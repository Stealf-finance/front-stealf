import { useState, useCallback, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import ephemeralRollupService, { EREndpoint } from '../services/ephemeralRollupService';
import solanaWalletService from '../services/solanaWalletService';

export interface ERTransferResult {
  initSignature: string;
  delegateSignature: string;
  transferSignature: string;
  transferDuration: number;
}

export interface ERTransferProgress {
  step: string;
  signature?: string;
}

/**
 * Hook pour gérer les transferts Ephemeral Rollup
 * Permet d'exécuter des transactions SOL ultra-rapides (~80ms)
 */
export function useEphemeralTransfer() {
  const [isTransferring, setIsTransferring] = useState(false);
  const [progress, setProgress] = useState<ERTransferProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ERTransferResult | null>(null);
  const [isERAvailable, setIsERAvailable] = useState<boolean | null>(null);
  const [currentEndpoint, setCurrentEndpoint] = useState<EREndpoint>(
    ephemeralRollupService.getCurrentEndpoint()
  );
  const [availableEndpoints] = useState<EREndpoint[]>(
    ephemeralRollupService.getAvailableEndpoints()
  );

  /**
   * Vérifie la disponibilité de l'Ephemeral Rollup
   */
  const checkERAvailability = useCallback(async () => {
    try {
      const available = await ephemeralRollupService.checkERAvailability();
      setIsERAvailable(available);
      return available;
    } catch (err) {
      console.error('Error checking ER availability:', err);
      setIsERAvailable(false);
      return false;
    }
  }, []);

  /**
   * Exécute un transfert instantané via Ephemeral Rollup
   */
  const executeERTransfer = useCallback(
    async (recipientAddress: string, amountSOL: number): Promise<ERTransferResult | null> => {
      setIsTransferring(true);
      setError(null);
      setProgress(null);
      setResult(null);

      try {
        // 1. Récupérer le wallet de l'utilisateur
        const keypair = solanaWalletService.getKeypair();
        if (!keypair) {
          throw new Error('Wallet not loaded. Please load wallet first.');
        }

        // 2. Vérifier la disponibilité de l'ER
        console.log('🔍 Checking Ephemeral Rollup availability...');
        const erAvailable = await checkERAvailability();
        if (!erAvailable) {
          throw new Error(
            'Ephemeral Rollup not available. Please ensure the ER validator is running.'
          );
        }

        // 3. Exécuter le workflow complet
        console.log('🚀 Starting Ephemeral Rollup transfer...');
        const transferResult = await ephemeralRollupService.executeFullERTransfer(
          keypair,
          recipientAddress,
          amountSOL,
          (step: string, signature?: string) => {
            console.log(`📊 Progress: ${step}`, signature);
            setProgress({ step, signature });
          }
        );

        setResult(transferResult);
        console.log('✅ Ephemeral Rollup transfer completed!', transferResult);

        return transferResult;
      } catch (err: any) {
        const errorMessage = err?.message || 'Unknown error during ER transfer';
        console.error('❌ Ephemeral Rollup transfer failed:', errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setIsTransferring(false);
        setProgress(null);
      }
    },
    [checkERAvailability]
  );

  /**
   * Change l'endpoint ER utilisé
   */
  const changeEndpoint = useCallback((endpoint: EREndpoint) => {
    ephemeralRollupService.setEndpoint(endpoint);
    setCurrentEndpoint(endpoint);
    setIsERAvailable(null); // Reset availability status
    console.log(`🔄 Switched to ${endpoint.toUpperCase()} endpoint`);
  }, []);

  /**
   * Teste la latence d'un endpoint
   */
  const testEndpointLatency = useCallback(async (endpoint: EREndpoint) => {
    return await ephemeralRollupService.testEndpointLatency(endpoint);
  }, []);

  /**
   * Trouve et sélectionne automatiquement le meilleur endpoint
   */
  const selectBestEndpoint = useCallback(async () => {
    console.log('🔍 Finding best Ephemeral Rollup endpoint...');
    const bestEndpoint = await ephemeralRollupService.findBestEndpoint();
    changeEndpoint(bestEndpoint);
    return bestEndpoint;
  }, [changeEndpoint]);

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setIsTransferring(false);
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  return {
    // État
    isTransferring,
    progress,
    error,
    result,
    isERAvailable,
    currentEndpoint,
    availableEndpoints,

    // Actions
    executeERTransfer,
    checkERAvailability,
    changeEndpoint,
    testEndpointLatency,
    selectBestEndpoint,
    reset,
  };
}
