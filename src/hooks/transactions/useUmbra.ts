import { useState, useCallback } from "react";
import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToSelfClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getSelfClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  getMoproCreateReceiverClaimableUtxoProver,
  getMoproCreateSelfClaimableUtxoProver,
  getMoproClaimReceiverIntoEncryptedProver,
  getMoproClaimSelfIntoEncryptedProver,
} from "../../services/solana/moproZkProvers";
import { isEncryptedDepositError } from "@umbra-privacy/sdk/errors";
import type { Address } from "@solana/kit";
import bs58 from "bs58";
import { walletKeyCache } from "../../services/cache/walletKeyCache";
import { masterSeedStorage, umbraClearSeed } from "../../services/solana/umbraSeed";
import { getPrivacyKeypair } from "../../utils/solanaKeyDerivation";

type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

export { umbraClearSeed };

/** Clear client + registration state (call on logout). */
export function clearUmbraState(): void {
  cachedClient = null;
  cachedSignerKey = null;
  registered = false;
}

// --- Config ---

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || "";
const NETWORK = "devnet" as const;
const RELAYER_API = "https://relayer.umbra.finance";
const INDEXER_API = "https://indexer.api.umbraprivacy.com ";


let cachedClient: UmbraClient | null = null;
let cachedSignerKey: string | null = null;

async function getClient(): Promise<UmbraClient> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error("No stealf_wallet key — wallet setup required");
  }

  if (cachedClient && cachedSignerKey !== privateKeyB58) {
    cachedClient = null;
  }
  if (cachedClient) return cachedClient;

  // Umbra expects 64-byte keypair (32 private + 32 public)
  const keyBytes = bs58.decode(privateKeyB58);
  if (keyBytes.length === 64) {
    var signer = await createSignerFromPrivateKeyBytes(keyBytes);
  } else {
    const { createKeyPairFromPrivateKeyBytes, getAddressFromPublicKey } = await import('@solana/kit');
    const cryptoKeyPair = await createKeyPairFromPrivateKeyBytes(keyBytes);
    const pubKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', cryptoKeyPair.publicKey));
    const fullKeyBytes = new Uint8Array(64);
    fullKeyBytes.set(keyBytes, 0);
    fullKeyBytes.set(pubKeyRaw, 32);
    var signer = await createSignerFromPrivateKeyBytes(fullKeyBytes);
  }

  cachedClient = await getUmbraClient(
    {
      signer,
      network: NETWORK,
      rpcUrl: RPC_URL,
      rpcSubscriptionsUrl: WSS_URL,
      indexerApiEndpoint: INDEXER_API,
    },
    {
      masterSeedStorage: {
        load: masterSeedStorage.load as any,
        store: masterSeedStorage.store as any,
      },
    }
  );

  cachedSignerKey = privateKeyB58;
  return cachedClient;
}

function getRelayer() {
  return getUmbraRelayer({ apiEndpoint: RELAYER_API } as any);
}

// --- Registration guard ---

let registered = false;

export async function ensureRegistered(): Promise<void> {
  if (registered) return;
  try {
    const client = await getClient();
    const register = getUserRegistrationFunction({ client });
    await register({ confidential: true, anonymous: true });
    registered = true;
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("already") || msg.includes("Already")) {
      registered = true;
      return;
    }
    throw err;
  }
}

// --- Hook ---

type UmbraOp =
  | "register"
  | "deposit"
  | "withdraw"
  | "sendPrivate"
  | "selfShield"
  | "claimSelf"
  | "claimReceived";

export function useUmbra() {
  const [loading, setLoading] = useState(false);
  const [currentOp, setCurrentOp] = useState<UmbraOp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(
    async <T>(op: UmbraOp, fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setCurrentOp(op);
      setError(null);
      try {
        return await fn();
      } catch (err: any) {
        if (__DEV__) {
          console.error(`[Umbra] ${op} failed:`, err);
          if (err?.logs) console.error(`[Umbra] tx logs:`, err.logs);
          if (err?.cause) console.error(`[Umbra] cause:`, err.cause);
        }
        setError(err?.message || `${op} failed`);
        return null;
      } finally {
        setLoading(false);
        setCurrentOp(null);
      }
    },
    []
  );

  const register = useCallback(
    () => wrap("register", () => ensureRegistered()),
    [wrap]
  );

  /** Deposit tokens into encrypted balance. */
  const deposit = useCallback(
    async (mint: Address, amount: bigint) => {
      return wrap("deposit", async () => {
        await ensureRegistered();
        const client = await getClient();
        const doDeposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
        // as any on amount: SDK expects branded U64 type
        return doDeposit(client.signer.address, mint, amount as any);
      });
    },
    [wrap]
  );

  /** Withdraw tokens from encrypted balance. */
  const withdraw = useCallback(
    async (mint: Address, amount: bigint) => {
      return wrap("withdraw", async () => {
        const client = await getClient();
        const doWithdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
        return doWithdraw(client.signer.address, mint, amount as any);
      });
    },
    [wrap]
  );

  /** Send private transfer — creates a UTXO claimable by recipient. */
  const sendPrivate = useCallback(
    async (recipient: Address, mint: Address, amount: bigint) => {
      return wrap("sendPrivate", async () => {
        await ensureRegistered();
        const client = await getClient();
        const zkProver = getMoproCreateReceiverClaimableUtxoProver();
        // as any on zkProver: mopro interface differs from SDK's IZkProver
        const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
          { client },
          { zkProver: zkProver as any }
        );
        return createUtxo({
          destinationAddress: recipient,
          mint,
          amount: amount as any,
        });
      });
    },
    [wrap]
  );

  /** Self-shield — creates a UTXO claimable by self. */
  const selfShield = useCallback(
    async (mint: Address, amount: bigint) => {
      return wrap("selfShield", async () => {
        await ensureRegistered();
        const client = await getClient();
        const zkProver = getMoproCreateSelfClaimableUtxoProver();
        const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
          { client },
          { zkProver: zkProver as any }
        );
        return createUtxo({
          destinationAddress: client.signer.address,
          mint,
          amount: amount as any,
        });
      });
    },
    [wrap]
  );

  /** Claim self-created UTXOs into encrypted balance. */
  const claimSelf = useCallback(
    async (utxos: any[]) => {
      return wrap("claimSelf", async () => {
        const client = await getClient();
        const zkProver = getMoproClaimSelfIntoEncryptedProver();
        const relayer = getRelayer();
        const claimFn = getSelfClaimableUtxoToEncryptedBalanceClaimerFunction(
          { client },
          { zkProver: zkProver as any, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof! }
        );
        return claimFn(utxos);
      });
    },
    [wrap]
  );

  /** Claim received UTXOs into encrypted balance. */
  const claimReceived = useCallback(
    async (utxos: any[]) => {
      return wrap("claimReceived", async () => {
        const client = await getClient();
        const zkProver = getMoproClaimReceiverIntoEncryptedProver();
        const relayer = getRelayer();
        const claimFn = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
          { client },
          { zkProver: zkProver as any, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof! }
        );
        return claimFn(utxos);
      });
    },
    [wrap]
  );

  return {
    loading,
    currentOp,
    error,
    register,
    deposit,
    withdraw,
    sendPrivate,
    selfShield,
    claimSelf,
    claimReceived,
  };
}
