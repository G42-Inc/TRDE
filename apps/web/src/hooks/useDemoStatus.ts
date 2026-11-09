'use client';

import { useState, useEffect, useRef } from 'react';

interface UseDemoStatusResult {
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
}

// Cache demo status to avoid repeated API calls
const demoStatusCache: { value: boolean | null; timestamp: number } = {
  value: null,
  timestamp: 0,
};
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Hook to check if the current user is in demo mode
 * 
 * Fetches the user's entitlement status and determines if they're
 * in demo mode (status === 'demo').
 * 
 * Results are cached to prevent excessive API calls.
 */
export function useDemoStatus(): UseDemoStatusResult {
  const [isDemo, setIsDemo] = useState(demoStatusCache.value ?? false);
  const [isLoading, setIsLoading] = useState(demoStatusCache.value === null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in StrictMode
    if (fetchedRef.current) return;
    
    // Use cache if valid
    const now = Date.now();
    if (demoStatusCache.value !== null && now - demoStatusCache.timestamp < CACHE_DURATION) {
      setIsDemo(demoStatusCache.value);
      setIsLoading(false);
      return;
    }

    fetchedRef.current = true;

    const checkDemoStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-access?plan=basic', {
          credentials: 'include',
        });

        if (!response.ok) {
          // Not authenticated or error - not in demo
          demoStatusCache.value = false;
          demoStatusCache.timestamp = Date.now();
          setIsDemo(false);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        
        // Check if entitlement exists and status is 'demo'
        const isDemoMode = data.entitlement?.status === 'demo';
        
        // Update cache
        demoStatusCache.value = isDemoMode;
        demoStatusCache.timestamp = Date.now();
        
        setIsDemo(isDemoMode);
      } catch (err: any) {
        console.error('[useDemoStatus] Error:', err);
        setError(err.message);
        setIsDemo(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkDemoStatus();
  }, []);

  return { isDemo, isLoading, error };
}

/**
 * Clear the demo status cache (call when user logs out or session changes)
 */
export function clearDemoStatusCache(): void {
  demoStatusCache.value = null;
  demoStatusCache.timestamp = 0;
}
