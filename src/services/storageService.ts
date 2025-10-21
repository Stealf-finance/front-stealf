import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserData } from '../types';

export class StorageService {
  // User data
  async saveUserData(data: UserData): Promise<void> {
    const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
    await AsyncStorage.multiSet(
      entries.map(([key, value]) => [key, String(value)])
    );
  }

  async getUserData(): Promise<UserData> {
    const keys = ['email', 'username', 'gridAddress', 'gridUserId'];
    const values = await AsyncStorage.multiGet(keys);

    return values.reduce((acc, [key, value]) => {
      if (value) acc[key as keyof UserData] = value;
      return acc;
    }, {} as UserData);
  }

  async getGridAddress(): Promise<string | null> {
    return await AsyncStorage.getItem('gridAddress');
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  async saveAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', token);
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      'gridAddress',
      'gridUserId',
      'userEmail',
      'username',
      'authToken',
      'refreshToken',
      'encryptedAuthKey',
      'hpkePrivateKey',
      'hpkePublicKey',
    ]);
  }
}

export const storageService = new StorageService();
