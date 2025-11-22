/**
 * usePrivateTransfer Hook
 *
 * Handles encrypted private transfers using Arcium MPC
 * All transfer amounts are encrypted - only sender/recipient can see them
 */

import { useState, useCallback } from 'react';
import { Keypair } from '@solana/web3.js';
import { arciumService, PrivateTransferResult } from '../services/arciumService';
import stealfService from '../services/stealfService';

interface UsePrivateTransferReturn {
  executePrivateTransfer: (
    amount: number,
    recipientAddress: string
  ) => Promise<PrivateTransferResult | null>;
  loading: boolean;
  error: string | null;
  lastTransfer: PrivateTransferResult | null;
}

export function usePrivateTransfer(): UsePrivateTransferReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransfer, setLastTransfer] = useState<PrivateTransferResult | null>(null);

  const executePrivateTransfer = useCallback(async (
    amount: number,
    recipientAddress: string
  ): Promise<PrivateTransferResult | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[usePrivateTransfer] Starting private transfer...');
      console.log('[usePrivateTransfer] Amount:', amount, 'SOL');
      console.log('[usePrivateTransfer] Recipient:', recipientAddress);

      // Get the private wallet keypair from Stealf service
      const keypair = await stealfService.getPrivateWalletKeypair();

      if (!keypair) {
        throw new Error('Private wallet not found. Please set up your wallet first.');
      }

      // Get current balance
      const currentBalance = await arciumService.getPrivateBalance(keypair);

      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. You have ${currentBalance.toFixed(4)} SOL`);
      }

      // Execute the private transfer through Arcium MPC
      const result = await arciumService.privateTransfer(
        keypair,
        currentBalance,
        amount,
        recipientAddress
      );

      if (!result.success) {
        throw new Error('Transfer failed - insufficient funds or computation error');
      }

      console.log('[usePrivateTransfer] Transfer successful!');
      console.log('[usePrivateTransfer] Signature:', result.signature);

      setLastTransfer(result);
      return result;

    } catch (err: any) {
      console.error('[usePrivateTransfer] Error:', err);
      setError(err.message || 'Private transfer failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    executePrivateTransfer,
    loading,
    error,
    lastTransfer,
  };
}

export default usePrivateTransfer;
