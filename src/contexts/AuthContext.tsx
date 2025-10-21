import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage } from '../services/authStorage';
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
          gridAddress: data?.grid_address,
        });
      } else {
        await authStorage.clearAuth();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await authStorage.clearAuth();
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
