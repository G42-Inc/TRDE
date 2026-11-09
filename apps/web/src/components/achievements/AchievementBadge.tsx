'use client';

import { motion } from 'framer-motion';
import type { AchievementWithStatus, AchievementRarity } from '@/lib/engagement/types';
import { RARITY_STYLES } from '@/lib/engagement/types';
import {
  LockClosedIcon,
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
  HandRaisedIcon,
  EyeIcon,
  MapIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

// Icon mapping for achievements using heroicons
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

interface AchievementBadgeProps {
  achievement: AchievementWithStatus;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

/**
 * Achievement Badge Component
 * 
 * Displays an achievement with its icon, name, and unlock status.
 * Shows progress bar for locked achievements with progress.
 */
export function AchievementBadge({ 
  achievement, 
  size = 'md',
  showProgress = true,
  onClick,
}: AchievementBadgeProps) {
  const styles = RARITY_STYLES[achievement.rarity];
  const IconComponent = ICON_MAP[achievement.icon] || TrophyIcon;
  
  const sizeStyles = {
    sm: { badge: 'w-12 h-12', icon: 'w-5 h-5', ring: 'p-0.5' },
    md: { badge: 'w-16 h-16', icon: 'w-7 h-7', ring: 'p-1' },
    lg: { badge: 'w-20 h-20', icon: 'w-9 h-9', ring: 'p-1.5' },
  };

  const s = sizeStyles[size];

  return (
    <motion.button
      onClick={onClick}
      className={`relative group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}
      `}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Badge */}
      <div 
        className={`relative ${s.ring} rounded-full ${
          achievement.unlocked 
            ? `bg-gradient-to-br ${styles.gradient} ${styles.glow}` 
            : 'bg-white/5'
        }`}
      >
        <div 
          className={`${s.badge} rounded-full flex items-center justify-center
            ${achievement.unlocked 
              ? `${styles.bg} border-2 ${styles.border}` 
              : 'bg-white/5 border border-white/10'
            }
          `}
        >
          {achievement.unlocked ? (
            <IconComponent className={`${s.icon} ${styles.text}`} />
          ) : (
            <LockClosedIcon className={`${size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'} text-white/20`} />
          )}
        </div>

        {/* Rarity indicator for unlocked */}
        {achievement.unlocked && achievement.rarity !== 'common' && (
          <div 
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
              ${styles.bg} border ${styles.border}`}
          >
            <StarIcon className={`w-3 h-3 ${styles.text}`} />
          </div>
        )}
      </div>

      {/* Name */}
      <span className={`text-xs font-medium text-center leading-tight max-w-[80px]
        ${achievement.unlocked ? 'text-white/80' : 'text-white/40'}
      `}>
        {achievement.name}
      </span>

      {/* Progress bar for locked achievements */}
      {!achievement.unlocked && showProgress && achievement.progress && (
        <div className="w-full max-w-[60px]">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${styles.bg}`}
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-white/30 mt-0.5 block text-center">
            {achievement.progress.current}/{achievement.progress.threshold}
          </span>
        </div>
      )}
    </motion.button>
  );
}
