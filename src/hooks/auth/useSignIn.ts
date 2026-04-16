import { useState } from 'react';
import { useTurnkey, ClientState } from "@turnkey/react-native-wallet-kit";
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useAuthContext } from '../../contexts/AuthContext';
import { authStorage } from '../../services/auth/authStorage';
import { apiGet } from '../../services/api/client';
import { BalanceResponseSchema, HistoryResponseSchema } from '../../services/api/schemas';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useSignIn() {
  const { loginWithPasskey, refreshWallets, clientState } = useTurnkey();
  const { setUserData } = useAuthContext();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const isClientReady = clientState === ClientState.Ready;

  const signInWithPasskey = async (onPasskeySuccess?: () => void) => {
    if (!isClientReady) {
      return {
        success: false,
        message: 'Please wait',
        description: 'App is still starting up. Try again in a moment.',
      };
    }

    setLoading(true);

    try {
      const authResult = await loginWithPasskey();
      const { sessionToken } = authResult;

      onPasskeySuccess?.();

      if (!sessionToken) {
        throw new Error('No session token received from Turnkey');
      }

      const refreshedWallets = await refreshWallets();
      const cashWalletData = refreshedWallets?.find(w => w.walletName?.includes('Cash'));
      const cash_wallet = cashWalletData?.accounts?.[0]?.address || '';

      if (!cash_wallet) {
        throw new Error('Failed to get wallet addresses');
      }

      const localData = await authStorage.getUserData();
      const stealf_wallet = localData?.stealf_wallet || '';

      const prefetchWalletData = (address: string): Promise<unknown>[] => {
        if (!address) return [];
        queryClient.removeQueries({ queryKey: ['wallet-balance', address] });
        queryClient.removeQueries({ queryKey: ['wallet-history', address] });
        return [
          queryClient.prefetchQuery({
            queryKey: ['wallet-balance', address],
            queryFn: async () => BalanceResponseSchema.parse(await apiGet(`/api/wallet/balance/${address}`, sessionToken)),
            staleTime: Infinity,
          }),
          queryClient.prefetchQuery({
            queryKey: ['wallet-history', address],
            queryFn: async () => HistoryResponseSchema.parse(await apiGet(`/api/wallet/history/${address}?limit=10`, sessionToken)),
            staleTime: Infinity,
          }),
        ];
      };

      const userFetchPromise = fetch(`${API_URL}/api/users/${cash_wallet}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      const [response] = await Promise.all([
        userFetchPromise,
        ...prefetchWalletData(cash_wallet),
        ...prefetchWalletData(stealf_wallet),
      ]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();

      if (!data.data?.user) {
        throw new Error('Backend did not return user data');
      }

      setUserData({
        email: data.data.user.email,
        username: data.data.user.username || data.data.user.pseudo,
        cash_wallet: data.data.user.cash_wallet,
        stealf_wallet,
        subOrgId: data.data.user.subOrgId,
        points: data.data.user.points ?? 0,
      });

      return { success: true };

    } catch (error: any) {
      if (__DEV__) console.error('Error during sign in:', error);

      return {
        success: false,
        message: 'Sign In Failed',
        description: error?.message || 'Failed to sign in. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isClientReady,
    signInWithPasskey,
  };
}
