import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiDelete } from '../../services/api/client';

export function useAuthenticatedApi() {
  const { session } = useTurnkey();
  const token = session?.token;

  const get = useCallback(
    async (endpoint: string) => {
      if (!token) throw new Error('Not authenticated');
      return apiGet(endpoint, token);
    },
    [token],
  );

  const post = useCallback(
    async (endpoint: string, data?: any) => {
      if (!token) throw new Error('Not authenticated');
      return apiPost(endpoint, token, data);
    },
    [token],
  );

  const del = useCallback(
    async (endpoint: string) => {
      if (!token) throw new Error('Not authenticated');
      return apiDelete(endpoint, token);
    },
    [token],
  );

  return useMemo(() => ({ get, post, del }), [get, post, del]);
}
