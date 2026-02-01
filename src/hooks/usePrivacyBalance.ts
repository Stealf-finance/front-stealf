import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socketService } from '../services/socketService';
import { useAuthenticatedApi } from '../services/clientStealf';
import { createGetPrivacyBalance } from '../services/fetchWalletInfos';
import { useAuth } from '../contexts/AuthContext';

interface PrivacyBalances {
  sol: number;
  usdc: number;
}

interface PrivacyBalanceResponse {
  privateBalance: PrivacyBalances;
}

export function usePrivacyBalance() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const [balances, setBalances] = useState<PrivacyBalances>({ sol: 0, usdc: 0 });

  const { data: privacyBalanceData, isLoading } = useQuery<PrivacyBalanceResponse>({
    queryKey: ['privacy-balance', userData?.cash_wallet],
    queryFn: createGetPrivacyBalance(api, userData?.cash_wallet || ''),
    staleTime: Infinity,
    enabled: !!userData?.cash_wallet,
  });

  useEffect(() => {
    if (privacyBalanceData?.privateBalance) {
      setBalances(privacyBalanceData.privateBalance);
    }
  }, [privacyBalanceData]);

  useEffect(() => {
    const handleBalanceUpdate = (balances: PrivacyBalances) => {
      setBalances(balances);

      queryClient.setQueryData(['privacy-balance', userData?.cash_wallet], {
        privateBalance: balances,
      });
    };

    socketService.on('privateBalanceUpdate', handleBalanceUpdate);

    return () => {
      socketService.off('privateBalanceUpdate', handleBalanceUpdate);
    };
  }, [queryClient, userData?.cash_wallet]);

  return {
    solBalance: balances.sol,
    usdcBalance: balances.usdc,
    totalUSD: balances.sol + balances.usdc,
    isLoading,
  };
}
