'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(WALKTHROUGH_KEY);
    setHasSeenTour(!!seen);

    // Auto-show for new users after a brief delay
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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
