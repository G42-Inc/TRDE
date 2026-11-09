'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { AchievementsPanel } from './AchievementsPanel';
import { TrophyIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getLevelProgress } from '@/lib/engagement/types';

interface AchievementsWidgetProps {
  /** Number of recent achievements to show */
  showCount?: number;
  /** Show XP progress bar */
  showProgress?: boolean;
  /** Compact mode for header */
  compact?: boolean;
}

/**
 * Achievements Widget
 * 
 * Compact display of recent achievements with option to view all.
 * Can be placed on dashboard or in header.
 */
export function AchievementsWidget({ 
  showCount = 5, 
  showProgress = true,
  compact = false,
}: AchievementsWidgetProps) {
  const { achievements, stats, recentUnlocks, isLoading } = useAchievements();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const xpProgress = getLevelProgress(stats.totalXp);

  // Get achievements to display
  const displayAchievements = recentUnlocks.length > 0 
    ? recentUnlocks.slice(0, showCount)
    : achievements.filter(a => !a.unlocked && a.progress).slice(0, showCount);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsPanelOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
        >
          <TrophyIcon className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-white/70 group-hover:text-white">
            {stats.unlocked}/{stats.total}
          </span>
          <span className="text-xs text-white/40">Lv.{xpProgress.currentLevel}</span>
        </button>

        <AchievementsPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-white">Achievements</h3>
          </div>
          <button
            onClick={() => setIsPanelOpen(true)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
          >
            View All
            <ChevronRightIcon className="w-3 h-3" />
          </button>
        </div>

        {/* XP Progress */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60 font-medium">Level {xpProgress.currentLevel}</span>
              <span className="text-white/40">{stats.totalXp} XP</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress.progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{stats.unlocked}</div>
            <div className="text-xs text-white/40">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white/40">{stats.total - stats.unlocked}</div>
            <div className="text-xs text-white/40">Locked</div>
          </div>
        </div>

        {/* Recent or in-progress achievements */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayAchievements.length > 0 ? (
          <div>
            <div className="text-xs text-white/40 mb-2">
              {recentUnlocks.length > 0 ? 'Recent Unlocks' : 'In Progress'}
            </div>
            <div className="flex flex-wrap gap-1">
              {displayAchievements.map(achievement => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="sm"
                  showProgress={recentUnlocks.length === 0}
                  onClick={() => setIsPanelOpen(true)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-white/40">
            Start logging trades to earn achievements!
          </div>
        )}
      </motion.div>

      <AchievementsPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
