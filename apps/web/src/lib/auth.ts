'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

interface AuthState {
  token: string | null;
  user: any | null;
  setToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'homecare-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Hook that handles hydration properly
export function useAuth() {
  const store = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for zustand to hydrate from localStorage
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
      setIsLoading(false);
    });

    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      setIsLoading(false);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return {
    ...store,
    isLoading,
    hydrated,
  };
}
