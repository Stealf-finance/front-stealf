import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '../services/apiClient';
import { createGetBalance, createGetTransactionsHistory } from '../services/fetchWalletInfos';
import { socketService } from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';

interface BalanceResponse {
  address: string;
  balance: number;
}

interface Transaction {
  signature: string;
  amountUSD: number;
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
    queryFn: createGetBalance(api, address),
    staleTime: Infinity,
    enabled: !!address,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery<HistoryResponse>({
    queryKey: ['wallet-history', address],
    queryFn: createGetTransactionsHistory(api, address),
    staleTime: Infinity,
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
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔔 WEBHOOK REÇU: balance:updated');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📍 Wallet:', data.address);
      console.log('💰 New Balance:', data.balance);
      console.log('⏰ Timestamp:', data.timestamp);
      console.log('🎯 Current wallet:', address);
      console.log('✅ Match:', data.address === address ? 'OUI' : 'NON');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Update cache for ANY wallet that received an update, not just the current one
      queryClient.setQueryData(['wallet-balance', data.address], {
        address: data.address,
        balance: data.balance
      });
    };

    const handleNewTransaction = (data: { address: string; transaction: Transaction; timestamp: string }) => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔔 WEBHOOK REÇU: transaction:new');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📍 Wallet:', data.address);
      console.log('💸 Transaction:');
      console.log('   - Signature:', data.transaction.signature);
      console.log('   - Amount:', data.transaction.amountUSD, 'USD');
      console.log('   - Type:', data.transaction.type);
      console.log('   - Status:', data.transaction.status);
      console.log('⏰ Timestamp:', data.timestamp);
      console.log('🎯 Current wallet:', address);
      console.log('✅ Match:', data.address === address ? 'OUI' : 'NON');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Invalidate history for ANY wallet that received a transaction, not just the current one
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
    balance: balanceData?.balance,
    transactions: historyData?.transactions || [],
    count: historyData?.count || 0,
    isLoadingBalance,
    isLoadingHistory,
    isLoading: isLoadingBalance || isLoadingHistory,
    balanceError,
    historyError,
  };
}