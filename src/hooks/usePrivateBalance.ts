import { useState, useEffect } from 'react';
import { authStorage } from '../services/authStorage';
import { BRIDGE_URL } from '../config/config';

interface PrivateWalletBalance {
  walletId: string;
  walletName: string;
  balance: number; // in SOL
  encrypted: boolean;
}

export function usePrivateBalance(userId: string | null) {
  const [balances, setBalances] = useState<PrivateWalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (userId) {
      loadPrivateBalances();
    }
  }, [userId]);

  const loadPrivateBalances = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Load balances for privacy_1 and yield_1
      const wallets = [
        { id: 'privacy_1', name: 'Privacy 1' },
        { id: 'yield_1', name: 'Yield 1' },
      ];

      const balancePromises = wallets.map(async (wallet) => {
        try {
          const response = await fetch(
            `${BRIDGE_URL}/arcium/wallets/${userId}/${wallet.id}/balance-total`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log(`💰 ${wallet.name} balance:`, data.balance, 'SOL');
            return {
              walletId: wallet.id,
              walletName: wallet.name,
              balance: data.balance || 0,
              encrypted: false,
            };
          }
        } catch (err) {
          console.warn(`Failed to load balance for ${wallet.name}:`, err);
        }

        return {
          walletId: wallet.id,
          walletName: wallet.name,
          balance: 0,
          encrypted: false,
        };
      });

      const results = await Promise.all(balancePromises);
      setBalances(results);
    } catch (err: any) {
      console.error('Error loading private balances:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalBalance = () => {
    return balances.reduce((sum, wallet) => sum + wallet.balance, 0);
  };

  return {
    balances,
    totalBalance: getTotalBalance(),
    loading,
    error,
    refresh: loadPrivateBalances,
  };
}
