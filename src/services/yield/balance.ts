import { useAuth } from "../../contexts/AuthContext";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "../solana/kit";
import { socketService } from "../real-time/socketService";
import { getUserIdHash } from "./deposit";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface YieldBalanceData {
  balanceLamports: string;
  balanceJitosol: number;
  balanceSol: number;
  rate: number;
  apy: number;
  timestamp: string;
}

// Singleton socket listener — updates React Query cache globally
let yieldHandler: ((data: YieldBalanceData) => void) | null = null;

export function registerYieldSocketListener(queryClient: ReturnType<typeof useQueryClient>, subOrgId: string) {
  // Always detach first to avoid duplicates, then re-attach
  if (yieldHandler) {
    socketService.off('yield:balance-updated', yieldHandler);
  }

  yieldHandler = (data: YieldBalanceData) => {
    if (__DEV__) console.log('[yield] balance-updated received:', data);
    queryClient.setQueryData(['yield-balance', subOrgId], Number(data.balanceLamports) / LAMPORTS_PER_SOL);
    queryClient.setQueryData(['yield-stats'], { rate: data.rate, apy: data.apy });
  };

  socketService.on('yield:balance-updated', yieldHandler);
}

export function unregisterYieldSocketListener() {
  if (yieldHandler) {
    socketService.off('yield:balance-updated', yieldHandler);
    yieldHandler = null;
  }
}

// Prefetch at login — called from AuthContext with raw token
export async function prefetchYieldData(queryClient: QueryClient, subOrgId: string, token: string) {
  const userIdHash = getUserIdHash(subOrgId).toString('hex');

  try {
    const [balanceRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/api/yield/balance/${userIdHash}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      }),
      fetch(`${API_URL}/api/yield/stats`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      }),
    ]);

    if (balanceRes.ok) {
      const balanceJson = await balanceRes.json();
      const balanceData = balanceJson.data || balanceJson;
      if (__DEV__) console.log('[prefetchYield] balance:', balanceData);
      queryClient.setQueryData(['yield-balance', subOrgId], Number(balanceData.balanceLamports) / LAMPORTS_PER_SOL);
    }

    if (statsRes.ok) {
      const statsJson = await statsRes.json();
      const statsData = statsJson.data || statsJson;
      if (__DEV__) console.log('[prefetchYield] stats:', statsData);
      queryClient.setQueryData(['yield-stats'], { rate: statsData.rate, apy: statsData.apy });
    }
  } catch (err) {
    if (__DEV__) console.error('[prefetchYield] error:', err);
  }
}

export function useYieldBalance() {
  const { userData } = useAuth();
  const subOrgId = userData?.subOrgId;

  return useQuery<number>({
    queryKey: ['yield-balance', subOrgId],
    queryFn: () => Promise.resolve(0),
    enabled: false,
    staleTime: Infinity,
  });
}

export function useYieldStats() {
  return useQuery<{ rate: number; apy: number }>({
    queryKey: ['yield-stats'],
    queryFn: () => Promise.resolve({ rate: 0, apy: 0 }),
    enabled: false,
    staleTime: Infinity,
  });
}

export function useInvalidateYieldBalance() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['yield-balance'] });
}
