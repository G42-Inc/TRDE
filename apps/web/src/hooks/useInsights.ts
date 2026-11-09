'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Insight, InsightType } from '@/lib/engagement/types';

interface UseInsightsResult {
  insights: Insight[];
  activeCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  generateInsights: () => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  getByType: (type: InsightType) => Insight[];
  highPriorityInsights: Insight[];
  isGenerating: boolean;
}

/**
 * Hook to fetch and manage personalized insights
 */
export function useInsights(): UseInsightsResult {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/insights?limit=20', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setInsights([]);
          return;
        }
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
      setActiveCount(data.activeCount || 0);
    } catch (err: any) {
      console.error('[useInsights] Error:', err);
      setError(err.message || 'Failed to load insights');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate new insights
  const generateInsights = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      // Refetch to get updated insights
      await fetchInsights();
    } catch (err: any) {
      console.error('[useInsights] Generate error:', err);
      setError(err.message || 'Failed to generate insights');
    } finally {
      setIsGenerating(false);
    }
  }, [fetchInsights]);

  // Dismiss a single insight
  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      // Optimistic update
      setInsights(prev => prev.filter(i => i.id !== insightId));
      setActiveCount(prev => Math.max(0, prev - 1));

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ insightId, action: 'dismiss' }),
      });

      if (!response.ok) {
        // Revert on error
        await fetchInsights();
      }
    } catch (err) {
      console.error('[useInsights] Dismiss error:', err);
      await fetchInsights();
    }
  }, [fetchInsights]);

  // Dismiss all insights
  const dismissAll = useCallback(async () => {
    try {
      // Optimistic update
      setInsights([]);
      setActiveCount(0);

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'dismiss_all' }),
      });

      if (!response.ok) {
        await fetchInsights();
      }
    } catch (err) {
      console.error('[useInsights] Dismiss all error:', err);
      await fetchInsights();
    }
  }, [fetchInsights]);

  // Filter by type
  const getByType = useCallback((type: InsightType): Insight[] => {
    return insights.filter(i => i.type === type);
  }, [insights]);

  // High priority insights (warnings and improvements with high relevance)
  const highPriorityInsights = insights
    .filter(i => (i.type === 'warning' || i.type === 'improvement') && i.relevance >= 80)
    .slice(0, 3);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    activeCount,
    isLoading,
    error,
    refetch: fetchInsights,
    generateInsights,
    dismissInsight,
    dismissAll,
    getByType,
    highPriorityInsights,
    isGenerating,
  };
}
