import * as SecureStore from 'expo-secure-store';

const USER_DATA_KEY = 'user_data';

export const authStorage = {
  /**
   * Save user data to SecureStore (encrypted)
   */
  async setUserData(userData: any): Promise<void> {
    try {
      if (userData === null || userData === undefined) {
        if (__DEV__) console.warn('Attempted to save null/undefined user data. Use clearUserData() instead.');
        return;
      }
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
      if (__DEV__) console.log('User data saved successfully in SecureStore');
    } catch (error) {
      console.error('Failed to save user data to SecureStore:', error);
    }
  },
  /**
   * Get user data from SecureStore
   */
  async getUserData(): Promise<any | null> {
    try {
      const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data from SecureStore:', error);
      return null;
    }
  },
  /**
   * Clear user data from SecureStore
   */
  async clearUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
      if (__DEV__) console.log('User data cleared from SecureStore');
    } catch (error) {
      console.error('Failed to clear user data from SecureStore:', error);
    }
  }
}