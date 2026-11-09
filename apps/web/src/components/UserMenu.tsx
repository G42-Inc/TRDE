'use client';

import { useState, useEffect, useContext } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { StorageContext } from '@/contexts/StorageContext';

export function UserMenu() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // Use context directly to handle case where StorageProvider is not present
  // This happens on public pages like /pricing
  const storageContext = useContext(StorageContext);
  const trades = storageContext?.trades ?? [];
  const saveTrades = storageContext?.saveTrades;
  
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isLoaded = userLoaded && authLoaded;

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Sync trades to cloud before signing out (only if StorageProvider is present)
      if (saveTrades && trades.length > 0) {
        try {
          console.log('[UserMenu] Syncing trades to cloud before sign out...');
          await saveTrades(trades);
          console.log('[UserMenu] Trades synced successfully');
        } catch (syncError) {
          console.error('[UserMenu] Error syncing trades before sign out:', syncError);
          // Continue with sign out even if sync fails
        }
      }
      
      // Call signOut without redirectUrl to avoid server-side cookie access
      // Clerk will handle the sign-out client-side
      await signOut();
      // Redirect after sign-out completes using window.location for full page reload
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
      // Even if signOut fails, try to redirect to home to clear state
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  if (!isLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  // Show sign in button if not signed in
  if (!isSignedIn || !user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/sign-in')}
          className="px-4 py-2 text-sm font-medium theme-text-secondary hover:theme-text transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => router.push('/sign-up')}
          className="px-4 py-2 text-sm font-semibold bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Sign Up
        </button>
      </div>
    );
  }

  // Show user menu if signed in
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.emailAddresses[0]?.emailAddress || 'User';

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.username?.[0]?.toUpperCase() || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || 'U';

  return (
    <div className="relative" data-user-menu>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={displayName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
            unoptimized
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium theme-text hidden sm:inline">
          {displayName}
        </span>
        <svg
          className={`h-4 w-4 theme-text-secondary transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 glass-surface-strong rounded-lg shadow-xl z-[100]">
            <div className="p-4 border-b border-black/10 dark:border-white/10">
              <p className="text-sm font-semibold theme-text">{displayName}</p>
              <p className="text-xs theme-text-secondary mt-1">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  router.push('/settings');
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm theme-text"
              >
                Settings
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm theme-text text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
