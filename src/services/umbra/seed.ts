import * as SecureStore from "expo-secure-store";

const MASTER_SEED_KEY_PREFIX = "umbra_master_seed_";
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.stealf.wallet",
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/**
 * Random 64-byte seed generator for wallets where the SDK's default
 * signMessage-based derivation can't run (e.g. Seeker Seed Vault, which
 * rejects signing arbitrary multi-kilobyte messages). The seed is wrapped
 * with `__brand: "MasterSeed"` so the SDK's nominal type accepts it.
 *
 * Trade-off: the seed is not derivable from the wallet anymore — if the
 * device's SecureStore is wiped (uninstall, factory reset) the user loses
 * access to their Umbra balances. Acceptable for the current Seeker beta
 * where Umbra itself is awaiting mainnet.
 */
export function generateRandomMasterSeed(): Uint8Array {
  const bytes = new Uint8Array(64);
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    (crypto as any).getRandomValues(bytes);
  } else {
    // Hermes fallback — should never hit in practice since polyfills.ts
    // installs crypto.getRandomValues at app boot.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

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
}

/**
 * Build a master seed storage scoped to a specific wallet address (e.g. the
 * cash wallet) without touching the global `currentWalletKey`. Used by the
 * cash-wallet UmbraClient so its (potential) seed reads/writes never collide
 * with the stealth wallet storage.
 */
export function createMasterSeedStorage(walletAddress: string) {
  const safe = walletAddress.replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${MASTER_SEED_KEY_PREFIX}${safe}`;

  return {
    async load() {
      try {
        const stored = await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
        if (!stored) return { exists: false as const };
        const seed = Uint8Array.from(Buffer.from(stored, "base64"));
        return { exists: true as const, seed };
      } catch {
        return { exists: false as const };
      }
    },
    async store(seed: Uint8Array) {
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
}
