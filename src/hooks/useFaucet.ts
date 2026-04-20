import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from './api/useApi';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api/client';

export type WalletType = 'cash' | 'stealf';

export type WalletFaucetStatus = {
  canClaim: boolean;
  lastClaimAt: string | null;
  nextAvailableAt: string | null;
};

export type FaucetStatus = {
  amountLamports: number;
  cooldownHours: number;
  wallets: Record<WalletType, WalletFaucetStatus>;
};

export type FaucetClaimResponse = {
  signature: string;
  amountLamports: number;
  walletType: WalletType;
  nextAvailableAt: string;
};

const FAUCET_STATUS_KEY = ['faucet-status'] as const;

export function useFaucetStatus() {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();

  return useQuery<FaucetStatus>({
    queryKey: FAUCET_STATUS_KEY,
    queryFn: () => api.get('/api/faucet/status'),
    enabled: !!userData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useFaucetClaim() {
  const api = useAuthenticatedApi();
  const qc = useQueryClient();

  return useMutation<
    FaucetClaimResponse,
    ApiError,
    { wallet: string; walletType: WalletType }
  >({
    mutationFn: (body) => api.post('/api/faucet/claim', body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: FAUCET_STATUS_KEY });
      qc.invalidateQueries({ queryKey: ['wallet-balance', variables.wallet] });
    },
  });
}
