'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'settings';
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onCommandPalette?: () => void;
  onShortcutsHelp?: () => void;
}

export function useKeyboardShortcuts({
  enabled = true,
  onCommandPalette,
  onShortcutsHelp,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Define shortcuts
  const shortcuts: ShortcutHandler[] = [
    // Command palette - Cmd+K / Ctrl+K
    {
      key: 'k',
      meta: true,
      action: () => onCommandPalette?.(),
      description: 'Open command palette',
      category: 'actions',
    },
    {
      key: 'k',
      ctrl: true,
      action: () => onCommandPalette?.(),
      description: 'Open command palette',
      category: 'actions',
    },
    // Help - ?
    {
      key: '?',
      shift: true,
      action: () => onShortcutsHelp?.(),
      description: 'Show keyboard shortcuts',
      category: 'actions',
    },
    // New trade - N
    {
      key: 'n',
      action: () => router.push('/trades/new'),
      description: 'New trade',
      category: 'actions',
    },
    // Go to navigation (G + key combos handled separately)
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const isMeta = event.metaKey;
    const isCtrl = event.ctrlKey;
    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    // Handle G + key navigation combos
    if (pendingKey === 'g') {
      event.preventDefault();
      setPendingKey(null);
      
      switch (key) {
        case 'd':
          router.push('/app');
          return;
        case 't':
          router.push('/trades');
          return;
        case 'a':
          router.push('/analytics');
          return;
        case 'j':
          router.push('/journal');
          return;
        case 's':
          router.push('/settings');
          return;
        case 'p':
          router.push('/performance');
          return;
        case 'r':
          router.push('/risk');
          return;
        case 'e':
          router.push('/edge');
          return;
        case 'h':
          router.push('/trades/timeline');
          return;
      }
      return;
    }

    // Start G combo
    if (key === 'g' && !isMeta && !isCtrl && !isShift && !isAlt) {
      setPendingKey('g');
      // Clear pending after 1 second
      setTimeout(() => setPendingKey(null), 1000);
      return;
    }

    // Check for matching shortcuts
    for (const shortcut of shortcuts) {
      const keyMatches = shortcut.key === key;
      const metaMatches = shortcut.meta ? isMeta : !isMeta;
      const ctrlMatches = shortcut.ctrl ? isCtrl : !isCtrl;
      const shiftMatches = shortcut.shift ? isShift : !isShift;
      const altMatches = shortcut.alt ? isAlt : !isAlt;

      if (keyMatches && metaMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }

    // Escape - close modals (handled by individual components usually)
    if (key === 'escape') {
      setPendingKey(null);
    }
  }, [enabled, pendingKey, router, shortcuts, onCommandPalette, onShortcutsHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    pendingKey,
  };
}

// Exportable list of all shortcuts for help modal
export const ALL_SHORTCUTS = [
  // Actions
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'actions' },
  { keys: ['N'], description: 'New trade', category: 'actions' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'actions' },
  { keys: ['Esc'], description: 'Close modal / Cancel', category: 'actions' },
  { keys: ['/'], description: 'Focus search', category: 'actions' },
  
  // Navigation
  { keys: ['G', 'D'], description: 'Go to Dashboard', category: 'navigation' },
  { keys: ['G', 'T'], description: 'Go to Trades', category: 'navigation' },
  { keys: ['G', 'A'], description: 'Go to Analytics', category: 'navigation' },
  { keys: ['G', 'J'], description: 'Go to Journal', category: 'navigation' },
  { keys: ['G', 'S'], description: 'Go to Settings', category: 'navigation' },
  { keys: ['G', 'P'], description: 'Go to Performance', category: 'navigation' },
  { keys: ['G', 'R'], description: 'Go to Risk', category: 'navigation' },
  { keys: ['G', 'E'], description: 'Go to Edge', category: 'navigation' },
  { keys: ['G', 'H'], description: 'Go to Trade Hub', category: 'navigation' },
];
