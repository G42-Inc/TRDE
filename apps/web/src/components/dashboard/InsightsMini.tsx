'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInsights } from '@/hooks/useInsights';
import { INSIGHT_STYLES } from '@/lib/engagement/types';
import {
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  XMarkIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface InsightsMiniProps {
  onViewAll?: () => void;
}

const INSIGHT_ICONS = {
  pattern: ArrowTrendingUpIcon,
  improvement: LightBulbIcon,
  warning: ExclamationTriangleIcon,
  tip: SparklesIcon,
  celebration: TrophyIcon,
};

/**
 * Compact Insights Display for Hero Card
 * 
 * Shows top 2 priority insights with dismiss functionality
 */
export function InsightsMini({ onViewAll }: InsightsMiniProps) {
  const { insights, isLoading, dismissInsight, generateInsights, isGenerating } = useInsights();

  // Get top priority insights (warnings first, then patterns, then improvements)
  const priorityInsights = useMemo(() => {
    const priorityOrder = ['warning', 'pattern', 'improvement', 'tip', 'celebration'];
    return [...insights]
      .sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.type);
        const bIndex = priorityOrder.indexOf(b.type);
        if (aIndex !== bIndex) return aIndex - bIndex;
        // Secondary sort by relevance
        return (b.relevance || 0) - (a.relevance || 0);
      })
      .slice(0, 2);
  }, [insights]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-purple-400" />
          <span className="text-xs theme-text-secondary uppercase tracking-wider">
            {insights.length > 0 ? `${insights.length} Active` : 'No Insights'}
          </span>
        </div>
        <button
          onClick={() => generateInsights()}
          disabled={isGenerating}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Insights List */}
      <AnimatePresence mode="popLayout">
        {priorityInsights.length > 0 ? (
          priorityInsights.map((insight) => {
            const styles = INSIGHT_STYLES[insight.type];
            const Icon = INSIGHT_ICONS[insight.type] || SparklesIcon;
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`relative p-3 rounded-xl ${styles.bg} border ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${styles.iconBg || styles.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${styles.text}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${styles.text}`}>
                      {insight.title}
                    </div>
                    <p className="text-xs theme-text-secondary mt-0.5 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="flex-shrink-0 p-1 theme-text-secondary hover:theme-text transition-colors"
                    aria-label="Dismiss"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <p className="text-sm theme-text-secondary">No active insights</p>
            <button
              onClick={() => generateInsights()}
              disabled={isGenerating}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
            >
              Generate insights from your data
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* View All Link */}
      {onViewAll && insights.length > 2 && (
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium theme-text-secondary hover:theme-text transition-colors"
        >
          View All {insights.length} Insights
          <ChevronRightIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
