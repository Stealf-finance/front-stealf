import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { sessionHandler } from '../services/sessionHandler';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from './AuthContext';
import LockScreen from '../app/(lock)/LockScreen';
import { View, StyleSheet } from 'react-native';

interface SessionContextType {
  isLocked: boolean;
  unlockWithAuth: () => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  setSuppressLock: (suppress: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isLocked, setIsLocked] = useState(false);
  const suppressLockRef = useRef(false);
  const { refreshSession } = useTurnkey();
  const { isAuthenticated, userData } = useAuth();

  // Register lock callback with session handler
  useEffect(() => {
    sessionHandler.setOnLockCallback(() => {
      if (isAuthenticated) {
        setIsLocked(true);
      }
    });

    // Start lock timer when authenticated
    if (isAuthenticated) {
      sessionHandler.startLockTimer();
    }

    return () => {
      sessionHandler.reset();
    };
  }, [isAuthenticated]);

  // Handle app state changes
  useAppState({
    onForeground: useCallback(() => {
      if (isAuthenticated && !suppressLockRef.current) {
        sessionHandler.handleForeground();
        if (sessionHandler.shouldLock()) {
          setIsLocked(true);
        }
      }
    }, [isAuthenticated]),
    onBackground: useCallback(() => {
      if (isAuthenticated && !suppressLockRef.current) {
        sessionHandler.handleBackground();
        setIsLocked(true);
      }
    }, [isAuthenticated]),
  });

  /**
   * Refresh Turnkey session (without prompting for passkey)
   * Returns TStampLoginResponse | undefined
   */
  const refreshTurnkeySession = useCallback(async () => {
    try {
      const result = await refreshSession();
      return !!result;
    } catch (error) {
      if (__DEV__) console.error('[Session] Failed to refresh Turnkey session:', error);
      return false;
    }
  }, [refreshSession]);

  /**
   * Unlock with biometric authentication (FaceID/TouchID)
   * After biometric success, refreshes Turnkey session
   */
  const unlockWithAuth = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { success: false, error: 'entication not available' };
      }

      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Stealf',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (biometricResult.success) {
        await refreshTurnkeySession();
        sessionHandler.unlock();
        setIsLocked(false);
        return { success: true };
      }

      const failedResult = biometricResult as { success: false; error: string };
      if (failedResult.error === 'user_cancel') {
        return { success: false, error: 'Authentication cancelled' };
      }

      return { success: false, error: 'Biometric authentication failed' };

    } catch (error: any) {
      if (__DEV__) console.error('[Session] Unlock error:', error);
      return { success: false, error: error?.message || 'Authentication failed' };
    }
  }, [refreshTurnkeySession]);

  /**
   * Manually lock the app
   */
  const lockApp = useCallback(() => {
    sessionHandler.lock();
    setIsLocked(true);
  }, []);

  const setSuppressLock = useCallback((suppress: boolean) => {
    suppressLockRef.current = suppress;
  }, []);

  const value: SessionContextType = {
    isLocked,
    unlockWithAuth,
    lockApp,
    setSuppressLock,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
      {isLocked && isAuthenticated && (
        <View style={styles.lockOverlay}>
          <LockScreen onUnlock={unlockWithAuth} username={userData?.username} />
        </View>
      )}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#000000',
  },
});
