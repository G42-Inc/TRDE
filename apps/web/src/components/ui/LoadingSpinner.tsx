'use client';

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  color?: 'accent' | 'white' | 'muted';
  /** Loading text */
  text?: string;
  /** Center in container */
  centered?: boolean;
  /** Full page overlay */
  fullPage?: boolean;
  /** Variant style */
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  /** Additional className */
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const COLOR_MAP = {
  accent: 'border-accent',
  white: 'border-white',
  muted: 'border-white/40',
};

const TEXT_SIZE_MAP = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

/**
 * Loading Spinner Component
 * 
 * Multiple loading indicator styles.
 */
export function LoadingSpinner({
  size = 'md',
  color = 'accent',
  text,
  centered = false,
  fullPage = false,
  variant = 'spinner',
  className = '',
}: LoadingSpinnerProps) {
  const content = (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {variant === 'spinner' && (
        <div
          className={`${SIZE_MAP[size]} border-2 ${COLOR_MAP[color]} border-t-transparent rounded-full animate-spin`}
        />
      )}

      {variant === 'dots' && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`rounded-full bg-current ${
                size === 'xs' ? 'w-1.5 h-1.5' :
                size === 'sm' ? 'w-2 h-2' :
                size === 'md' ? 'w-2.5 h-2.5' :
                size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
              } ${color === 'accent' ? 'text-accent' : color === 'white' ? 'text-white' : 'text-white/40'}`}
              animate={{
                y: [0, -8, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}

      {variant === 'pulse' && (
        <motion.div
          className={`${SIZE_MAP[size]} rounded-full ${
            color === 'accent' ? 'bg-accent' : color === 'white' ? 'bg-white' : 'bg-white/40'
          }`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
      )}

      {variant === 'bars' && (
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className={`rounded-sm ${
                size === 'xs' ? 'w-1' :
                size === 'sm' ? 'w-1.5' :
                size === 'md' ? 'w-2' :
                size === 'lg' ? 'w-2.5' : 'w-3'
              } ${color === 'accent' ? 'bg-accent' : color === 'white' ? 'bg-white' : 'bg-white/40'}`}
              animate={{
                height: [
                  size === 'xs' ? 8 : size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32,
                  size === 'xs' ? 16 : size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 48 : 64,
                  size === 'xs' ? 8 : size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32,
                ],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}

      {text && (
        <span className={`${TEXT_SIZE_MAP[size]} text-white/50`}>{text}</span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  if (centered) {
    return (
      <div className="flex items-center justify-center py-12">
        {content}
      </div>
    );
  }

  return content;
}
