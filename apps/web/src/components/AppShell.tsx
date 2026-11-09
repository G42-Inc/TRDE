'use client';

/**
 * App Shell (Client Component)
 * 
 * Contains Sidebar, Header, and main content area.
 * This is a client component so it can use hooks for UI state.
 * Access protection is handled by parent ProtectedRoute (server component).
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { setEdgeAccount } from '@/lib/edge/store/accountScope';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileAppMenu } from './MobileAppMenu';
import { PageTransition } from './PageTransition';
import { DashboardSceneProvider } from './DashboardSceneProvider';
import { StorageProvider, useStorage } from '@/contexts/StorageContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { DemoBanner, UpgradePromptModal } from '@/components/demo';
import { FeedbackWidget } from '@/components/feedback';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useDemoStatus } from '@/hooks/useDemoStatus';

const SIDEBAR_COLLAPSED_KEY = 'trde:sidebar-collapsed';

function CloudSyncNotice() {
  const { syncError, syncFromCloud, isSyncing } = useStorage();
  if (!syncError) return null;
  return <div role="alert" className="mx-3 mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-950 px-3 py-2 text-sm text-amber-100 sm:mx-5">
    <p className="min-w-0 flex-1">{syncError}</p>
    <button type="button" disabled={isSyncing} onClick={() => { void syncFromCloud(); }} className="min-h-11 rounded-md border border-amber-200/40 px-3 font-medium disabled:opacity-50">{isSyncing ? 'Retrying…' : 'Retry cloud sync'}</button>
  </div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const accountId = isLoaded ? user?.id ?? null : null;
  const [readyAccount, setReadyAccount] = useState<string | null>(null);

  useLayoutEffect(() => {
    setEdgeAccount(accountId);
    setReadyAccount(accountId);
    return () => setEdgeAccount(null);
  }, [accountId]);

  // Initialize the verified account scope before any browser stores mount.
  // Account switches unmount forms/charts as well as their stale async work.
  if (!accountId || readyAccount !== accountId) {
    return <p role="status" className="p-6 theme-text-secondary">Loading your workspace…</p>;
  }
  return <AccountAppShell key={accountId}>{children}</AccountAppShell>;
}

function AccountAppShell({ children }: { children: React.ReactNode }) {
  const { isDemo } = useDemoStatus();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useEffect(() => { if (!window.location.hash) mainRef.current?.scrollTo({ top: 0, left: 0 }); }, [pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <StorageProvider>
      <CelebrationProvider>
        <DemoProvider isDemo={isDemo}>
          <DashboardSceneProvider>
            <div className="relative flex h-dvh min-h-0 w-full overflow-hidden" style={{ isolation: 'isolate' }}>
              <a href="#app-main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[150] focus:rounded-lg focus:bg-black focus:px-4 focus:py-3 focus:text-white">Skip to content</a>
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:block shrink-0 relative z-[1] sidebar-wrapper" style={{ transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)', width: sidebarCollapsed ? 68 : 256 }}>
                <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
              </div>
              
              <div className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden relative z-[1]">
                <Header onOpenNavigation={() => setMobileMenuOpen(true)} navigationOpen={mobileMenuOpen} />
                
                {/* Demo Banner - shows at top when in demo mode */}
                <DemoBanner />
                <CloudSyncNotice />
                
                <main 
                  ref={mainRef}
                  id="app-main-content"
                  tabIndex={-1}
                  className="min-h-0 min-w-0 flex-1 overflow-auto p-3 pb-24 sm:p-5 sm:pb-24 md:pb-5 focus:outline-none"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
              
              {/* Mobile Bottom Navigation - visible only on mobile */}
              <MobileBottomNav onOpenNavigation={() => setMobileMenuOpen(true)} navigationOpen={mobileMenuOpen} />
              <MobileAppMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
            </div>
          </DashboardSceneProvider>
          
          {/* Upgrade Prompt Modal - appears when blocked features are accessed */}
          <UpgradePromptModal />
          
          {/* Feedback Widget - floating button for user feedback */}
          <FeedbackWidget position="bottom-right" />
          
          {/* Offline Indicator - shows banner when connection is lost */}
          <OfflineIndicator />
        </DemoProvider>
      </CelebrationProvider>
    </StorageProvider>
  );
}
