import { useQuery } from '@tanstack/react-query';

interface AppStats {
  totalUsers: number;
  totalTransactions: number;
  dailyLogins: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface UseAppStatsReturn {
  totalUsers: number;
  totalTransactions: number;
  dailyLogins: number;
  isLoading: boolean;
}

export function useAppStats(): UseAppStatsReturn {
  const { data, isLoading } = useQuery<AppStats>({
    queryKey: ['app-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/stats`);
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      return res.json() as Promise<AppStats>;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  return {
    totalUsers: data?.totalUsers ?? 0,
    totalTransactions: data?.totalTransactions ?? 0,
    dailyLogins: data?.dailyLogins ?? 0,
    isLoading,
  };
}
