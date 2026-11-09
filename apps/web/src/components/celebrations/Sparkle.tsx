'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SparkleProps {
  /** Color of sparkles */
  color?: string;
  /** Size range [min, max] */
  sizeRange?: [number, number];
  /** Number of sparkles */
  count?: number;
  /** Children to wrap */
  children: React.ReactNode;
  /** Enable sparkle effect */
  enabled?: boolean;
}

interface SparkleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

/**
 * Sparkle effect wrapper
 * 
 * Wraps children with randomly positioned sparkle animations,
 * creating a magical highlighting effect.
 */
export function Sparkle({
  color = '#C9A962',
  sizeRange = [8, 16],
  count = 8,
  children,
  enabled = true,
}: SparkleProps) {
  const [sparkles, setSparkles] = useState<SparkleInstance[]>([]);

  useEffect(() => {
    if (!enabled) {
      setSparkles([]);
      return;
    }

    // Generate initial sparkles
    const generateSparkles = () => {
      const newSparkles: SparkleInstance[] = [];
      for (let i = 0; i < count; i++) {
        newSparkles.push({
          id: Date.now() + i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
          delay: Math.random() * 2,
        });
      }
      setSparkles(newSparkles);
    };

    generateSparkles();

    // Regenerate sparkles periodically
    const interval = setInterval(generateSparkles, 3000);
    return () => clearInterval(interval);
  }, [enabled, count, sizeRange]);

  return (
    <span className="relative inline-block">
      {children}
      
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: sparkle.size,
              height: sparkle.size,
            }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180],
            }}
            transition={{
              duration: 1.5,
              delay: sparkle.delay,
              ease: 'easeInOut',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill={color}
              style={{ width: '100%', height: '100%' }}
            >
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
