'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { APP_NAVIGATION, isNavigationActive } from '@/lib/app-navigation';
import { ModalDialog } from './ModalDialog';

export function MobileAppMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname, onClose]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [onClose]);

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} labelledBy="app-navigation-title" className="items-start justify-start !p-0">
      <section className="flex h-dvh w-full max-w-sm flex-col overflow-hidden border-r theme-border theme-bg-secondary shadow-2xl" style={{ background: 'var(--glass-bg-strong, #111827)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex shrink-0 items-center justify-between border-b theme-border p-4">
          <h2 id="app-navigation-title" className="text-lg font-semibold theme-text">Your workspace</h2>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="flex h-11 w-11 items-center justify-center rounded-lg theme-text hover:theme-bg-tertiary"><XMarkIcon className="h-6 w-6" /></button>
        </div>
        <nav aria-label="All app pages" className="min-h-0 flex-1 overflow-y-auto p-3">
          <Link href="/trades/new" onClick={onClose} className="mb-3 flex min-h-12 items-center gap-3 rounded-xl bg-accent px-4 py-3 font-semibold text-white"><PlusIcon className="h-5 w-5" />New trade</Link>
          {APP_NAVIGATION.map((item) => {
            const active = isNavigationActive(pathname, item.href);
            return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-4 py-3 font-medium theme-text ${active ? 'theme-bg-tertiary ring-1 ring-inset theme-border' : 'hover:theme-bg-tertiary'}`}>{item.label}</Link>;
          })}
          <p className="px-4 py-3 text-sm theme-text-secondary">Flow · Coming soon</p>
        </nav>
      </section>
    </ModalDialog>
  );
}
