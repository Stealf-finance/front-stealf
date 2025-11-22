import { useState, useEffect } from 'react';
import { authStorage } from '../services/authStorage';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    console.log('🚀 useWallet - loadWalletAddress called');
    try {
      // Get Solana address directly from storage (saved during login/register)
      const solanaAddress = await authStorage.getSolanaAddress();

      if (solanaAddress) {
        console.log('✅ Loaded Solana address from storage:', solanaAddress);
        setWalletAddress(solanaAddress);
        setLoading(false);
        return;
      }

      // Fallback: Try to get from user data
      const userData = await authStorage.getUserData();
      const walletFromUserData = userData?.solana_address;

      if (walletFromUserData) {
        console.log('✅ Loaded Solana address from user data:', walletFromUserData);
        setWalletAddress(walletFromUserData);
        setLoading(false);
        return;
      }

      console.error('❌ No Solana wallet address found in storage or user data');
    } catch (error) {
      console.error('❌ Error loading wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  return { walletAddress, loading, reload: loadWalletAddress };
}
