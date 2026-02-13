import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
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
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isLocked, setIsLocked] = useState(false);
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
    onForeground: useCallback(async () => {
      if (isAuthenticated) {
        // Diagnostic: check SecureStore on foreground
        const key = await SecureStore.getItemAsync('stealf_private_key');
        const mnemonic = await SecureStore.getItemAsync('stealf_wallet_mnemonic');
        console.log('[Session] onForeground SecureStore check:', {
          privateKey: key ? `found (${key.length})` : 'NULL',
          mnemonic: mnemonic ? `found` : 'NULL',
        });
        sessionHandler.handleForeground();
        if (sessionHandler.shouldLock()) {
          setIsLocked(true);
        }
      }
    }, [isAuthenticated]),
    onBackground: useCallback(async () => {
      if (isAuthenticated) {
        // Diagnostic: check SecureStore on background
        const key = await SecureStore.getItemAsync('stealf_private_key');
        const mnemonic = await SecureStore.getItemAsync('stealf_wallet_mnemonic');
        console.log('[Session] onBackground SecureStore check:', {
          privateKey: key ? `found (${key.length})` : 'NULL',
          mnemonic: mnemonic ? `found` : 'NULL',
        });
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
      if (result) {
        console.log('[Session] Turnkey session refreshed successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Session] Failed to refresh Turnkey session:', error);
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
        // Diagnostic: check SecureStore BEFORE session refresh
        const keyBefore = await SecureStore.getItemAsync('stealf_private_key');
        const mnemonicBefore = await SecureStore.getItemAsync('stealf_wallet_mnemonic');
        const userDataBefore = await SecureStore.getItemAsync('user_data');
        console.log('[Session] SecureStore BEFORE refresh:', {
          privateKey: keyBefore ? `found (${keyBefore.length})` : 'NULL',
          mnemonic: mnemonicBefore ? `found (${mnemonicBefore.split(' ').length} words)` : 'NULL',
          userData: userDataBefore ? `found (${userDataBefore.length})` : 'NULL',
        });

        await refreshTurnkeySession();

        // Diagnostic: check SecureStore AFTER session refresh
        const keyAfter = await SecureStore.getItemAsync('stealf_private_key');
        const mnemonicAfter = await SecureStore.getItemAsync('stealf_wallet_mnemonic');
        const userDataAfter = await SecureStore.getItemAsync('user_data');
        console.log('[Session] SecureStore AFTER refresh:', {
          privateKey: keyAfter ? `found (${keyAfter.length})` : 'NULL',
          mnemonic: mnemonicAfter ? `found (${mnemonicAfter.split(' ').length} words)` : 'NULL',
          userData: userDataAfter ? `found (${userDataAfter.length})` : 'NULL',
        });

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
      console.error('[Session] Unlock error:', error);
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

  const value: SessionContextType = {
    isLocked,
    unlockWithAuth,
    lockApp,
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
