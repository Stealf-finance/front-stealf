import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { umbraApi, isError } from '../services/umbraApiClient';
import { PRICE_FEEDS, SOLANA_CONFIG } from '../config/umbra';
import { authStorage } from '../services/authStorage';
import type { DepositInfo, BalanceResponse, UmbraApiError } from '../types/umbra';

interface PrivateBalance {
  claimId: string;
  amount: number; // In SOL
  depositedAt: Date;
  depositTx: string;
}

interface UsePrivateBalanceReturn {
  balances: PrivateBalance[];
  totalBalance: number; // In USD
  totalBalanceSOL: number; // In SOL
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deposits: DepositInfo[]; // Raw deposit data from Umbra
}

export function usePrivateBalance(): UsePrivateBalanceReturn {
  const [balances, setBalances] = useState<PrivateBalance[]>([]);
  const [deposits, setDeposits] = useState<DepositInfo[]>([]);
  const [totalBalance, setTotalBalance] = useState(0); // USD
  const [totalBalanceSOL, setTotalBalanceSOL] = useState(0); // SOL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrivateBalances = async () => {

    setLoading(true);
    setError(null);

    try {
      console.log('[usePrivateBalance] Fetching on-chain balance for private wallet...');

      // Get private wallet address from storage
      const privateWalletAddress = await authStorage.getPrivateWalletAddress();

      if (!privateWalletAddress) {
        console.log('[usePrivateBalance] No private wallet address found');
        setBalances([]);
        setDeposits([]);
        setTotalBalance(0);
        setTotalBalanceSOL(0);
        setLoading(false);
        return;
      }

      console.log('[usePrivateBalance] Private wallet address:', privateWalletAddress);

      // Fetch on-chain balance directly from Solana RPC
      const connection = new Connection(SOLANA_CONFIG.RPC_URL, 'confirmed');
      const publicKey = new PublicKey(privateWalletAddress);

      const balanceLamports = await connection.getBalance(publicKey);
      const totalSOL = balanceLamports / LAMPORTS_PER_SOL;

      // Convert to USD using price feed
      const totalUSD = totalSOL * PRICE_FEEDS.SOL_USD;

      console.log('[usePrivateBalance] On-chain balance:', {
        totalSOL,
        totalUSD,
        lamports: balanceLamports,
      });

      // For now, we don't have individual deposit breakdown when fetching on-chain
      // So we create a single balance entry with the total
      const formattedBalances: PrivateBalance[] = totalSOL > 0 ? [{
        claimId: 'on-chain-balance',
        amount: totalSOL,
        depositedAt: new Date(),
        depositTx: 'on-chain',
      }] : [];

      setBalances(formattedBalances);
      setDeposits([]);
      setTotalBalanceSOL(totalSOL);
      setTotalBalance(totalUSD);

    } catch (err: any) {
      console.error('[usePrivateBalance] Error fetching on-chain balance:', err);
      setError(err.message || 'Failed to fetch private wallet balance');
      setBalances([]);
      setDeposits([]);
      setTotalBalance(0);
      setTotalBalanceSOL(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivateBalances();
  }, []);

  return {
    balances,
    totalBalance, // USD
    totalBalanceSOL, // SOL
    loading,
    error,
    refresh: fetchPrivateBalances,
    deposits, // Raw Umbra deposit data
  };
}
