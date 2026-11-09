'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Show value text (e.g., "5/10") */
  showValue?: boolean;
  /** Custom label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  color?: 'accent' | 'success' | 'warning' | 'error' | 'purple' | 'blue';
  /** Animated fill */
  animated?: boolean;
  /** Indeterminate (loading) state */
  indeterminate?: boolean;
  /** Additional className */
  className?: string;
}

const SIZE_STYLES = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const COLOR_STYLES = {
  accent: 'from-accent to-amber-400',
  success: 'from-green-500 to-emerald-400',
  warning: 'from-amber-500 to-yellow-400',
  error: 'from-red-500 to-rose-400',
  purple: 'from-purple-500 to-pink-400',
  blue: 'from-blue-500 to-cyan-400',
};

/**
 * Progress Bar Component
 * 
 * Animated progress bar with multiple variants.
 */
export function ProgressBar({
  value,
  max = 100,
  showPercentage = false,
  showValue = false,
  label,
  size = 'md',
  color = 'accent',
  animated = true,
  indeterminate = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {/* Label and value */}
      {(label || showPercentage || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm text-white/60">{label}</span>
          )}
          <span className="text-sm text-white/40">
            {showValue && `${value}/${max}`}
            {showValue && showPercentage && ' · '}
            {showPercentage && `${Math.round(percentage)}%`}
          </span>
        </div>
      )}

      {/* Progress track */}
      <div className={`relative ${SIZE_STYLES[size]} bg-white/10 rounded-full overflow-hidden`}>
        {indeterminate ? (
          // Indeterminate animation
          <motion.div
            className={`absolute inset-y-0 w-1/3 bg-gradient-to-r ${COLOR_STYLES[color]} rounded-full`}
            animate={{
              x: ['-100%', '400%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ) : (
          // Determinate progress
          <motion.div
            className={`h-full bg-gradient-to-r ${COLOR_STYLES[color]} rounded-full`}
            initial={animated ? { width: 0 } : false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
}
