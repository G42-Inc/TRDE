import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    card: string;
    cardHover: string;
    primary: string;
    primaryLight: string;
    success: string;
    successLight: string;
    danger: string;
    dangerLight: string;
    warning: string;
    warningLight: string;
    purple: string;
    purpleLight: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  background: '#fafafa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#111827',
  textSecondary: 'rgba(17, 24, 39, 0.65)',
  textTertiary: 'rgba(17, 24, 39, 0.45)',
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  card: 'rgba(0, 0, 0, 0.03)',
  cardHover: 'rgba(0, 0, 0, 0.08)',
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  success: '#22c55e',
  successLight: '#4ade80',
  danger: '#ef4444',
  dangerLight: '#f87171',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  purple: '#a855f7',
  purpleLight: '#c084fc',
};

const darkColors = {
  background: '#0a0a0a',
  surface: '#111111',
  surfaceElevated: '#1a1a1a',
  text: '#f9fafb',
  textSecondary: 'rgba(249, 250, 251, 0.7)',
  textTertiary: 'rgba(249, 250, 251, 0.5)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  card: 'rgba(255, 255, 255, 0.04)',
  cardHover: 'rgba(255, 255, 255, 0.08)',
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  success: '#22c55e',
  successLight: '#4ade80',
  danger: '#ef4444',
  dangerLight: '#f87171',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  purple: '#a855f7',
  purpleLight: '#c084fc',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('trde-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch (e) {
      // Default to dark
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('trde-theme', newTheme);
    } catch (e) {
      // Ignore storage errors
    }
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
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
