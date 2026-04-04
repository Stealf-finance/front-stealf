/**
 * useWealthStealthBalance — Hook for unified wealth wallet balance (main + stealth UTXOs).
 *
 * Polls GET /api/stealth/wealth/balance every 30 seconds.
 * Exposes stealthBalance, stealthPayments, isLoading, error, refreshBalance.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../services/api/clientStealf';

export interface WealthStealthPayment {
  _id: string;
  stealthAddress: string;
  amountLamports: string;
  txSignature: string;
  ephemeralR: string;
  status: 'spendable';
}

interface WealthStealthBalanceState {
  stealthBalance: number;
  stealthPayments: WealthStealthPayment[];
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => void;
}

const POLL_INTERVAL_MS = 30_000;

export function useWealthStealthBalance(): WealthStealthBalanceState {
  const [stealthBalance, setStealthBalance] = useState(0);
  const [stealthPayments, setStealthPayments] = useState<WealthStealthPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/stealth/wealth/balance');
      setStealthBalance(data.stealthBalance ?? 0);
      setStealthPayments(data.stealthPayments ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch wealth stealth balance');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return {
    stealthBalance,
    stealthPayments,
    isLoading,
    error,
    refreshBalance: fetchBalance,
  };
}
