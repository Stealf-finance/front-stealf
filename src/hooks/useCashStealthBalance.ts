/**
 * useCashStealthBalance — Hook pour le solde cash unifié (main + stealth UTXOs).
 *
 * Poll GET /api/stealth/cash/balance toutes les 30 secondes.
 * Expose mainBalance, stealthBalance, totalBalance, stealthPayments, isLoading, error.
 * refreshBalance() déclenche un rafraîchissement immédiat (après consolidation).
 *
 * Requirements : 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../services/api/clientStealf';

interface StealthPaymentSummary {
  stealthAddress: string;
  amountLamports: string;
  txSignature: string;
  ephemeralR: string;
  status: string;
}

interface CashBalanceState {
  mainBalance: number;
  stealthBalance: number;
  totalBalance: number;
  stealthPayments: StealthPaymentSummary[];
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => void;
}

const POLL_INTERVAL_MS = 30_000;

export function useCashStealthBalance(): CashBalanceState {
  const [mainBalance, setMainBalance] = useState(0);
  const [stealthBalance, setStealthBalance] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [stealthPayments, setStealthPayments] = useState<StealthPaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/stealth/cash/balance');
      setMainBalance(data.mainBalance ?? 0);
      setStealthBalance(data.stealthBalance ?? 0);
      setTotalBalance(data.totalBalance ?? 0);
      setStealthPayments(data.stealthPayments ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch cash balance');
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
    mainBalance,
    stealthBalance,
    totalBalance,
    stealthPayments,
    isLoading,
    error,
    refreshBalance: fetchBalance,
  };
}
