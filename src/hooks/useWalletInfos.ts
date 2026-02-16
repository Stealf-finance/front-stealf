import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '../services/clientStealf';
import { createGetBalance, createGetTransactionsHistory } from '../services/fetchWalletInfos';
import { socketService } from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';

interface TokenBalance {
  tokenMint: string | null;
  tokenSymbol: string;
  tokenDecimals: number;
  balance: number;
  balanceUSD: number;
}

interface BalanceResponse {
  address: string;
  tokens: TokenBalance[];
  totalUSD: number;
}

interface Transaction {
  signature: string;
  amount: number;
  amountUSD: number;
  tokenMint: string | null;
  tokenSymbol: string;
  tokenDecimals: number;
  signatureURL: string;
  walletAddress: string;
  dateFormatted: string;
  status: string;
  type: 'sent' | 'received' | 'unknown';
  slot: number;
}

interface HistoryResponse {
  address: string;
  count: number;
  transactions: Transaction[];
}

export function useWalletInfos(address: string) {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { userData } = useAuth();

  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError
  } = useQuery<BalanceResponse>({
    queryKey: ['wallet-balance', address],
    queryFn: async () => {
      const result = await createGetBalance(api, address)();
      return result;
    },
    staleTime: 5000,
    refetchInterval: 10000,
    enabled: !!address,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery<HistoryResponse>({
    queryKey: ['wallet-history', address],
    queryFn: createGetTransactionsHistory(api, address),
    staleTime: 5000,
    refetchInterval: 15000,
    enabled: !!address,
  });

  useEffect(() => {
    if (!address)
        return;

    const walletsToSubscribe = [userData?.cash_wallet, userData?.stealf_wallet].filter(Boolean) as string[];

    walletsToSubscribe.forEach(walletAddress => {
      socketService.subscribeToWallet(walletAddress);
    });

    const handleBalanceUpdate = (data: { address: string; balance: number; timestamp: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['wallet-balance', data.address],
      });
    };

    const handleNewTransaction = (data: { address: string; transaction: Transaction; timestamp: string }) => {
      queryClient.invalidateQueries({
        queryKey: ['wallet-history', data.address],
      });
    };

    socketService.on('balance:updated', handleBalanceUpdate);
    socketService.on('transaction:new', handleNewTransaction);

    return () => {
      socketService.off('balance:updated', handleBalanceUpdate);
      socketService.off('transaction:new', handleNewTransaction);
      walletsToSubscribe.forEach(walletAddress => {
        socketService.unsubscribeFromWallet(walletAddress);
      });
    };
  }, [address, queryClient, userData?.cash_wallet, userData?.stealf_wallet]);

  return {
    balance: balanceData?.totalUSD,
    tokens: balanceData?.tokens || [],
    transactions: historyData?.transactions || [],
    count: historyData?.count || 0,
    isLoadingBalance,
    isLoadingHistory,
    isLoading: isLoadingBalance || isLoadingHistory,
    balanceError,
    historyError,
  };
}
