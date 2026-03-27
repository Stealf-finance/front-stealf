import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function getAuthToken(isWalletAuth: boolean, turnkeyToken?: string): Promise<string> {
  if (isWalletAuth) {
    const walletToken = await SecureStore.getItemAsync('wallet_session_token');
    if (walletToken) return walletToken;
  }
  if (turnkeyToken) return turnkeyToken;
  throw new Error('Not authenticated');
}

export function useAuthenticatedApi() {
  const { session } = useTurnkey();
  const { isWalletAuth } = useAuth();

  const get = useCallback(async (endpoint: string) => {
    const token = await getAuthToken(isWalletAuth, session?.token);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const result = await response.json();

    return result.data || result;
  }, [session?.token, isWalletAuth]);

  const post = useCallback(async (endpoint: string, data?: any) => {
    const token = await getAuthToken(isWalletAuth, session?.token);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const result = await response.json();

    return result.data || result;
  }, [session?.token, isWalletAuth]);

  const del = useCallback(async (endpoint: string) => {
    const token = await getAuthToken(isWalletAuth, session?.token);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const result = await response.json();

    return result.data || result;
  }, [session?.token, isWalletAuth]);

  return { get, post, del };
}
