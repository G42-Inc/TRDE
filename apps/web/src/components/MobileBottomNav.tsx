'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  FolderIcon,
  ChartBarIcon,
  BoltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  FolderIcon as FolderIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BoltIcon as BoltIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
  { href: '/app', label: 'Overview', icon: HomeIcon, activeIcon: HomeIconSolid },
  { href: '/trades/timeline', label: 'Trades', icon: FolderIcon, activeIcon: FolderIconSolid },
  { href: '/performance', label: 'Stats', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
  { href: '/edge', label: 'EDGE', icon: BoltIcon, activeIcon: BoltIconSolid },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon, activeIcon: Cog6ToothIconSolid },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom glass-surface-strong"
      style={{
        borderRadius: 0,
        border: 'none',
        borderTop: '1px solid var(--glass-border-subtle, var(--theme-border))',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="flex items-center justify-around" style={{ padding: 'var(--space-sm) 0' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center transition-all active:scale-95"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                gap: 'var(--space-xs)',
                color: isActive ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                transitionDuration: 'var(--transition-fast)',
                minWidth: '64px',
              }}
            >
              <Icon className="h-6 w-6" />
              <span
                style={{
                  fontSize: 'var(--font-size-caption)',
                  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: '32px',
                    height: '3px',
                    background: 'var(--theme-primary)',
                    borderRadius: 'var(--radius-full)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
