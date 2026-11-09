/**
 * Admin Layout (Client Component)
 * 
 * Protects admin routes using Clerk auth + admin metadata check.
 * Uses client-side API call to avoid server-side Clerk middleware detection issues.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';

/**
 * Admin Layout
 * 
 * Requires:
 * 1. Clerk authentication (handled by middleware)
 * 2. Admin role in Clerk publicMetadata
 * 
 * If not admin, redirects to /app (regular users) or /sign-in (not authenticated)
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Wait for both auth states to be loaded
    if (!authLoaded || !userLoaded) return;
    
    // Prevent duplicate checks
    if (hasCheckedRef.current) return;

    // If not signed in, wait a bit before redirecting (session might still be establishing)
    if (!isSignedIn && !user) {
      if (retryCount < 3) {
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }
      console.log('AdminLayout: No user after retries, redirecting to sign-in');
      router.push('/sign-in?redirect_url=/admin');
      return;
    }
    
    // Mark as checked to prevent duplicate API calls
    hasCheckedRef.current = true;

    // Check admin access via API route (which can properly use Clerk auth)
    fetch('/api/auth/check-access?plan=basic', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isAdmin) {
          console.log('AdminLayout: Admin access granted');
          setIsAdmin(true);
          setChecking(false);
        } else {
          console.log('AdminLayout: Admin access denied, redirecting to sign-in');
          router.push('/sign-in?redirect_url=/admin');
        }
      })
      .catch((error) => {
        console.error('AdminLayout: Error checking admin access:', error);
        router.push('/sign-in?redirect_url=/admin');
      });
  }, [authLoaded, userLoaded, isSignedIn, user, router, retryCount]);

  // Show loading state while checking
  if (checking || !authLoaded || !userLoaded || !isAdmin) {
    return (
      <div 
        className="min-h-screen theme-bg flex items-center justify-center"
        style={{ overscrollBehavior: 'none' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="theme-text mt-4">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ overscrollBehavior: 'none' }}
    >
      {children}
    </div>
  );
}
