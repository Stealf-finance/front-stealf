import { useState } from 'react';
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuth as useAuthContext } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useSignIn() {
  const { loginWithPasskey, refreshWallets } = useTurnkey();
  const { setUserData } = useAuthContext();

  const [loading, setLoading] = useState(false);

  const signInWithPasskey = async () => {
    setLoading(true);

    try {
      const authResult = await loginWithPasskey();
      const { sessionToken } = authResult;

      if (!sessionToken) {
        throw new Error('No session token received from Turnkey');
      }

      const refreshedWallets = await refreshWallets();
      const cashWalletData = refreshedWallets?.find(w => w.walletName?.includes('Cash'));
      const cash_wallet = cashWalletData?.accounts?.[0]?.address || '';

      if (!cash_wallet) {
        throw new Error('Failed to get wallet addresses');
      }

      const response = await fetch(`${API_URL}/api/users/${cash_wallet}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
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
        stealf_wallet: data.data.user.stealf_wallet,
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
    signInWithPasskey,
  };
}
