'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAchievements } from '@/hooks/useAchievements';
import { getLevelProgress, RARITY_STYLES } from '@/lib/engagement/types';
import { TrophyIcon, LockClosedIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface AchievementsMiniProps {
  onViewAll?: () => void;
}

/**
 * Compact Achievements Display for Hero Card
 * 
 * Shows level progress bar and 3 closest-to-unlock achievements
 */
export function AchievementsMini({ onViewAll }: AchievementsMiniProps) {
  const { achievements, stats, isLoading } = useAchievements();

  // Get achievements closest to unlocking (highest progress, not yet unlocked)
  const closestToUnlock = useMemo(() => {
    return achievements
      .filter(a => !a.unlocked && a.progress && a.progress.percentage > 0)
      .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0))
      .slice(0, 3);
  }, [achievements]);

  // Get recently unlocked achievements
  const recentUnlocks = useMemo(() => {
    return achievements
      .filter(a => a.unlocked)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 3);
  }, [achievements]);

  // Decide what to show: recent unlocks if any, otherwise closest to unlock
  const displayAchievements = recentUnlocks.length > 0 ? recentUnlocks : closestToUnlock;

  // XP progress
  const xpProgress = useMemo(() => getLevelProgress(stats.totalXp), [stats.totalXp]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level Progress */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrophyIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold theme-text">Level {xpProgress.currentLevel}</div>
            <div className="text-xs theme-text-secondary">{stats.totalXp} XP</div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="theme-text-secondary">{stats.unlocked}/{stats.total} unlocked</span>
            <span className="theme-text-secondary">{Math.round(xpProgress.progressPercentage)}%</span>
          </div>
          <div className="h-1.5 theme-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress.progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Achievement List */}
      {displayAchievements.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs theme-text-secondary uppercase tracking-wider">
            {recentUnlocks.length > 0 ? 'Recent Unlocks' : 'Almost There'}
          </div>
          {displayAchievements.map((achievement) => {
            const styles = RARITY_STYLES[achievement.rarity];
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-2 rounded-lg theme-bg-tertiary transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.bg}`}>
                  {achievement.unlocked ? (
                    <TrophyIcon className={`w-4 h-4 ${styles.text}`} />
                  ) : (
                    <LockClosedIcon className="w-4 h-4 theme-text-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium theme-text truncate">{achievement.name}</div>
                  {!achievement.unlocked && achievement.progress && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 theme-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full ${styles.bg.replace('/10', '/60')}`}
                          style={{ width: `${achievement.progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs theme-text-secondary">{Math.round(achievement.progress.percentage)}%</span>
                    </div>
                  )}
                  {achievement.unlocked && (
                    <div className="text-xs theme-text-secondary">+{achievement.xpReward} XP</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm theme-text-secondary">Start logging trades to earn achievements</p>
        </div>
      )}

      {/* View All Link */}
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium theme-text-secondary hover:theme-text transition-colors"
        >
          View All Achievements
          <ChevronRightIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
