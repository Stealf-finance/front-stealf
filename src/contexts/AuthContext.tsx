import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { authStorage } from '../services/auth/authStorage';
import { socketService } from '../services/real-time/socketService';
import { walletKeyCache } from '../services/cache/walletKeyCache';
import { registerYieldSocketListener, unregisterYieldSocketListener, prefetchYieldData } from '../services/yield/balance';
import { getUserIdHash } from '../services/yield/deposit';
import { attachWalletListeners, detachWalletListeners } from '../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';
import { umbraClearSeed } from '../services/umbra/seed';
import { clearUmbraState } from '../hooks/transactions/useUmbra';

interface UserData {
  email?: string;
  username?: string;
  cash_wallet?: string;
  stealf_wallet?: string;
  subOrgId?: string;
  points?:number;
}

interface AuthContextType {
  isAuthenticated: boolean;
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
  const [bootDone, setBootDone] = useState(false);

  const sessionToken = session?.token;
  // Backend's verifyAuth derives userIdHash from req.user.organizationId in JWT.
  // We must use session.organizationId here (the sub-org ID), not user.userId
  // (which is a different identifier scoped to the sub-org).
  const userId = (session as any)?.organizationId || user?.userId;


  useEffect(() => {
    if (bootDone) return;

    if (sessionToken && userId) {
      setBootDone(true);
      return;
    }

    const timer = setTimeout(() => {
      if (__DEV__) console.log('[AuthContext] boot timeout — no session restored');
      setBootDone(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionToken, userId, bootDone]);

  useEffect(() => {
    if (!bootDone) return;

    const loadAuth = async () => {
      if (__DEV__) console.log('[AuthContext] loadAuth - session:', !!sessionToken, 'user:', !!userId);

      if (sessionToken && userId) {
        const storedData = await authStorage.getUserData();
        if (__DEV__) console.log('[AuthContext] storedData:', JSON.stringify(storedData));

        setUserDataState({
          email: user?.userEmail || storedData?.email || '',
          username: storedData?.username || '',
          cash_wallet: storedData?.cash_wallet || '',
          stealf_wallet: storedData?.stealf_wallet || '',
          subOrgId: userId,
          points: storedData?.points ?? 0,
        });

        attachWalletListeners(queryClient);
        socketService.connect(sessionToken);
        if (storedData?.cash_wallet) socketService.subscribeToWallet(storedData.cash_wallet);
        if (storedData?.stealf_wallet) socketService.subscribeToWallet(storedData.stealf_wallet);
        if (userId) {
          socketService.subscribeToYield(userId, getUserIdHash(userId).toString('hex'));
          registerYieldSocketListener(queryClient, userId);
          prefetchYieldData(queryClient, userId, sessionToken);
        }
      } else {
        setUserDataState(null);
        detachWalletListeners();
        unregisterYieldSocketListener();
        socketService.disconnect();
      }

      setLoading(false);
    };

    loadAuth().catch((err) => {
      if (__DEV__) console.error('[AuthContext] loadAuth crashed:', err);
      setLoading(false);
    });
  }, [bootDone, sessionToken, userId]);

  const saveUserData = async (data: UserData | null) => {
    if (__DEV__) console.log('[AuthContext] saveUserData called:', JSON.stringify(data));

    if (data === null) {
      setUserDataState(null);
      await authStorage.clearUserData();
      socketService.disconnect();
      return;
    }

    // Preserve stealf_wallet from local storage (never returned by backend)
    const existing = await authStorage.getUserData();
    if (__DEV__) console.log('[AuthContext] existing in storage:', JSON.stringify(existing));

    const merged: UserData = {
      ...data,
      stealf_wallet: data.stealf_wallet || existing?.stealf_wallet || '',
    };

    if (__DEV__) console.log('[AuthContext] merged result:', JSON.stringify(merged));

    setUserDataState(merged);
    await authStorage.setUserData(merged);
    if (merged.cash_wallet) {
      attachWalletListeners(queryClient);
      if (session?.token) socketService.connect(session.token);
      socketService.subscribeToWallet(merged.cash_wallet);
      if (merged.stealf_wallet) {
        socketService.subscribeToWallet(merged.stealf_wallet);
      }
      if (merged.subOrgId) {
        socketService.subscribeToYield(merged.subOrgId, getUserIdHash(merged.subOrgId).toString('hex'));
        registerYieldSocketListener(queryClient, merged.subOrgId);
        if (session?.token) prefetchYieldData(queryClient, merged.subOrgId, session.token);
      }
    }
  };

  const logout = async () => {
    try {
      await turnkeyLogout();
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

  const isAuthenticated = !!session && !!user && !!userDataState?.cash_wallet;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
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