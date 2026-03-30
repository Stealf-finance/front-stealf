import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { authStorage } from '../services/auth/authStorage';
import { socketService } from '../services/real-time/socketService';
import { walletKeyCache } from '../services/cache/walletKeyCache';
import { registerYieldSocketListener, unregisterYieldSocketListener, prefetchYieldData } from '../services/yield/balance';
import { getUserIdHash } from '../services/yield/deposit';
import { attachWalletListeners, detachWalletListeners } from '../hooks/wallet/useWalletInfos';
import { useQueryClient } from '@tanstack/react-query';
import { umbraClearSeed } from '../services/solana/umbraSeed';
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
  const userId = user?.userId;


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

  // Once boot is done, load auth data
  useEffect(() => {
    if (!bootDone) return;

    const loadAuth = async () => {
      if (__DEV__) console.log('[AuthContext] loadAuth - session:', !!sessionToken, 'user:', !!userId);

      if (sessionToken && userId) {
        const storedData = await authStorage.getUserData();

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
    setUserDataState(data);
    if (data === null) {
      await authStorage.clearUserData();
      socketService.disconnect();
    } else {
      await authStorage.setUserData(data);
      if (data.cash_wallet) {
        attachWalletListeners(queryClient);
        if (session?.token) socketService.connect(session.token);
        socketService.subscribeToWallet(data.cash_wallet);
        if (data.stealf_wallet) {
          socketService.subscribeToWallet(data.stealf_wallet);
        }
        if (data.subOrgId) {
          socketService.subscribeToYield(data.subOrgId, getUserIdHash(data.subOrgId).toString('hex'));
          registerYieldSocketListener(queryClient, data.subOrgId);
          if (session?.token) prefetchYieldData(queryClient, data.subOrgId, session.token);
        }
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