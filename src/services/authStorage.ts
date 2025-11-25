import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SOLANA_ADDRESS: 'solanaAddress', // Remplace GRID_ADDRESS
  EXPIRES_AT: 'token_expires_at',
  PRIVATE_WALLET_SECRET_KEY: 'private_wallet_secret_key',
  PRIVATE_WALLET_ADDRESS: 'private_wallet_address',
};

// Helper to create user-specific storage key
const getUserSpecificKey = (baseKey: string, email: string): string => {
  const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseKey}_${safeEmail}`;
};

export const authStorage = {
  /**
   * Save auth tokens and user data
   */
  async saveAuth(data: {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
    user: any;
  }): Promise<void> {
    try {
      const expiresAt = Date.now() + (data.expires_in * 1000);

      // Extract solana_address from user data
      const solanaAddress = data.user.solana_address || '';

      console.log('💾 Saving Solana address to storage:', solanaAddress);
      console.log('💾 Full user data:', JSON.stringify(data.user, null, 2));

      await AsyncStorage.multiSet([
        [KEYS.ACCESS_TOKEN, data.access_token],
        [KEYS.REFRESH_TOKEN, data.refresh_token],
        [KEYS.USER_DATA, JSON.stringify(data.user)],
        [KEYS.SOLANA_ADDRESS, solanaAddress],
        [KEYS.EXPIRES_AT, expiresAt.toString()],
      ]);

      console.log('✅ Auth data saved to storage');
    } catch (error) {
      console.error('Failed to save auth:', error);
    }
  },

  /**
   * Get access token (auto-refresh if expired)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
      const expiresAt = await AsyncStorage.getItem(KEYS.EXPIRES_AT);

      if (!token || !expiresAt) {
        return null;
      }

      // Check if expired
      const now = Date.now();
      const expires = parseInt(expiresAt);

      if (now >= expires - (5 * 60 * 1000)) { // Refresh 5 min before expiry
        console.log('⚠️ Token expired or expiring soon');
        return null; // Grid SDK gère le refresh automatiquement
      }

      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },


  /**
   * Get user data
   */
  async getUserData(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  },

  /**
   * Get Solana wallet address (user-specific)
   */
  async getSolanaAddress(email?: string): Promise<string | null> {
    const userEmail = email || (await this.getUserData())?.email;
    if (!userEmail) {
      console.warn('⚠️ getSolanaAddress: No email provided or found');
      return null;
    }
    const key = getUserSpecificKey(KEYS.SOLANA_ADDRESS, userEmail);
    return await AsyncStorage.getItem(key);
  },

  /**
   * Save Solana wallet address (user-specific)
   */
  async saveSolanaAddress(address: string, email?: string): Promise<void> {
    try {
      const userEmail = email || (await this.getUserData())?.email;
      if (!userEmail) {
        console.error('❌ saveSolanaAddress: No email provided or found');
        return;
      }
      const key = getUserSpecificKey(KEYS.SOLANA_ADDRESS, userEmail);
      await AsyncStorage.setItem(key, address);
      console.log('💾 Solana address saved for', userEmail, ':', address);
    } catch (error) {
      console.error('Failed to save Solana address:', error);
    }
  },

  /**
   * Save Private Wallet address (user-specific)
   */
  async savePrivateWalletAddress(address: string, email?: string): Promise<void> {
    try {
      const userEmail = email || (await this.getUserData())?.email;
      if (!userEmail) {
        console.error('❌ savePrivateWalletAddress: No email provided or found');
        return;
      }
      const key = getUserSpecificKey(KEYS.PRIVATE_WALLET_ADDRESS, userEmail);
      await AsyncStorage.setItem(key, address);
      console.log('💾 Private wallet address saved for', userEmail, ':', address);
    } catch (error) {
      console.error('Failed to save private wallet address:', error);
    }
  },

  /**
   * Get Private Wallet address (user-specific)
   */
  async getPrivateWalletAddress(email?: string): Promise<string | null> {
    const userEmail = email || (await this.getUserData())?.email;
    if (!userEmail) {
      console.warn('⚠️ getPrivateWalletAddress: No email provided or found');
      return null;
    }
    const key = getUserSpecificKey(KEYS.PRIVATE_WALLET_ADDRESS, userEmail);
    return await AsyncStorage.getItem(key);
  },

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  },

  /**
   * Clear all auth data (logout)
   */
  async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.ACCESS_TOKEN,
        KEYS.REFRESH_TOKEN,
        KEYS.USER_DATA,
        KEYS.SOLANA_ADDRESS,
        KEYS.EXPIRES_AT,
      ]);
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  },
};
