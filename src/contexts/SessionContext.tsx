import React, { createContext, useContext, useCallback, ReactNode } from 'react';

interface SessionContextType {
  setMWAInProgress: (inProgress: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Track MWA state outside React to avoid re-renders
let _mwaInProgress = false;

export function SessionProvider({ children }: { children: ReactNode }) {
  const setMWAInProgress = useCallback((inProgress: boolean) => {
    _mwaInProgress = inProgress;
  }, []);

  return (
    <SessionContext.Provider value={{ setMWAInProgress }}>
      {children}
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

export function isMWAInProgress() {
  return _mwaInProgress;
}
