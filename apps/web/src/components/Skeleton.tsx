'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

// Base skeleton with shimmer effect
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Skeleton({ 
  className = '', 
  width, 
  height,
  rounded = 'md'
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden
        ${roundedClasses[rounded]}
        ${className}
      `}
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, var(--theme-bg-tertiary) 25%, var(--theme-bg-secondary) 50%, var(--theme-bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear',
      }}
    />
  );
}

// Text skeleton
export function SkeletonText({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={16} 
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

// Metric card skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`p-6 rounded-2xl theme-bg-secondary border theme-border ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton width={100} height={14} />
        <Skeleton width={24} height={24} rounded="full" />
      </div>
      <Skeleton width={120} height={36} className="mb-2" />
      <Skeleton width={80} height={12} />
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ 
  rows = 5, 
  columns = 5,
  className = '' 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl theme-bg-secondary border theme-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b theme-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={14} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 p-4 border-b theme-border last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
export function SkeletonChart({ 
  type = 'bar',
  className = '' 
}: { 
  type?: 'bar' | 'line' | 'area';
  className?: string;
}) {
  const bars = Array.from({ length: 12 }, () => Math.random() * 60 + 20);
  
  return (
    <div className={`rounded-2xl theme-bg-secondary border theme-border p-6 ${className}`}>
      {/* Chart header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton width={150} height={20} />
        <div className="flex gap-2">
          <Skeleton width={60} height={28} rounded="lg" />
          <Skeleton width={60} height={28} rounded="lg" />
        </div>
      </div>
      
      {/* Chart area */}
      <div className="h-64 flex items-end justify-between gap-2">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              background: 'linear-gradient(90deg, var(--theme-bg-tertiary) 25%, var(--theme-bg-secondary) 50%, var(--theme-bg-tertiary) 75%)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              height: [`${height}%`, `${height}%`],
              backgroundPosition: ['200% 0', '-200% 0'],
            }}
            transition={{
              backgroundPosition: {
                repeat: Infinity,
                duration: 1.5,
                ease: 'linear',
              },
            }}
          />
        ))}
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={40} height={12} />
        ))}
      </div>
    </div>
  );
}

// List item skeleton
export function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      <Skeleton width={48} height={48} rounded="xl" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} className="w-1/2" />
        <Skeleton height={12} className="w-3/4" />
      </div>
      <Skeleton width={60} height={24} rounded="lg" />
    </div>
  );
}

// List skeleton
export function SkeletonList({ 
  items = 5,
  className = '' 
}: { 
  items?: number;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl theme-bg-secondary border theme-border divide-y theme-border overflow-hidden ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// Dashboard grid skeleton
export function SkeletonDashboard({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      {/* Metric cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ 
  size = 'md' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };
  
  return <Skeleton width={sizes[size]} height={sizes[size]} rounded="full" />;
}

// Button skeleton
export function SkeletonButton({ 
  size = 'md',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const heights = {
    sm: 32,
    md: 40,
    lg: 48,
  };
  
  return <Skeleton height={heights[size]} className={`w-24 ${className}`} rounded="xl" />;
}
