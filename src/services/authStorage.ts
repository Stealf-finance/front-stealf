import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/config';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  GRID_ADDRESS: 'gridAddress',
  EXPIRES_AT: 'token_expires_at',
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

      // Extract grid_address or grid_user_id (API returns grid_user_id)
      const gridAddress = data.user.grid_address || data.user.grid_user_id || '';

      console.log('💾 Saving Grid address to storage:', gridAddress);
      console.log('💾 Full user data:', JSON.stringify(data.user, null, 2));

      await AsyncStorage.multiSet([
        [KEYS.ACCESS_TOKEN, data.access_token],
        [KEYS.REFRESH_TOKEN, data.refresh_token],
        [KEYS.USER_DATA, JSON.stringify(data.user)],
        [KEYS.GRID_ADDRESS, gridAddress],
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
        console.log('🔄 Token expired or expiring soon, refreshing...');
        return await this.refreshToken();
      }

      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return null;
      }

      console.log('🔄 Refreshing access token...');

      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log('❌ Token refresh failed, need to re-login');
        return null;
      }

      const data = await response.json();

      // Save new tokens
      await this.saveAuth({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user: await this.getUserData(), // Reuse existing user data
      });

      console.log('✅ Token refreshed successfully');
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
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
   * Get Grid address
   */
  async getGridAddress(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.GRID_ADDRESS);
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
        KEYS.GRID_ADDRESS,
        KEYS.EXPIRES_AT,
      ]);
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  },
};
