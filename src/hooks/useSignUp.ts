import { useState, useCallback } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuth as useAuthContext } from "../contexts/AuthContext";
import { useSetupWallet } from "./useInitPrivateWallet";
import { CASH_WALLET_CONFIG } from "../constants/turnkey";
import type { WalletSetupChoice } from "../app/(auth)/WalletSetupScreen";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UseAuthFlowParams {
  email: string;
  pseudo: string;
  setStep: (step: 'email' | 'waiting') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setShowLogoAnimation: (show: boolean) => void;
}

type ScreenState = 'passkey' | 'walletSetup' | 'creatingWallet' | 'showMnemonic' | 'error';

interface PasskeyResult {
  success: boolean;
  sessionToken?: string;
  cashWallet?: string;
  error?: string;
}

interface WalletChoiceResult {
  success: boolean;
  user?: any;
  mnemonic?: string;
  error?: string;
}

export function useAuthFlow() {
  const { setUserData } = useAuthContext();
  const { signUpWithPasskey, refreshWallets } = useTurnkey();
  const setupWallet = useSetupWallet();

  const [screenState, setScreenState] = useState<ScreenState>('passkey');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [cashWallet, setCashWallet] = useState<string>('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingUser, setPendingUser] = useState<any>(null);

  /**
   * Step 1: Create passkey and cash wallet via Turnkey
   */
  const createPasskey = useCallback(async (email: string): Promise<PasskeyResult> => {
    try {
      const authResult = await signUpWithPasskey({
        createSubOrgParams: {
          subOrgName: `User ${email}`,
          customWallet: CASH_WALLET_CONFIG,
        },
      });

      const { sessionToken: token } = authResult;
      if (!token) throw new Error('No session token received from Turnkey');

      setSessionToken(token);

      const wallets = await refreshWallets();
      const cashAddr = wallets?.[0]?.accounts?.[0]?.address || '';
      if (!cashAddr) throw new Error('Failed to retrieve cash wallet address');

      setCashWallet(cashAddr);
      setScreenState('walletSetup');

      return { success: true, sessionToken: token, cashWallet: cashAddr };
    } catch (err: any) {
      if (__DEV__) console.error('Passkey creation failed:', err);
      const errorMsg = err?.message || 'Failed to create passkey';
      setError(errorMsg);
      setScreenState('error');
      return { success: false, error: errorMsg };
    }
  }, [signUpWithPasskey, refreshWallets]);

  /**
   * Step 2: Handle wallet setup choice and register with backend
   */
  const handleWalletChoice = useCallback(async (
    choice: WalletSetupChoice,
    email: string,
    pseudo: string,
    preAuthToken?: string
  ): Promise<WalletChoiceResult> => {
    setLoading(true);
    setScreenState('creatingWallet');

    try {
      let walletAddr = '';

      if (choice.mode === 'create') {
        const result = await setupWallet.handleCreateWallet();
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
        setGeneratedMnemonic(result.mnemonic);
      } else if (choice.mode === 'import') {
        const result = await setupWallet.handleImportWallet(choice.mnemonic);
        if (!result.success) throw new Error(result.error);
        walletAddr = result.walletAddress || '';
      }

      // Register with backend
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      };
      if (preAuthToken) {
        headers['X-Preauth-Token'] = preAuthToken;
      }

      const response = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          pseudo,
          cash_wallet: cashWallet,
          stealf_wallet: walletAddr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      if (!data.data?.user) throw new Error('Backend did not return user data');

      if (choice.mode === 'create') {
        // Show mnemonic for user backup
        setPendingUser(data.data.user);
        setScreenState('showMnemonic');
        setLoading(false);
        return {
          success: true,
          user: data.data.user,
          mnemonic: generatedMnemonic,
        };
      }

      // Import mode - no need to show mnemonic
      finishAuth(data.data.user, pseudo);
      return { success: true, user: data.data.user };

    } catch (err: any) {
      if (__DEV__) console.error('Wallet setup failed:', err);
      const errorMsg = err?.message || 'Failed to set up wallet';
      setError(errorMsg);
      setScreenState('error');
      setLoading(false);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [sessionToken, cashWallet, setupWallet, generatedMnemonic]);

  /**
   * Called after user confirms they saved their mnemonic
   */
  const handleMnemonicConfirmed = useCallback((pseudo: string) => {
    setGeneratedMnemonic(undefined);
    if (pendingUser) {
      finishAuth(pendingUser, pseudo);
    }
  }, [pendingUser]);

  /**
   * Complete authentication by setting user data
   */
  const finishAuth = (user: any, pseudo: string) => {
    setPendingUser(null);
    setUserData({
      email: user.email,
      username: user.username || user.pseudo || pseudo,
      cash_wallet: user.cash_wallet,
      stealf_wallet: user.stealf_wallet,
      subOrgId: user.subOrgId,
    });
  };

  /**
   * Resend magic link to user's email
   */
  const handleResendMagicLink = async (params: Pick<UseAuthFlowParams, 'email' | 'pseudo' | 'setLoading'> & { preAuthToken?: string }) => {
    const { email, pseudo, setLoading: setLoadingParam, preAuthToken } = params;

    setLoadingParam(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (preAuthToken) {
        headers['Authorization'] = `Bearer ${preAuthToken}`;
      }

      const response = await fetch(`${API_URL}/api/users/send-magic-link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, pseudo }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend magic link');
      }

      return { success: true, message: 'Magic link sent! Check your email.' };
    } catch (error: any) {
      if (__DEV__) console.error('Error resending magic link:', error);
      return { success: false, message: 'Failed to resend magic link' };
    } finally {
      setLoadingParam(false);
    }
  };

  /**
   * Check email/pseudo availability and send magic link
   * Returns preAuthToken for polling verification status
   */
  const handleEmailSubmit = async (params: Pick<UseAuthFlowParams, 'email' | 'pseudo' | 'setStep' | 'setLoading'>) => {
    const { email, pseudo, setStep, setLoading: setLoadingParam } = params;

    if (!email) {
      return { success: false, message: 'Email is required' };
    }

    if (!email.includes('@')) {
      return { success: false, message: 'Invalid email' };
    }

    if (!pseudo) {
      return { success: false, message: 'Pseudo is required' };
    }

    setLoadingParam(true);

    try {
      const response = await fetch(`${API_URL}/api/users/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pseudo }),
      });
      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      const data = await response.json();

      if (!data.canProceed) {
        const unavailable = data.unavailable || [];
        const errors = [];

        if (unavailable.includes(1)) {
          errors.push('This email is already registered');
        }
        if (unavailable.includes(2)) {
          errors.push('This pseudo is already registered');
        }
        if (unavailable.length === 0) {
          errors.push('User already exists!');
        }

        return { success: false, message: errors.join('\n') };
      }

      setStep('waiting');

      return {
        success: true,
        message: 'Check your email for the magic link!',
        preAuthToken: data.preAuthToken
      };

    } catch (error: any) {
      if (__DEV__) console.error('Error during email submit:', error);
      return { success: false, message: error?.message || 'An error occurred' };
    } finally {
      setLoadingParam(false);
    }
  };

  return {
    // State
    screenState,
    setScreenState,
    loading,
    error,
    generatedMnemonic,

    // Actions
    createPasskey,
    handleWalletChoice,
    handleMnemonicConfirmed,
    handleResendMagicLink,
    handleEmailSubmit,
  };
}
