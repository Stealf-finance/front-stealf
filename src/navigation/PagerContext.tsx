import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import type { RevolutPagerRef } from './swipePager';
import type { PageType } from './types';

interface PagerContextValue {
  currentPage: PageType;
  navigateToPage: (page: PageType) => void;
  pagerRef: React.RefObject<RevolutPagerRef | null>;
  onIndexChange: (index: number) => void;
}

const PagerContext = createContext<PagerContextValue | null>(null);

const PAGE_ORDER: PageType[] = ['home', 'privacy', 'profile'];

export function PagerProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const pagerRef = useRef<RevolutPagerRef | null>(null);

  const navigateToPage = useCallback((page: PageType) => {
    const index = PAGE_ORDER.indexOf(page);
    if (index >= 0) {
      setCurrentPage(page);
      pagerRef.current?.scrollToIndex(index);
    }
  }, []);

  const onIndexChange = useCallback((index: number) => {
    setCurrentPage(PAGE_ORDER[index]);
  }, []);

  return (
    <PagerContext.Provider value={{ currentPage, navigateToPage, pagerRef, onIndexChange }}>
      {children}
    </PagerContext.Provider>
  );
}

export function usePager() {
  const ctx = useContext(PagerContext);
  if (!ctx) throw new Error('usePager must be used inside PagerProvider');
  return ctx;
}
