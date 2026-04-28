import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from '../services/auth/authStorage';
import { socketService } from '../services/real-time/socketService';
import { walletKeyCache } from '../services/cache/walletKeyCache';
import {
  AUTH_METHOD_KEY,
  MWA_AUTH_TOKEN_KEY,
  MWA_WALLET_ADDRESS_KEY,
  WALLET_SESSION_TOKEN_KEY,
} from '../constants/walletAuth';
import { registerYieldSocketListener, unregisterYieldSocketListener, prefetchYieldData } from '../services/yield/balance';
import { getUserIdHash } from '../services/yield/deposit';
import { attachWalletListeners, detachWalletListeners } from '../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';
import { umbraClearSeed } from '../services/umbra/seed';
import { clearUmbraState } from '../hooks/transactions/useUmbra';

export type AuthMethod = 'passkey' | 'wallet';

interface UserData {
  email?: string;
  username?: string;
  cash_wallet?: string;
  stealf_wallet?: string;
  subOrgId?: string;
  points?: number;
  authMethod?: AuthMethod;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isWalletAuth: boolean;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUserData: (data: UserData | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, logout: turnkeyLogout } = useTurnkey();
  const queryClient = useQueryClient();
  const [userDataState, setUserDataState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionToken = session?.token;
  // Backend's verifyAuth derives userIdHash from req.user.organizationId in JWT.
  // We must use session.organizationId here (the sub-org ID), not user.userId
  // (which is a different identifier scoped to the sub-org).
  const turnkeyUserId = (session as any)?.organizationId || user?.userId;

  // Single source of truth: tries the persisted wallet session first, then falls
  // back to Turnkey passkey state. Re-runs whenever the Turnkey session changes.
  useEffect(() => {
    const loadAuth = async () => {
      if (__DEV__) {
        console.log(
          '[AuthContext] loadAuth — tk session:',
          !!sessionToken,
          'tk user:',
          !!turnkeyUserId,
        );
      }

      const stored = await authStorage.getUserData();

      // 1) Restore an active Seeker wallet session (validate JWT against backend).
      if (stored?.authMethod === 'wallet' && stored?.stealf_wallet && stored?.cash_wallet) {
        const walletToken = await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY);
        if (walletToken) {
          try {
            const res = await fetch(`${API_URL}/api/users/${stored.cash_wallet}`, {
              headers: { Authorization: `Bearer ${walletToken}` },
            });
            if (!res.ok) throw new Error('Token invalid');

            if (__DEV__) console.log('[AuthContext] Restoring wallet session');
            setUserDataState({ ...stored, authMethod: 'wallet' });
            attachWalletListeners(queryClient);
            socketService.connect(walletToken);
            socketService.subscribeToWallet(stored.cash_wallet);
            if (stored.stealf_wallet) socketService.subscribeToWallet(stored.stealf_wallet);
            if (stored.subOrgId) {
              socketService.subscribeToYield(stored.subOrgId, getUserIdHash(stored.subOrgId).toString('hex'));
              registerYieldSocketListener(queryClient, stored.subOrgId);
              prefetchYieldData(queryClient, stored.subOrgId, walletToken);
            }
            setLoading(false);
            return;
          } catch {
            if (__DEV__) console.log('[AuthContext] wallet token invalid, clearing');
            await authStorage.clearUserData();
            await SecureStore.deleteItemAsync(WALLET_SESSION_TOKEN_KEY).catch(() => undefined);
            await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
            await SecureStore.deleteItemAsync(MWA_WALLET_ADDRESS_KEY).catch(() => undefined);
            await SecureStore.deleteItemAsync(AUTH_METHOD_KEY).catch(() => undefined);
          }
        }
      }

      // 2) Standard Turnkey passkey path.
      if (sessionToken && turnkeyUserId) {
        setUserDataState({
          email: user?.userEmail || stored?.email || '',
          username: stored?.username || '',
          cash_wallet: stored?.cash_wallet || '',
          stealf_wallet: stored?.stealf_wallet || '',
          subOrgId: turnkeyUserId,
          points: stored?.points ?? 0,
          authMethod: 'passkey',
        });

        attachWalletListeners(queryClient);
        socketService.connect(sessionToken);
        if (stored?.cash_wallet) socketService.subscribeToWallet(stored.cash_wallet);
        if (stored?.stealf_wallet) socketService.subscribeToWallet(stored.stealf_wallet);
        if (turnkeyUserId) {
          socketService.subscribeToYield(turnkeyUserId, getUserIdHash(turnkeyUserId).toString('hex'));
          registerYieldSocketListener(queryClient, turnkeyUserId);
          prefetchYieldData(queryClient, turnkeyUserId, sessionToken);
        }
        setLoading(false);
        return;
      }

      // 3) No valid session.
      setUserDataState(null);
      detachWalletListeners();
      unregisterYieldSocketListener();
      socketService.disconnect();
      setLoading(false);
    };

    loadAuth().catch((err) => {
      if (__DEV__) console.error('[AuthContext] loadAuth crashed:', err);
      setLoading(false);
    });
  }, [sessionToken, turnkeyUserId]);

  const saveUserData = async (data: UserData | null) => {
    if (__DEV__) console.log('[AuthContext] saveUserData:', JSON.stringify(data));

    if (data === null) {
      setUserDataState(null);
      await authStorage.clearUserData();
      socketService.disconnect();
      return;
    }

    const existing = await authStorage.getUserData();
    const merged: UserData = {
      ...data,
      stealf_wallet: data.stealf_wallet || existing?.stealf_wallet || '',
      authMethod: data.authMethod || existing?.authMethod,
    };

    setUserDataState(merged);
    await authStorage.setUserData(merged);

    if (!merged.cash_wallet) return;

    const token = merged.authMethod === 'wallet'
      ? await SecureStore.getItemAsync(WALLET_SESSION_TOKEN_KEY)
      : sessionToken;

    if (!token) return;

    attachWalletListeners(queryClient);
    socketService.connect(token);
    socketService.subscribeToWallet(merged.cash_wallet);
    if (merged.stealf_wallet) socketService.subscribeToWallet(merged.stealf_wallet);
    if (merged.subOrgId) {
      socketService.subscribeToYield(merged.subOrgId, getUserIdHash(merged.subOrgId).toString('hex'));
      registerYieldSocketListener(queryClient, merged.subOrgId);
      prefetchYieldData(queryClient, merged.subOrgId, token);
    }
  };

  const logout = async () => {
    try {
      const isWallet = userDataState?.authMethod === 'wallet';
      if (!isWallet) {
        await turnkeyLogout();
      } else {
        await SecureStore.deleteItemAsync(WALLET_SESSION_TOKEN_KEY).catch(() => undefined);
        await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY).catch(() => undefined);
        await SecureStore.deleteItemAsync(MWA_WALLET_ADDRESS_KEY).catch(() => undefined);
        await SecureStore.deleteItemAsync(AUTH_METHOD_KEY).catch(() => undefined);
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
