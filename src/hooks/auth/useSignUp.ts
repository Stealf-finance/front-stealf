import { useState, useCallback } from "react";
import { useTurnkey } from "@turnkey/react-native-wallet-kit";
import { useAuth as useAuthContext } from "../../contexts/AuthContext";
import { useSetupWallet } from "../wallet/useInitPrivateWallet";
import { CASH_WALLET_CONFIG } from "../../constants/turnkey";
import type { WalletSetupChoice } from "../../components/WalletSetup";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UseAuthFlowParams {
  email: string;
  pseudo: string;
  inviteCode?: string;
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
  retryable?: boolean;
}

const TURNKEY_KEYCHAIN_PREFIX = 'com.turnkey.keypair:';
const TURNKEY_ASYNC_STORAGE_PREFIX = '@turnkey/';

async function purgeTurnkeyKeychain(): Promise<void> {
  try {
    const Keychain = require('react-native-keychain');
    const services: string[] = await Keychain.getAllGenericPasswordServices();
    const turnkeyServices = services.filter((s) => s.startsWith(TURNKEY_KEYCHAIN_PREFIX));
    await Promise.all(
      turnkeyServices.map((service) =>
        Keychain.resetGenericPassword({ service }).catch(() => undefined)
      )
    );
  } catch (_) {
  }
}

async function purgeTurnkeyAsyncStorage(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys: string[] = await AsyncStorage.getAllKeys();
    const turnkeyKeys = allKeys.filter((k) => k.startsWith(TURNKEY_ASYNC_STORAGE_PREFIX));
    if (turnkeyKeys.length > 0) {
      await AsyncStorage.multiRemove(turnkeyKeys);
    }
  } catch (_) {
  }
}

function isRetryablePasskeyError(err: any): boolean {
  let current: any = err;
  for (let i = 0; i < 5 && current; i++) {
    const code = current?.error || current?.code;
    const msg = current?.message || '';
    if (code === 'RequestFailed' || code === 'UserCancelled') return true;
    if (code === 'E_CRYPTO_FAILED') return true;
    if (/no credentials|cancelled|canceled|timeout|timed out|failed to sign up with passkey|failed to delete unused key pair|network request failed|network request timed out|network error|empty key extracted|authentication tag verification failed/i.test(msg)) {
      return true;
    }
    current = current?.cause;
  }
  return false;
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
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [cashWallet, setCashWallet] = useState<string>('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | undefined>();
  const [pendingUser, setPendingUser] = useState<any>(null);

  /**
   * Create passkey and cash wallet via Turnkey
   */
  const createPasskey = useCallback(async (email: string, pseudo: string, preAuthToken?: string): Promise<PasskeyResult> => {
    try {
      await purgeTurnkeyAsyncStorage();
      await purgeTurnkeyKeychain();

      const safePseudo = pseudo.replace(/[^a-zA-Z0-9 \-_:/]/g, '').slice(0, 50);
      const authResult = await signUpWithPasskey({
        passkeyDisplayName: `Stealf - ${safePseudo}`,
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      if (preAuthToken) {
        headers['X-Preauth-Token'] = preAuthToken;
      }

      const response = await fetch(`${API_URL}/api/users/auth`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, pseudo, cash_wallet: cashAddr }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to authenticate with backend');
      }

      const data = await response.json();
      if (!data.data?.user) throw new Error('Backend did not return user data');

      finishAuth(data.data.user, pseudo);

      return { success: true, sessionToken: token, cashWallet: cashAddr };
    } catch (err: any) {
      if (__DEV__) {
        console.error('Passkey creation failed:', err);
        let current: any = err?.cause;
        let depth = 1;
        while (current && depth < 5) {
          console.error(`  cause[${depth}]:`, {
            code: current?.code || current?.error,
            message: current?.message,
          });
          current = current?.cause;
          depth++;
        }
      }
      const retryable = isRetryablePasskeyError(err);
      const causeMsg = err?.cause?.message || '';
      const topMsg = err?.message || '';
      const isNetwork = /network request failed|network request timed out|network error/i.test(causeMsg + topMsg);
      const isCryptoStore = err?.cause?.code === 'E_CRYPTO_FAILED' ||
                            /empty key extracted|authentication tag verification failed|failed to delete unused key pair/i.test(causeMsg + topMsg);
      const errorMsg = !retryable
        ? (topMsg || 'Failed to create passkey')
        : isNetwork
          ? 'Network error. Please check your connection and try again.'
          : isCryptoStore
            ? 'Device storage issue. Please restart the app and try again.'
            : 'Face ID was cancelled or timed out. Please try again.';
      setError(errorMsg);
      setErrorRetryable(retryable);
      setScreenState('error');
      return { success: false, error: errorMsg, retryable };
    }
  }, [signUpWithPasskey, refreshWallets]);

  const retryPasskey = useCallback((email: string, pseudo: string, preAuthToken?: string) => {
    setError('');
    setErrorRetryable(false);
    setScreenState('passkey');
    return createPasskey(email, pseudo, preAuthToken);
  }, [createPasskey]);

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
      points: user.points ?? 0,
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
  const handleEmailSubmit = async (params: Pick<UseAuthFlowParams, 'email' | 'pseudo' | 'inviteCode' | 'setStep' | 'setLoading'>) => {
    const { email, pseudo, inviteCode, setStep, setLoading: setLoadingParam } = params;

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
        body: JSON.stringify({ email, pseudo, inviteCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check availability');
      }

      const data = await response.json();

      if (!data.canProceed) {
        const messages: string[] = [];

        // Unavailable fields (1 = email, 2 = pseudo)
        const unavailable: number[] = data.unavailable || [];
        if (unavailable.includes(1)) messages.push('This email is already taken.');
        if (unavailable.includes(2)) messages.push('This username is already taken.');

        // Validation errors from backend (e.g. invalid pseudo format)
        const apiErrors: { field: string; message: string }[] = data.errors || [];
        for (const e of apiErrors) messages.push(e.message);

        if (messages.length === 0) messages.push('Unable to create account.');

        return { success: false, message: messages.join('\n') };
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
    errorRetryable,
    generatedMnemonic,

    // Actions
    createPasskey,
    retryPasskey,
    handleWalletChoice,
    handleMnemonicConfirmed,
    handleResendMagicLink,
    handleEmailSubmit,
  };
}
