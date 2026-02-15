'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface WalkthroughContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  hasSeenTour: boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  hasSeenTour: false,
});

const WALKTHROUGH_KEY = 'homecare-walkthrough-seen';

// Pages that are public (no auth required) — don't auto-show the tour here
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/pricing', '/welcome'];

function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem('homecare-auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.state?.token;
  } catch {
    return false;
  }
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(WALKTHROUGH_KEY);
    setHasSeenTour(!!seen);

    // Only auto-show for authenticated users on app pages (not landing/login)
    const isPublicPage = PUBLIC_PATHS.includes(pathname);
    if (!seen && !isPublicPage && isAuthenticated()) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(WALKTHROUGH_KEY, 'true');
    setHasSeenTour(true);
  }, []);

  return (
    <WalkthroughContext.Provider value={{ isOpen, open, close, hasSeenTour }}>
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}
