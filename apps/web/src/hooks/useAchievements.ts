'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AchievementWithStatus } from '@/lib/engagement/types';
import { useCelebration } from '@/contexts/CelebrationContext';

interface AchievementStats {
  total: number;
  unlocked: number;
  totalXp: number;
}

interface UseAchievementsResult {
  achievements: AchievementWithStatus[];
  stats: AchievementStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkForNewAchievements: () => Promise<AchievementWithStatus[]>;
  markNotified: (achievementId: string) => Promise<void>;
  getByCategory: (category: string) => AchievementWithStatus[];
  getByRarity: (rarity: string) => AchievementWithStatus[];
  recentUnlocks: AchievementWithStatus[];
}

/**
 * Hook to fetch and manage achievements
 * 
 * Provides access to all achievements with unlock status,
 * progress tracking, and celebration triggers.
 */
export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [stats, setStats] = useState<AchievementStats>({ total: 0, unlocked: 0, totalXp: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { celebrate } = useCelebration();

  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/achievements', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAchievements([]);
          return;
        }
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements(data.achievements || []);
      setStats(data.stats || { total: 0, unlocked: 0, totalXp: 0 });
    } catch (err: any) {
      console.error('[useAchievements] Error:', err);
      setError(err.message || 'Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for newly unlocked achievements
  const checkForNewAchievements = useCallback(async (): Promise<AchievementWithStatus[]> => {
    try {
      const response = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) return [];

      const data = await response.json();
      const newAchievements = data.newAchievements || [];

      // Celebrate each new achievement
      for (const achievement of newAchievements) {
        celebrate({
          type: 'achievement',
          title: achievement.name,
          description: `+${achievement.xpReward} XP`,
          confetti: achievement.rarity === 'legendary' || achievement.rarity === 'epic',
        });
      }

      // Refetch to update state
      if (newAchievements.length > 0) {
        await fetchAchievements();
      }

      return newAchievements;
    } catch (err) {
      console.error('[useAchievements] Error checking:', err);
      return [];
    }
  }, [celebrate, fetchAchievements]);

  // Mark achievement as notified
  const markNotified = useCallback(async (achievementId: string) => {
    try {
      await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ achievementId, action: 'mark_notified' }),
      });
    } catch (err) {
      console.error('[useAchievements] Error marking notified:', err);
    }
  }, []);

  // Filter by category
  const getByCategory = useCallback((category: string): AchievementWithStatus[] => {
    return achievements.filter(a => a.category === category);
  }, [achievements]);

  // Filter by rarity
  const getByRarity = useCallback((rarity: string): AchievementWithStatus[] => {
    return achievements.filter(a => a.rarity === rarity);
  }, [achievements]);

  // Get recent unlocks (last 7 days)
  const recentUnlocks = achievements
    .filter(a => {
      if (!a.unlocked || !a.unlockedAt) return false;
      const unlockDate = new Date(a.unlockedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return unlockDate > weekAgo;
    })
    .sort((a, b) => {
      const dateA = new Date(a.unlockedAt!);
      const dateB = new Date(b.unlockedAt!);
      return dateB.getTime() - dateA.getTime();
    });

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    stats,
    isLoading,
    error,
    refetch: fetchAchievements,
    checkForNewAchievements,
    markNotified,
    getByCategory,
    getByRarity,
    recentUnlocks,
  };
}
