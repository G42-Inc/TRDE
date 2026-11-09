'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from '@/components/celebrations/Confetti';
import { playSound, setSoundEnabled, setSoundVolume, type SoundEffect } from '@/lib/sounds';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  CheckIcon,
  TrophyIcon,
  ArrowUpIcon,
  FireIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export type CelebrationType = 
  | 'success'
  | 'achievement'
  | 'levelUp'
  | 'streak'
  | 'milestone'
  | 'tradeLogged'
  | 'winningTrade';

interface CelebrationOptions {
  /** Type of celebration */
  type: CelebrationType;
  /** Title to display */
  title?: string;
  /** Description text */
  description?: string;
  /** Duration in ms (default: 3000) */
  duration?: number;
  /** Show confetti */
  confetti?: boolean;
  /** Play sound */
  sound?: boolean;
  /** Custom sound to play */
  soundEffect?: SoundEffect;
}

interface CelebrationContextValue {
  /** Trigger a celebration */
  celebrate: (options: CelebrationOptions) => void;
  /** Quick celebration for common events */
  quickCelebrate: (type: CelebrationType) => void;
  /** Whether sounds are enabled */
  soundEnabled: boolean;
  /** Toggle sound */
  setSoundEnabled: (enabled: boolean) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

interface ActiveCelebration extends CelebrationOptions {
  id: string;
}

interface CelebrationProviderProps {
  children: React.ReactNode;
}

// Celebration configurations
const CELEBRATION_CONFIGS: Record<CelebrationType, {
  title: string;
  description: string;
  soundEffect: SoundEffect;
  confetti: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  success: {
    title: 'Success!',
    description: 'Action completed successfully',
    soundEffect: 'success',
    confetti: false,
    icon: CheckIcon,
    color: '#22C55E',
  },
  achievement: {
    title: 'Achievement Unlocked!',
    description: 'You earned a new achievement',
    soundEffect: 'achievement',
    confetti: true,
    icon: TrophyIcon,
    color: '#C9A962',
  },
  levelUp: {
    title: 'Level Up!',
    description: 'You reached a new level',
    soundEffect: 'levelUp',
    confetti: true,
    icon: ArrowUpIcon,
    color: '#8B5CF6',
  },
  streak: {
    title: 'Streak Extended!',
    description: 'Keep the momentum going',
    soundEffect: 'success',
    confetti: false,
    icon: FireIcon,
    color: '#F97316',
  },
  milestone: {
    title: 'Milestone Reached!',
    description: 'You hit an important milestone',
    soundEffect: 'achievement',
    confetti: true,
    icon: CheckBadgeIcon,
    color: '#3B82F6',
  },
  tradeLogged: {
    title: 'Trade Logged',
    description: 'Your trade has been recorded',
    soundEffect: 'success',
    confetti: false,
    icon: DocumentTextIcon,
    color: '#22C55E',
  },
  winningTrade: {
    title: 'Winning Trade!',
    description: 'Nice work on that trade',
    soundEffect: 'success',
    confetti: false,
    icon: CurrencyDollarIcon,
    color: '#22C55E',
  },
};

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [activeCelebrations, setActiveCelebrations] = useState<ActiveCelebration[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { preferences } = useUserPreferences();
  const celebrationIdRef = useRef(0);

  // Sync sound setting with user preferences
  useEffect(() => {
    if (preferences?.soundEnabled !== undefined) {
      setSoundEnabledState(preferences.soundEnabled);
      setSoundEnabled(preferences.soundEnabled);
    }
  }, [preferences?.soundEnabled]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const celebrate = useCallback((options: CelebrationOptions) => {
    const config = CELEBRATION_CONFIGS[options.type];
    const id = `celebration-${celebrationIdRef.current++}`;
    
    const celebration: ActiveCelebration = {
      id,
      type: options.type,
      title: options.title || config.title,
      description: options.description || config.description,
      duration: options.duration || 3000,
      confetti: options.confetti ?? config.confetti,
      sound: options.sound ?? true,
      soundEffect: options.soundEffect || config.soundEffect,
    };

    // Play sound if enabled
    if (celebration.sound && soundEnabled) {
      playSound(celebration.soundEffect!);
    }

    // Add celebration to stack
    setActiveCelebrations(prev => [...prev, celebration]);

    // Auto-remove after duration
    setTimeout(() => {
      setActiveCelebrations(prev => prev.filter(c => c.id !== id));
    }, celebration.duration);
  }, [soundEnabled]);

  const quickCelebrate = useCallback((type: CelebrationType) => {
    celebrate({ type });
  }, [celebrate]);

  const handleSetSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
  }, []);

  const value: CelebrationContextValue = {
    celebrate,
    quickCelebrate,
    soundEnabled,
    setSoundEnabled: handleSetSoundEnabled,
  };

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      
      {/* Celebration Overlay */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeCelebrations.map((celebration, index) => {
            const config = CELEBRATION_CONFIGS[celebration.type];
            
            return (
              <React.Fragment key={celebration.id}>
                {/* Confetti */}
                {celebration.confetti && (
                  <Confetti
                    variant="burst"
                    particleCount={80}
                    duration={2000}
                    origin={{ x: 0.5, y: 0.3 }}
                  />
                )}
                
                {/* Toast notification */}
                <motion.div
                  initial={{ opacity: 0, y: -50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="fixed z-[60] left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ top: `${80 + index * 80}px` }}
                >
                  <div 
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                      borderColor: `${config.color}40`,
                      boxShadow: `0 10px 40px -10px ${config.color}30`,
                    }}
                  >
                    {/* Icon */}
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: `${config.color}20`,
                        boxShadow: `0 0 20px ${config.color}30`,
                        color: config.color,
                      }}
                    >
                      <config.icon className="w-5 h-5" />
                    </div>
                    
                    {/* Text */}
                    <div>
                      <div className="font-semibold text-white text-sm">
                        {celebration.title}
                      </div>
                      <div className="text-white/50 text-xs">
                        {celebration.description}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>,
        document.body
      )}
    </CelebrationContext.Provider>
  );
}

/**
 * Hook to access celebration context
 */
export function useCelebration(): CelebrationContextValue {
  const context = useContext(CelebrationContext);
  
  if (!context) {
    // Return no-op functions if context not available
    return {
      celebrate: () => {},
      quickCelebrate: () => {},
      soundEnabled: false,
      setSoundEnabled: () => {},
    };
  }
  
  return context;
}
