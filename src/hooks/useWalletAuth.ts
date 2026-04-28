import { useState, useCallback } from 'react';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import {
  AUTH_METHOD_KEY,
  MWA_AUTH_TOKEN_KEY,
  MWA_WALLET_ADDRESS_KEY,
  WALLET_SESSION_TOKEN_KEY,
} from '../constants/walletAuth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STEALF_IDENTITY = {
  name: 'Stealf',
  uri: 'https://stealf.xyz' as `${string}://${string}`,
  icon: 'favicon.ico' as const,
};

const SOLANA_CHAIN = (
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL?.includes('devnet') ? 'solana:devnet' : 'solana:mainnet'
) as 'solana:devnet' | 'solana:mainnet';

interface ConnectWalletResult {
  success: boolean;
  address?: string;
  publicKeyHex?: string;
  authToken?: string;
  label?: string;
  error?: string;
}

interface SignUpResult {
  success: boolean;
  error?: string;
  conflict?: boolean;
}

interface SignInResult {
  success: boolean;
  error?: string;
  notFound?: boolean;
}

/**
 * Drives the Seeker Seed Vault sign-up / sign-in flows over MWA.
 * The Seeker wallet replaces the cold/stealth keypair — backend creates
 * a Turnkey sub-org for the cash wallet using the Seeker pubkey as an
 * ED25519 API authenticator.
 */
export function useWalletAuth() {
  const { setUserData } = useAuthContext();
  const { setMWAInProgress } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  /**
   * Open MWA, biometric-gate, authorize (or reauthorize) the Seed Vault and
   * return base58 address + hex pubkey + MWA auth token.
   */
  const connectWallet = useCallback(async (): Promise<ConnectWalletResult> => {
    setLoading(true);
    setError(null);

    try {
      setMWAInProgress(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const biometric = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to connect your Seeker wallet',
          fallbackLabel: 'Use passcode',
          disableDeviceFallback: false,
        });
        if (!biometric.success) {
          setMWAInProgress(false);
          setLoading(false);
          return { success: false, error: 'Authentication required' };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      const existingAuthToken = await SecureStore.getItemAsync(MWA_AUTH_TOKEN_KEY);
      const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

      const extract = (auth: any) => ({
        addressBase64: auth.accounts[0].address,
        label: auth.accounts[0].label || '',
        authToken: auth.auth_token,
      });

      let result: { addressBase64: string; label: string; authToken: string } | null = null;

      // Reauthorize attempt. On failure we MUST exit transact() before
      // calling authorize — chaining them in the same session breaks the
      // MWA bridge with CancellationException on later operations.
      if (existingAuthToken) {
        try {
          result = await transact(async (wallet: Web3MobileWallet) => {
            const auth = await wallet.reauthorize({
              auth_token: existingAuthToken,
              identity: STEALF_IDENTITY,
            });
            return extract(auth);
          });
        } catch (e: any) {
          if (__DEV__) console.warn('[useWalletAuth] reauthorize session failed:', e?.message);
          await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
        }
      }

      try {
        if (!result) {
          result = await transact(async (wallet: Web3MobileWallet) => {
            const auth = await wallet.authorize({
              chain: SOLANA_CHAIN,
              identity: STEALF_IDENTITY,
            });
            return extract(auth);
          });
        }
      } finally {
        setMWAInProgress(false);
      }

      if (!result) throw new Error('MWA authorize did not return an account');

      const addressBytes = Buffer.from(result.addressBase64, 'base64');
      const addressBase58 = bs58.encode(addressBytes);
      const publicKeyHex = addressBytes.toString('hex');

      await SecureStore.setItemAsync(MWA_AUTH_TOKEN_KEY, result.authToken);
      await SecureStore.setItemAsync(MWA_WALLET_ADDRESS_KEY, addressBase58);

      setWalletConnected(true);
      setConnectedAddress(addressBase58);
      setLoading(false);

      return {
        success: true,
        address: addressBase58,
        publicKeyHex,
        authToken: result.authToken,
        label: result.label,
      };
    } catch (err: any) {
      if (__DEV__) console.error('[useWalletAuth] connectWallet error:', err);
      const errorMsg = err?.message || 'Failed to connect wallet';
      setMWAInProgress(false);
      setLoading(false);

      const isCancelled = /cancel|declined|rejected/i.test(errorMsg);
      if (isCancelled) return { success: false };

      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [setMWAInProgress]);

  /**
   * Create a new account where stealf_wallet = MWA address. Backend creates
   * a Turnkey sub-org with publicKeyHex as ED25519 API key + cash wallet.
   */
  const signUpWithWallet = useCallback(
    async (params: {
      publicKeyHex: string;
      walletAddress: string;
      authToken: string;
      email: string;
      pseudo: string;
      inviteCode?: string;
      label?: string;
    }): Promise<SignUpResult> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/users/wallet-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: params.email,
            pseudo: params.pseudo,
            inviteCode: params.inviteCode,
            publicKeyHex: params.publicKeyHex,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            return {
              success: false,
              conflict: true,
              error: data.error || 'Account already exists. Sign in instead?',
            };
          }
          throw new Error(data.error || 'Signup failed');
        }

        if (!data.data?.user) throw new Error('Backend did not return user data');

        const user = data.data.user;
        const sessionToken = data.data.token;

        await SecureStore.setItemAsync(AUTH_METHOD_KEY, 'wallet');
        if (sessionToken) {
          await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
        }

        await setUserData({
          email: user.email,
          username: user.pseudo,
          cash_wallet: user.cash_wallet || data.data.cashWallet,
          stealf_wallet: user.stealf_wallet || params.walletAddress,
          subOrgId: data.data.subOrgId || user.turnkey_subOrgId,
          authMethod: 'wallet',
          points: user.points ?? 0,
        });

        setLoading(false);
        return { success: true };
      } catch (err: any) {
        if (__DEV__) console.error('[useWalletAuth] signUpWithWallet error:', err);
        const errorMsg = err?.message || 'Failed to sign up with wallet';
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    },
    [setUserData],
  );

  /**
   * Sign in by opening MWA and looking up the user by their Seeker pubkey.
   */
  const signInWithWallet = useCallback(async (): Promise<SignInResult> => {
    setLoading(true);
    setError(null);

    try {
      const connectResult = await connectWallet();
      if (!connectResult.success) {
        setLoading(false);
        return { success: false, error: connectResult.error };
      }

      setLoading(true);

      const response = await fetch(`${API_URL}/api/users/wallet-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKeyHex: connectResult.publicKeyHex }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setLoading(false);
          return { success: false, notFound: true, error: 'No account found for this wallet' };
        }
        throw new Error(data.error || 'Login failed');
      }

      if (!data.data?.user) throw new Error('Backend did not return user data');

      const user = data.data.user;
      const sessionToken = data.data.token;

      await SecureStore.setItemAsync(AUTH_METHOD_KEY, 'wallet');
      if (sessionToken) {
        await SecureStore.setItemAsync(WALLET_SESSION_TOKEN_KEY, sessionToken);
      }

      await setUserData({
        email: user.email,
        username: user.pseudo,
        cash_wallet: user.cash_wallet,
        stealf_wallet: user.stealf_wallet,
        subOrgId: user.turnkey_subOrgId,
        authMethod: 'wallet',
        points: user.points ?? 0,
      });

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      if (__DEV__) console.error('[useWalletAuth] signInWithWallet error:', err);
      const errorMsg = err?.message || 'Failed to sign in with wallet';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [connectWallet, setUserData]);

  return {
    loading,
    error,
    walletConnected,
    connectedAddress,
    connectWallet,
    signUpWithWallet,
    signInWithWallet,
  };
}
