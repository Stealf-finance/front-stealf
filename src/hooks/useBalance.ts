import { useState, useEffect, useCallback } from 'react';
import type { Balance } from '../types';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Cache global pour éviter les rechargements inutiles
const balanceCache: { [key: string]: { data: Balance; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 secondes

// Export function to invalidate cache (call after transactions)
export function invalidateBalanceCache(walletAddress?: string) {
  if (walletAddress) {
    delete balanceCache[walletAddress];
    console.log('🗑️ Balance cache invalidated for:', walletAddress);
  } else {
    // Clear all cache
    Object.keys(balanceCache).forEach(key => delete balanceCache[key]);
    console.log('🗑️ All balance cache invalidated');
  }
}

export function useBalance(walletAddress: string | null) {
  // Vérifier le cache initial
  const initialCache = walletAddress ? balanceCache[walletAddress] : null;
  const hasValidCache = initialCache && Date.now() - initialCache.timestamp < CACHE_DURATION;

  const [balance, setBalance] = useState<Balance | null>(hasValidCache ? initialCache.data : null);
  const [loading, setLoading] = useState(!hasValidCache);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async (silent = false) => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    // Vérifier le cache d'abord
    const cached = balanceCache[walletAddress];
    const cacheIsValid = cached && Date.now() - cached.timestamp < CACHE_DURATION;

    if (cacheIsValid) {
      console.log('💾 Using cached balance:', cached.data.sol, 'SOL');
      setBalance(cached.data);
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // TEMPORARY FIX: Lire directement depuis Solana blockchain au lieu de Grid SDK
      // Grid SDK indexer ne voit pas les airdrops directs
      console.log('🔍 Fetching balance directly from Solana for:', walletAddress);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const publicKey = new PublicKey(walletAddress);
      const lamports = await connection.getBalance(publicKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;

      console.log(`💰 Direct Solana balance: ${solBalance} SOL (${lamports} lamports)`);

      // Pour l'instant, on ne récupère que SOL, pas les tokens
      // TODO: Ajouter getParsedTokenAccountsByOwner pour les tokens
      const balanceData: Balance = {
        sol: solBalance,
        tokens: [], // Grid SDK tokens could be added here if needed
      };

      setBalance(balanceData);

      // Mettre en cache
      balanceCache[walletAddress] = {
        data: balanceData,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err as Error);
      // Garder l'ancienne balance en cas d'erreur
      if (!balance) {
        setBalance(null);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress, balance]);

  useEffect(() => {
    fetchBalance(false);

    // Refresh silencieux toutes les 30 secondes
    const interval = setInterval(() => {
      fetchBalance(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  const refresh = useCallback(() => {
    fetchBalance(false);
  }, [fetchBalance]);

  return { balance, loading, error, refresh };
}
