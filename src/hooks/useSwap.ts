/**
 * useSwap
 * Main hook for executing swaps via SilentSwap
 * Handles transaction signing, step tracking, and history saving
 */

import { useState, useCallback, useRef } from 'react';
import { useSilentSwap } from '@silentswap/react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import type {
  SwapExecuteParams,
  SwapResult,
  SwapStep,
  SwapExecuteError,
  UseSwapResult,
} from '../types/swap';
import { useSwapHistory, buildExplorerUrl } from './useSwapHistory';
import { useEphemeralEvmWallet } from './useEphemeralEvmWallet';
import {
  createTurnkeyWalletAdapter,
  TurnkeyWalletAccount,
} from '../adapters/TurnkeyWalletAdapter';
import { buildSolanaContactId, SWAP_TIMEOUT_MS } from '../constants/tokens';

export function useSwap(): UseSwapResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<SwapStep | null>(null);
  const [error, setError] = useState<SwapExecuteError | null>(null);

  // SilentSwap SDK
  const {
    executeSwap: executeSilentSwap,
    isSwapping,
    currentStep: silentSwapStep,
    orderId,
    orderComplete,
    swapError,
  } = useSilentSwap();

  // Turnkey for signing
  const { signAndSendTransaction, wallets } = useTurnkey();

  // EVM wallet for bridge operations
  const { getEvmWallet } = useEphemeralEvmWallet();

  // History for saving completed swaps
  const { saveSwap } = useSwapHistory();

  // Timeout ref
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Execute a swap with full flow:
   * 1. Prepare - validate inputs
   * 2. Sign - sign transaction with Turnkey
   * 3. Submit - submit to SilentSwap
   * 4. Bridge - wait for privacy bridge (if enabled)
   * 5. Complete - save to history
   */
  const executeSwap = useCallback(
    async (params: SwapExecuteParams): Promise<SwapResult> => {
      const {
        sourceToken,
        destinationToken,
        amount,
        quote,
        privacyEnabled,
        destinationAddress,
      } = params;

      setIsExecuting(true);
      setError(null);
      setCurrentStep('PREPARING');

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('TIMEOUT: Swap took too long'));
        }, SWAP_TIMEOUT_MS);
      });

      try {
        // Step 1: Prepare
        console.log('[useSwap] Preparing swap...');

        // Get wallet account
        const wallet = wallets?.[0];
        if (!wallet) {
          throw new Error('No wallet found');
        }

        // Find the private wallet account (stealf_wallet)
        const walletAccount = wallet.accounts?.find(
          (account: TurnkeyWalletAccount) => account.address !== ''
        );

        if (!walletAccount) {
          throw new Error('Wallet account not found');
        }

        // Create wallet adapter for SilentSwap
        const adapter = createTurnkeyWalletAdapter(walletAccount, {
          signAndSendTransaction: async (txParams) => {
            return signAndSendTransaction({
              walletAccount: txParams.walletAccount as any,
              unsignedTransaction: txParams.unsignedTransaction,
              transactionType: txParams.transactionType as any,
              rpcUrl: txParams.rpcUrl,
            });
          },
        });

        // Get EVM wallet for bridge operations (if privacy enabled)
        let evmWallet = null;
        if (privacyEnabled) {
          setCurrentStep('SIGNING');
          console.log('[useSwap] Getting EVM wallet for bridge...');
          evmWallet = await getEvmWallet();
        }

        // Step 2: Execute swap via SilentSwap SDK
        setCurrentStep('SUBMITTING');
        console.log('[useSwap] Executing swap via SilentSwap...');

        const swapPromise = executeSilentSwap({
          sourceAsset: sourceToken.caip19Id,
          sourceAmount: amount,
          destinations: [
            {
              asset: destinationToken.caip19Id,
              contact: buildSolanaContactId(destinationAddress),
              amount: '', // Calculated by SDK
            },
          ],
          splits: [1],
          senderContactId: buildSolanaContactId(walletAccount.address),
          integratorId: process.env.EXPO_PUBLIC_SILENTSWAP_INTEGRATOR_ID,
        });

        // Race against timeout
        await Promise.race([swapPromise, timeoutPromise]);

        // Step 3: Wait for bridging if privacy enabled
        if (privacyEnabled) {
          setCurrentStep('BRIDGING');
          console.log('[useSwap] Waiting for bridge completion...');

          // Poll for completion
          await waitForCompletion();
        }

        // Step 4: Complete
        setCurrentStep('COMPLETING');
        console.log('[useSwap] Swap completing...');

        // Build result
        const transactionId = orderId || `tx_${Date.now()}`;
        const result: SwapResult = {
          success: true,
          transactionId,
          outputAmount: quote.estimatedOutput,
          explorerUrl: buildExplorerUrl(transactionId),
        };

        // Save to history
        await saveSwap({
          sourceToken,
          destinationToken,
          inputAmount: amount,
          outputAmount: quote.estimatedOutput,
          transactionId,
          privacyEnabled,
          status: 'completed',
        });

        console.log('[useSwap] Swap completed successfully:', transactionId);

        return result;
      } catch (err: any) {
        console.error('[useSwap] Swap failed:', err);

        const swapError = mapToSwapError(err);
        setError(swapError);

        // Save failed swap to history
        try {
          await saveSwap({
            sourceToken,
            destinationToken,
            inputAmount: amount,
            outputAmount: '0',
            transactionId: '',
            privacyEnabled,
            status: 'failed',
          });
        } catch (saveError) {
          console.error('[useSwap] Failed to save failed swap:', saveError);
        }

        throw swapError;
      } finally {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setIsExecuting(false);
        setCurrentStep(null);
      }
    },
    [executeSilentSwap, getEvmWallet, orderId, saveSwap, signAndSendTransaction, wallets]
  );

  /**
   * Wait for swap completion (polling)
   */
  async function waitForCompletion(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes at 5s intervals
      const pollInterval = 5000;

      const poll = setInterval(() => {
        attempts++;

        if (orderComplete) {
          clearInterval(poll);
          resolve();
        } else if (swapError) {
          clearInterval(poll);
          reject(new Error(swapError.message));
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          reject(new Error('TIMEOUT: Bridge completion timed out'));
        }
      }, pollInterval);
    });
  }

  return {
    executeSwap,
    isExecuting: isExecuting || isSwapping,
    currentStep: currentStep || mapSilentSwapStep(silentSwapStep),
    error,
  };
}

/**
 * Map SilentSwap step to our step type
 */
function mapSilentSwapStep(step: string | null | undefined): SwapStep | null {
  if (!step) return null;

  const stepLower = step.toLowerCase();
  if (stepLower.includes('prepar')) return 'PREPARING';
  if (stepLower.includes('sign')) return 'SIGNING';
  if (stepLower.includes('submit') || stepLower.includes('send')) return 'SUBMITTING';
  if (stepLower.includes('bridge') || stepLower.includes('relay')) return 'BRIDGING';
  if (stepLower.includes('complet') || stepLower.includes('finish')) return 'COMPLETING';

  return 'SUBMITTING';
}

/**
 * Map errors to SwapExecuteError
 */
function mapToSwapError(err: any): SwapExecuteError {
  const message = err.message || 'Unknown error';
  const messageLower = message.toLowerCase();

  if (messageLower.includes('rejected') || messageLower.includes('denied') || messageLower.includes('user_rejected')) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction was rejected',
      recoverable: true,
    };
  }

  if (messageLower.includes('insufficient') || messageLower.includes('balance')) {
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: 'Insufficient balance for swap',
      recoverable: false,
    };
  }

  if (messageLower.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: 'Swap timed out. Please check your wallet.',
      recoverable: true,
    };
  }

  if (messageLower.includes('failed') || messageLower.includes('error')) {
    return {
      code: 'TRANSACTION_FAILED',
      message: message,
      recoverable: true,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: message,
    recoverable: true,
  };
}
