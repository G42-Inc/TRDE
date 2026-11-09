'use client';

import { motion } from 'framer-motion';
import type { AchievementWithStatus } from '@/lib/engagement/types';
import { RARITY_STYLES } from '@/lib/engagement/types';
import {
  LockClosedIcon,
  CheckCircleIcon,
  TrophyIcon,
  ChartBarIcon,
  FireIcon,
  StarIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  BoltIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HeartIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  MapIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Icon mapping using heroicons
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  target: CheckBadgeIcon,
  chart: ChartBarIcon,
  fire: FireIcon,
  trophy: TrophyIcon,
  star: StarIcon,
  rocket: RocketLaunchIcon,
  brain: AcademicCapIcon,
  shield: ShieldCheckIcon,
  crown: SparklesIcon,
  gem: SparklesIcon,
  medal: TrophyIcon,
  lightning: BoltIcon,
  book: BookOpenIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  money: CurrencyDollarIcon,
  heart: HeartIcon,
  muscle: ArrowTrendingUpIcon,
  eye: EyeIcon,
  compass: MapIcon,
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

interface AchievementCardProps {
  achievement: AchievementWithStatus;
  onClick?: () => void;
}

/**
 * Achievement Card Component
 * 
 * Detailed view of an achievement with description, XP reward, and progress.
 */
export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const styles = RARITY_STYLES[achievement.rarity];
  const IconComponent = ICON_MAP[achievement.icon] || TrophyIcon;

  return (
    <motion.div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200
        ${achievement.unlocked 
          ? `${styles.bg} ${styles.border} ${styles.glow}` 
          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Gradient overlay for unlocked */}
      {achievement.unlocked && (
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-30`}
        />
      )}

      <div className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div 
            className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
              ${achievement.unlocked 
                ? `${styles.bg} border ${styles.border}` 
                : 'bg-white/5 border border-white/10'
              }
            `}
          >
            {achievement.unlocked ? (
              <IconComponent className={`w-7 h-7 ${styles.text}`} />
            ) : (
              <LockClosedIcon className="w-6 h-6 text-white/20" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-white/60'}`}>
                {achievement.name}
              </h3>
              {achievement.unlocked && (
                <CheckCircleIcon className={`w-4 h-4 ${styles.text}`} />
              )}
            </div>
            
            <p className={`text-sm ${achievement.unlocked ? 'text-white/60' : 'text-white/40'}`}>
              {achievement.description}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                {RARITY_LABELS[achievement.rarity]}
              </span>
              <span className="text-xs text-white/40">
                +{achievement.xpReward} XP
              </span>
              {achievement.unlockedAt && (
                <span className="text-xs text-white/40">
                  {format(new Date(achievement.unlockedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {!achievement.unlocked && achievement.progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Progress</span>
              <span className="text-white/60">
                {achievement.progress.current}/{achievement.progress.threshold}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${styles.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
