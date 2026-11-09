'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initializeData } from '@/lib/init';
import { initDashboardTheme, removeDashboardTheme } from '@/lib/themes';
import { initFont } from '@/lib/fonts';
import { UserSync } from './UserSync';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';

import { isDashboardRoute } from '@/lib/routes';

export function InitWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    initializeData();
    
    // Only initialize dashboard theme on dashboard routes
    if (isDashboardRoute(pathname)) {
      initDashboardTheme();
    } else {
      // Remove dashboard theme on landing/public routes
      removeDashboardTheme();
    }
    
    // Font initialization is handled by root layout script, but keep this for compatibility
    if (isDashboardRoute(pathname)) {
      initFont();
    }
  }, [pathname]);

  // Only render UserSync if Clerk is configured
  // Check at runtime since env vars are available in client components
  const hasClerkKey = typeof window !== 'undefined' && 
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <>
      <ServiceWorkerRegistration />
      {hasClerkKey && <UserSync />}
    </>
  );
}
