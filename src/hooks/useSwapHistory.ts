/**
 * useSwapHistory
 * Manages swap history stored locally in AsyncStorage
 * No data is ever sent to the backend for privacy
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SwapHistoryEntry, UseSwapHistoryResult } from '../types/swap';
import {
  SWAP_HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from '../constants/tokens';

/**
 * Generate a unique ID for a swap entry
 */
function generateId(): string {
  return `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useSwapHistory(): UseSwapHistoryResult {
  const [history, setHistory] = useState<SwapHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load history from AsyncStorage on mount
   */
  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Load swap history from local storage
   */
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(SWAP_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SwapHistoryEntry[];
        // Sort by timestamp descending (most recent first)
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('[useSwapHistory] Failed to load history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save a new swap to history
   * Implements FIFO - removes oldest entries when limit exceeded
   */
  const saveSwap = useCallback(
    async (entry: Omit<SwapHistoryEntry, 'id' | 'timestamp'>): Promise<void> => {
      try {
        const newEntry: SwapHistoryEntry = {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        };

        // Get current history
        const stored = await AsyncStorage.getItem(SWAP_HISTORY_STORAGE_KEY);
        let currentHistory: SwapHistoryEntry[] = stored ? JSON.parse(stored) : [];

        // Add new entry at the beginning
        currentHistory.unshift(newEntry);

        // Enforce FIFO limit
        if (currentHistory.length > MAX_HISTORY_ENTRIES) {
          currentHistory = currentHistory.slice(0, MAX_HISTORY_ENTRIES);
        }

        // Save to storage
        await AsyncStorage.setItem(
          SWAP_HISTORY_STORAGE_KEY,
          JSON.stringify(currentHistory)
        );

        // Update state
        setHistory(currentHistory);

        console.log('[useSwapHistory] Swap saved:', newEntry.id);
      } catch (error) {
        console.error('[useSwapHistory] Failed to save swap:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Clear all swap history
   */
  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(SWAP_HISTORY_STORAGE_KEY);
      setHistory([]);
      console.log('[useSwapHistory] History cleared');
    } catch (error) {
      console.error('[useSwapHistory] Failed to clear history:', error);
      throw error;
    }
  }, []);

  return {
    history,
    isLoading,
    saveSwap,
    clearHistory,
  };
}

/**
 * Get a single swap entry by ID
 */
export async function getSwapById(id: string): Promise<SwapHistoryEntry | null> {
  try {
    const stored = await AsyncStorage.getItem(SWAP_HISTORY_STORAGE_KEY);
    if (!stored) return null;

    const history = JSON.parse(stored) as SwapHistoryEntry[];
    return history.find((entry) => entry.id === id) || null;
  } catch (error) {
    console.error('[getSwapById] Error:', error);
    return null;
  }
}

/**
 * Build Solana explorer URL for a transaction
 */
export function buildExplorerUrl(transactionId: string, isDevnet = true): string {
  const cluster = isDevnet ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${transactionId}${cluster}`;
}
