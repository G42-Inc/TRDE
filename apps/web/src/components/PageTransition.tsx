'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
      <motion.div
        key={pathname}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.12 }}
        className={`min-w-0 ${className}`}
      >
        {children}
      </motion.div>
  );
}

// Simple fade transition for sections
export function FadeIn({ 
  children, 
  className = '',
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list animation
export function StaggeredList({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      className={className}
      variants={{
        animate: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 10 },
        animate: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.3 }
        },
      }}
    >
      {children}
    </motion.div>
  );
}
