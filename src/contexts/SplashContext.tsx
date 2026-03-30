import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SplashContextValue {
  splashVisible: boolean;
  splashFading: boolean;
  showSplash: () => void;
  startFade: () => void;
  hideSplash: () => void;
}

const SplashContext = createContext<SplashContextValue | null>(null);

export function SplashProvider({ children }: { children: ReactNode }) {
  const [splashVisible, setSplashVisible] = useState(false);
  const [splashFading, setSplashFading] = useState(false);

  const showSplash = useCallback(() => {
    setSplashVisible(true);
    setSplashFading(false);
  }, []);

  const startFade = useCallback(() => {
    setSplashFading(true);
  }, []);

  const hideSplash = useCallback(() => {
    setSplashVisible(false);
    setSplashFading(false);
  }, []);

  return (
    <SplashContext.Provider value={{ splashVisible, splashFading, showSplash, startFade, hideSplash }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const ctx = useContext(SplashContext);
  if (!ctx) throw new Error('useSplash must be used inside SplashProvider');
  return ctx;
}
