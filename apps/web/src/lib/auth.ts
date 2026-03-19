'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// HIPAA Compliance: Session timeout after 15 minutes of inactivity
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
// Only track discrete click/key events - NOT scroll or mousemove (causes re-renders)
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart'] as const;
// Throttle activity updates to prevent excessive state changes
const ACTIVITY_THROTTLE_MS = 30000; // Only update every 30 seconds max (was 5s - way too frequent)

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  role: string;
  is_active: boolean;
  business_id?: string;
  agency_name?: string;
  business_name?: string;
  permissions?: string[];
  temp_password?: boolean;
  executive_title?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  lastActivity: number | null;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
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
      name: 'palmcare-auth',
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
    const data = localStorage.getItem('palmcare-auth');
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
    const data = localStorage.getItem('palmcare-auth');
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

// Selectors — subscribe only to the slices you need to avoid re-renders from lastActivity
const selectToken = (s: AuthState) => s.token;
const selectUser = (s: AuthState) => s.user;
const selectLastActivity = (s: AuthState) => s.lastActivity;
const selectSetToken = (s: AuthState) => s.setToken;
const selectSetUser = (s: AuthState) => s.setUser;
const selectUpdateLastActivity = (s: AuthState) => s.updateLastActivity;
const selectLogout = (s: AuthState) => s.logout;

// Hook that handles hydration and session timeout
export function useAuth() {
  const token = useAuthStore(selectToken);
  const user = useAuthStore(selectUser);
  const lastActivity = useAuthStore(selectLastActivity);
  const setToken = useAuthStore(selectSetToken);
  const setUser = useAuthStore(selectSetUser);
  const updateLastActivity = useAuthStore(selectUpdateLastActivity);
  const logout = useAuthStore(selectLogout);

  const hasStoredToken = hasStoredTokenCached();

  const shouldShowLoading = !globalHydrated && !hasStoredToken && !hasEverHadSession;
  
  const [isLoading, setIsLoading] = useState(shouldShowLoading);
  const [hydrated, setHydrated] = useState(globalHydrated);
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastActivityUpdateRef = useRef<number>(0);
  const sessionWarningRef = useRef(false);
  sessionWarningRef.current = sessionWarning;

  useEffect(() => {
    if (token && !hasEverHadSession) {
      hasEverHadSession = true;
    }
  }, [token]);

  const handleActivity = useCallback(() => {
    if (!token) return;
    const now = Date.now();
    if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityUpdateRef.current = now;
      updateLastActivity();
      if (sessionWarningRef.current) {
        setSessionWarning(false);
      }
    }
  }, [token, updateLastActivity]);

  useEffect(() => {
    if (typeof window === 'undefined' || !token) return;

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token, handleActivity]);

  useEffect(() => {
    if (!token || !lastActivity) return;

    const checkTimeout = () => {
      if (isSessionExpired(lastActivity)) {
        logout();
      } else {
        const timeLeft = SESSION_TIMEOUT_MS - (Date.now() - (lastActivity || 0));
        if (timeLeft < 2 * 60 * 1000 && timeLeft > 0) {
          setSessionWarning(true);
        }
      }
    };

    const interval = setInterval(checkTimeout, 60000);
    checkTimeout();

    return () => clearInterval(interval);
  }, [token, lastActivity, logout]);

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
    token,
    user,
    lastActivity,
    setToken,
    setUser,
    updateLastActivity,
    logout,
    isLoading,
    hydrated,
    sessionWarning,
    sessionTimeoutMs: SESSION_TIMEOUT_MS,
  };
}

// Wrapper hook for protected pages — waits for hydration before allowing redirects
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.hydrated && !auth.token) {
      router.push('/login');
    }
  }, [auth.hydrated, auth.token, router]);

  return {
    ...auth,
    isReady: auth.hydrated && !!auth.token,
  };
}


const TRACKING_INTERVAL_MS = 60000; // Send heartbeat every 60s

export function useTeamActivityTracker(pageName: string) {
  const { token, user } = useAuth();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== 'admin' && user.role !== 'admin_team') return;

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

    const sendHeartbeat = () => {
      fetch(`${API_BASE}/admin/team/log-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'page_view', page: pageName, details: '' }),
      }).catch(() => {});
    };

    if (!sentRef.current) {
      sendHeartbeat();
      sentRef.current = true;
    }

    const interval = setInterval(sendHeartbeat, TRACKING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, user, pageName]);
}
