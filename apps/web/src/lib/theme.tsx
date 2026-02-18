'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'palmcare-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  // First check data-theme attribute (set by inline script)
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  
  // Then check localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);
  const themeRef = useRef<Theme>('dark');

  // On mount, sync React state with what the inline script already applied
  useEffect(() => {
    const initial = getInitialTheme();
    themeRef.current = initial;
    setThemeState(initial);
    // Ensure DOM is in sync
    document.documentElement.setAttribute('data-theme', initial);
    setMounted(true);
  }, []);

  // Apply theme to DOM and persist
  const applyTheme = useCallback((newTheme: Theme) => {
    themeRef.current = newTheme;
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Use ref to avoid stale closure
  const toggleTheme = useCallback(() => {
    const current = themeRef.current;
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }, [applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    applyTheme(newTheme);
  }, [applyTheme]);

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context;
}
