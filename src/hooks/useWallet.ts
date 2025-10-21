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
      // Get token
      const token = await authStorage.getAccessToken();
      if (!token) {
        console.error('❌ useWallet - No token found');
        setLoading(false);
        return;
      }
      console.log('✅ useWallet - Token found, length:', token.length);

      // Essayer d'abord depuis le JWT (plus rapide)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const solanaWallet = payload.solana_wallet;

          if (solanaWallet) {
            console.log('✅ Loaded Solana wallet from JWT:', solanaWallet);
            setWalletAddress(solanaWallet);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('⚠️ Could not read wallet from JWT, fetching from API...');
      }

      // Si pas dans le JWT, fetch depuis l'API
      console.log('🔍 Fetching wallet from API...');
      const response = await fetch(`${API_URL}/api/v1/wallet/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const solanaWallet = data.solana_wallet || data.solana_public_key;

        if (solanaWallet) {
          console.log('✅ Loaded Solana wallet from API:', solanaWallet);
          setWalletAddress(solanaWallet);
        } else {
          console.error('❌ No solana_wallet in API response');
        }
      } else {
        console.error('❌ Failed to fetch wallet from API:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  return { walletAddress, loading, reload: loadWalletAddress };
}
