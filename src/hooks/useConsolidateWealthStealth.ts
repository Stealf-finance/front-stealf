/**
 * useConsolidateWealthStealth — Consolidates all wealth stealth UTXOs to the main wealth address.
 *
 * Mirrors useConsolidateCashStealth but uses:
 *   - signSpendTransaction() from stealthCrypto (wealth SecureStore keys: stealth_spending_seed)
 *   - destinationAddress = userData.stealth_wallet (wealth main address)
 *
 * For each spendable payment:
 *   1. POST /api/stealth/spend/prepare → unsigned TX + ephemeralR + stealthAddress
 *   2. signSpendTransaction() — reads wealth stealth keys from SecureStore
 *   3. Submit signed TX to Solana RPC
 *   4. POST /api/stealth/spend/confirm → mark payment as spent
 */

import { useState, useCallback } from 'react';
import { Connection } from '@solana/web3.js';
import { useAuthenticatedApi } from '../services/clientStealf';
import { useAuth } from '../contexts/AuthContext';
import { signSpendTransaction } from '../services/stealthCrypto';
import { WealthStealthPayment } from './useWealthStealthBalance';

const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || '';

interface ConsolidateResult {
  consolidated: number;
  errors: number;
}

interface ConsolidateState {
  isConsolidating: boolean;
  error: string | null;
  consolidate: (payments: WealthStealthPayment[]) => Promise<ConsolidateResult | null>;
}

export function useConsolidateWealthStealth(): ConsolidateState {
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();
  const { userData } = useAuth();

  const consolidate = useCallback(
    async (payments: WealthStealthPayment[]): Promise<ConsolidateResult | null> => {
      if (payments.length === 0) return { consolidated: 0, errors: 0 };

      const destinationAddress = userData?.stealf_wallet;
      if (!destinationAddress) {
        setError('Wealth wallet address not found');
        return null;
      }

      setIsConsolidating(true);
      setError(null);

      let consolidated = 0;
      let errors = 0;

      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      for (const payment of payments) {
        try {
          // 1. Build unsigned TX
          const prepared = await api.post('/api/stealth/spend/prepare', {
            paymentId: payment._id,
            destinationAddress,
          });

          // 2. Sign with wealth stealth spending key (SecureStore: stealth_spending_seed)
          const { serializedSignedTx } = await signSpendTransaction(
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
          await api.post('/api/stealth/spend/confirm', { paymentId: payment._id, txSignature });

          consolidated++;
          __DEV__ && console.log(`[WealthConsolidate] Payment ${payment._id} consolidated, tx: ${txSignature.slice(0, 12)}`);
        } catch (err: any) {
          errors++;
          __DEV__ && console.error(`[WealthConsolidate] Failed for payment ${payment._id}:`, err?.message);
        }
      }

      setIsConsolidating(false);

      if (errors > 0 && consolidated === 0) {
        setError(`Consolidation failed (${errors} error${errors > 1 ? 's' : ''})`);
        return null;
      }

      return { consolidated, errors };
    },
    [api, userData],
  );

  return { isConsolidating, error, consolidate };
}
