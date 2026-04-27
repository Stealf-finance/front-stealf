import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiGet, apiPost, apiDelete } from '../../services/api/client';
import { useAuth } from '../../contexts/AuthContext';
import { WALLET_SESSION_TOKEN_KEY } from '../../constants/walletAuth';

async function resolveToken(
  isWalletAuth: boolean,
  turnkeyToken?: string,
): Promise<string | null> {
  if (isWalletAuth) {
    return SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY);
  }
  return turnkeyToken ?? null;
}

export function useAuthenticatedApi() {
  const { session } = useTurnkey();
  const { isWalletAuth } = useAuth();
  const turnkeyToken = session?.token;

  const get = useCallback(
    async (endpoint: string) => {
      const token = await resolveToken(isWalletAuth, turnkeyToken);
      if (!token) throw new Error('Not authenticated');
      return apiGet(endpoint, token);
    },
    [isWalletAuth, turnkeyToken],
  );

  const post = useCallback(
    async (endpoint: string, data?: any) => {
      const token = await resolveToken(isWalletAuth, turnkeyToken);
      if (!token) throw new Error('Not authenticated');
      return apiPost(endpoint, token, data);
    },
    [isWalletAuth, turnkeyToken],
  );

  const del = useCallback(
    async (endpoint: string) => {
      const token = await resolveToken(isWalletAuth, turnkeyToken);
      if (!token) throw new Error('Not authenticated');
      return apiDelete(endpoint, token);
    },
    [isWalletAuth, turnkeyToken],
  );

  return useMemo(() => ({ get, post, del }), [get, post, del]);
}
