/**
 * PrivateWalletContext - Cold wallet state management and session handling
 *
 * Manages wallet unlock state, inactivity timeout (90s), and keypair in memory.
 * The keypair is only held in memory when unlocked and never persisted.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Keypair } from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  secureStorageService,
  AuthMethod,
  UnlockError,
  DeviceSecurityStatus,
} from '../services/coldWallet/secureStorage';

// Session timeout in milliseconds (90 seconds)
const SESSION_TIMEOUT_MS = 90 * 1000;

// AsyncStorage keys for non-sensitive data
const ASYNC_STORAGE_KEYS = {
  WALLET_INITIALIZED: 'privateWallet_initialized',
  PUBLIC_KEY: 'privateWallet_publicKey',
  AUTH_METHOD: 'privateWallet_authMethod',
};

/**
 * Private wallet state
 */
export interface PrivateWalletState {
  isInitialized: boolean;
  isUnlocked: boolean;
  publicKey: string | null;
  authMethod: AuthMethod | null;
  lastActivity: number;
  biometricFailCount: number;
  passwordFailCount: number;
  lockoutUntil: number | null;
  deviceSecurity: DeviceSecurityStatus | null;
}

/**
 * Unlock result type
 */
export type UnlockResult =
  | { success: true }
  | { success: false; error: UnlockError | 'lockout' | 'max_attempts' };

/**
 * Context type
 */
export interface PrivateWalletContextType {
  state: PrivateWalletState;

  // Initialization
  initialize: () => Promise<void>;
  createWallet: (keypair: Keypair, authMethod: AuthMethod, password: string) => Promise<void>;
  restoreWallet: (keypair: Keypair, authMethod: AuthMethod, password: string) => Promise<void>;

  // Unlock/Lock
  unlock: (method: 'biometric' | 'password', password?: string) => Promise<UnlockResult>;
  lock: () => void;

  // Session
  resetInactivityTimer: () => void;
  getKeypair: () => Keypair | null;

  // Utils
  deleteWallet: () => Promise<void>;
  checkBiometrics: () => Promise<{ available: boolean; type: 'fingerprint' | 'facial' | 'iris' | null }>;
  getRemainingLockoutTime: () => number;
}

const PrivateWalletContext = createContext<PrivateWalletContextType | null>(null);

/**
 * Calculate lockout duration based on failure count
 */
function getLockoutDuration(failCount: number): number {
  if (failCount < 5) return 0;

  const lockoutTiers = [
    30 * 1000,    // 30 seconds after 5 failures
    60 * 1000,    // 1 minute after 6 failures
    5 * 60 * 1000,  // 5 minutes after 7 failures
    15 * 60 * 1000, // 15 minutes after 8+ failures
  ];

  const tierIndex = Math.min(failCount - 5, lockoutTiers.length - 1);
  return lockoutTiers[tierIndex];
}

export function PrivateWalletProvider({ children }: { children: ReactNode }) {
  // State
  const [state, setState] = useState<PrivateWalletState>({
    isInitialized: false,
    isUnlocked: false,
    publicKey: null,
    authMethod: null,
    lastActivity: Date.now(),
    biometricFailCount: 0,
    passwordFailCount: 0,
    lockoutUntil: null,
    deviceSecurity: null,
  });

  // Refs for timer and keypair (keypair in ref to avoid re-renders)
  const keypairRef = useRef<Keypair | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Clear inactivity timer
   */
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  /**
   * Lock the wallet
   */
  const lock = useCallback(() => {
    clearInactivityTimer();
    keypairRef.current = null;
    setState(prev => ({
      ...prev,
      isUnlocked: false,
      lastActivity: Date.now(),
    }));
  }, [clearInactivityTimer]);

  /**
   * Start inactivity timer
   */
  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();

    inactivityTimerRef.current = setTimeout(() => {
      lock();
    }, SESSION_TIMEOUT_MS);
  }, [clearInactivityTimer, lock]);

  /**
   * Reset inactivity timer (called on user activity)
   */
  const resetInactivityTimer = useCallback(() => {
    if (state.isUnlocked) {
      setState(prev => ({ ...prev, lastActivity: Date.now() }));
      startInactivityTimer();
    }
  }, [state.isUnlocked, startInactivityTimer]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - start timer
        if (state.isUnlocked) {
          startInactivityTimer();
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - reset timer if still unlocked
        if (state.isUnlocked) {
          resetInactivityTimer();
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isUnlocked, startInactivityTimer, resetInactivityTimer]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearInactivityTimer();
      keypairRef.current = null;
    };
  }, [clearInactivityTimer]);

  /**
   * Initialize context - load saved state
   */
  const initialize = useCallback(async () => {
    try {
      // Check device security
      const deviceSecurity = await secureStorageService.checkDeviceSecurity();

      // Check if wallet exists
      const hasWallet = await secureStorageService.hasWallet();

      if (hasWallet) {
        const publicKey = await secureStorageService.getStoredPublicKey();
        const authMethod = await secureStorageService.getStoredAuthMethod();

        setState(prev => ({
          ...prev,
          isInitialized: true,
          publicKey,
          authMethod,
          deviceSecurity,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isInitialized: false,
          deviceSecurity,
        }));
      }
    } catch (error) {
      console.error('Failed to initialize PrivateWalletContext:', error);
    }
  }, []);

  /**
   * Create new wallet
   */
  const createWallet = useCallback(async (
    keypair: Keypair,
    authMethod: AuthMethod,
    password: string
  ) => {
    await secureStorageService.saveWallet(keypair, authMethod, password);

    // Store non-sensitive data
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.WALLET_INITIALIZED, 'true');
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PUBLIC_KEY, keypair.publicKey.toBase58());
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.AUTH_METHOD, authMethod);

    // Update state and unlock
    keypairRef.current = keypair;
    setState(prev => ({
      ...prev,
      isInitialized: true,
      isUnlocked: true,
      publicKey: keypair.publicKey.toBase58(),
      authMethod,
      lastActivity: Date.now(),
      biometricFailCount: 0,
      passwordFailCount: 0,
    }));

    startInactivityTimer();
  }, [startInactivityTimer]);

  /**
   * Restore wallet from seed phrase
   */
  const restoreWallet = useCallback(async (
    keypair: Keypair,
    authMethod: AuthMethod,
    password: string
  ) => {
    // Same as create wallet
    await createWallet(keypair, authMethod, password);
  }, [createWallet]);

  /**
   * Unlock wallet
   */
  const unlock = useCallback(async (
    method: 'biometric' | 'password',
    password?: string
  ): Promise<UnlockResult> => {
    // Check lockout
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
      return { success: false, error: 'lockout' };
    }

    let result;

    if (method === 'biometric') {
      result = await secureStorageService.unlockWithBiometrics();

      if (!result.success) {
        const newFailCount = state.biometricFailCount + 1;

        // After 3 biometric failures, suggest password
        if (newFailCount >= 3) {
          setState(prev => ({
            ...prev,
            biometricFailCount: newFailCount,
          }));
          return { success: false, error: 'max_attempts' };
        }

        setState(prev => ({
          ...prev,
          biometricFailCount: newFailCount,
        }));
        return { success: false, error: result.error };
      }
    } else {
      if (!password) {
        return { success: false, error: 'password_invalid' };
      }

      result = await secureStorageService.unlockWithPassword(password);

      if (!result.success) {
        const newFailCount = state.passwordFailCount + 1;
        const lockoutDuration = getLockoutDuration(newFailCount);

        setState(prev => ({
          ...prev,
          passwordFailCount: newFailCount,
          lockoutUntil: lockoutDuration > 0 ? Date.now() + lockoutDuration : null,
        }));

        if (lockoutDuration > 0) {
          return { success: false, error: 'lockout' };
        }
        return { success: false, error: result.error };
      }
    }

    // Success
    keypairRef.current = result.keypair;
    setState(prev => ({
      ...prev,
      isUnlocked: true,
      lastActivity: Date.now(),
      biometricFailCount: 0,
      passwordFailCount: 0,
      lockoutUntil: null,
    }));

    startInactivityTimer();
    return { success: true };
  }, [state.biometricFailCount, state.passwordFailCount, state.lockoutUntil, startInactivityTimer]);

  /**
   * Get keypair (only if unlocked)
   */
  const getKeypair = useCallback((): Keypair | null => {
    if (!state.isUnlocked) {
      return null;
    }
    return keypairRef.current;
  }, [state.isUnlocked]);

  /**
   * Delete wallet
   */
  const deleteWallet = useCallback(async () => {
    lock();
    await secureStorageService.deleteWallet();
    await AsyncStorage.multiRemove([
      ASYNC_STORAGE_KEYS.WALLET_INITIALIZED,
      ASYNC_STORAGE_KEYS.PUBLIC_KEY,
      ASYNC_STORAGE_KEYS.AUTH_METHOD,
    ]);

    setState(prev => ({
      ...prev,
      isInitialized: false,
      isUnlocked: false,
      publicKey: null,
      authMethod: null,
    }));
  }, [lock]);

  /**
   * Check biometrics availability
   */
  const checkBiometrics = useCallback(async () => {
    const available = await secureStorageService.isBiometricsAvailable();
    const type = await secureStorageService.getBiometricType();
    return { available, type };
  }, []);

  /**
   * Get remaining lockout time in seconds
   */
  const getRemainingLockoutTime = useCallback((): number => {
    if (!state.lockoutUntil) return 0;
    const remaining = state.lockoutUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }, [state.lockoutUntil]);

  const value: PrivateWalletContextType = {
    state,
    initialize,
    createWallet,
    restoreWallet,
    unlock,
    lock,
    resetInactivityTimer,
    getKeypair,
    deleteWallet,
    checkBiometrics,
    getRemainingLockoutTime,
  };

  return (
    <PrivateWalletContext.Provider value={value}>
      {children}
    </PrivateWalletContext.Provider>
  );
}

/**
 * Hook to use the private wallet context
 */
export function usePrivateWallet(): PrivateWalletContextType {
  const context = useContext(PrivateWalletContext);
  if (!context) {
    throw new Error('usePrivateWallet must be used within a PrivateWalletProvider');
  }
  return context;
}

export default PrivateWalletContext;
