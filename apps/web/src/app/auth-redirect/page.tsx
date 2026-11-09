/**
 * Auth Redirect Page (Client Component)
 * 
 * Handles post-authentication routing after Clerk sign-in.
 * Uses client-side API call to avoid Clerk middleware detection issues.
 * 
 * IMPORTANT: This page must handle the race condition where Clerk's session
 * is being established. We use useAuth() for more reliable authentication state.
 */

'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';

function AuthRedirectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Wait for both auth and user to be loaded
    if (!authLoaded || !userLoaded) return;
    
    // Prevent duplicate processing
    if (hasProcessedRef.current) return;

    // If definitely not signed in, redirect to sign-in
    // But give it a few retries in case session is still being established
    if (!isSignedIn && !user) {
      if (retryCount < 3) {
        // Wait a bit and retry - session might still be establishing
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }
      // After retries, redirect to sign-in
      router.push('/sign-in');
      return;
    }
    
    // Must have either isSignedIn or user to proceed
    if (!isSignedIn && !user) {
      return;
    }
    
    // Mark as processed to prevent duplicate API calls
    hasProcessedRef.current = true;

    // Check access and onboarding status via API routes
    Promise.all([
      fetch('/api/auth/check-access?plan=basic', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/preferences', { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([accessData, prefsData]) => {
        console.log('AuthRedirect: Access check result:', {
          hasAccess: accessData.hasAccess,
          isAdmin: accessData.isAdmin,
          hasEntitlement: !!accessData.entitlement,
          entitlementStatus: accessData.entitlement?.status,
          userId: accessData.userId,
          error: accessData.error,
        });
        console.log('AuthRedirect: Preferences:', {
          hasPrefs: !!prefsData.preferences,
          onboardingCompleted: prefsData.preferences?.onboardingCompleted,
        });

        // Admins go to admin panel
        if (accessData.isAdmin) {
          console.log('AuthRedirect: Admin user, redirecting to /admin');
          router.push('/admin');
          return;
        }

        // Check if onboarding is completed
        const onboardingCompleted = prefsData.preferences?.onboardingCompleted ?? false;
        
        // New users who haven't completed onboarding go to welcome
        if (!onboardingCompleted) {
          console.log('AuthRedirect: Onboarding not completed, redirecting to /welcome');
          router.push('/welcome');
          return;
        }

        // Users with access go to app or redirect URL
        if (accessData.hasAccess) {
          const redirectUrl = searchParams.get('redirect_url') || '/app';
          console.log('AuthRedirect: User has access, redirecting to', redirectUrl);
          router.push(redirectUrl);
          return;
        }

        // Users without access go to pricing (but with positive framing)
        console.log('AuthRedirect: No access, redirecting to /pricing');
        router.push('/pricing?upgrade=true');
      })
      .catch((error) => {
        console.error('AuthRedirect: Error checking access:', error);
        // Show error instead of redirecting - could be temporary network issue
        setError('Unable to verify access. Please try again.');
      });
  }, [authLoaded, userLoaded, isSignedIn, user, router, searchParams, retryCount]);

  // Show loading state or error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check for redirect URL from query params
  const redirectUrl = searchParams.get('redirect_url');

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {redirectUrl ? 'Verifying access...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Loading…</div>}>
      <AuthRedirectPageContent />
    </Suspense>
  );
}
