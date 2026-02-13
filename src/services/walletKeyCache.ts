import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_KEY = 'stealf_private_key';
const MNEMONIC_STORE_KEY = 'stealf_wallet_mnemonic';

/**
 * Single set of options used for ALL SecureStore operations (set, get, delete).
 * This guarantees we always hit the same iOS Keychain namespace/service.
 */
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/**
 * Consistent SecureStore wrappers — same options on every call.
 */
async function secureSet(key: string, value: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS); } catch (_) {}
  await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
}

async function secureGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
}

async function secureDel(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
}

/**
 * In-memory cache for wallet keys.
 *
 * iOS Keychain becomes inaccessible after certain app state transitions
 * (inactive → active after biometric dialog). SecureStore.getItemAsync
 * returns null for ALL items in this state, even with AFTER_FIRST_UNLOCK.
 *
 * This cache loads keys into memory on first successful read and serves
 * them from RAM for the rest of the session. SecureStore is still used
 * for persistence across app restarts.
 */
let cachedPrivateKey: string | null = null;
let cachedMnemonic: string | null = null;

export const walletKeyCache = {
  /**
   * Store both key and mnemonic in memory + SecureStore
   */
  async store(privateKey: string, mnemonic?: string): Promise<void> {
    cachedPrivateKey = privateKey;
    if (mnemonic) cachedMnemonic = mnemonic;

    await secureSet(SECURE_STORE_KEY, privateKey);
    if (mnemonic) {
      await secureSet(MNEMONIC_STORE_KEY, mnemonic);
    }
  },

  /**
   * Get private key — memory first, SecureStore fallback
   */
  async getPrivateKey(): Promise<string | null> {
    if (cachedPrivateKey) return cachedPrivateKey;

    try {
      const val = await secureGet(SECURE_STORE_KEY);
      if (val) {
        cachedPrivateKey = val;
        return val;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Get mnemonic — memory first, SecureStore fallback
   */
  async getMnemonic(): Promise<string | null> {
    if (cachedMnemonic) return cachedMnemonic;

    try {
      const val = await secureGet(MNEMONIC_STORE_KEY);
      if (val) {
        cachedMnemonic = val;
        return val;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Pre-load keys from SecureStore into memory.
   * Call this early in the app lifecycle (e.g. after sign-in).
   */
  async warmup(): Promise<void> {
    if (!cachedPrivateKey) {
      try {
        const key = await secureGet(SECURE_STORE_KEY);
        if (key) cachedPrivateKey = key;
      } catch (_) {}
    }
    if (!cachedMnemonic) {
      try {
        const mnemonic = await secureGet(MNEMONIC_STORE_KEY);
        if (mnemonic) cachedMnemonic = mnemonic;
      } catch (_) {}
    }
  },

  /**
   * Clear in-memory cache + SecureStore (call on logout)
   */
  async clearAll(): Promise<void> {
    cachedPrivateKey = null;
    cachedMnemonic = null;
    try { await secureDel(SECURE_STORE_KEY); } catch (_) {}
    try { await secureDel(MNEMONIC_STORE_KEY); } catch (_) {}
  },

  /**
   * Clear in-memory cache only (without touching SecureStore)
   */
  clear(): void {
    cachedPrivateKey = null;
    cachedMnemonic = null;
  },

  /**
   * Check if keys are available (in memory)
   */
  hasKeys(): boolean {
    return !!(cachedPrivateKey || cachedMnemonic);
  },
};
