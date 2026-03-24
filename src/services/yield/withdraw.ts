import { useState } from 'react';
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useAuth } from '../../contexts/AuthContext';
import { useAuthenticatedApi } from '../api/clientStealf';
import { getUserIdHash } from './deposit';
export function useYieldWithdraw() {
  const { userData } = useAuth();
  const api = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async (amount: number, savingsBalance?: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const subOrgId = userData?.subOrgId;
      const stealfWallet = userData?.stealf_wallet;
      if (!subOrgId || !stealfWallet) throw new Error('User not authenticated');

      if (savingsBalance != null && amount > savingsBalance) {
        throw new Error(`Insufficient yield balance. Available: ${savingsBalance.toFixed(4)} SOL`);
      }

      const body = {
        userId: subOrgId,
        amount: Math.floor(amount * LAMPORTS_PER_SOL),
        wallet: stealfWallet,
      };
      if (__DEV__) console.log('[useYieldWithdraw] body:', body);
      await api.post('/api/yield/withdraw', body);
    } catch (err: any) {
      console.error('[useYieldWithdraw] Error:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error };
}
