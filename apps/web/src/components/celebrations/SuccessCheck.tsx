'use client';

import { motion } from 'framer-motion';

interface SuccessCheckProps {
  /** Size in pixels */
  size?: number;
  /** Color of the check */
  color?: string;
  /** Animation delay */
  delay?: number;
  /** Show ripple effect */
  ripple?: boolean;
}

/**
 * Animated success checkmark
 * 
 * A beautiful SVG checkmark with drawing animation and optional ripple effect.
 */
export function SuccessCheck({ 
  size = 64, 
  color = '#22C55E',
  delay = 0,
  ripple = true,
}: SuccessCheckProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ripple effect */}
      {ripple && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ opacity: 0.3, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ 
              delay: delay + 0.2, 
              duration: 0.6, 
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ opacity: 0.2, scale: 1 }}
            animate={{ opacity: 0, scale: 2.5 }}
            transition={{ 
              delay: delay + 0.3, 
              duration: 0.8, 
              ease: 'easeOut',
            }}
          />
        </>
      )}
      
      {/* Circle background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: `${color}20` }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          delay, 
          duration: 0.3, 
          type: 'spring', 
          stiffness: 300, 
          damping: 20,
        }}
      />
      
      {/* SVG Checkmark */}
      <svg
        viewBox="0 0 52 52"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <motion.circle
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ 
            delay, 
            duration: 0.4, 
            ease: 'easeInOut',
          }}
        />
        <motion.path
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ 
            delay: delay + 0.3, 
            duration: 0.3, 
            ease: 'easeOut',
          }}
        />
      </svg>
    </div>
  );
}
