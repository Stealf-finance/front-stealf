import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPendingClaims } from '../transactions/useUmbra';

export function usePendingClaims() {
  const { userData } = useAuth();
  const wallet = userData?.stealf_wallet || '';

  return useQuery({
    queryKey: ['pending-claims', wallet],
    queryFn: async () => {
      const claims = await fetchPendingClaims();
      return claims;
    },
    enabled: !!wallet,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
