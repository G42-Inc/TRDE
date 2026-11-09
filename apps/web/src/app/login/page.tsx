'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy /login redirect
 * 
 * Redirects to the canonical /sign-in page.
 * This ensures consistent auth flow through Clerk.
 */
export default function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any redirect_url param
    const redirectUrl = searchParams.get('redirect_url');
    const targetUrl = redirectUrl 
      ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
      : '/sign-in';
    
    router.replace(targetUrl);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
