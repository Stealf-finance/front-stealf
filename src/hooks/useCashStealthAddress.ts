/**
 * useCashStealthAddress — Hook pour gérer la meta-adresse stealth du cash wallet.
 *
 * Au montage :
 *   1. Vérifie SecureStore (getStoredCashMetaAddress)
 *   2. Si absente : génère les clés + enregistre côté backend via POST /api/stealth/register-cash
 *   3. Gère le 409 (déjà enregistré) comme succès silencieux
 *   4. Expose cashMetaAddress, isLoading, error, refresh
 *
 * Namespace SecureStore distinct : cash_stealth_* (jamais stealth_*)
 * Requirements : 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../services/clientStealf';
import {
  getStoredCashMetaAddress,
  generateAndStoreCashKeys,
} from '../services/cashStealthCrypto';

interface CashStealthAddressState {
  cashMetaAddress: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCashStealthAddress(): CashStealthAddressState {
  const [cashMetaAddress, setCashMetaAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const init = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Vérifier SecureStore
      const stored = await getStoredCashMetaAddress();
      if (stored) {
        setCashMetaAddress(stored);
        return;
      }

      // 2. Générer les clés cash localement
      const keys = await generateAndStoreCashKeys();

      // 3. Enregistrer côté backend
      try {
        await api.post('/api/stealth/register-cash', {
          viewingPublicKey: keys.viewingPublicKey,
          viewingPrivateKeyHex: keys.viewingPrivateKeyHex,
          spendingPublicKey: keys.spendingPublicKey,
        });
      } catch (registerErr: any) {
        // 409 = déjà enregistré (idempotent) — continuer avec la meta-adresse locale
        if (!registerErr?.message?.includes('409')) {
          throw registerErr;
        }
      }

      setCashMetaAddress(keys.metaAddress);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize cash stealth address');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    init();
  }, []);

  return { cashMetaAddress, isLoading, error, refresh: init };
}
