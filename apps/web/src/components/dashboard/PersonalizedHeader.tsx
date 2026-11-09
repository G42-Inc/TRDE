'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useUserPreferences, getPersonalizedContent } from '@/hooks/useUserPreferences';
import { AchievementsMini } from './AchievementsMini';
import { InsightsMini } from './InsightsMini';
import { AchievementsPanel } from '@/components/achievements';
import { InsightsPanel } from '@/components/insights';
import {
  PlusIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  SparklesIcon,
  ArrowRightIcon,
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface PersonalizedHeaderProps {
  /** Metrics to display (win rate, total PnL, etc) */
  metrics?: {
    winRate: number;
    totalPnLUsd: number;
    totalPnLR: number;
    expectancy: number;
  };
  /** Number of trades */
  tradeCount?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  plus: PlusIcon,
  chart: ChartBarIcon,
  shield: ShieldCheckIcon,
  warning: ExclamationTriangleIcon,
  filter: FunnelIcon,
  search: MagnifyingGlassIcon,
  settings: Cog6ToothIcon,
};

type ExpandedSection = 'tips' | 'achievements' | 'insights' | null;

/**
 * Personalized Dashboard Header
 * 
 * Clean, spacious layout with central metrics and expandable sections below.
 */
export function PersonalizedHeader({ metrics, tradeCount = 0 }: PersonalizedHeaderProps) {
  const { user } = useUser();
  const { preferences, isLoading } = useUserPreferences();
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  
  const content = getPersonalizedContent(preferences);
  
  // Rotate tips every 8 seconds (only when tips is expanded)
  useEffect(() => {
    if (expandedSection !== 'tips' || content.tips.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % content.tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [expandedSection, content.tips.length]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get contextual message based on performance
  const getContextMessage = () => {
    if (!metrics || tradeCount === 0) {
      return preferences?.onboardingCompleted 
        ? "Let's log your first trade"
        : 'Ready to start your trading journey';
    }
    
    if (metrics.winRate >= 70) return 'Exceptional performance';
    if (metrics.winRate >= 60) return 'Strong win rate';
    if (metrics.expectancy > 1) return 'Positive expectancy';
    if (metrics.totalPnLR > 0) return 'Net profitable';
    return 'Keep refining your edge';
  };

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="space-y-4">
      {/* Main Hero Card — dark frosted glass over scene gradient */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow), var(--glass-highlight)',
        }}
      >
        {/* Subtle gold radiance */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none rounded-3xl"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, rgba(201, 169, 98, 0.12) 0%, transparent 60%)',
          }}
        />
        
        <div className="relative z-10 px-8 py-5 sm:px-10 sm:py-6">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5"
          >
            <h1 className="text-3xl sm:text-4xl font-bold theme-text mb-2">
              {getGreeting()}, {user?.firstName || 'Trader'}
            </h1>
            <p className="theme-text-secondary text-sm">
              {getContextMessage()}
            </p>
          </motion.div>

          {/* Central Metric - Win Rate */}
          {metrics && tradeCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex justify-center mb-6"
            >
              <div className="text-center">
                <div 
                  className="text-6xl sm:text-7xl font-bold mb-2"
                  style={{ 
                    color: metrics.winRate >= 50 ? 'var(--theme-success)' : 'var(--theme-error)',
                  }}
                >
                  {metrics.winRate.toFixed(1)}%
                </div>
                <div className="text-sm theme-text-secondary uppercase tracking-wider">Win Rate</div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions - Sleek design */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap justify-center gap-3 mb-4"
          >
            {content.quickActions.slice(0, 2).map((action) => {
              const Icon = iconMap[action.icon] || PlusIcon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200"
                  style={{
                    background: 'var(--glass-bg-subtle)',
                    border: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(12px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                    boxShadow: 'var(--glass-highlight)',
                  }}
                >
                  <Icon className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium theme-text">
                    {action.label}
                  </span>
                  <ArrowRightIcon className="w-3 h-3 theme-text-secondary group-hover:translate-x-0.5 transition-transform" />
                </Link>
              );
            })}
          </motion.div>

          {/* Bottom Row - Minimal text buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center items-center gap-6 pt-4"
            style={{ borderTop: '1px solid var(--glass-border-subtle)' }}
          >
            <button
              onClick={() => toggleSection('tips')}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-200
                ${expandedSection === 'tips' 
                  ? 'text-accent' 
                  : 'text-white/40 hover:text-white/60'
                }
              `}
            >
              <LightBulbIcon className="w-3.5 h-3.5" />
              Tips
            </button>
            <button
              onClick={() => toggleSection('achievements')}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-200
                ${expandedSection === 'achievements' 
                  ? 'text-accent' 
                  : 'text-white/40 hover:text-white/60'
                }
              `}
            >
              <TrophyIcon className="w-3.5 h-3.5" />
              Achievements
            </button>
            <button
              onClick={() => toggleSection('insights')}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-200
                ${expandedSection === 'insights' 
                  ? 'text-purple-400' 
                  : 'text-white/40 hover:text-white/60'
                }
              `}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Insights
            </button>
          </motion.div>
        </div>
      </div>

      {/* Expandable Section Below */}
      <AnimatePresence>
        {expandedSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow), var(--glass-highlight)',
              }}
            >
              {/* Tips Content */}
              {expandedSection === 'tips' && (
                <div>
                  {content.tips.length > 0 ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <LightBulbIcon className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={currentTipIndex}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-sm theme-text leading-relaxed"
                          >
                            {content.tips[currentTipIndex]}
                          </motion.p>
                        </AnimatePresence>
                        {content.tips.length > 1 && (
                          <p className="text-xs theme-text-secondary mt-2">
                            {currentTipIndex + 1} of {content.tips.length}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedSection(null)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm theme-text-secondary text-center">Complete onboarding for personalized tips</p>
                  )}
                </div>
              )}

              {/* Achievements Content */}
              {expandedSection === 'achievements' && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <AchievementsMini onViewAll={() => setShowAchievementsPanel(true)} />
                  </div>
                  <button
                    onClick={() => setExpandedSection(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Insights Content */}
              {expandedSection === 'insights' && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <InsightsMini onViewAll={() => setShowInsightsPanel(true)} />
                  </div>
                  <button
                    onClick={() => setExpandedSection(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Panels (slide-out) */}
      <AchievementsPanel 
        isOpen={showAchievementsPanel} 
        onClose={() => setShowAchievementsPanel(false)} 
      />
      <InsightsPanel 
        isOpen={showInsightsPanel} 
        onClose={() => setShowInsightsPanel(false)} 
      />
    </div>
  );
}
