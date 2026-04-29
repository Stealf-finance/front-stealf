import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUmbraRelayer,
  getPollingTransactionForwarder,
  getPollingComputationMonitor,
} from "@umbra-privacy/sdk";
import bs58 from "bs58";
import { walletKeyCache } from "../cache/walletKeyCache";
import { authStorage } from "../auth/authStorage";
import { createMWAUmbraSigner } from "./mwaSigner";
import {
  masterSeedStorage,
  setActiveWallet,
  createMasterSeedStorage,
  generateRandomMasterSeed,
} from "./seed";
import { getStealfWalletType } from "../wallet/stealfWalletType";
import {
  createTurnkeyUmbraSigner,
  type TurnkeyWalletAccount,
  type TurnkeySignTransactionFn,
  type TurnkeySignMessageFn,
} from "./turnkeySigner";

export const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "";
export const WSS_URL = process.env.EXPO_PUBLIC_SOLANA_WSS_URL || "";
export const NETWORK = "devnet" as const;
export const RELAYER_API = "https://relayer.api-devnet.umbraprivacy.com";
export const INDEXER_API = "https://utxo-indexer.api-devnet.umbraprivacy.com";
// Polling forwarder avoids flaky WebSocket on mobile; 90s is enough for slow
// RPC responses without blocking the UI for too long on failure.
const TX_CONFIRMATION_TIMEOUT_MS = 90_000;

// Arcium MPC callbacks on devnet run on low-powered nodes — the default
// 200-slot (~80s) window often isn't enough. Bump to 400 slots (~160s) so
// legitimate slow callbacks complete instead of firing TX_TIMEOUT.
const MPC_SLOT_WINDOW = 400;

/**
 * Wrap the polling computation monitor so every `prepareMonitor` call uses
 * our longer slot window by default. Callers can still override per-call.
 */
function createComputationMonitor() {
  const base = getPollingComputationMonitor({ rpcUrl: RPC_URL });
  return {
    ...base,
    prepareMonitor: (address: any, options?: any) =>
      base.prepareMonitor(address, { maxSlotWindow: MPC_SLOT_WINDOW, ...options }),
  };
}

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;


let cachedClient: UmbraClient | null = null;
let cachedSignerKey: string | null = null;
// Dedupe concurrent getClient() calls so two simultaneous reads on a fresh
// install don't race the SDK's masterSeedStorage.generate() override into
// producing two different random seeds — the second store() would otherwise
// orphan the first client's key hierarchy. All concurrent callers share the
// same in-flight promise.
let inFlightClient: Promise<UmbraClient> | null = null;

export function getCachedSignerKey(): string | null {
  return cachedSignerKey;
}

export async function getClient(): Promise<UmbraClient> {
  if (cachedClient) return cachedClient;
  if (inFlightClient) return inFlightClient;
  inFlightClient = buildClient().finally(() => {
    inFlightClient = null;
  });
  return inFlightClient;
}

async function buildClient(): Promise<UmbraClient> {
  const stored = await authStorage.getUserData();
  const stealfType = await getStealfWalletType();

  // Seeker / MWA stealth wallet — the address IS the Seed Vault account, no
  // local key. Picked at wallet setup; persisted via setStealfWalletType.
  if (stealfType === 'mwa') {
    const walletAddress = stored?.stealf_wallet as string | undefined;
    if (!walletAddress) {
      throw new Error("No stealf_wallet address — reconnect your Seeker wallet");
    }
    setActiveWallet(walletAddress);

    if (cachedSignerKey && cachedSignerKey !== walletAddress) {
      cachedClient = null;
    }
    if (cachedClient) return cachedClient;

    const signer = createMWAUmbraSigner({ walletAddress });
    cachedClient = await getUmbraClient(
      {
        signer,
        network: NETWORK,
        rpcUrl: RPC_URL,
        rpcSubscriptionsUrl: WSS_URL,
        indexerApiEndpoint: INDEXER_API,
      },
      {
        transactionForwarder: getPollingTransactionForwarder(
          { rpcUrl: RPC_URL },
          { defaultOptions: { timeoutMs: TX_CONFIRMATION_TIMEOUT_MS } } as any,
        ),
        computationMonitor: createComputationMonitor() as any,
        masterSeedStorage: {
          load: masterSeedStorage.load as any,
          store: masterSeedStorage.store as any,
          // Override the SDK's default signMessage-based derivation. Seeker
          // Seed Vault refuses to sign Umbra's 1700-byte derivation message
          // (returns CancellationException with no biometric prompt). Generate
          // a random 64-byte seed instead — SDK persists it via store() so
          // subsequent loads return the same seed.
          generate: (async () => generateRandomMasterSeed()) as any,
        },
      },
    );
    cachedSignerKey = walletAddress;
    return cachedClient;
  }

  // Legacy / local BIP39 keypair path — used both by passkey users on every
  // platform and by users who explicitly picked "Create new wallet" /
  // "Import wallet" at setup time on a Seeker phone.
  const privateKeyB58 = await walletKeyCache.getPrivateKey();
  if (!privateKeyB58) {
    throw new Error("No stealf_wallet key — wallet setup required");
  }

  setActiveWallet(privateKeyB58);

  if (cachedSignerKey && cachedSignerKey !== privateKeyB58) {
    cachedClient = null;
  }
  if (cachedClient) return cachedClient;

  const keyBytes = bs58.decode(privateKeyB58);
  let signer;
  if (keyBytes.length === 64) {
    signer = await createSignerFromPrivateKeyBytes(keyBytes);
  } else {
    const { createKeyPairFromPrivateKeyBytes } = await import("@solana/kit");
    const cryptoKeyPair = await createKeyPairFromPrivateKeyBytes(keyBytes);
    const pubKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", cryptoKeyPair.publicKey)
    );
    const fullKeyBytes = new Uint8Array(64);
    fullKeyBytes.set(keyBytes, 0);
    fullKeyBytes.set(pubKeyRaw, 32);
    signer = await createSignerFromPrivateKeyBytes(fullKeyBytes);
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
      transactionForwarder: getPollingTransactionForwarder(
        { rpcUrl: RPC_URL },
        { defaultOptions: { timeoutMs: TX_CONFIRMATION_TIMEOUT_MS } } as any,
      ),
      computationMonitor: createComputationMonitor() as any,
      masterSeedStorage: {
        load: masterSeedStorage.load as any,
        store: masterSeedStorage.store as any,
      },
    }
  );

  cachedSignerKey = privateKeyB58;
  return cachedClient;
}

/**
 * Reset the stealth client cache. Called on logout / wallet switch so the next
 * `getClient()` rebuilds with the new keys.
 */
export function clearUmbraClient(): void {
  cachedClient = null;
  cachedSignerKey = null;
}


const cashClientCache = new Map<string, UmbraClient>();

export interface GetCashClientArgs {
  walletAccount: TurnkeyWalletAccount;
  signTransaction: TurnkeySignTransactionFn;
  signMessage: TurnkeySignMessageFn;
}

/**
 * Build (or fetch from cache) an `UmbraClient` whose signer is the user's
 * cash wallet via Turnkey. Cached per cash wallet address — calling this
 * twice with the same `walletAccount.address` returns the same client.
 */
export async function getCashClient(args: GetCashClientArgs): Promise<UmbraClient> {
  const addr = args.walletAccount.address;
  const cached = cashClientCache.get(addr);
  if (cached) return cached;

  const signer = createTurnkeyUmbraSigner({
    walletAccount: args.walletAccount,
    signTransaction: args.signTransaction,
    signMessage: args.signMessage,
  });

  const seedStorage = createMasterSeedStorage(addr);

  const client = await getUmbraClient(
    {
      signer,
      network: NETWORK,
      rpcUrl: RPC_URL,
      rpcSubscriptionsUrl: WSS_URL,
      indexerApiEndpoint: INDEXER_API,
    },
    {
      transactionForwarder: getPollingTransactionForwarder(
        { rpcUrl: RPC_URL },
        { defaultOptions: { timeoutMs: TX_CONFIRMATION_TIMEOUT_MS } } as any,
      ),
      computationMonitor: createComputationMonitor() as any,
      masterSeedStorage: {
        load: seedStorage.load as any,
        store: seedStorage.store as any,
      },
    }
  );

  cashClientCache.set(addr, client);
  return client;
}

export function clearCashClient(walletAddress?: string): void {
  if (walletAddress) cashClientCache.delete(walletAddress);
  else cashClientCache.clear();
}

export function getRelayer() {
  return getUmbraRelayer({ apiEndpoint: RELAYER_API } as any);
}
