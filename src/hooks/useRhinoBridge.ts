/**
 * useRhinoBridge Hook
 *
 * Manages cross-chain bridge operations from Ethereum/L2s to Solana
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { rhinoApi } from '../services/rhinoApiClient';
import type {
  RhinoChainConfig,
  RhinoDepositQuote,
  RhinoBridgeStatus,
  RhinoBridgeHistory,
  SupportedSourceChain,
  RhinoBridgeState,
} from '../types/rhino';

interface UseRhinoBridgeReturn {
  // State
  configs: RhinoChainConfig | null;
  currentQuote: RhinoDepositQuote | null;
  bridgeStatus: RhinoBridgeStatus | null;
  pendingBridges: RhinoBridgeHistory[];
  loading: boolean;
  error: string | null;

  // Actions
  loadConfigs: () => Promise<void>;
  createDepositAddress: (params: {
    chainIn: SupportedSourceChain;
    token: string;
    amount: string;
    recipientAddress: string;
    userEmail?: string;
  }) => Promise<RhinoDepositQuote | null>;
  checkStatus: (quoteId: string) => Promise<RhinoBridgeStatus | null>;
  loadPendingBridges: (userEmail: string) => Promise<void>;
  loadBridgeHistory: (userEmail: string, limit?: number) => Promise<RhinoBridgeHistory[]>;
  clearQuote: () => void;
  clearError: () => void;
}

const STATUS_POLL_INTERVAL = 10000; // 10 seconds

// Terminal states that don't need polling
const TERMINAL_STATES: RhinoBridgeState[] = ['EXECUTED', 'FAILED', 'CANCELLED'];

export function useRhinoBridge(): UseRhinoBridgeReturn {
  const [configs, setConfigs] = useState<RhinoChainConfig | null>(null);
  const [currentQuote, setCurrentQuote] = useState<RhinoDepositQuote | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<RhinoBridgeStatus | null>(null);
  const [pendingBridges, setPendingBridges] = useState<RhinoBridgeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load bridge configurations
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await rhinoApi.getConfigs();

      if (result.success && result.data) {
        setConfigs(result.data);
      } else {
        setError(result.error || 'Failed to load bridge configurations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop status polling
  const stopStatusPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Check bridge status
  const checkStatus = useCallback(async (quoteId: string): Promise<RhinoBridgeStatus | null> => {
    try {
      const result = await rhinoApi.getBridgeStatus(quoteId);

      if (result.success && result.data) {
        setBridgeStatus(result.data);

        // Stop polling if in terminal state
        if (TERMINAL_STATES.includes(result.data.state)) {
          stopStatusPolling();
        }

        return result.data;
      }
      return null;
    } catch (err: any) {
      console.error('[useRhinoBridge] Status check error:', err);
      return null;
    }
  }, [stopStatusPolling]);

  // Start status polling
  const startStatusPolling = useCallback((quoteId: string) => {
    stopStatusPolling();

    // Immediate check
    checkStatus(quoteId);

    // Start interval
    pollIntervalRef.current = setInterval(() => {
      checkStatus(quoteId);
    }, STATUS_POLL_INTERVAL);
  }, [checkStatus, stopStatusPolling]);

  // Create deposit address
  const createDepositAddress = useCallback(async (params: {
    chainIn: SupportedSourceChain;
    token: string;
    amount: string;
    recipientAddress: string;
    userEmail?: string;
  }): Promise<RhinoDepositQuote | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useRhinoBridge] Creating deposit address...');
      console.log('[useRhinoBridge] Chain:', params.chainIn);
      console.log('[useRhinoBridge] Token:', params.token);
      console.log('[useRhinoBridge] Amount:', params.amount);

      const result = await rhinoApi.getDepositAddress(params);

      if (result.success && result.data) {
        setCurrentQuote(result.data);

        // Start polling for status
        startStatusPolling(result.data.quoteId);

        return result.data;
      } else {
        setError(result.error || 'Failed to create deposit address');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit address');
      return null;
    } finally {
      setLoading(false);
    }
  }, [startStatusPolling]);

  // Load pending bridges
  const loadPendingBridges = useCallback(async (userEmail: string) => {
    try {
      const result = await rhinoApi.getPendingBridges(userEmail);

      if (result.success && result.data) {
        setPendingBridges(result.data.bridges);
      }
    } catch (err: any) {
      console.error('[useRhinoBridge] Load pending error:', err);
    }
  }, []);

  // Load bridge history
  const loadBridgeHistory = useCallback(async (
    userEmail: string,
    limit?: number
  ): Promise<RhinoBridgeHistory[]> => {
    try {
      const result = await rhinoApi.getBridgeHistory(userEmail, limit);

      if (result.success && result.data) {
        return result.data.bridges;
      }
      return [];
    } catch (err: any) {
      console.error('[useRhinoBridge] Load history error:', err);
      return [];
    }
  }, []);

  // Clear current quote
  const clearQuote = useCallback(() => {
    setCurrentQuote(null);
    setBridgeStatus(null);
    stopStatusPolling();
  }, [stopStatusPolling]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  return {
    configs,
    currentQuote,
    bridgeStatus,
    pendingBridges,
    loading,
    error,
    loadConfigs,
    createDepositAddress,
    checkStatus,
    loadPendingBridges,
    loadBridgeHistory,
    clearQuote,
    clearError,
  };
}

export default useRhinoBridge;
