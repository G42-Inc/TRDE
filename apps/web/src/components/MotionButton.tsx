'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';

interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, variant = 'default', size = 'md', className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      default: 'glass-surface hover:opacity-90',
      primary: 'glass-surface text-white',
      secondary: 'glass-surface hover:opacity-80',
      ghost: 'theme-text-secondary hover:theme-text hover:bg-white/5',
    };

    return (
      <motion.button
        ref={ref}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';

// Motion card with hover effect
interface MotionCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: ReactNode;
  hover?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, hover = true, className = '', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        whileHover={hover ? { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

// Clickable motion wrapper
interface MotionPressableProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: ReactNode;
  onClick?: () => void;
}

export const MotionPressable = forwardRef<HTMLDivElement, MotionPressableProps>(
  ({ children, onClick, className = '', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`cursor-pointer ${className}`}
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionPressable.displayName = 'MotionPressable';
