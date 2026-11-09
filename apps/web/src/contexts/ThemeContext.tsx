'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** @deprecated Dark/light mode is now driven by the scene system. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Read initial theme from localStorage or <html> class
  useEffect(() => {
    const saved = localStorage.getItem('trde-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      setThemeState(saved);
    } else if (document.documentElement.classList.contains('dark')) {
      setThemeState('dark');
    }
  }, []);

  // When theme state changes, sync to DOM + localStorage
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('trde-theme', theme);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // toggleTheme kept for backward compat but effectively a no-op in production
  // (scene system drives dark/light mode)
  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
