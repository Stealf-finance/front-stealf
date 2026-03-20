import { useState, useCallback } from "react";
import {
  createSignerFromPrivateKeyBytes,
  getUmbraClientFromSigner,
  getUserRegistrationFunction,
  getDirectDepositIntoEncryptedBalanceFunction,
  getDirectWithdrawIntoPublicBalanceV3Function,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction,
  getCreateSelfClaimableUtxoFromEncryptedBalanceFunction,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction,
  getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  getMoproCreateReceiverClaimableUtxoProver,
  getMoproCreateSelfClaimableUtxoProver,
  getMoproClaimReceiverIntoEncryptedProver,
  getMoproClaimSelfIntoEncryptedProver,
} from "../../services/solana/moproZkProvers";
import type { IUmbraClient } from "@umbra-privacy/sdk/interfaces";
import { isEncryptedDepositError } from "@umbra-privacy/sdk/errors";
import bs58 from "bs58";
import { walletKeyCache } from "../../services/cache/walletKeyCache";
import { masterSeedStorage, umbraClearSeed } from "../../services/solana/umbraSeed";

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
const RELAYER_API = process.env.EXPO_PUBLIC_UMBRA_RELAYER_URL || "https://relayer.umbra.finance";

// --- Client singleton ---

let cachedClient: IUmbraClient | null = null;
let cachedSignerKey: string | null = null;

async function getClient(): Promise<IUmbraClient> {
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error("No stealf_wallet key — wallet setup required");
  }

  // Invalidate if signer changed
  if (cachedClient && cachedSignerKey !== privateKeyB58) {
    cachedClient = null;
  }
  if (cachedClient) return cachedClient;

  const signer = await createSignerFromPrivateKeyBytes(bs58.decode(privateKeyB58));

  cachedClient = await getUmbraClientFromSigner(
    {
      signer,
      network: NETWORK,
      rpcUrl: RPC_URL,
      rpcSubscriptionsUrl: WSS_URL,
      deferMasterSeedSignature: true,
    },
    {
      masterSeedStorage: masterSeedStorage as any,
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

async function ensureRegistered(): Promise<void> {
  if (registered) return;
  try {
    const client = await getClient();
    const register = getUserRegistrationFunction({ client });
    await register({ confidential: true, anonymous: false });
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

  /** Register on-chain (confidential balances, no mixer). */
  const register = useCallback(
    () => wrap("register", () => ensureRegistered()),
    [wrap]
  );

  /** Deposit tokens into encrypted balance. Auto-registers if needed. */
  const deposit = useCallback(
    async (mint: string, amount: bigint): Promise<string | null> => {
      return wrap("deposit", async () => {
        await ensureRegistered();
        const client = await getClient();
        const doDeposit = getDirectDepositIntoEncryptedBalanceFunction({ client });
        return doDeposit(client.signer.address as any, mint as any, amount as any);
      });
    },
    [wrap]
  );

  /** Withdraw tokens from encrypted balance back to public ATA. */
  const withdraw = useCallback(
    async (mint: string, amount: bigint): Promise<string | null> => {
      return wrap("withdraw", async () => {
        const client = await getClient();
        const doWithdraw = getDirectWithdrawIntoPublicBalanceV3Function({ client });
        return doWithdraw(client.signer.address as any, mint as any, amount as any);
      });
    },
    [wrap]
  );

  /** Send private transfer — creates a UTXO claimable by recipient. */
  const sendPrivate = useCallback(
    async (recipient: string, mint: string, amount: bigint) => {
      return wrap("sendPrivate", async () => {
        await ensureRegistered();
        const client = await getClient();
        const zkProver = getMoproCreateReceiverClaimableUtxoProver();
        const createUtxo = getCreateReceiverClaimableUtxoFromEncryptedBalanceFunction(
          { client },
          { zkProver: zkProver as any }
        );
        return createUtxo({
          destinationAddress: recipient as any,
          mint: mint as any,
          amount: amount as any,
        });
      });
    },
    [wrap]
  );

  /** Self-shield — creates a UTXO claimable by self (for rebalancing). */
  const selfShield = useCallback(
    async (mint: string, amount: bigint) => {
      return wrap("selfShield", async () => {
        await ensureRegistered();
        const client = await getClient();
        const zkProver = getMoproCreateSelfClaimableUtxoProver();
        const createUtxo = getCreateSelfClaimableUtxoFromEncryptedBalanceFunction(
          { client },
          { zkProver: zkProver as any }
        );
        return createUtxo({
          destinationAddress: client.signer.address as any,
          mint: mint as any,
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
        const claimFn = getClaimSelfClaimableUtxoIntoEncryptedBalanceFunction(
          { client },
          { zkProver: zkProver as any, relayer }
        );
        return claimFn(utxos as any);
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
        const claimFn = getClaimReceiverClaimableUtxoIntoEncryptedBalanceFunction(
          { client },
          { zkProver: zkProver as any, relayer }
        );
        return claimFn(utxos as any);
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
