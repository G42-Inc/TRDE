/**
 * Clerk Provider Wrapper for Mobile
 * 
 * Uses @clerk/clerk-expo (Expo/React Native specific)
 * Different from web which uses @clerk/nextjs
 * 
 * Clerk Expo requires:
 * - expo-secure-store for token storage
 * - publishableKey from environment variable
 */

import { ClerkProvider as ClerkProviderExpo } from '@clerk/clerk-expo';
import { ReactNode } from 'react';
import { CLERK_PUBLISHABLE_KEY } from '../lib/config';
import * as SecureStore from 'expo-secure-store';

interface ClerkProviderWrapperProps {
  children: ReactNode;
}

// Token cache for Clerk Expo
// Clerk Expo uses SecureStore to store tokens securely
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('[Clerk] Error saving token:', err);
    }
  },
};

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  // Only wrap with ClerkProvider if publishable key is available
  if (!CLERK_PUBLISHABLE_KEY) {
    // Return children without ClerkProvider for development
    // This allows the app to render without Clerk keys
    console.warn('⚠️ Clerk publishable key not set. Authentication disabled.');
    return <>{children}</>;
  }

  return (
    <ClerkProviderExpo 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      {children}
    </ClerkProviderExpo>
  );
}
