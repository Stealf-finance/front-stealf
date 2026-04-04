/**
 * useConsolidateCashStealth — Consolide tous les UTXOs stealth cash vers l'adresse principale.
 *
 * Pour chaque paiement stealth spendable :
 *   1. POST /api/stealth/spend/prepare → TX non signée + ephemeralR + stealthAddress
 *   2. signCashSpendTransaction() — lit les clés depuis SecureStore
 *   3. Soumettre la TX signée au RPC Solana
 *   4. POST /api/stealth/spend/confirm → marque le paiement comme spent
 *
 * Requirements : 6.1, 6.3, 6.4, 6.5
 */

import { useState, useCallback } from 'react';
import { Connection } from '@solana/web3.js';
import { useAuthenticatedApi } from '../services/api/clientStealf';
import { useAuth } from '../contexts/AuthContext';
import { signCashSpendTransaction } from '../services/cashStealthCrypto';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';

interface StealthPaymentItem {
  _id?: string;
  paymentId?: string;
  stealthAddress: string;
  amountLamports: string;
  txSignature: string;
  ephemeralR: string;
}

interface ConsolidateResult {
  consolidated: number;
  errors: number;
}

interface ConsolidateState {
  isConsolidating: boolean;
  error: string | null;
  consolidate: (payments: StealthPaymentItem[], destinationAddress: string) => Promise<ConsolidateResult | null>;
}

export function useConsolidateCashStealth(): ConsolidateState {
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const consolidate = useCallback(
    async (payments: StealthPaymentItem[], destinationAddress: string): Promise<ConsolidateResult | null> => {
      if (payments.length === 0) return { consolidated: 0, errors: 0 };

      setIsConsolidating(true);
      setError(null);

      let consolidated = 0;
      let errors = 0;

      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      for (const payment of payments) {
        const paymentId = payment._id || payment.paymentId;
        if (!paymentId) { errors++; continue; }

        try {
          // 1. Build unsigned TX
          const prepared = await api.post('/api/stealth/spend/prepare', {
            paymentId,
            destinationAddress,
          });

          // 2. Sign with cash stealth spending key (SecureStore)
          const { serializedSignedTx } = await signCashSpendTransaction(
            prepared.serializedUnsignedTx,
            prepared.ephemeralR,
            prepared.stealthAddress,
          );

          // 3. Submit to Solana
          const txBytes = Buffer.from(serializedSignedTx, 'base64');
          const txSignature = await connection.sendRawTransaction(txBytes, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });

          // 4. Confirm
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');
          await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'processed');

          // 5. Register spend
          await api.post('/api/stealth/spend/confirm', { paymentId, txSignature });

          consolidated++;
          __DEV__ && console.log(`[Consolidate] Payment ${paymentId} consolidated, tx: ${txSignature.slice(0, 12)}`);
        } catch (err: any) {
          errors++;
          console.error(`[Consolidate] Failed for payment ${paymentId}:`, err?.message);
        }
      }

      setIsConsolidating(false);

      if (errors > 0 && consolidated === 0) {
        setError(`Consolidation failed (${errors} error${errors > 1 ? 's' : ''})`);
        return null;
      }

      return { consolidated, errors };
    },
    [api],
  );

  return { isConsolidating, error, consolidate };
}
