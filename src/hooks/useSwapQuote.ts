/**
 * useSwapQuote
 * Fetches and refreshes quotes from SilentSwap SDK
 * Implements debouncing and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSwap as useSilentSwapState } from '@silentswap/react';
import type {
  TokenInfo,
  SwapQuote,
  SwapQuoteError,
  UseSwapQuoteResult,
} from '../types/swap';
import {
  QUOTE_REFRESH_INTERVAL,
  QUOTE_DEBOUNCE_MS,
  buildSolanaContactId,
} from '../constants/tokens';

interface UseSwapQuoteParams {
  sourceToken: TokenInfo | null;
  destinationToken: TokenInfo | null;
  amount: string;
  privacyEnabled: boolean;
  destinationAddress?: string;
}

export function useSwapQuote(params: UseSwapQuoteParams): UseSwapQuoteResult {
  const { sourceToken, destinationToken, amount, privacyEnabled, destinationAddress } = params;

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SwapQuoteError | null>(null);

  // SilentSwap state management
  const silentSwap = useSilentSwapState();

  // Refs for debouncing and refresh interval
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  /**
   * Fetch quote from SilentSwap
   */
  const fetchQuote = useCallback(async () => {
    // Validate inputs
    if (!sourceToken || !destinationToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    // Create params hash to avoid duplicate fetches
    const paramsHash = `${sourceToken.caip19Id}-${destinationToken.caip19Id}-${amount}-${privacyEnabled}`;
    if (paramsHash === lastFetchParamsRef.current && quote) {
      return; // Skip if params haven't changed
    }
    lastFetchParamsRef.current = paramsHash;

    setIsLoading(true);
    setError(null);

    try {
      // Configure SilentSwap state
      silentSwap.setInputAmount(amount);

      // Set destination with CAIP format
      const contact = destinationAddress
        ? buildSolanaContactId(destinationAddress)
        : '';

      silentSwap.setDestinations([
        {
          asset: destinationToken.caip19Id,
          contact,
          amount: '', // Calculated by quote
        },
      ]);

      // Wait a moment for state to propagate, then get quote
      // Note: SilentSwap SDK may provide a direct quote API
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For now, we'll simulate the quote based on typical exchange rates
      // In production, this would come from the SilentSwap SDK
      const mockQuote = await simulateQuote(
        sourceToken,
        destinationToken,
        amount,
        privacyEnabled
      );

      setQuote(mockQuote);
    } catch (err: any) {
      console.error('[useSwapQuote] Error fetching quote:', err);

      const errorCode = mapErrorToCode(err);
      setError({
        code: errorCode,
        message: err.message || 'Failed to get quote',
      });
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [sourceToken, destinationToken, amount, privacyEnabled, destinationAddress, silentSwap]);

  /**
   * Debounced fetch - called when inputs change
   */
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchQuote();
    }, QUOTE_DEBOUNCE_MS);
  }, [fetchQuote]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async () => {
    lastFetchParamsRef.current = ''; // Force refresh
    await fetchQuote();
  }, [fetchQuote]);

  // Trigger debounced fetch when inputs change
  useEffect(() => {
    debouncedFetch();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sourceToken, destinationToken, amount, privacyEnabled, debouncedFetch]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (sourceToken && destinationToken && amount && parseFloat(amount) > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchQuote();
      }, QUOTE_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sourceToken, destinationToken, amount, fetchQuote]);

  return {
    quote,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Simulate a quote for development/testing
 * In production, this comes from SilentSwap SDK
 */
async function simulateQuote(
  sourceToken: TokenInfo,
  destinationToken: TokenInfo,
  amount: string,
  privacyEnabled: boolean
): Promise<SwapQuote> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const inputAmount = parseFloat(amount);

  // Simple price simulation (SOL ≈ $150, USDC = $1)
  const prices: Record<string, number> = {
    SOL: 150,
    USDC: 1,
    USDT: 1,
    mSOL: 160,
    JUP: 0.8,
    BONK: 0.00002,
  };

  const sourcePrice = prices[sourceToken.symbol] || 1;
  const destPrice = prices[destinationToken.symbol] || 1;

  const inputValueUsd = inputAmount * sourcePrice;
  const serviceFeeUsd = inputValueUsd * 0.003; // 0.3% service fee
  const bridgeFeeUsd = privacyEnabled ? 0.5 : 0; // $0.50 bridge fee for privacy
  const totalFeeUsd = serviceFeeUsd + bridgeFeeUsd;

  const outputValueUsd = inputValueUsd - totalFeeUsd;
  const estimatedOutput = outputValueUsd / destPrice;

  return {
    estimatedOutput: estimatedOutput.toFixed(destinationToken.decimals > 6 ? 6 : destinationToken.decimals),
    estimatedOutputUsd: outputValueUsd,
    serviceFeeUsd,
    bridgeFeeUsd,
    totalFeeUsd,
    expiresAt: Date.now() + 30000, // 30 seconds
    route: {
      path: privacyEnabled
        ? [sourceToken.symbol, 'AVAX', destinationToken.symbol]
        : [sourceToken.symbol, destinationToken.symbol],
      bridgeProvider: privacyEnabled ? 'relay.link' : undefined,
      estimatedDuration: privacyEnabled ? 120 : 30, // seconds
    },
  };
}

/**
 * Map SDK errors to our error codes
 */
function mapErrorToCode(
  error: any
): 'INSUFFICIENT_LIQUIDITY' | 'UNSUPPORTED_PAIR' | 'AMOUNT_TOO_LOW' | 'NETWORK_ERROR' {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('liquidity')) {
    return 'INSUFFICIENT_LIQUIDITY';
  }
  if (message.includes('unsupported') || message.includes('pair')) {
    return 'UNSUPPORTED_PAIR';
  }
  if (message.includes('minimum') || message.includes('too low') || message.includes('too small')) {
    return 'AMOUNT_TOO_LOW';
  }
  return 'NETWORK_ERROR';
}
