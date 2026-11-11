'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveKeyboardShortcut } from '@/lib/keyboard-shortcuts';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onCommandPalette?: () => void;
  onShortcutsHelp?: () => void;
}

export function useKeyboardShortcuts({ enabled = true, onCommandPalette, onShortcutsHelp }: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      pending.current = null;
      setPendingKey(null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    if (!enabled) { clear(); return; }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], dialog[open]')) {
        clear();
        return;
      }
      const command = resolveKeyboardShortcut(event, pending.current);
      clear();
      if (!command) return;
      event.preventDefault();
      if (command === 'prefix') {
        pending.current = 'g';
        setPendingKey('g');
        timer.current = setTimeout(clear, 1000);
      } else if (command === 'palette') onCommandPalette?.();
      else if (command === 'help') onShortcutsHelp?.();
      else router.push(command.href);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', clear);
      if (timer.current) clearTimeout(timer.current);
      pending.current = null;
    };
  }, [enabled, router, onCommandPalette, onShortcutsHelp]);
  return { pendingKey };
}

// Exportable list of all shortcuts for help modal
export const ALL_SHORTCUTS = [
  // Actions
  { keys: ['Ctrl / ⌘', 'K'], description: 'Open command palette', category: 'actions' },
  { keys: ['N'], description: 'New trade', category: 'actions' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'actions' },
  { keys: ['Esc'], description: 'Close modal / Cancel', category: 'actions' },
  
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
