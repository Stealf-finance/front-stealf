import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPendingClaimsForCash } from '../transactions/useUmbra';

export function usePendingClaimsForCash() {
  const { userData, isWalletAuth } = useAuth();
  const cashWallet = userData?.cash_wallet || '';
  const stealfWallet = userData?.stealf_wallet || '';

  // Seeker (MWA) users: Umbra master-seed derivation triggers a Seed Vault
  // popup every 30s on the refetch interval. Disable until Umbra mainnet.
  const enabled = !!cashWallet && !!stealfWallet && !isWalletAuth;

  return useQuery({
    queryKey: ['pending-claims-cash', cashWallet],
    queryFn: async () => {
      const claims = await fetchPendingClaimsForCash(cashWallet);
      return claims;
    },
    enabled,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
