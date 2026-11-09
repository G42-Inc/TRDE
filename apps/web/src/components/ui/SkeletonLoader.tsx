'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Border radius */
  borderRadius?: string;
  /** Number of text lines to show */
  lines?: number;
  /** Variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none';
  /** Additional className */
  className?: string;
}

/**
 * Premium Skeleton Loader
 * 
 * Animated placeholder for loading content.
 */
export function SkeletonLoader({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  lines = 1,
  variant = 'text',
  animation = 'pulse',
  className = '',
}: SkeletonLoaderProps) {
  const baseClass = `bg-white/5 ${animation === 'pulse' ? 'animate-pulse' : ''} ${className}`;

  // Card variant
  if (variant === 'card') {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 ${className}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full ${baseClass}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 rounded ${baseClass}`} style={{ width: '60%' }} />
            <div className={`h-3 rounded ${baseClass}`} style={{ width: '40%' }} />
          </div>
        </div>
        <div className="space-y-2">
          <div className={`h-3 rounded ${baseClass}`} />
          <div className={`h-3 rounded ${baseClass}`} style={{ width: '85%' }} />
          <div className={`h-3 rounded ${baseClass}`} style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  // Circular variant
  if (variant === 'circular') {
    return (
      <div
        className={`rounded-full ${baseClass}`}
        style={{ width, height: width }} // Square dimensions for circle
      />
    );
  }

  // Multiple lines
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={baseClass}
            style={{
              width: i === lines - 1 ? '75%' : width,
              height,
              borderRadius,
            }}
            {...(animation === 'wave' && {
              animate: {
                backgroundPosition: ['200% 0', '-200% 0'],
              },
              transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              },
              style: {
                width: i === lines - 1 ? '75%' : width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
                backgroundSize: '200% 100%',
              },
            })}
          />
        ))}
      </div>
    );
  }

  // Single skeleton
  if (animation === 'wave') {
    return (
      <motion.div
        className={className}
        animate={{
          backgroundPosition: ['200% 0', '-200% 0'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          width,
          height,
          borderRadius,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
          backgroundSize: '200% 100%',
        }}
      />
    );
  }

  return (
    <div
      className={baseClass}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-white/10 bg-white/[0.02]">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} width={i === 0 ? '20%' : '15%'} height="1rem" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-white/5 last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} width={colIndex === 0 ? '20%' : '15%'} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton loader
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader width="200px" height="2rem" />
          <SkeletonLoader width="300px" height="1rem" />
        </div>
        <SkeletonLoader width="120px" height="40px" borderRadius="0.75rem" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <SkeletonLoader width="60%" height="1rem" className="mb-2" />
            <SkeletonLoader width="80%" height="2rem" className="mb-2" />
            <SkeletonLoader width="50%" height="0.75rem" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
        <SkeletonLoader width="150px" height="1.5rem" className="mb-4" />
        <SkeletonLoader width="100%" height="300px" borderRadius="0.75rem" />
      </div>
    </div>
  );
}
