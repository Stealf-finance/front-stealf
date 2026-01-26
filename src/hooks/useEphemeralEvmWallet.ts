/**
 * useEphemeralEvmWallet
 * Derives an ephemeral EVM wallet from Turnkey mnemonic for SilentSwap bridge operations
 * The private key is never persisted - derived on demand and released after use
 */

import { useState, useCallback, useRef } from 'react';
import { Wallet, HDNodeWallet, Transaction } from 'ethers';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import type {
  EphemeralEvmWallet,
  EvmTransaction,
  UseEphemeralEvmWalletResult,
} from '../types/swap';

// BIP-44 path for EVM (Ethereum)
const EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export function useEphemeralEvmWallet(): UseEphemeralEvmWalletResult {
  const { exportWallet, wallets } = useTurnkey();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache the derived wallet for the duration of a swap operation
  // Cleared after use to avoid keeping private key in memory
  const walletCacheRef = useRef<HDNodeWallet | null>(null);

  /**
   * Derive EVM wallet from Turnkey mnemonic
   * Returns an ephemeral wallet that should not be persisted
   */
  const getEvmWallet = useCallback(async (): Promise<EphemeralEvmWallet> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get wallet ID from Turnkey
      const walletId = wallets?.[0]?.walletId;
      if (!walletId) {
        throw new Error('No Turnkey wallet found');
      }

      // Export mnemonic from Turnkey
      const mnemonic = await exportWallet({ walletId });
      if (!mnemonic) {
        throw new Error('Failed to export wallet mnemonic');
      }

      // Derive EVM wallet using BIP-44 path
      const hdNode = HDNodeWallet.fromPhrase(mnemonic, undefined, EVM_DERIVATION_PATH);

      // Cache for multiple operations within the same swap
      walletCacheRef.current = hdNode;

      // Create ephemeral wallet interface
      const ephemeralWallet: EphemeralEvmWallet = {
        address: hdNode.address,

        signMessage: async (message: string): Promise<string> => {
          if (!walletCacheRef.current) {
            throw new Error('EVM wallet not initialized');
          }
          return walletCacheRef.current.signMessage(message);
        },

        signTransaction: async (tx: EvmTransaction): Promise<string> => {
          if (!walletCacheRef.current) {
            throw new Error('EVM wallet not initialized');
          }

          const transaction = Transaction.from({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : 0n,
            gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
          });

          return walletCacheRef.current.signTransaction(transaction);
        },
      };

      return ephemeralWallet;
    } catch (err: any) {
      console.error('[useEphemeralEvmWallet] Error:', err);
      setError(err.message || 'Failed to derive EVM wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [exportWallet, wallets]);

  /**
   * Clear the cached wallet from memory
   * Call this after swap completion
   */
  const clearWallet = useCallback(() => {
    walletCacheRef.current = null;
  }, []);

  return {
    getEvmWallet,
    isLoading,
    error,
  };
}

/**
 * Check if an EVM address has sufficient gas for a transaction
 * Used to warn users if bridge operations might fail
 */
export async function checkEvmGasBalance(
  address: string,
  rpcUrl: string
): Promise<{ hasGas: boolean; balance: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });

    const data = await response.json();
    const balanceWei = BigInt(data.result || '0');
    const balanceEth = Number(balanceWei) / 1e18;

    // Minimum gas for a basic transaction (approx 0.001 ETH)
    const MIN_GAS_THRESHOLD = 0.001;

    return {
      hasGas: balanceEth >= MIN_GAS_THRESHOLD,
      balance: balanceEth.toFixed(6),
    };
  } catch (error) {
    console.error('[checkEvmGasBalance] Error:', error);
    return { hasGas: false, balance: '0' };
  }
}
