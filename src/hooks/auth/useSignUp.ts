import { useState, useCallback } from "react";
import { useTurnkey, ClientState } from "@turnkey/react-native-wallet-kit";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth as useAuthContext } from "../../contexts/AuthContext";
import { CASH_WALLET_CONFIG } from "../../constants/turnkey";
import { apiGet } from "../../services/api/client";
import { BalanceResponseSchema, HistoryResponseSchema } from "../../services/api/schemas";

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

type ScreenState = 'passkey' | 'error';

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

export function useAuthFlow() {
  const { setUserData } = useAuthContext();
  const { signUpWithPasskey, refreshWallets, clientState } = useTurnkey();
  const queryClient = useQueryClient();
  const isClientReady = clientState === ClientState.Ready;

  const prefetchWalletData = useCallback((address: string, token: string) => {
    if (!address || !token) return;
    queryClient.prefetchQuery({
      queryKey: ['wallet-balance', address],
      queryFn: async () => BalanceResponseSchema.parse(await apiGet(`/api/wallet/balance/${address}`, token)),
      staleTime: Infinity,
    });
    queryClient.prefetchQuery({
      queryKey: ['wallet-history', address],
      queryFn: async () => HistoryResponseSchema.parse(await apiGet(`/api/wallet/history/${address}?limit=10`, token)),
      staleTime: Infinity,
    });
  }, [queryClient]);

  const [screenState, setScreenState] = useState<ScreenState>('passkey');
  const [error, setError] = useState('');
  const [errorRetryable, setErrorRetryable] = useState(false);

  /**
   * Create passkey and bank wallet via Turnkey
   */
  const createPasskey = useCallback(async (email: string, pseudo: string, preAuthToken?: string): Promise<PasskeyResult> => {
    try {
      if (!isClientReady) {
        const errorMsg = 'App is still starting up. Please try again in a moment.';
        setError(errorMsg);
        setErrorRetryable(true);
        setScreenState('error');
        return { success: false, error: errorMsg, retryable: true };
      }

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

      const wallets = await refreshWallets();
      const cashAddr = wallets?.[0]?.accounts?.[0]?.address || '';
      if (!cashAddr) throw new Error('Failed to retrieve cash wallet address');

      prefetchWalletData(cashAddr, token);

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
  }, [signUpWithPasskey, refreshWallets, isClientReady, prefetchWalletData]);

  const retryPasskey = useCallback((email: string, pseudo: string, preAuthToken?: string) => {
    setError('');
    setErrorRetryable(false);
    setScreenState('passkey');
    return createPasskey(email, pseudo, preAuthToken);
  }, [createPasskey]);

  /**
   * Complete authentication by setting user data
   */
  const finishAuth = (user: any, pseudo: string) => {
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
    error,
    errorRetryable,

    // Actions
    createPasskey,
    retryPasskey,
    handleResendMagicLink,
    handleEmailSubmit,
  };
}
