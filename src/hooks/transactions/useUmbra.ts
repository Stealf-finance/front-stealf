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
  getSelfClaimableUtxoToPublicBalanceClaimerFunction,
  getEncryptedBalanceQuerierFunction,
  getClaimableUtxoScannerFunction,
  getBatchMerkleProofFetcher,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import {
  createUserRegistrationProver,
  createCreateUtxoWithReceiverUnlockerZkProver,
  createCreateUtxoWithEphemeralUnlockerZkProver,
  createClaimReceiverZkProver,
  createClaimEphemeralZkProver,
} from "../../zk";
import type { Address } from "@solana/kit";
import bs58 from "bs58";
import { walletKeyCache } from "../../services/cache/walletKeyCache";
import { masterSeedStorage, umbraClearSeed, setActiveWallet } from "../../services/solana/umbraSeed";

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

  setActiveWallet(privateKeyB58);

  if (cachedSignerKey && cachedSignerKey !== privateKeyB58) {
    cachedClient = null;
    registered = false;
  }
  if (cachedClient) return cachedClient;

  const keyBytes = bs58.decode(privateKeyB58);
  if (keyBytes.length === 64) {
    var signer = await createSignerFromPrivateKeyBytes(keyBytes);
  } else {
    const { createKeyPairFromPrivateKeyBytes } = await import('@solana/kit');
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


const BURNT_UTXOS_KEY_PREFIX = "umbra_burnt_utxos_";
const burntUtxoIds = new Set<string>();
let burntUtxosLoadedForKey: string | null = null;

async function loadBurntUtxosForCurrentWallet(privateKeyB58: string): Promise<void> {
  if (burntUtxosLoadedForKey === privateKeyB58) return;
  burntUtxoIds.clear();
  const safe = privateKeyB58.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${BURNT_UTXOS_KEY_PREFIX}${safe}`;
  try {
    const SecureStore = await import("expo-secure-store");
    const stored = await SecureStore.getItemAsync(key);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      for (const id of ids) burntUtxoIds.add(id);
    }
  } catch (_) {}
  burntUtxosLoadedForKey = privateKeyB58;
}

async function persistBurntUtxos(): Promise<void> {
  if (!burntUtxosLoadedForKey) return;
  const safe = burntUtxosLoadedForKey.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${BURNT_UTXOS_KEY_PREFIX}${safe}`;
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, JSON.stringify(Array.from(burntUtxoIds)));
  } catch (_) {}
}

function utxoToId(utxo: any): string {

  const tree = utxo?.treeIndex?.toString?.() ?? String(utxo?.treeIndex ?? '0');
  const leaf = utxo?.insertionIndex?.toString?.() ?? String(utxo?.insertionIndex ?? '');
  return `${tree}:${leaf}`;
}

export async function fetchPendingClaims(): Promise<any[]> {
  const client = await getClient();
  if (cachedSignerKey) await loadBurntUtxosForCurrentWallet(cachedSignerKey);
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.received ?? [];
  if (burntUtxoIds.size === 0) return all;
  return all.filter((u: any) => !burntUtxoIds.has(utxoToId(u)));
}

/**
 * Scan the mixer for self-claimable UTXOs whose destinationAddress matches
 * the given wallet (typically the cash wallet). These were created by the
 * user via Stealth → Cash flow (`selfShield(destination=cash_wallet)`) and
 * are waiting to be claimed via the relayer to the destination's public ATA.
 */
export async function fetchPendingClaimsForCash(cashWalletAddress: string): Promise<any[]> {
  const client = await getClient();
  if (cachedSignerKey) await loadBurntUtxosForCurrentWallet(cachedSignerKey);
  const scan = getClaimableUtxoScannerFunction({ client });
  const result = await scan(0n as any, 0n as any);
  const all = result.selfBurnable ?? [];
  return all.filter((u: any) => {
    if (burntUtxoIds.has(utxoToId(u))) return false;
    const dest = u?.destinationAddress?.toString?.() ?? String(u?.destinationAddress ?? '');
    return dest === cashWalletAddress;
  });
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
  | "claimReceived"
  | "claimSelfToPublic";

export type UmbraErrorCode =
  | "RECEIVER_NOT_REGISTERED"
  | "INSUFFICIENT_BALANCE"
  | "USER_NOT_REGISTERED"
  | "VERIFYING_KEY_NOT_INITIALIZED"
  | "RPC_ERROR"
  | "ZK_PROOF_ERROR"
  | "UNKNOWN";

export class UmbraError extends Error {
  code: UmbraErrorCode;
  op: UmbraOp;
  /** Best-effort user-facing message in English. */
  userMessage: string;
  /** The original SDK error for debugging. */
  cause?: unknown;

  constructor(
    code: UmbraErrorCode,
    op: UmbraOp,
    rawMessage: string,
    userMessage: string,
    cause?: unknown
  ) {
    super(rawMessage);
    this.name = "UmbraError";
    this.code = code;
    this.op = op;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

/**
 * Parse a raw SDK error into an `UmbraError` with a stable code + friendly message.
 */
function parseUmbraError(err: any, op: UmbraOp): UmbraError {
  const causeName: string = err?.cause?.name || err?.name || "";
  const rawMessage: string = err?.cause?.message || err?.message || `${op} failed`;
  const simulationLogs: string[] = err?.cause?.context?.logs || [];

  // Receiver is not registered on Umbra
  if (/receiver is not registered/i.test(rawMessage)) {
    return new UmbraError(
      "RECEIVER_NOT_REGISTERED",
      op,
      rawMessage,
      "Recipient is not a Stealf user yet. Ask them to set up their privacy wallet first.",
      err?.cause ?? err
    );
  }

  // Current user is not yet registered on Umbra
  if (/user is not registered|account.*not.*initialised|not registered/i.test(rawMessage)) {
    return new UmbraError(
      "USER_NOT_REGISTERED",
      op,
      rawMessage,
      "Your privacy wallet is not registered yet. Try again in a few seconds.",
      err?.cause ?? err
    );
  }

  // Global verifying key not initialized on devnet (program-side issue)
  if (simulationLogs.some((l) => /zero_knowledge_verifying_key/i.test(l))) {
    return new UmbraError(
      "VERIFYING_KEY_NOT_INITIALIZED",
      op,
      rawMessage,
      "Umbra protocol is not fully deployed on this network. Please contact support.",
      err?.cause ?? err
    );
  }

  // Insufficient balance — surface from logs or message
  if (
    /insufficient/i.test(rawMessage) ||
    simulationLogs.some((l) => /insufficient (funds|lamports)/i.test(l))
  ) {
    return new UmbraError(
      "INSUFFICIENT_BALANCE",
      op,
      rawMessage,
      "Insufficient balance to complete this transaction.",
      err?.cause ?? err
    );
  }

  // Generic ZK proof error
  if (causeName === "CryptographyError" || /zk.?proof|groth16/i.test(rawMessage)) {
    return new UmbraError(
      "ZK_PROOF_ERROR",
      op,
      rawMessage,
      "Failed to generate the privacy proof. Please try again.",
      err?.cause ?? err
    );
  }

  // RPC / network
  if (/rpc|network|fetch|timeout/i.test(rawMessage)) {
    return new UmbraError(
      "RPC_ERROR",
      op,
      rawMessage,
      "Network error. Please check your connection and try again.",
      err?.cause ?? err
    );
  }

  return new UmbraError("UNKNOWN", op, rawMessage, rawMessage, err?.cause ?? err);
}

export function useUmbra() {
  const [loading, setLoading] = useState(false);
  const [currentOp, setCurrentOp] = useState<UmbraOp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(
    async <T>(op: UmbraOp, fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setCurrentOp(op);
      setError(null);
      try {
        return await fn();
      } catch (err: any) {
        const umbraErr = parseUmbraError(err, op);
        if (__DEV__) {
          console.error(`[Umbra] ${op} failed (${umbraErr.code}):`, umbraErr.message);
          if (err?.cause?.context?.logs) {
            console.error(`[Umbra] simulation logs:`, err.cause.context.logs);
          }
        }
        setError(umbraErr.userMessage);
        throw umbraErr;
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
    async (mint: Address, amount: bigint, destinationAddress?: Address) => {
      return wrap("selfShield", async () => {
        await ensureRegistered();
        const client = await getClient();
        const zkProver = createCreateUtxoWithEphemeralUnlockerZkProver();
        const createUtxo = getEncryptedBalanceToSelfClaimableUtxoCreatorFunction(
          { client },
          { zkProver }
        );
        return createUtxo({
          destinationAddress: destinationAddress ?? client.signer.address,
          mint,
          amount: amount as any,
        });
      });
    },
    [wrap]
  );

  /**
   * Claim self-claimable UTXOs into the destination's PUBLIC balance (ATA).
   * The relayer signs the on-chain claim, so the on-chain footprint is
   * `relayer → destinationAddress` — no link to the original sender.
   * Used as the second step of the anonymous Stealth → Cash flow.
   */
  const claimSelfToPublic = useCallback(
    async (utxos: any[]) => {
      return wrap("claimSelfToPublic", async () => {
        const client = await getClient();
        const zkProver = createClaimEphemeralZkProver();
        const relayer = getRelayer();
        const fetchBatchMerkleProof = getBatchMerkleProofFetcher({ apiEndpoint: INDEXER_API });
        const claimFn = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
          { client },
          { zkProver, relayer, fetchBatchMerkleProof }
        );

        // Make sure the persistent blacklist is loaded before any add/check
        if (cachedSignerKey) await loadBurntUtxosForCurrentWallet(cachedSignerKey);

        const safeStringify = (v: any) =>
          JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() : val), 2);

        console.log('[claimSelfToPublic] input utxos:', safeStringify(utxos));
        console.log('[claimSelfToPublic] signer.address:', client?.signer?.address?.toString?.() ?? String(client?.signer?.address));

        let result;
        try {
          result = await claimFn(utxos);
          console.log('[claimSelfToPublic] claimFn result:', safeStringify(result));
          if (result?.batches instanceof Map) {
            for (const [k, batch] of result.batches) {
              console.log(`[claimSelfToPublic] batch ${String(k)}:`, safeStringify(batch));
            }
          }
        } catch (err: any) {
          console.log('[claimSelfToPublic] claimFn threw:', err?.message, err?.cause?.message);
          const msg = String(err?.message || err?.cause?.message || '');
          if (
            /NullifierAlreadyBurnt/i.test(msg) ||
            /already burnt/i.test(msg) ||
            /already reserved/i.test(msg) ||
            /0x6d64/i.test(msg)
          ) {
            let blacklistChanged = false;
            for (const u of utxos) {
              const id = utxoToId(u);
              if (!burntUtxoIds.has(id)) {
                burntUtxoIds.add(id);
                blacklistChanged = true;
              }
            }
            if (blacklistChanged) await persistBurntUtxos();
            // Treat as success — these UTXOs are effectively gone
            return { batches: new Map() };
          }
          throw err;
        }

        // Inspect every batch and decide what to do
        const batches = result?.batches;
        let anySuccess = false;
        let anyAlreadyBurnt = false;
        let blacklistChanged = false;
        const otherFailures: string[] = [];
        if (batches instanceof Map) {
          for (const [, batch] of batches) {
            const status = batch?.status;
            const utxoIds = batch?.utxoIds ?? [];
            if (status === 'completed') {
              anySuccess = true;
              for (const id of utxoIds) {
                if (!burntUtxoIds.has(id)) {
                  burntUtxoIds.add(id);
                  blacklistChanged = true;
                }
              }
              // Also blacklist via input UTXOs as a safety net (in case relayer ids don't match scan ids)
              for (const u of utxos) {
                const id = utxoToId(u);
                if (!burntUtxoIds.has(id)) {
                  burntUtxoIds.add(id);
                  blacklistChanged = true;
                }
              }
            } else if (status === 'failed' || status === 'timed_out') {
              const reason = batch?.failureReason || '';
              if (
                /NullifierAlreadyBurnt/i.test(reason) ||
                /already burnt/i.test(reason) ||
                /0x6d64/i.test(reason)
              ) {
                anyAlreadyBurnt = true;
                for (const id of utxoIds) {
                  if (!burntUtxoIds.has(id)) {
                    burntUtxoIds.add(id);
                    blacklistChanged = true;
                  }
                }
              } else {
                otherFailures.push(reason || 'unknown failure');
              }
            }
          }
        }

        if (blacklistChanged) await persistBurntUtxos();

        if (otherFailures.length > 0 && !anySuccess && !anyAlreadyBurnt) {
          throw new Error(otherFailures[0]);
        }

        return result;
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
        const fetchBatchMerkleProof = getBatchMerkleProofFetcher({ apiEndpoint: INDEXER_API });
        const claimFn = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
          { client },
          { zkProver, relayer, fetchBatchMerkleProof }
        );

        // Make sure the persistent blacklist is loaded before any add/check
        if (cachedSignerKey) await loadBurntUtxosForCurrentWallet(cachedSignerKey);

        let result;
        try {
          result = await claimFn(utxos);
        } catch (err: any) {

          const msg = String(err?.message || err?.cause?.message || '');
          if (
            /NullifierAlreadyBurnt/i.test(msg) ||
            /already burnt/i.test(msg) ||
            /already reserved/i.test(msg) ||
            /0x6d64/i.test(msg)
          ) {
            let blacklistChanged = false;
            for (const u of utxos) {
              const id = utxoToId(u);
              if (!burntUtxoIds.has(id)) {
                burntUtxoIds.add(id);
                blacklistChanged = true;
              }
            }
            if (blacklistChanged) await persistBurntUtxos();
            // Treat as success — these UTXOs are effectively gone
            return { batches: new Map() };
          }
          throw err;
        }

        // Inspect every batch and decide what to do
        const batches = result?.batches;
        let anySuccess = false;
        let anyAlreadyBurnt = false;
        let blacklistChanged = false;
        const otherFailures: string[] = [];
        if (batches instanceof Map) {
          for (const [, batch] of batches) {
            const status = batch?.status;
            const utxoIds = batch?.utxoIds ?? [];
            if (status === 'completed') {
              anySuccess = true;
              for (const id of utxoIds) {
                if (!burntUtxoIds.has(id)) {
                  burntUtxoIds.add(id);
                  blacklistChanged = true;
                }
              }
              // Also blacklist via input UTXOs as a safety net (in case relayer ids don't match scan ids)
              for (const u of utxos) {
                const id = utxoToId(u);
                if (!burntUtxoIds.has(id)) {
                  burntUtxoIds.add(id);
                  blacklistChanged = true;
                }
              }
            } else if (status === 'failed' || status === 'timed_out') {
              const reason = batch?.failureReason || '';
              if (
                /NullifierAlreadyBurnt/i.test(reason) ||
                /already burnt/i.test(reason) ||
                /0x6d64/i.test(reason)
              ) {
                anyAlreadyBurnt = true;
                for (const id of utxoIds) {
                  if (!burntUtxoIds.has(id)) {
                    burntUtxoIds.add(id);
                    blacklistChanged = true;
                  }
                }
              } else {
                otherFailures.push(reason || 'unknown failure');
              }
            }
          }
        }

        if (blacklistChanged) await persistBurntUtxos();

        if (otherFailures.length > 0 && !anySuccess && !anyAlreadyBurnt) {
          throw new Error(otherFailures[0]);
        }

        return result;
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
    claimSelfToPublic,
    claimReceived,
  };
}
