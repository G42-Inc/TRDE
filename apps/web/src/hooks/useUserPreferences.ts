'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserPreferences, UserPreferencesInput } from '@/lib/engagement/types';

interface UseUserPreferencesResult {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (input: UserPreferencesInput) => Promise<void>;
  refetch: () => Promise<void>;
}

// Cache preferences to avoid repeated API calls
const preferencesCache: { value: UserPreferences | null; timestamp: number } = {
  value: null,
  timestamp: 0,
};
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Hook to fetch and manage user preferences
 * 
 * Provides access to user preferences for dashboard personalization,
 * with caching to prevent redundant API calls.
 */
export function useUserPreferences(): UseUserPreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferences | null>(preferencesCache.value);
  const [isLoading, setIsLoading] = useState(preferencesCache.value === null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchPreferences = useCallback(async (force = false) => {
    // Use cache if valid and not forcing refresh
    const now = Date.now();
    if (!force && preferencesCache.value !== null && now - preferencesCache.timestamp < CACHE_DURATION) {
      setPreferences(preferencesCache.value);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/preferences', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - not necessarily an error
          preferencesCache.value = null;
          preferencesCache.timestamp = Date.now();
          setPreferences(null);
          return;
        }
        throw new Error('Failed to fetch preferences');
      }
      
      const data = await response.json();
      const prefs = data.preferences || null;
      
      // Update cache
      preferencesCache.value = prefs;
      preferencesCache.timestamp = Date.now();
      
      setPreferences(prefs);
    } catch (err: any) {
      console.error('[useUserPreferences] Error:', err);
      setError(err.message || 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (input: UserPreferencesInput) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      const data = await response.json();
      const prefs = data.preferences;
      
      // Update cache
      preferencesCache.value = prefs;
      preferencesCache.timestamp = Date.now();
      
      setPreferences(prefs);
    } catch (err: any) {
      console.error('[useUserPreferences] Update error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    // Prevent double-fetch in StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refetch: () => fetchPreferences(true),
  };
}

/**
 * Clear the preferences cache (call when user logs out)
 */
export function clearPreferencesCache(): void {
  preferencesCache.value = null;
  preferencesCache.timestamp = 0;
}

/**
 * Get personalized content based on user preferences
 */
export function getPersonalizedContent(preferences: UserPreferences | null) {
  const experience = preferences?.tradingExperience || 'intermediate';
  const goals = preferences?.primaryGoals || ['track_performance'];
  const primaryGoal = goals[0] || 'track_performance';
  const assets = preferences?.assetClasses || [];

  // Experience-based tips
  const experienceTips = {
    beginner: [
      'Focus on one strategy at a time',
      'Review every trade before moving on',
      'Keep position sizes small while learning',
      'Document your emotions after each trade',
    ],
    intermediate: [
      'Track your edge metrics over time',
      'Identify your best performing setups',
      'Review your mistake patterns weekly',
      'Test new strategies in small size first',
    ],
    advanced: [
      'Optimize position sizing based on edge',
      'Analyze regime-specific performance',
      'Build automated trade rules',
      'Focus on risk-adjusted returns',
    ],
  };

  // Goal-based quick actions
  const goalActions = {
    track_performance: [
      { label: 'Log a Trade', href: '/trades/new', icon: 'plus' },
      { label: 'View Analytics', href: '/analytics', icon: 'chart' },
    ],
    improve_discipline: [
      { label: 'Set Risk Rules', href: '/risk', icon: 'shield' },
      { label: 'Review Mistakes', href: '/analytics', icon: 'warning' },
    ],
    analyze_patterns: [
      { label: 'View Analytics', href: '/analytics', icon: 'chart' },
      { label: 'Filter by Setup', href: '/trades', icon: 'filter' },
    ],
    build_strategies: [
      { label: 'Create Strategy', href: '/strategies', icon: 'plus' },
      { label: 'Explore Templates', href: '/strategies/explore', icon: 'search' },
    ],
    manage_risk: [
      { label: 'Risk Dashboard', href: '/risk', icon: 'shield' },
      { label: 'Set Limits', href: '/settings', icon: 'settings' },
    ],
  };

  // Asset-specific labels
  const assetLabels = {
    futures: 'Futures',
    options: 'Options',
    stocks: 'Stocks',
    crypto: 'Crypto',
  };

  return {
    tips: experienceTips[experience] || experienceTips.intermediate,
    quickActions: goalActions[primaryGoal as keyof typeof goalActions] || goalActions.track_performance,
    tradingAssets: assets.map(a => assetLabels[a as keyof typeof assetLabels] || a),
    experienceLevel: experience,
    primaryGoals: goals,
  };
}
