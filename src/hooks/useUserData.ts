import { useState, useEffect } from 'react';
import { storageService } from '../services';
import type { UserData } from '../types';

export function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await storageService.getUserData();
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (data: Partial<UserData>) => {
    try {
      await storageService.saveUserData(data as UserData);
      setUserData((prev) => ({ ...prev, ...data } as UserData));
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const clearUserData = async () => {
    try {
      await storageService.clearAll();
      setUserData(null);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  return { userData, loading, updateUserData, clearUserData, reload: loadUserData };
}
