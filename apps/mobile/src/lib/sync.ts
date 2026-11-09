/**
 * Sync Utilities for Mobile
 * 
 * Handles syncing queued items when coming back online
 * 
 * Note: Requires @react-native-community/netinfo package
 */

import { syncQueue } from './storage.db';
import { useEffect } from 'react';

// Try to import NetInfo - it may not be installed
let NetInfo: typeof import('@react-native-community/netinfo').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  console.warn('[Sync] NetInfo not available, auto-sync disabled');
}

/**
 * Hook to automatically sync when device comes back online
 * 
 * Note: Requires @react-native-community/netinfo package
 * If not installed, this hook will not work (but app will still function)
 */
export function useAutoSync() {
  useEffect(() => {
    if (!NetInfo) {
      return;
    }
    
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Device is online, sync queued items
        syncQueue().catch(error => {
          console.error('[Sync] Error syncing queue:', error);
        });
      }
    });

    // Also sync on mount if online
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        syncQueue().catch(error => {
          console.error('[Sync] Error syncing queue:', error);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
