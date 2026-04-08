import * as SecureStore from "expo-secure-store";

const MASTER_SEED_KEY_PREFIX = "umbra_master_seed_";
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.stealf.wallet",
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/**
 * The master seed must be namespaced per stealth wallet, otherwise switching
 * accounts overwrites the seed and the SDK decrypts balances/UTXOs with the
 * wrong key — leading to garbage values like a 256-bit number as the balance.
 *
 * `currentWalletKey` is set whenever the active wallet changes via `setActiveWallet()`.
 */
let currentWalletKey: string | null = null;

export function setActiveWallet(walletAddress: string | null | undefined) {
  currentWalletKey = walletAddress || null;
}

function getStorageKey(): string | null {
  if (!currentWalletKey) return null;

  const safe = currentWalletKey.replace(/[^A-Za-z0-9._-]/g, "_");
  
  return `${MASTER_SEED_KEY_PREFIX}${safe}`;
}


export const masterSeedStorage = {
  async load() {
    const key = getStorageKey();
    if (!key) return { exists: false as const };
    try {
      // Read ONLY the namespaced key for the current wallet.
      // The master seed is deterministic from the signer (derived via
      // UMBRA_MESSAGE_TO_SIGN), so if the namespaced key is empty the SDK
      // will re-derive the correct seed from the active wallet's signer.
      // No legacy fallback — it would return another wallet's seed and
      // produce garbage on decryption.
      const stored = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
      if (!stored) return { exists: false as const };
      const seed = Uint8Array.from(Buffer.from(stored, "base64"));
      return { exists: true as const, seed };
    } catch {
      return { exists: false as const };
    }
  },

  async store(seed: Uint8Array) {
    const key = getStorageKey();
    if (!key) {
      return { success: false as const, error: "No active wallet" };
    }
    try {
      const encoded = Buffer.from(seed).toString("base64");
      try {
        await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
      } catch (_) {}
      await SecureStore.setItemAsync(key, encoded, KEYCHAIN_OPTIONS);
      return { success: true as const };
    } catch (e) {
      return { success: false as const, error: String(e) };
    }
  },
};

/**
 * Clear the master seed for the currently active wallet only.
 * Other wallets' seeds are preserved so they remain decryptable.
 */
export async function umbraClearSeed(): Promise<void> {
  const key = getStorageKey();
  if (!key) return;
  try {
    await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
  } catch (_) {}
}


export async function umbraCleanupLegacySeed(): Promise<void> {
  // intentional no-op
}
