'use client';

/**
 * App Shell (Client Component)
 * 
 * Contains Sidebar, Header, and main content area.
 * This is a client component so it can use hooks for UI state.
 * Access protection is handled by parent ProtectedRoute (server component).
 */

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { PageTransition } from './PageTransition';
import { DashboardSceneProvider } from './DashboardSceneProvider';
import { StorageProvider } from '@/contexts/StorageContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { DemoBanner, UpgradePromptModal } from '@/components/demo';
import { FeedbackWidget } from '@/components/feedback';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useDemoStatus } from '@/hooks/useDemoStatus';

const SIDEBAR_COLLAPSED_KEY = 'trde:sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDemo, isLoading: isDemoLoading } = useDemoStatus();
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
            <div className="relative flex h-screen" style={{ isolation: 'isolate' }}>
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:block relative z-[1] sidebar-wrapper" style={{ transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)', width: sidebarCollapsed ? 68 : 256 }}>
                <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden relative z-[1]">
                <Header />
                
                {/* Demo Banner - shows at top when in demo mode */}
                <DemoBanner />
                
                <main 
                  className="flex-1 overflow-y-auto p-5 pb-24 md:pb-5"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
              
              {/* Mobile Bottom Navigation - visible only on mobile */}
              <MobileBottomNav />
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
