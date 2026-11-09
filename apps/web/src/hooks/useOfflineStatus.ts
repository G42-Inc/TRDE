'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseOfflineStatusResult {
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Whether we've detected the connection was restored */
  wasOffline: boolean;
  /** Clear the wasOffline flag */
  clearWasOffline: () => void;
  /** Last time connection was checked */
  lastOnline: Date | null;
}

/**
 * Hook to track offline/online status
 */
export function useOfflineStatus(): UseOfflineStatusResult {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
    setLastOnline(new Date());
    // If we were offline, mark it so we can show a "back online" message
    if (isOffline) {
      setWasOffline(true);
    }
  }, [isOffline]);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  useEffect(() => {
    // Check initial state
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) {
        setLastOnline(new Date());
      }
    }

    // Listen for changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOffline,
    wasOffline,
    clearWasOffline,
    lastOnline,
  };
}
