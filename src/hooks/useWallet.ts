import { useState, useEffect } from 'react';
import { authStorage } from '../services/authStorage';
import { API_URL } from '../config/config';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    console.log('🚀 useWallet - loadWalletAddress called');
    try {
      // Get grid address directly from storage (saved during login/register)
      const gridAddress = await authStorage.getGridAddress();

      if (gridAddress) {
        console.log('✅ Loaded Grid address from storage:', gridAddress);
        console.log('⚠️ This is the GRID smart account address, NOT a standard Solana wallet address');
        setWalletAddress(gridAddress);
        setLoading(false);
        return;
      }

      // Fallback: Try to get from user data
      const userData = await authStorage.getUserData();
      const walletFromUserData = userData?.grid_address || userData?.address;

      if (walletFromUserData) {
        console.log('✅ Loaded wallet from user data:', walletFromUserData);
        setWalletAddress(walletFromUserData);
        setLoading(false);
        return;
      }

      console.error('❌ No wallet address found in storage or user data');
    } catch (error) {
      console.error('❌ Error loading wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  return { walletAddress, loading, reload: loadWalletAddress };
}
