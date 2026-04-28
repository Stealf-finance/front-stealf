import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPendingClaims } from '../transactions/useUmbra';

export function usePendingClaims() {
  const { userData, isWalletAuth } = useAuth();
  const wallet = userData?.stealf_wallet || '';

  return useQuery({
    queryKey: ['pending-claims', wallet],
    queryFn: async () => {
      const claims = await fetchPendingClaims();
      return claims;
    },
    // Seeker (MWA) users: Umbra needs signMessage to derive its master seed,
    // which on Seed Vault always pops a fingerprint dialog. Disabled until
    // Umbra mainnet ships and we can revisit the auth-token persistence story.
    enabled: !!wallet && !isWalletAuth,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
