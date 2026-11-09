'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface CountUpProps {
  /** Target number to count to */
  value: number;
  /** Starting number (default: 0) */
  from?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%") */
  suffix?: string;
  /** Format with thousands separator */
  separator?: boolean;
  /** Class name for styling */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Animated number counter
 * 
 * Smoothly animates a number from one value to another,
 * great for stats and metrics.
 */
export function CountUp({
  value,
  from = 0,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = true,
  className = '',
  onComplete,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(from);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const completedRef = useRef(false);

  useEffect(() => {
    const startValue = from;
    const endValue = value;
    const diff = endValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + diff * easeProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, from, duration, onComplete]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    if (!separator) return fixed;
    
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  return (
    <span className={className}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
}
