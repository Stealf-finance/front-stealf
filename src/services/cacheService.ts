import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service to manage cache invalidation
 */
class CacheService {
  /**
   * Clear all transaction and balance caches for a wallet
   */
  async clearWalletCache(walletAddress: string) {
    try {
      const keys = [
        `transactions_cache_${walletAddress}`,
        `balance_cache_${walletAddress}`,
      ];

      await AsyncStorage.multiRemove(keys);
      console.log('🗑️ Cache cleared for wallet:', walletAddress);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith('transactions_cache_') ||
        key.startsWith('balance_cache_')
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('🗑️ Cleared all transaction and balance caches');
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}

export const cacheService = new CacheService();
