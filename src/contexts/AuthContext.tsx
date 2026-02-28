import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from '../services/authStorage';
import { socketService } from '../services/socketService';

const MWA_AUTH_TOKEN_KEY = 'mwa_auth_token';
const MWA_WALLET_ADDRESS_KEY = 'mwa_wallet_address';
const AUTH_METHOD_KEY = 'auth_method';

interface UserData {
  email?: string;
  username?: string;
  cash_wallet?: string;
  stealf_wallet?: string;
  subOrgId?: string;
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
  const [userDataState, setUserDataState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      // Check for wallet auth first
      const storedAuthMethod = await SecureStore.getItemAsync(AUTH_METHOD_KEY);

      if (storedAuthMethod === 'wallet') {
        // Wallet auth: restore from SecureStore
        const storedData = await authStorage.getUserData();
        if (storedData?.stealf_wallet) {
          setUserDataState({
            ...storedData,
            authMethod: 'wallet',
          });
          setLoading(false);
          return;
        }
      }

      // Passkey auth: use Turnkey session
      if (session && user) {
        const storedData = await authStorage.getUserData();

        setUserDataState({
          email: user.userEmail || storedData?.email || '',
          username: storedData?.username || '',
          cash_wallet: storedData?.cash_wallet || '',
          stealf_wallet: storedData?.stealf_wallet || '',
          subOrgId: user.userId,
          authMethod: storedData?.authMethod || 'passkey',
        });

        if (session.token){
          socketService.connect(session.token);
        }
      } else if (!storedAuthMethod) {
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
    } else {
      await authStorage.setUserData(data);
    }
  };

  const logout = async () => {
    try {
      const isWallet = userDataState?.authMethod === 'wallet';

      if (!isWallet) {
        await turnkeyLogout();
      }

      // Clear all auth data
      await authStorage.clearUserData();
      await SecureStore.deleteItemAsync(AUTH_METHOD_KEY);

      // Clear wallet-specific data if wallet auth
      if (isWallet) {
        await SecureStore.deleteItemAsync(MWA_AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(MWA_WALLET_ADDRESS_KEY);
        await SecureStore.deleteItemAsync('wallet_session_token');
      }

      setUserDataState(null);
      socketService.disconnect();
    } catch (error) {
      __DEV__ && console.error('Logout error:', error);
    }
  };

  const isWalletAuth = userDataState?.authMethod === 'wallet';

  // For wallet auth: authenticated if we have user data with stealf_wallet
  // For passkey auth: authenticated if Turnkey session is active
  const isAuthenticated = isWalletAuth
    ? !!userDataState?.stealf_wallet && !!userDataState?.cash_wallet
    : !!session && !!user && !!userDataState?.stealf_wallet;

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
