'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

// HIPAA Compliance: Session timeout after 15 minutes of inactivity
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
// Only track discrete click/key events - NOT scroll or mousemove (causes re-renders)
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart'] as const;
// Throttle activity updates to prevent excessive state changes
const ACTIVITY_THROTTLE_MS = 30000; // Only update every 30 seconds max (was 5s - way too frequent)

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

// Cache the localStorage check result to avoid parsing JSON on every render
let _cachedHasToken: boolean | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 2000; // Cache for 2 seconds

function hasStoredTokenCached(): boolean {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  if (_cachedHasToken !== null && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedHasToken;
  }
  try {
    const data = localStorage.getItem('homecare-auth');
    if (data) {
      const parsed = JSON.parse(data);
      _cachedHasToken = !!parsed?.state?.token;
    } else {
      _cachedHasToken = false;
    }
  } catch {
    _cachedHasToken = false;
  }
  _cacheTimestamp = now;
  return _cachedHasToken;
}

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

// Also track if we've ever had a valid session (prevents flash on navigation)
let hasEverHadSession = false;

// Hook that handles hydration and session timeout
export function useAuth() {
  const store = useAuthStore();
  
  // Use cached localStorage check instead of parsing JSON on every render
  const hasStoredToken = hasStoredTokenCached();
  
  // Only show loading if: not hydrated AND no stored token AND never had a session
  const shouldShowLoading = !globalHydrated && !hasStoredToken && !hasEverHadSession;
  
  const [isLoading, setIsLoading] = useState(shouldShowLoading);
  const [hydrated, setHydrated] = useState(globalHydrated);
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastActivityUpdateRef = useRef<number>(0);
  
  // Track if we have a session (this is a side-effect-free flag update)
  if (store.token && !hasEverHadSession) {
    hasEverHadSession = true;
  }

  // Update activity timestamp on user interaction
  // Uses a ref to track timing WITHOUT causing re-renders
  const handleActivity = useCallback(() => {
    if (!store.token) return;
    const now = Date.now();
    if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityUpdateRef.current = now;
      // Update Zustand state - this triggers re-render, but only every 30s
      store.updateLastActivity();
      if (sessionWarning) {
        setSessionWarning(false);
      }
    }
  }, [store.token, sessionWarning]);

  // Set up activity listeners for session timeout
  useEffect(() => {
    if (typeof window === 'undefined' || !store.token) return;

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
        console.log('Session timeout - logging out for security');
        store.logout();
      } else {
        const timeLeft = SESSION_TIMEOUT_MS - (Date.now() - (store.lastActivity || 0));
        if (timeLeft < 2 * 60 * 1000 && timeLeft > 0) {
          setSessionWarning(true);
        }
      }
    };

    // Check every 60 seconds (was 30s - unnecessary frequency)
    const interval = setInterval(checkTimeout, 60000);
    checkTimeout();

    return () => clearInterval(interval);
  }, [store.token, store.lastActivity, store.logout]);

  // Handle hydration
  useEffect(() => {
    if (globalHydrated) {
      setHydrated(true);
      setIsLoading(false);
      return;
    }

    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      globalHydrated = true;
      setHydrated(true);
      setIsLoading(false);
      
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
