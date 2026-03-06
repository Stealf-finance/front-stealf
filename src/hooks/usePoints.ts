import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedApi } from '../services/api/clientStealf';

export interface PointsHistoryEntry {
  action: 'private transfer' | 'standard deposit' | 'private deposit' | 'yield withdrawal' | 'daily bonus';
  points: number;
  totalAfter: number;
  createdAt: string;
}

export interface PointsData {
  points: number;
  history: PointsHistoryEntry[];
}

export function usePoints() {
  const api = useAuthenticatedApi();

  const { data, isLoading, refetch } = useQuery<PointsData>({
    queryKey: ['points'],
    queryFn: async () => {
      const res = await api.get('/api/points');
      return {
        points: res.points ?? 0,
        history: res.history ?? [],
      };
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  return {
    points: data?.points ?? 0,
    history: data?.history ?? [],
    isLoading,
    refresh: refetch,
  };
}
