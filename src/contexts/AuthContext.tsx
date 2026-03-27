import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from '../services/auth/authStorage';
import { socketService } from '../services/real-time/socketService';
import { walletKeyCache } from '../services/cache/walletKeyCache';
import { registerYieldSocketListener, unregisterYieldSocketListener, prefetchYieldData } from '../services/yield/balance';
import { attachWalletListeners, detachWalletListeners } from '../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';
import { umbraClearSeed } from '../services/solana/umbraSeed';
import { clearUmbraState } from '../hooks/transactions/useUmbra';

const MWA_AUTH_TOKEN_KEY = 'mwa_auth_token';
const WALLET_SESSION_TOKEN_KEY = 'wallet_session_token';

interface UserData {
  email?: string;
  username?: string;
  cash_wallet?: string;
  stealf_wallet?: string;
  subOrgId?: string;
  points?: number;
  authMethod?: 'passkey' | 'wallet';
}

interface AuthContextType {
  isAuthenticated: boolean;
  isWalletAuth: boolean;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUserData: (data: UserData | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, logout: turnkeyLogout } = useTurnkey();
  const queryClient = useQueryClient();
  const [userDataState, setUserDataState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      if (__DEV__) console.log('[AuthContext] loadAuth start - session:', !!session, 'user:', !!user);

      // Check for wallet auth session first (persisted across app restarts)
      const storedData = await authStorage.getUserData();
      if (storedData?.authMethod === 'wallet' && storedData?.stealf_wallet && storedData?.cash_wallet) {
        const walletToken = await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY);
        if (walletToken) {
          // Validate token against backend before restoring session
          try {
            const API_URL = process.env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/users/${storedData.cash_wallet}`, {
              headers: { Authorization: `Bearer ${walletToken}` },
            });
            if (!res.ok) throw new Error('Token invalid');
            if (__DEV__) console.log('[AuthContext] Restoring wallet auth session');
            setUserDataState(storedData);
            attachWalletListeners(queryClient);
            socketService.connect(walletToken);
            socketService.subscribeToWallet(storedData.cash_wallet);
            if (storedData.stealf_wallet) socketService.subscribeToWallet(storedData.stealf_wallet);
            if (storedData.subOrgId) {
              socketService.subscribeToYield(storedData.subOrgId);
              registerYieldSocketListener(queryClient, storedData.subOrgId);
              prefetchYieldData(queryClient, storedData.subOrgId, walletToken);
            }
            setLoading(false);
            return;
          } catch {
            if (__DEV__) console.log('[AuthContext] Wallet token invalid, clearing session');
            await authStorage.clearUserData();
            await SecureStore.deleteItemAsync(WALLET_SESSION_TOKEN_KEY);
            await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY);
          }
        } else {
          await authStorage.clearUserData();
        }
      }

      // Standard Turnkey/passkey auth
      if (session && user) {
        setUserDataState({
          email: user.userEmail || storedData?.email || '',
          username: storedData?.username || '',
          cash_wallet: storedData?.cash_wallet || '',
          stealf_wallet: storedData?.stealf_wallet || '',
          subOrgId: user.userId,
          points: storedData?.points ?? 0,
          authMethod: 'passkey',
        });

        if (session.token) {
          attachWalletListeners(queryClient);
          socketService.connect(session.token);
          if (storedData?.cash_wallet) socketService.subscribeToWallet(storedData.cash_wallet);
          if (storedData?.stealf_wallet) socketService.subscribeToWallet(storedData.stealf_wallet);
          if (user.userId) {
            socketService.subscribeToYield(user.userId);
            registerYieldSocketListener(queryClient, user.userId);
            prefetchYieldData(queryClient, user.userId, session.token);
          }
        }
      } else {
        setUserDataState(null);
        detachWalletListeners();
        unregisterYieldSocketListener();
        socketService.disconnect();
      }
      if (__DEV__) console.log('[AuthContext] loadAuth done, setting loading=false');
      setLoading(false);
    };

    loadAuth().catch((err) => {
      if (__DEV__) console.error('[AuthContext] loadAuth crashed:', err);
      setLoading(false);
    });
  }, [session, user]);

  const saveUserData = async (data: UserData | null) => {
    setUserDataState(data);
    if (data === null) {
      await authStorage.clearUserData();
      socketService.disconnect();
    } else {
      await authStorage.setUserData(data);
      if (data.cash_wallet) {
        attachWalletListeners(queryClient);
        // For wallet auth, get token from SecureStore; for passkey use Turnkey session
        const token = data.authMethod === 'wallet'
          ? await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY)
          : session?.token;
        if (token) socketService.connect(token);
        socketService.subscribeToWallet(data.cash_wallet);
        if (data.stealf_wallet) socketService.subscribeToWallet(data.stealf_wallet);
        if (data.subOrgId) {
          socketService.subscribeToYield(data.subOrgId);
          registerYieldSocketListener(queryClient, data.subOrgId);
          if (token) prefetchYieldData(queryClient, data.subOrgId, token);
        }
      }
    }
  };

  const logout = async () => {
    try {
      const isWallet = userDataState?.authMethod === 'wallet';
      if (!isWallet) {
        await turnkeyLogout();
      } else {
        // Clear wallet-specific SecureStore keys
        await SecureStore.deleteItemAsync(WALLET_SESSION_TOKEN_KEY);
        await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY);
      }
      await authStorage.clearUserData();
      await walletKeyCache.clearAll();
      await umbraClearSeed();
      clearUmbraState();
      setUserDataState(null);
      detachWalletListeners();
      unregisterYieldSocketListener();
      socketService.disconnect();
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    }
  };

  const isWalletAuth = userDataState?.authMethod === 'wallet';
  const isAuthenticated = isWalletAuth
    ? !!userDataState?.stealf_wallet && !!userDataState?.cash_wallet
    : !!session && !!user && !!userDataState?.cash_wallet;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isWalletAuth,
        userData: userDataState,
        loading,
        logout,
        setUserData: saveUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
