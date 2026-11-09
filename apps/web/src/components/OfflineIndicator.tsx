'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Offline Indicator Component
 * 
 * Shows a banner when the user goes offline and a brief "back online" message
 * when connection is restored.
 */
export function OfflineIndicator() {
  const { isOffline, wasOffline, clearWasOffline } = useOfflineStatus();

  // Auto-clear "back online" message after 3 seconds
  useEffect(() => {
    if (wasOffline) {
      const timer = setTimeout(() => {
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, clearWasOffline]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-3 bg-amber-500/90 text-black"
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span className="font-medium text-sm">
            You&apos;re offline. Some features may be unavailable.
          </span>
        </motion.div>
      )}

      {!isOffline && wasOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-3 bg-green-500/90 text-black"
        >
          <CheckCircleIcon className="w-5 h-5" />
          <span className="font-medium text-sm">
            Back online!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
