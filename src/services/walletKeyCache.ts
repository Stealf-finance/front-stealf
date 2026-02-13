import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_KEY = 'stealf_private_key';
const MNEMONIC_STORE_KEY = 'stealf_wallet_mnemonic';

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

    try { await SecureStore.deleteItemAsync(SECURE_STORE_KEY); } catch (_) {}
    await SecureStore.setItemAsync(SECURE_STORE_KEY, privateKey, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    if (mnemonic) {
      try { await SecureStore.deleteItemAsync(MNEMONIC_STORE_KEY); } catch (_) {}
      await SecureStore.setItemAsync(MNEMONIC_STORE_KEY, mnemonic, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
  },

  /**
   * Get private key — memory first, SecureStore fallback
   */
  async getPrivateKey(): Promise<string | null> {
    if (cachedPrivateKey) return cachedPrivateKey;

    try {
      const val = await SecureStore.getItemAsync(SECURE_STORE_KEY);
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
      const val = await SecureStore.getItemAsync(MNEMONIC_STORE_KEY);
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
        const key = await SecureStore.getItemAsync(SECURE_STORE_KEY);
        if (key) cachedPrivateKey = key;
      } catch (_) {}
    }
    if (!cachedMnemonic) {
      try {
        const mnemonic = await SecureStore.getItemAsync(MNEMONIC_STORE_KEY);
        if (mnemonic) cachedMnemonic = mnemonic;
      } catch (_) {}
    }
  },

  /**
   * Clear in-memory cache (call on logout)
   */
  clear(): void {
    cachedPrivateKey = null;
    cachedMnemonic = null;
  },

  /**
   * Check if keys are available (in memory or SecureStore)
   */
  hasKeys(): boolean {
    return !!(cachedPrivateKey || cachedMnemonic);
  },
};
