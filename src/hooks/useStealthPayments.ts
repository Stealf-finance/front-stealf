/**
 * useStealthPayments — Hook pour afficher et dépenser les paiements stealth entrants.
 *
 * Flux :
 *   - Polling GET /api/stealth/incoming toutes les 30 secondes
 *   - spendPayment() : prepare → signSpendTransaction → soumettre → confirm
 *
 * Requirements : 3.6, 6.4, 6.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { useAuthenticatedApi } from '../services/clientStealf';
import { signSpendTransaction } from '../services/stealthCrypto';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');
const POLL_INTERVAL_MS = 30_000;

export interface StealthPayment {
  _id: string;
  stealthAddress: string;
  amountLamports: string;
  txSignature: string;
  detectedAt: string;
  status: 'pending' | 'spendable' | 'spent';
  spentAt?: string;
}

interface StealthPaymentsState {
  payments: StealthPayment[];
  isLoading: boolean;
  error: string | null;
  spendPayment: (paymentId: string, destinationAddress: string) => Promise<string | null>;
  refresh: () => void;
}

export function useStealthPayments(): StealthPaymentsState {
  const [payments, setPayments] = useState<StealthPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const api = useAuthenticatedApi();

  const fetchPayments = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/stealth/incoming');
      if (mountedRef.current) {
        setPayments(data.payments || []);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Failed to fetch stealth payments');
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [api]);

  const triggerScan = useCallback(async () => {
    try {
      await api.post('/api/stealth/scan', {});
    } catch {
      // scan non-bloquant — erreur silencieuse
    }
  }, [api]);

  useEffect(() => {
    mountedRef.current = true;

    // Scan immédiat au mount + fetch des résultats
    triggerScan().then(() => {
      if (mountedRef.current) fetchPayments();
    });

    intervalRef.current = setInterval(fetchPayments, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPayments, triggerScan]);

  const spendPayment = useCallback(
    async (paymentId: string, destinationAddress: string): Promise<string | null> => {
      try {
        // 1. Préparer la TX de dépense côté backend
        __DEV__ && console.log('[spendPayment] step1: prepare, paymentId:', paymentId);
        const prepareResult = await api.post('/api/stealth/spend/prepare', {
          paymentId,
          destinationAddress,
        });
        __DEV__ && console.log('[spendPayment] step1 OK, stealthAddress:', prepareResult?.stealthAddress?.slice(0, 8));

        const { serializedUnsignedTx, ephemeralR, stealthAddress } = prepareResult;

        // 2. Signer côté frontend (stealth spending key depuis SecureStore)
        __DEV__ && console.log('[spendPayment] step2: signSpendTransaction...');
        const { serializedSignedTx } = await signSpendTransaction(
          serializedUnsignedTx,
          ephemeralR,
          stealthAddress,
        );
        __DEV__ && console.log('[spendPayment] step2 OK');

        // 3. Soumettre on-chain
        __DEV__ && console.log('[spendPayment] step3: sendRawTransaction...');
        const txBytes = Buffer.from(serializedSignedTx, 'base64');
        const sig = await connection.sendRawTransaction(txBytes, {
          skipPreflight: false,
        });
        __DEV__ && console.log('[spendPayment] step3 OK, spend sig (full):', sig);
        __DEV__ && console.log('[spendPayment] Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

        // 4. Attendre confirmation 'processed' (tx dans un bloc, suffisant pour le spend)
        __DEV__ && console.log('[spendPayment] step4: confirmTransaction...');
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'processed');
        __DEV__ && console.log('[spendPayment] step4 confirmed ✓');

        // 5. Confirmer côté backend
        await api.post('/api/stealth/spend/confirm', {
          paymentId,
          txSignature: sig,
        });

        // 6. Rafraîchir la liste
        await fetchPayments();

        return sig;
      } catch (err: any) {
        console.error('[spendPayment] ERROR:', err?.message, err);
        setError(err?.message || 'Failed to spend payment');
        return null;
      }
    },
    [api, fetchPayments],
  );

  return {
    payments,
    isLoading,
    error,
    spendPayment,
    refresh: fetchPayments,
  };
}
