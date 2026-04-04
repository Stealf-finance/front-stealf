import { useState, useCallback } from 'react';
import { useAuthenticatedApi } from '../services/api/clientStealf';
import { useAuth } from '../contexts/AuthContext';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

export interface SwapQuote {
  requestId: string;
  unsignedTransaction: string;
  totalInputAmount: string;
  totalOutputAmount: string;
  expiresAt: string;
  slippageBps: number;
}

export type SwapDirection = 'SOL_TO_USDC' | 'USDC_TO_SOL';

export function useSwap() {
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { post } = useAuthenticatedApi();
  const { userData } = useAuth();

  const getQuote = useCallback(async (
    direction: SwapDirection,
    amount: number,
  ): Promise<SwapQuote | null> => {
    setIsLoadingQuote(true);
    setError(null);
    setQuote(null);

    try {
      const cashWallet = userData?.cash_wallet;
      if (!cashWallet) throw new Error('Cash wallet not found');

      const isSOLtoUSDC = direction === 'SOL_TO_USDC';
      const inputMint = isSOLtoUSDC ? SOL_MINT : USDC_MINT;
      const outputMint = isSOLtoUSDC ? USDC_MINT : SOL_MINT;
      const decimals = isSOLtoUSDC ? SOL_DECIMALS : USDC_DECIMALS;
      const amountRaw = Math.floor(amount * Math.pow(10, decimals)).toString();

      const result = await post('/api/swap/order', {
        inputMint,
        outputMint,
        amount: amountRaw,
        taker: cashWallet,
      });

      // post() already unwraps result.data — `result` IS the Jupiter order directly
      // Jupiter returns `transaction` field — map to our `unsignedTransaction`
      const q: SwapQuote = {
        requestId: result.requestId,
        unsignedTransaction: result.transaction,
        totalInputAmount: result.totalInputAmount,
        totalOutputAmount: result.totalOutputAmount,
        expiresAt: result.expiresAt,
        slippageBps: result.slippageBps,
      };
      setQuote(q);
      return q;
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      return null;
    } finally {
      setIsLoadingQuote(false);
    }
  }, [post, userData]);

  const executeSwap = useCallback(async (q: SwapQuote): Promise<string | null> => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await post('/api/swap/execute-cash', {
        requestId: q.requestId,
        unsignedTransaction: q.unsignedTransaction,
      });
      setQuote(null);
      return result?.signature ?? null;
    } catch (err: any) {
      setError(err.message || 'Swap failed');
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [post]);

  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
  }, []);

  return {
    getQuote,
    executeSwap,
    reset,
    quote,
    isLoadingQuote,
    isExecuting,
    error,
  };
}
