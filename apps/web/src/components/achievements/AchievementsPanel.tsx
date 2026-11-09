'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementCard } from './AchievementCard';
import { AchievementBadge } from './AchievementBadge';
import type { AchievementCategory, AchievementRarity } from '@/lib/engagement/types';
import { RARITY_STYLES, getLevelProgress } from '@/lib/engagement/types';
import { XMarkIcon, TrophyIcon, FireIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/outline';

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: AchievementCategory | 'all'; label: string; icon: typeof TrophyIcon }[] = [
  { id: 'all', label: 'All', icon: SparklesIcon },
  { id: 'milestone', label: 'Milestones', icon: TrophyIcon },
  { id: 'streak', label: 'Streaks', icon: FireIcon },
  { id: 'skill', label: 'Skills', icon: StarIcon },
  { id: 'special', label: 'Special', icon: SparklesIcon },
];

const RARITY_ORDER: AchievementRarity[] = ['legendary', 'epic', 'rare', 'common'];

/**
 * Achievements Panel
 * 
 * Full-screen panel showing all achievements organized by category and rarity.
 */
export function AchievementsPanel({ isOpen, onClose }: AchievementsPanelProps) {
  const { achievements, stats, isLoading } = useAchievements();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Sort: unlocked first (by recency), then locked (by progress)
    return filtered.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (a.unlocked && b.unlocked) {
        return new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime();
      }
      // Both locked - sort by progress
      const progressA = a.progress?.percentage || 0;
      const progressB = b.progress?.percentage || 0;
      return progressB - progressA;
    });
  }, [achievements, selectedCategory]);

  // Group by rarity for display
  const groupedByRarity = useMemo(() => {
    const groups: Record<AchievementRarity, typeof filteredAchievements> = {
      legendary: [],
      epic: [],
      rare: [],
      common: [],
    };
    
    filteredAchievements.forEach(a => {
      groups[a.rarity].push(a);
    });

    return groups;
  }, [filteredAchievements]);

  // Calculate XP progress
  const xpProgress = useMemo(() => {
    // Assuming total XP from stats (would come from engagement stats)
    const totalXp = stats.totalXp;
    return getLevelProgress(totalXp);
  }, [stats.totalXp]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 bottom-0 w-full max-w-lg glass-surface-dark border-l z-50 overflow-hidden flex flex-col rounded-tl-2xl"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrophyIcon className="w-6 h-6 text-accent" />
                  Achievements
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-white">{stats.unlocked}</div>
                  <div className="text-xs text-white/40">Unlocked</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-xs text-white/40">Total</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-accent">{stats.totalXp}</div>
                  <div className="text-xs text-white/40">XP Earned</div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Level {xpProgress.currentLevel}</span>
                  <span className="text-white/40">
                    {Math.round(xpProgress.progressPercentage)}% to Level {xpProgress.currentLevel + 1}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent to-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar">
                {CATEGORIES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedCategory(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                      ${selectedCategory === id 
                        ? 'bg-accent text-black' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredAchievements.length === 0 ? (
                <div className="text-center py-12">
                  <SparklesIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No achievements in this category</p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-6">
                  {RARITY_ORDER.map(rarity => {
                    const group = groupedByRarity[rarity];
                    if (group.length === 0) return null;
                    
                    const rarityStyles = RARITY_STYLES[rarity];
                    
                    return (
                      <div key={rarity}>
                        <h3 className={`text-sm font-semibold ${rarityStyles.text} mb-3 capitalize`}>
                          {rarity} ({group.length})
                        </h3>
                        <div className="space-y-2">
                          {group.map(achievement => (
                            <AchievementCard 
                              key={achievement.id} 
                              achievement={achievement}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {filteredAchievements.map(achievement => (
                    <AchievementBadge
                      key={achievement.id}
                      achievement={achievement}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
