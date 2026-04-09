
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_KEY = 'stealf_private_key';

const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.stealf.wallet',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

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
 * In-memory cache for the signing key with TTL.
 */
const TTL_MS = 15 * 60 * 1000;

let cachedPrivateKey: string | null = null;
let cachedMnemonic: string | null = null;
let expiresAt: number = 0;

function isExpired(): boolean {
  return Date.now() >= expiresAt;
}

function refreshTTL(): void {
  expiresAt = Date.now() + TTL_MS;
}

export const walletKeyCache = {
  /**
   * Store signing key in Keychain + RAM, mnemonic in RAM only.
   */
  async store(privateKey: string, mnemonic?: string): Promise<void> {
    cachedPrivateKey = privateKey;
    if (mnemonic) cachedMnemonic = mnemonic;
    refreshTTL();

    await secureSet(SECURE_STORE_KEY, privateKey);
  },

  /**
   * Get private key — RAM (if not expired) → Keychain fallback.
   */
  async getPrivateKey(): Promise<string | null> {
    if (cachedPrivateKey && !isExpired()) return cachedPrivateKey;

    try {
      const val = await secureGet(SECURE_STORE_KEY);
      if (val) {
        cachedPrivateKey = val;
        refreshTTL();
        return val;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Get mnemonic — RAM only (never persisted), respects TTL.
   */
  getMnemonic(): string | null {
    if (cachedMnemonic && !isExpired()) return cachedMnemonic;
    return null;
  },

  /**
   * Refresh the TTL after a successful signing operation.
   */
  touch(): void {
    if (cachedPrivateKey) refreshTTL();
  },

  /**
   * Pre-load signing key from Keychain into RAM.
   * Call early (e.g. after sign-in) before state transitions.
   */
  async warmup(): Promise<void> {
    if (!cachedPrivateKey) {
      try {
        const key = await secureGet(SECURE_STORE_KEY);
        if (key) {
          cachedPrivateKey = key;
          refreshTTL();
        }
      } catch (_) {}
    }
  },

  /**
   * Clear RAM + Keychain (logout).
   */
  async clearAll(): Promise<void> {
    cachedPrivateKey = null;
    cachedMnemonic = null;
    expiresAt = 0;
    try { await secureDel(SECURE_STORE_KEY); } catch (_) {}
  },

  /**
   * Clear RAM only.
   */
  clear(): void {
    cachedPrivateKey = null;
    cachedMnemonic = null;
    expiresAt = 0;
  },

  /**
   * Whether a signing key is available in RAM (and not expired).
   */
  hasKeys(): boolean {
    return !!(cachedPrivateKey && !isExpired());
  },
};
