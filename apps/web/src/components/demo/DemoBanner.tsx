'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '@/contexts/DemoContext';
import { SparklesIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Demo Mode Banner
 * 
 * A sleek, dismissible banner that appears for demo users,
 * encouraging them to upgrade while not being intrusive.
 */
export function DemoBanner() {
  const { isDemo, isDemoLoading, hasSeenDemoBanner, dismissDemoBanner } = useDemo();
  const [isHovered, setIsHovered] = useState(false);

  // Don't show if not in demo mode, still loading, or already dismissed
  if (!isDemo || isDemoLoading || hasSeenDemoBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(201, 169, 98, 0.05) 100%)',
          }}
        />
        
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: isHovered 
              ? 'linear-gradient(90deg, transparent 0%, rgba(201, 169, 98, 0.1) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(201, 169, 98, 0.05) 50%, transparent 100%)',
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{
            backgroundPosition: {
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          style={{ backgroundSize: '200% 100%' }}
        />
        
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-accent" />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-sm font-medium text-white">
                You&apos;re exploring with sample data
              </span>
              <span className="hidden sm:inline text-white/30">•</span>
              <span className="text-xs sm:text-sm text-white/50">
                Upgrade to log your own trades
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/pricing"
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
            >
              <span>Upgrade</span>
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            
            <button
              onClick={dismissDemoBanner}
              className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              aria-label="Dismiss banner"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
