/**
 * useStealthAddress — Hook pour gérer la meta-adresse stealth de l'utilisateur.
 *
 * Au montage :
 *   1. Vérifie SecureStore (getStoredMetaAddress)
 *   2. Si absente : génère + enregistre côté backend (register)
 *   3. Expose metaAddress + isLoading + error
 *
 * Requirements : 1.4, 1.6
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../services/api/clientStealf';
import {
  generateAndStoreKeys,
  getStoredMetaAddress,
} from '../services/stealthCrypto';

interface StealthAddressState {
  metaAddress: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useStealthAddress(): StealthAddressState {
  const [metaAddress, setMetaAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useAuthenticatedApi();

  const init = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Vérifier SecureStore
      const stored = await getStoredMetaAddress();
      if (stored) {
        setMetaAddress(stored);
        return;
      }

      // 2. Générer les clés localement
      const keys = await generateAndStoreKeys();

      // 3. Enregistrer côté backend (viewing key chiffrée par le backend)
      try {
        await api.post('/api/stealth/register', {
          viewingPublicKey: keys.viewingPublicKey,
          viewingPrivateKeyHex: keys.viewingPrivateKeyHex,
          spendingPublicKey: keys.spendingPublicKey,
        });
      } catch (registerErr: any) {
        // 409 = déjà enregistré (idempotent) — continuer
        if (!registerErr?.message?.includes('409')) {
          throw registerErr;
        }
      }

      setMetaAddress(keys.metaAddress);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize stealth address');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    init();
  }, []);

  return { metaAddress, isLoading, error, refresh: init };
}
