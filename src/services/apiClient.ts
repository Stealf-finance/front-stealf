import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { useCallback } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useAuthenticatedApi() {
  const { session } = useTurnkey();

  const get = useCallback(async (endpoint: string) => {
    const token = session?.token;

    if (!token) {
      throw new Error('Not authenticated');
    }

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
  }, [session?.token]);

  const post = useCallback(async (endpoint: string, data?: any) => {
    const token = session?.token;

    if (!token) {
      throw new Error('Not authenticated');
    }

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
    // Extract data from wrapper if it exists
    return result.data || result;
  }, [session?.token]);

  return { get, post };
}