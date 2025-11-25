import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage } from '../services/authStorage';
import stealfService from '../services/stealfService';
import solanaWalletService from '../services/solanaWalletService';
import type { UserData } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  userData: UserData | null;
  login: (data: UserData) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isLoggedIn = await authStorage.isLoggedIn();

      if (isLoggedIn) {
        const data = await authStorage.getUserData();
        setIsAuthenticated(true);
        setUserData({
          email: data?.email,
          username: data?.username,
          profileImage: data?.profileImage,
          gridAddress: data?.grid_address,
        });
        // Set current user email for private wallet and solana wallet
        if (data?.email) {
          stealfService.setCurrentUserEmail(data.email);
          solanaWalletService.setCurrentUserEmail(data.email);
        }
      } else {
        await authStorage.clearAuth();
        stealfService.reset();
        solanaWalletService.reset();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await authStorage.clearAuth();
      stealfService.reset();
      solanaWalletService.reset();
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: UserData) => {
    setUserData(data);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await authStorage.clearAuth();
    stealfService.reset(); // Reset private wallet user email
    solanaWalletService.reset(); // Reset solana wallet user email
    setUserData(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userData, login, logout, loading }}>
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
