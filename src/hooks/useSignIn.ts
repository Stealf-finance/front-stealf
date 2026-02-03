import { useState } from 'react';
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useSetupWallet } from './useSetupWallet';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UserData {
  email: string;
  username: string;
  cash_wallet: string;
  stealf_wallet: string;
  subOrgId: string;
  coldWallet: boolean;
}

export function useSignIn() {
  const { loginWithPasskey, refreshWallets } = useTurnkey();
  const { setUserData } = useAuthContext();
  const setupWallet = useSetupWallet();

  const [loading, setLoading] = useState(false);
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  const [needsColdWalletImport, setNeedsColdWalletImport] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<UserData | null>(null);
  const [coldWalletImportError, setColdWalletImportError] = useState<string | null>(null);

  const signInWithPasskey = async () => {
    setLoading(true);
    setColdWalletImportError(null);

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
      console.log('Full API response:', JSON.stringify(data, null, 2));
      console.log('coldWallet raw value:', data.data?.user?.coldWallet);
      console.log('coldWallet type:', typeof data.data?.user?.coldWallet);

      if (!data.data?.user) {
        throw new Error('Backend did not return user data');
      }

      // Handle both boolean and string "true"
      const isColdWallet = data.data.user.coldWallet === true || data.data.user.coldWallet === 'true';
      console.log('isColdWallet resolved:', isColdWallet);

      const userData: UserData = {
        email: data.data.user.email,
        username: data.data.user.username || data.data.user.pseudo,
        cash_wallet: data.data.user.cash_wallet,
        stealf_wallet: data.data.user.stealf_wallet,
        subOrgId: data.data.user.subOrgId,
        coldWallet: isColdWallet,
      };

      // Check if user has cold wallet - need to import it first
      if (userData.coldWallet) {
        setPendingUserData(userData);
        setNeedsColdWalletImport(true);
        setLoading(false);
        return { success: true, needsColdWalletImport: true };
      }

      // No cold wallet - complete sign in
      setUserData(userData);
      
      setShowLogoAnimation(true);

      return { success: true };

    } catch (error: any) {
      console.error('Error during sign in:', error);

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
   * Import cold wallet using mnemonic phrase
   * Called after user enters their recovery phrase
   */
  const handleColdWalletImport = async (mnemonic: string) => {
    if (!pendingUserData) {
      return { success: false, error: 'No pending user data' };
    }

    setLoading(true);
    setColdWalletImportError(null);

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
      setNeedsColdWalletImport(false);
      setPendingUserData(null);
      setShowLogoAnimation(true);

      return { success: true };

    } catch (error: any) {
      console.error('Error importing cold wallet:', error);
      setColdWalletImportError(error?.message || 'Failed to import wallet');
      return {
        success: false,
        error: error?.message || 'Failed to import wallet'
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Skip cold wallet import - user can import later
   */
  const skipColdWalletImport = () => {
    if (!pendingUserData) return;

    setUserData(pendingUserData);
    setNeedsColdWalletImport(false);
    setPendingUserData(null);
    setShowLogoAnimation(true);
  };

  const handleAnimationComplete = () => {
    setShowLogoAnimation(false);
  };

  return {
    loading,
    showLogoAnimation,
    needsColdWalletImport,
    coldWalletImportError,
    signInWithPasskey,
    handleColdWalletImport,
    skipColdWalletImport,
    handleAnimationComplete,
  };
}
