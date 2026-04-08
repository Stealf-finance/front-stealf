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
  getEncryptedBalanceQuerierFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  createUserRegistrationProver,
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
  createClaimEphemeralZkProver,
  createClaimReceiverZkProver,
} from "../../zk";
import type { Address } from "@solana/kit";
import bs58 from "bs58";
import { walletKeyCache } from "../../services/cache/walletKeyCache";
import { masterSeedStorage, umbraClearSeed } from "../../services/solana/umbraSeed";

type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

export { umbraClearSeed };

export function clearUmbraState(): void {
  cachedClient = null;
  cachedSignerKey = null;
  registered = false;
}



const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || "";
const NETWORK = "devnet" as const;
const RELAYER_API = "https://relayer.api-devnet.umbraprivacy.com";
const INDEXER_API = "https://utxo-indexer.api-devnet.umbraprivacy.com";


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


export async function fetchEncryptedBalances(
  mints: Address[]
): Promise<Map<Address, any>> {
  const client = await getClient();
  const fetchBalances = getEncryptedBalanceQuerierFunction({ client });
  return fetchBalances(mints);
}

let registered = false;

export async function ensureRegistered(): Promise<void> {
  if (registered) return;
  try {
    const client = await getClient();
    const zkProver = await createUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
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
          console.error(`[Umbra] ${op} failed:`, err?.message);
          if (err?.logs) console.error(`[Umbra] tx logs:`, err.logs);
          if (err?.cause) {
            console.error(`[Umbra] cause:`, err.cause);
            const ctx = err.cause?.context;
            if (ctx?.logs) console.error(`[Umbra] simulation logs:`, ctx.logs);
            if (ctx?.err) console.error(`[Umbra] simulation err:`, JSON.stringify(ctx.err));
            if (ctx?.unitsConsumed != null) console.error(`[Umbra] units consumed:`, ctx.unitsConsumed);
            try {
              console.error(`[Umbra] full cause JSON:`, JSON.stringify(err.cause, null, 2));
            } catch (_) {}
          }
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
        const zkProver = createCreateUtxoWithReceiverUnlockerZkProver();
        const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
          { client },
          { zkProver }
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
        const zkProver = createCreateUtxoWithEphemeralUnlockerZkProver();
        const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
          { client },
          { zkProver }
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
        const zkProver = createClaimEphemeralZkProver();
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
        const zkProver = createClaimReceiverZkProver();
        const relayer = getRelayer();
        const claimFn = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
          { client },
          { zkProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof! }
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
