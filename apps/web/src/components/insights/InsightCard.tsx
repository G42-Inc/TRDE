'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Insight, InsightType } from '@/lib/engagement/types';
import { INSIGHT_STYLES } from '@/lib/engagement/types';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const TYPE_ICONS: Record<InsightType, typeof LightBulbIcon> = {
  pattern: SparklesIcon,
  improvement: ArrowTrendingUpIcon,
  warning: ExclamationTriangleIcon,
  tip: LightBulbIcon,
  celebration: CheckCircleIcon,
};

interface InsightCardProps {
  insight: Insight;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Insight Card Component
 * 
 * Displays a single insight with type-based styling, action link, and dismiss option.
 */
export function InsightCard({ insight, onDismiss, compact = false }: InsightCardProps) {
  const styles = INSIGHT_STYLES[insight.type];
  const Icon = TYPE_ICONS[insight.type];

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className={`flex items-start gap-3 p-3 rounded-lg ${styles.bg} border ${styles.border}`}
      >
        <div className={`flex-shrink-0 p-1.5 rounded-lg ${styles.iconBg}`}>
          <Icon className={`w-4 h-4 ${styles.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.text}`}>{insight.title}</p>
          <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{insight.description}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg}`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-50`} />

      <div className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 p-2.5 rounded-xl ${styles.iconBg}`}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{insight.title}</h3>
              {insight.relevance >= 90 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/10 text-white/60">
                  HIGH PRIORITY
                </span>
              )}
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{insight.description}</p>

            {/* Action link */}
            {insight.actionUrl && (
              <Link
                href={insight.actionUrl}
                className={`inline-flex items-center gap-1 mt-3 text-sm font-medium ${styles.text} hover:underline`}
              >
                View Details
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
