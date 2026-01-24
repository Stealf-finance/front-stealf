import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = 'user_data';

export const authStorage = {
  /**
   * Save user data to Async Storage
   */
  async setUserData(userData: any): Promise<void> {
    try {
      if (userData === null || userData === undefined) {
        console.warn('Attempted to save null/undefined user data. Use clearUserData() instead.');
        return;
      }
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      console.log('User data saved successfully in AsyncStorage');
    } catch (error) {
      console.error('Failed to save user data from AsyncStorage:', error);
    }
  },
  /**
   *  Get user data to Async Storage
   */
  async getUserData() : Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error){
      console.error('Failed to get user data from AsyncStorage:', error);
      return null;
    }
  },
  /**
   * Clear user data from AsyncStorage
   */
  async clearUserData(): Promise<void> {
    try{
      await AsyncStorage.removeItem(USER_DATA_KEY);
      console.log('User data cleared in AsyncStorage');
    } catch (error){
      console.error('Failed to clear user data from AsyncStorage:', error);
    }
  }
}