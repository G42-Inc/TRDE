interface KeyInput {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

const destinations: Record<string, string> = {
  d: '/app', t: '/trades', a: '/analytics', j: '/journal', s: '/settings',
  p: '/performance', r: '/risk', e: '/edge', h: '/trades/timeline',
};

export type KeyboardCommand = 'prefix' | 'palette' | 'help' | { href: string };

/** Match only deliberate shortcuts; leave browser and form key combinations alone. */
export function resolveKeyboardShortcut(event: KeyInput, pending: string | null): KeyboardCommand | null {
  const key = event.key.toLowerCase();
  if (event.altKey) return null;
  if (event.metaKey || event.ctrlKey) {
    return key === 'k' && !event.shiftKey && !(event.metaKey && event.ctrlKey) ? 'palette' : null;
  }
  if (key === '?') return 'help';
  if (event.shiftKey) return null;
  if (pending === 'g') return destinations[key] ? { href: destinations[key] } : null;
  if (key === 'g') return 'prefix';
  if (key === 'n') return { href: '/trades/new' };
  return null;
}
