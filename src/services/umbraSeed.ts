import * as SecureStore from "expo-secure-store";

const MASTER_SEED_KEY = "umbra_master_seed";
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.stealf.wallet",
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// SDK expects LoadResult<MasterSeed> = { exists: true, seed: MasterSeed } | { exists: false }
// and StoreResult = { success: true } | { success: false, error: string }
export const masterSeedStorage = {
  async load() {
    try {
      const stored = await SecureStore.getItemAsync(MASTER_SEED_KEY, KEYCHAIN_OPTIONS);
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
        await SecureStore.deleteItemAsync(MASTER_SEED_KEY, KEYCHAIN_OPTIONS);
      } catch (_) {}
      await SecureStore.setItemAsync(MASTER_SEED_KEY, encoded, KEYCHAIN_OPTIONS);
      return { success: true as const };
    } catch (e) {
      return { success: false as const, error: String(e) };
    }
  },
};

export async function umbraClearSeed(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(MASTER_SEED_KEY, KEYCHAIN_OPTIONS);
  } catch (_) {}
}
