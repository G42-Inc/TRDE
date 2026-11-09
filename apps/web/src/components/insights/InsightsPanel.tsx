'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInsights } from '@/hooks/useInsights';
import { InsightCard } from './InsightCard';
import type { InsightType } from '@/lib/engagement/types';
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface InsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSIGHT_TYPES: { id: InsightType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'warning', label: 'Warnings' },
  { id: 'improvement', label: 'Improvements' },
  { id: 'pattern', label: 'Patterns' },
  { id: 'tip', label: 'Tips' },
  { id: 'celebration', label: 'Celebrations' },
];

/**
 * Insights Panel
 * 
 * Full-screen panel showing all personalized insights.
 */
export function InsightsPanel({ isOpen, onClose }: InsightsPanelProps) {
  const { 
    insights, 
    activeCount, 
    isLoading, 
    isGenerating,
    generateInsights,
    dismissInsight,
    dismissAll,
  } = useInsights();
  
  const [selectedType, setSelectedType] = useState<InsightType | 'all'>('all');

  // Filter insights
  const filteredInsights = selectedType === 'all' 
    ? insights 
    : insights.filter(i => i.type === selectedType);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 bottom-0 w-full max-w-lg glass-surface-dark border-l z-50 overflow-hidden flex flex-col rounded-tl-2xl"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-purple-400" />
                  Insights
                  {activeCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                      {activeCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={generateInsights}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Analyzing...' : 'Refresh Insights'}
                </button>
                {insights.length > 0 && (
                  <button
                    onClick={dismissAll}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar">
                {INSIGHT_TYPES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedType(id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                      ${selectedType === id 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredInsights.length === 0 ? (
                <div className="text-center py-12">
                  <SparklesIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 mb-4">
                    {selectedType === 'all' 
                      ? 'No insights yet' 
                      : `No ${selectedType} insights`
                    }
                  </p>
                  <p className="text-sm text-white/30">
                    Click &quot;Refresh Insights&quot; to analyze your trading data
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredInsights.map(insight => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        onDismiss={() => dismissInsight(insight.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
