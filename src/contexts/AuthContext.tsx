import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { authStorage } from '../services/auth/authStorage';
import { socketService } from '../services/real-time/socketService';
import { walletKeyCache } from '../services/cache/walletKeyCache';
import { umbraClearSeed } from '../services/solana/umbraSeed';
import { clearUmbraState } from '../hooks/transactions/useUmbra';

interface UserData {
  email?: string;
  username?: string;
  cash_wallet?: string;
  stealf_wallet?: string;
  subOrgId?: string;
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
  const [userDataState, setUserDataState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      if (session && user) {
        const storedData = await authStorage.getUserData();

        setUserDataState({
          email: user.userEmail || storedData?.email || '',
          username: storedData?.username || '',
          cash_wallet: storedData?.cash_wallet || '',
          stealf_wallet: storedData?.stealf_wallet || '',
          subOrgId: user.userId,
        });

        if (session.token && storedData?.cash_wallet) {
          socketService.connect(session.token);
        }
      } else {
        setUserDataState(null);
        socketService.disconnect();
      }
      setLoading(false);
    };

    loadAuth();
  }, [session, user]);

  const saveUserData = async (data: UserData | null) => {
    setUserDataState(data);
    if (data === null) {
      await authStorage.clearUserData();
      socketService.disconnect();
    } else {
      await authStorage.setUserData(data);
      if (data.cash_wallet && session?.token) {
        socketService.connect(session.token);
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