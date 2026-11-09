'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

/**
 * Component to sync Clerk user to Supabase profile
 * Runs after sign-in to ensure profile exists
 * 
 * Note: This component must be rendered within ClerkProvider.
 * It will be conditionally rendered in InitWrapper only when Clerk is configured.
 */
export function UserSync() {
  const { user, isLoaded } = useUser();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // NOTE: Profile sync is now handled automatically via Clerk webhook
    // This client-side sync is kept as a fallback for edge cases
    // The webhook will handle most profile syncs automatically
    
    // Don't sync if:
    // 1. Clerk not loaded yet
    // 2. No Clerk user (e.g., admin-only session)
    // 3. Already synced
    // 4. On admin panel routes (admin uses standalone auth, not Clerk)
    // 5. On auth pages (sign-in/sign-up) - session not established yet
    if (!isLoaded || !user || hasSyncedRef.current) return;
    
    // Skip sync on auth-related routes (session not fully established yet)
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up') ||
        pathname.startsWith('/auth-redirect') ||
        pathname.startsWith('/welcome')
      ) {
        return;
      }
    }

    // Reduced delay since webhook handles most syncs
    // This is just a fallback for edge cases
    const syncTimer = setTimeout(() => {
      // Double-check pathname hasn't changed (user might have navigated)
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (
          pathname.startsWith('/sign-in') ||
          pathname.startsWith('/sign-up') ||
          pathname.startsWith('/auth-redirect') ||
          pathname.startsWith('/welcome')
        ) {
          return;
        }
      }

      hasSyncedRef.current = true;
      
      fetch('/api/admin/sync-profile', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty body as JSON
      })
        .then((res) => {
          if (!res.ok) {
            // Silently fail - webhook will handle most syncs
            // This is just a fallback
            return res.json().catch(() => ({}));
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success) {
            console.log('Profile synced successfully (fallback sync)');
          }
        })
        .catch((error) => {
          // Silently catch - not critical, webhook will handle it
          // This is expected to fail sometimes during sign-in flow
        });
    }, 500); // Reduced delay since webhook handles most syncs

    return () => clearTimeout(syncTimer);
  }, [user, isLoaded]);

  return null;
}
