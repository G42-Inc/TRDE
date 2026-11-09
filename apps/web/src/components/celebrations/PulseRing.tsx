'use client';

import { motion } from 'framer-motion';

interface PulseRingProps {
  /** Size in pixels */
  size?: number;
  /** Color of the rings */
  color?: string;
  /** Number of rings */
  rings?: number;
  /** Duration of each pulse cycle (ms) */
  duration?: number;
  /** Children to render in center */
  children?: React.ReactNode;
}

/**
 * Animated pulse rings
 * 
 * Creates an outward pulsing ring effect, great for
 * highlighting achievements or important elements.
 */
export function PulseRing({ 
  size = 64, 
  color = '#C9A962',
  rings = 3,
  duration = 2000,
  children,
}: PulseRingProps) {
  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Pulse rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ 
            border: `2px solid ${color}`,
            opacity: 0,
          }}
          animate={{
            scale: [1, 2.5],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            delay: (i * duration / 1000) / rings,
            ease: 'easeOut',
          }}
        />
      ))}
      
      {/* Center content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
