'use client';

import { useEffect } from 'react';

// Auth routes layout - isolated from theme system
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Force Inter font and reset theme variables for auth pages
    const resetTheme = () => {
      const root = document.documentElement;
      
      // Reset all theme CSS variables to mono defaults (must match layout.tsx for consistency)
      const isDark = document.documentElement.classList.contains('dark');
      root.style.setProperty('--font-family', "'Inter', sans-serif");
      root.style.setProperty('--theme-primary', isDark ? '#ffffff' : '#000000');
      root.style.setProperty('--theme-primary-hover', isDark ? '#e5e5e5' : '#1a1a1a');
      root.style.setProperty('--theme-primary-active', isDark ? '#cccccc' : '#333333');
      root.style.setProperty('--theme-primary-light', isDark ? '#b3b3b3' : '#4a4a4a');
      root.style.setProperty('--theme-primary-dark', isDark ? '#ffffff' : '#000000');
      root.style.setProperty('--theme-bg', isDark ? '#000000' : '#ffffff');
      root.style.setProperty('--theme-bg-secondary', isDark ? '#000000' : '#ffffff');
      root.style.setProperty('--theme-bg-tertiary', isDark ? '#333333' : '#f5f5f5');
      root.style.setProperty('--theme-text', isDark ? '#ffffff' : '#000000');
      root.style.setProperty('--theme-text-secondary', isDark ? '#e5e5e5' : '#1a1a1a');
      root.style.setProperty('--theme-text-tertiary', isDark ? '#b3b3b3' : '#4a4a4a');
      root.style.setProperty('--theme-border', isDark ? '#4a4a4a' : '#d4d4d4');
      root.style.setProperty('--theme-border-secondary', isDark ? '#333333' : '#e5e5e5');
      root.style.setProperty('--theme-accent', isDark ? '#ffffff' : '#000000');
      root.style.setProperty('--theme-accent-hover', isDark ? '#e5e5e5' : '#1a1a1a');
      root.style.setProperty('--theme-success', isDark ? '#22c55e' : '#16a34a');
      root.style.setProperty('--theme-warning', isDark ? '#f97316' : '#ea580c');
      root.style.setProperty('--theme-error', isDark ? '#ef4444' : '#dc2626');
      root.style.setProperty('--theme-info', '#0ea5e9');
      root.style.setProperty('--theme-ring', isDark ? '#ffffff' : '#000000');
      root.style.setProperty('--theme-shadow', isDark ? '#ffffff' : '#000000');
      
      // Remove any theme data attributes
      root.removeAttribute('data-theme');
      root.removeAttribute('data-dashboard-theme');
      root.removeAttribute('data-font');
      
      // Force Inter font class
      if (document.body) {
        document.body.className = 'font-sans';
      }
    };
    
    // Run immediately and after a short delay to catch theme script
    resetTheme();
    const timeout = setTimeout(resetTheme, 100);
    
    // Also run on any DOM mutations (in case theme script runs later)
    const observer = new MutationObserver(resetTheme);
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-font', 'class']
      });
    }
    
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  );
}
