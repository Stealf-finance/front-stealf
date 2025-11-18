import { useState, useCallback } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import stealfService from '../services/stealfService';

/**
 * Hook React pour gérer le Stealf SDK (Private Wallet + MPC)
 *
 * Utilisation :
 * ```tsx
 * const { linkWallet, retrieveWallets, isLoading, error } = useStealf();
 *
 * // Au signup
 * const result = await linkWallet(gridWalletAddress);
 *
 * // Au login
 * const wallets = await retrieveWallets(gridWalletAddress);
 * ```
 */
export function useStealf() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Crée et lie un nouveau Private Wallet au Grid Smart Account
   * À utiliser lors du SIGNUP
   */
  const linkWallet = useCallback(async (gridWalletAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stealfService.linkPrivateWallet(gridWalletAddress);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère les wallets liés depuis le MPC
   * À utiliser lors du LOGIN
   */
  const retrieveWallets = useCallback(async (gridWalletAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const wallets = await stealfService.retrieveLinkedWallets(gridWalletAddress);
      return wallets;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Vérifie si l'utilisateur a déjà des wallets liés
   */
  const checkHasLinkedWallets = useCallback(async (gridWalletAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const hasWallets = await stealfService.hasLinkedWallets(gridWalletAddress);
      return hasWallets;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Récupère le Keypair du Private Wallet depuis le stockage sécurisé
   */
  const getPrivateWalletKeypair = useCallback(async () => {
    try {
      const keypair = await stealfService.getPrivateWalletKeypair();
      return keypair;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, []);

  /**
   * Supprime les données du Private Wallet lors de la déconnexion
   */
  const clearWalletData = useCallback(async () => {
    try {
      await stealfService.clearPrivateWalletData();
    } catch (err) {
      const error = err as Error;
      setError(error);
    }
  }, []);

  return {
    linkWallet,
    retrieveWallets,
    checkHasLinkedWallets,
    getPrivateWalletKeypair,
    clearWalletData,
    isLoading,
    error,
  };
}

export default useStealf;