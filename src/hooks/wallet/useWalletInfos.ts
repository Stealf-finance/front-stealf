import { useEffect } from 'react';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '../../services/api/clientStealf';
import { createGetBalance, createGetTransactionsHistory } from '../../services/api/fetchWalletInfos';
import { socketService } from '../../services/real-time/socketService';

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

// ── Singleton socket listener ──
// Un seul handler global, peu importe combien de composants appellent useWalletInfos.
// Les subscriptions wallet sont gérées par AuthContext (seule autorité).

let globalQueryClient: QueryClient | null = null;
let listenersAttached = false;

function handleBalanceUpdate(data: { address: string; tokens: TokenBalance[]; totalUSD: number; timestamp: string }) {
  if (!globalQueryClient) return;
  if (__DEV__) console.log('[Socket] balance:updated', data.address, data.totalUSD);
  globalQueryClient.setQueryData<BalanceResponse>(['wallet-balance', data.address], {
    address: data.address,
    tokens: data.tokens,
    totalUSD: data.totalUSD,
  });
}

function handleNewTransaction(data: { address: string; transaction: Transaction; timestamp: string }) {
  if (!globalQueryClient) return;
  if (__DEV__) console.log('[Socket] transaction:new', data.address, data.transaction.type, data.transaction.amountUSD);
  globalQueryClient.setQueryData<HistoryResponse>(['wallet-history', data.address], (prev) => {
    const existing = prev?.transactions || [];
    const alreadyExists = existing.some(tx => tx.signature === data.transaction.signature);
    if (alreadyExists) return prev!;
    return {
      address: data.address,
      count: (prev?.count || 0) + 1,
      transactions: [data.transaction, ...existing],
    };
  });
}

function attachListeners(qc: QueryClient) {
  globalQueryClient = qc;
  if (listenersAttached) return;
  socketService.on('balance:updated', handleBalanceUpdate);
  socketService.on('transaction:new', handleNewTransaction);
  listenersAttached = true;
}

// Subscribe/unsubscribe gérés par AuthContext (seule autorité).
// Le hook ne fait qu'attacher les listeners React Query.

// ── Hook ──

export function useWalletInfos(address: string) {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

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
    if (!address) return;
    attachListeners(queryClient);
  }, [address, queryClient]);

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
