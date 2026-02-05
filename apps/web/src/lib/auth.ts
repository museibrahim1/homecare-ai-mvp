'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState, useCallback, useRef } from 'react';

// HIPAA Compliance: Session timeout after 15 minutes of inactivity
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
// Only track discrete events, NOT mousemove (causes performance issues)
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
// Throttle activity updates to prevent excessive state changes
const ACTIVITY_THROTTLE_MS = 5000; // Only update every 5 seconds max

interface AuthState {
  token: string | null;
  user: any | null;
  lastActivity: number | null;
  setToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  updateLastActivity: () => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      lastActivity: null,
      setToken: (token) => set({ token, lastActivity: Date.now() }),
      setUser: (user) => set({ user }),
      updateLastActivity: () => set({ lastActivity: Date.now() }),
      logout: () => set({ token: null, user: null, lastActivity: null }),
    }),
    {
      name: 'homecare-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper to get token directly from localStorage (for non-hook contexts)
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('homecare-auth');
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

// HIPAA Compliance: Check if session has timed out
function isSessionExpired(lastActivity: number | null): boolean {
  if (!lastActivity) return false;
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS;
}

// Track global hydration state to prevent re-showing loading on navigation
let globalHydrated = false;

// Hook that handles hydration and session timeout
export function useAuth() {
  const store = useAuthStore();
  // Start with globalHydrated value - if already hydrated from previous page, don't show loading
  const [isLoading, setIsLoading] = useState(!globalHydrated);
  const [hydrated, setHydrated] = useState(globalHydrated);
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastActivityUpdateRef = useRef<number>(0);

  // Update activity timestamp on user interaction (throttled to prevent performance issues)
  const handleActivity = useCallback(() => {
    if (store.token) {
      const now = Date.now();
      // Only update if enough time has passed since last update
      if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityUpdateRef.current = now;
        store.updateLastActivity();
        setSessionWarning(false);
      }
    }
  }, [store.token]);

  // Set up activity listeners for session timeout
  useEffect(() => {
    if (typeof window === 'undefined' || !store.token) return;

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [store.token, handleActivity]);

  // Check for session timeout periodically
  useEffect(() => {
    if (!store.token || !store.lastActivity) return;

    const checkTimeout = () => {
      if (isSessionExpired(store.lastActivity)) {
        // HIPAA: Auto-logout on session timeout
        console.log('Session timeout - logging out for security');
        store.logout();
        // Redirect will happen via protected route components
      } else {
        // Warn user 2 minutes before timeout
        const timeLeft = SESSION_TIMEOUT_MS - (Date.now() - (store.lastActivity || 0));
        if (timeLeft < 2 * 60 * 1000 && timeLeft > 0) {
          setSessionWarning(true);
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTimeout, 30000);
    checkTimeout(); // Check immediately

    return () => clearInterval(interval);
  }, [store.token, store.lastActivity, store.logout]);

  // Handle hydration
  useEffect(() => {
    // If already globally hydrated, just sync state immediately
    if (globalHydrated) {
      setHydrated(true);
      setIsLoading(false);
      return;
    }

    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      globalHydrated = true;
      setHydrated(true);
      setIsLoading(false);
      
      // Check for session timeout on hydration
      const state = useAuthStore.getState();
      if (state.token && isSessionExpired(state.lastActivity)) {
        console.log('Session expired during reload - logging out');
        state.logout();
      }
    });

    if (useAuthStore.persist.hasHydrated()) {
      globalHydrated = true;
      setHydrated(true);
      setIsLoading(false);
      
      // Check timeout
      const state = useAuthStore.getState();
      if (state.token && isSessionExpired(state.lastActivity)) {
        state.logout();
      }
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return {
    ...store,
    isLoading,
    hydrated,
    sessionWarning,
    sessionTimeoutMs: SESSION_TIMEOUT_MS,
  };
}
