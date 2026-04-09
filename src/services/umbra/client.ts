import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import bs58 from "bs58";
import { walletKeyCache } from "../cache/walletKeyCache";
import {
  masterSeedStorage,
  setActiveWallet,
  createMasterSeedStorage,
} from "./seed";
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

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;


let cachedClient: UmbraClient | null = null;
let cachedSignerKey: string | null = null;

export function getCachedSignerKey(): string | null {
  return cachedSignerKey;
}

export async function getClient(): Promise<UmbraClient> {
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
