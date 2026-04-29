import { useState, useCallback } from 'react';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { useSession } from '../contexts/SessionContext';
import {
  MWA_AUTH_TOKEN_KEY,
  MWA_WALLET_ADDRESS_KEY,
} from '../constants/walletAuth';

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

/**
 * Drives the Seeker Seed Vault MWA flow that's used to materialise the
 * stealth wallet during initial wallet setup. Unlike the previous design,
 * this hook only connects to the wallet (authorize + capture address) —
 * sign-up / sign-in still go through Turnkey passkey, and the cash wallet
 * remains a Turnkey sub-org. The returned `address` is what we persist
 * server-side as `stealf_wallet`.
 */
export function useWalletAuth() {
  const { setMWAInProgress } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

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
          const msg = (e?.message || '').toString();
          const cancelled = /cancel|declined|denied|user.*reject|back.*pressed/i.test(msg);
          if (cancelled) throw e;
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

  return {
    loading,
    error,
    connectedAddress,
    connectWallet,
  };
}
