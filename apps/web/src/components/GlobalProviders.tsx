'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePathname } from 'next/navigation';

const CommandPalette = dynamic(
  () => import('./CommandPalette').then((module) => module.CommandPalette),
  { ssr: false },
);
const KeyboardShortcutsHelp = dynamic(
  () => import('./KeyboardShortcutsHelp').then((module) => module.KeyboardShortcutsHelp),
  { ssr: false },
);

interface GlobalUIContextType {
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openShortcutsHelp: () => void;
  closeShortcutsHelp: () => void;
  isCommandPaletteOpen: boolean;
  isShortcutsHelpOpen: boolean;
}

const GlobalUIContext = createContext<GlobalUIContextType | null>(null);

export function useGlobalUI() {
  const context = useContext(GlobalUIContext);
  if (!context) {
    throw new Error('useGlobalUI must be used within GlobalProviders');
  }
  return context;
}

interface GlobalProvidersProps {
  children: ReactNode;
}

export function GlobalProviders({ children }: GlobalProvidersProps) {
  const pathname = usePathname();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [hasOpenedCommandPalette, setHasOpenedCommandPalette] = useState(false);
  const [hasOpenedShortcutsHelp, setHasOpenedShortcutsHelp] = useState(false);

  const openCommandPalette = useCallback(() => {
    setHasOpenedCommandPalette(true);
    setIsCommandPaletteOpen(true);
  }, []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const openShortcutsHelp = useCallback(() => {
    setHasOpenedShortcutsHelp(true);
    setIsShortcutsHelpOpen(true);
  }, []);
  const closeShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(false), []);

  // Check if we're on a dashboard route
  const isDashboardRoute = pathname?.startsWith('/app') || 
                          pathname?.startsWith('/trades') || 
                          pathname?.startsWith('/analytics') || 
                          pathname?.startsWith('/journal') || 
                          pathname?.startsWith('/strategies') || 
                          pathname?.startsWith('/review') || 
                          pathname?.startsWith('/risk') ||
                          pathname?.startsWith('/performance') ||
                          pathname?.startsWith('/settings') ||
                          pathname?.startsWith('/edge');

  // Enable keyboard shortcuts only on dashboard routes
  useKeyboardShortcuts({
    enabled: isDashboardRoute && !isCommandPaletteOpen && !isShortcutsHelpOpen,
    onCommandPalette: openCommandPalette,
    onShortcutsHelp: openShortcutsHelp,
  });

  return (
    <GlobalUIContext.Provider
      value={{
        openCommandPalette,
        closeCommandPalette,
        openShortcutsHelp,
        closeShortcutsHelp,
        isCommandPaletteOpen,
        isShortcutsHelpOpen,
      }}
    >
      {children}
      
      {/* Load on first use, then retain the dialogs for their exit animations. */}
      {isDashboardRoute && hasOpenedCommandPalette && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={closeCommandPalette}
        />
      )}
      {isDashboardRoute && hasOpenedShortcutsHelp && (
        <KeyboardShortcutsHelp
          isOpen={isShortcutsHelpOpen}
          onClose={closeShortcutsHelp}
        />
      )}
    </GlobalUIContext.Provider>
  );
}
