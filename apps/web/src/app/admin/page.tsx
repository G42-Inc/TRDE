'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AdminPanel } from './AdminPanel';

/**
 * Admin Page (Client Component)
 * 
 * Gets admin userId from Clerk client-side and passes to AdminPanel.
 * Admin access is already verified in layout.tsx, so we can trust that
 * if we reach here, the user is authenticated and is an admin.
 */
export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      // Small delay to ensure user data is fully loaded
      const timer = setTimeout(() => {
        setLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen theme-bg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="theme-text mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Trust the layout's admin check - if we reach here, user is authenticated and admin
  // But still wait for user data to be available
  if (!user?.id) {
    return (
      <div className="min-h-screen theme-bg p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="theme-text mt-4">Loading user data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen theme-bg p-6">
      <div className="max-w-7xl mx-auto">
        <AdminPanel adminUserId={user.id} />
      </div>
    </div>
  );
}
