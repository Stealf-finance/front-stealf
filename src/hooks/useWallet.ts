import { useState, useEffect } from 'react';
import { authStorage } from '../services/authStorage';
import solanaWalletService from '../services/solanaWalletService';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    console.log('🚀 useWallet - loadWalletAddress called');
    try {
      // IMPORTANT: First get user email to ensure we use the right storage key
      const userData = await authStorage.getUserData();
      const email = userData?.email;

      if (!email) {
        console.log('⚠️ useWallet: No user email found, user not logged in');
        setLoading(false);
        return;
      }

      // Set email in solanaWalletService to ensure correct storage key
      solanaWalletService.setCurrentUserEmail(email);

      // Get Solana address directly from storage (saved during login/register)
      const solanaAddress = await authStorage.getSolanaAddress(email);

      if (solanaAddress) {
        console.log('✅ Loaded Solana address from storage:', solanaAddress);
        setWalletAddress(solanaAddress);
        setLoading(false);
        return;
      }

      // Fallback: Try to get from user data
      const walletFromUserData = userData?.solana_address;

      if (walletFromUserData) {
        console.log('✅ Loaded Solana address from user data:', walletFromUserData);
        setWalletAddress(walletFromUserData);
        setLoading(false);
        return;
      }

      // Fallback: Try to load from server
      console.log('🔄 Trying to load wallet from server...');
      const keypair = await solanaWalletService.loadWallet();
      if (keypair) {
        const address = keypair.publicKey.toBase58();
        console.log('✅ Loaded Solana address from server:', address);
        setWalletAddress(address);
        // Save to local storage for next time
        await authStorage.saveSolanaAddress(address, email);
      } else {
        console.error('❌ No Solana wallet address found anywhere');
      }
    } catch (error) {
      console.error('❌ Error loading wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  return { walletAddress, loading, reload: loadWalletAddress };
}
