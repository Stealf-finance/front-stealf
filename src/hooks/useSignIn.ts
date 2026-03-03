import { useState } from 'react';
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useSetupWallet } from './useInitPrivateWallet';
import { walletKeyCache } from '../services/walletKeyCache';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UserData {
  email: string;
  username: string;
  cash_wallet: string;
  stealf_wallet: string;
  subOrgId: string;
}

export function useSignIn() {
  const { loginWithPasskey, refreshWallets } = useTurnkey();
  const { setUserData } = useAuthContext();
  const setupWallet = useSetupWallet();

  const [loading, setLoading] = useState(false);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const [needsSeedImport, setNeedsSeedImport] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<UserData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const signInWithPasskey = async () => {
    setLoading(true);
    setImportError(null);

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

      const userData: UserData = {
        email: data.data.user.email,
        username: data.data.user.username || data.data.user.pseudo,
        cash_wallet: data.data.user.cash_wallet,
        subOrgId: data.data.user.subOrgId,
      };

      // Load wallet keys from SecureStore into memory cache
      await walletKeyCache.warmup();
      const hasKey = await walletKeyCache.getPrivateKey();
      const hasMnemonic = walletKeyCache.getMnemonic();

      if (hasKey || hasMnemonic) {
        setUserData(userData);
        setShowLogoAnimation(true);
        return { success: true };
      }

      // No local key - prompt user to import seed phrase
      setPendingUserData(userData);
      setNeedsSeedImport(true);
      setLoading(false);
      return { success: true, needsSeedImport: true };

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

  /**
   * Import wallet using mnemonic phrase
   * Called after user enters their recovery phrase
   */
  const handleSeedImport = async (mnemonic: string) => {
    if (!pendingUserData) {
      return { success: false, error: 'No pending user data' };
    }

    setLoading(true);
    setImportError(null);

    try {
      const result = await setupWallet.handleImportWallet(mnemonic);

      if (!result.success) {
        throw new Error(result.error || 'Failed to import wallet');
      }

      // Verify imported wallet matches expected stealf_wallet
      if (result.walletAddress !== pendingUserData.stealf_wallet) {
        throw new Error('Imported wallet does not match your registered privacy wallet');
      }

      // Complete sign in
      setUserData(pendingUserData);
      setNeedsSeedImport(false);
      setPendingUserData(null);
      setShowLogoAnimation(true);

      return { success: true };

    } catch (error: any) {
      if (__DEV__) console.error('Error importing wallet:', error);
      setImportError(error?.message || 'Failed to import wallet');
      return {
        success: false,
        error: error?.message || 'Failed to import wallet'
      };
    } finally {
      setLoading(false);
    }
  };

  const cancelSeedImport = () => {
    setNeedsSeedImport(false);
    setPendingUserData(null);
    setImportError(null);
  };

  const handleAnimationComplete = () => {
    setShowLogoAnimation(false);
  };

  return {
    loading,
    showLogoAnimation,
    needsSeedImport,
    importError,
    signInWithPasskey,
    handleSeedImport,
    cancelSeedImport,
    handleAnimationComplete,
  };
}
