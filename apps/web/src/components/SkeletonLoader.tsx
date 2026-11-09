'use client';

import React from 'react';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '0.5rem',
  className = '',
  lines = 1,
}: SkeletonLoaderProps) {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-black/5 dark:bg-white/5 rounded"
            style={{
              width: i === lines - 1 ? '75%' : width,
              height,
              borderRadius,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse bg-black/5 dark:bg-white/5 rounded ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}
