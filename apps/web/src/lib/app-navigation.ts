export const APP_NAVIGATION = [
  { href: '/app', label: 'Overview' },
  { href: '/trades/timeline', label: 'Trade Hub' },
  { href: '/trades', label: 'All trades' },
  { href: '/journal', label: 'Journal' },
  { href: '/performance', label: 'Performance' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/strategies', label: 'Strategies' },
  { href: '/review', label: 'Calendar & review' },
  { href: '/risk', label: 'Risk' },
  { href: '/edge', label: 'EDGE' },
  { href: '/settings', label: 'Settings' },
] as const;

export function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/trades/timeline') return pathname === href;
  if (href === '/trades' && pathname === '/trades/timeline') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
