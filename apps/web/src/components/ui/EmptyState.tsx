'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ChartBarIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

type EmptyStateVariant = 
  | 'trades'
  | 'journal'
  | 'analytics'
  | 'strategies'
  | 'reviews'
  | 'generic';

interface EmptyStateProps {
  /** Predefined variant for common empty states */
  variant?: EmptyStateVariant;
  /** Custom icon (heroicon component) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  actionLabel?: string;
  /** Action URL or onClick */
  actionHref?: string;
  onAction?: () => void;
  /** Secondary action */
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Show tips for getting started */
  showTips?: boolean;
  /** Custom tips array */
  tips?: string[];
  /** Additional className */
  className?: string;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  tips: string[];
  gradient: string;
}> = {
  trades: {
    icon: ChartBarIcon,
    title: 'Log Your First Trade',
    description: 'Start building your trading journal by logging your first trade. Track every entry, exit, and insight.',
    actionLabel: 'Log a Trade',
    actionHref: '/trades/new',
    tips: [
      'Log trades right after closing them for accuracy',
      'Include screenshots for visual review later',
      'Rate your setup quality from A to F',
    ],
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  journal: {
    icon: BookOpenIcon,
    title: 'Start Your Trading Journal',
    description: 'Document your thoughts, emotions, and market observations. Great traders reflect daily.',
    actionLabel: 'Write First Entry',
    actionHref: '/journal/new',
    tips: [
      'Write about your pre-market routine',
      'Capture your emotional state during the day',
      'Note any mistakes and lessons learned',
    ],
    gradient: 'from-purple-500/20 to-pink-500/10',
  },
  analytics: {
    icon: ChartBarIcon,
    title: 'Analytics Unlock After 5 Trades',
    description: 'Log at least 5 trades to unlock powerful analytics. See patterns, optimize timing, and track your edge.',
    actionLabel: 'Log Trades',
    actionHref: '/trades/new',
    tips: [
      'More data = better insights',
      'Track win rate by session time',
      'Identify your most profitable setups',
    ],
    gradient: 'from-emerald-500/20 to-teal-500/10',
  },
  strategies: {
    icon: ClipboardDocumentListIcon,
    title: 'Define Your Trading Strategy',
    description: 'Create structured strategies with clear entry rules, exit criteria, and risk parameters.',
    actionLabel: 'Create Strategy',
    actionHref: '/strategies/new',
    tips: [
      'Start with one simple strategy',
      'Define clear entry and exit rules',
      'Set maximum risk per trade',
    ],
    gradient: 'from-amber-500/20 to-orange-500/10',
  },
  reviews: {
    icon: DocumentTextIcon,
    title: 'Weekly Reviews Coming Soon',
    description: 'Complete a full week of trading to unlock your first weekly review. Reflect on wins, losses, and growth.',
    actionLabel: 'Log Trades',
    actionHref: '/trades/new',
    tips: [
      'Reviews help identify recurring patterns',
      'Track your progress over time',
      'Set goals for the upcoming week',
    ],
    gradient: 'from-rose-500/20 to-red-500/10',
  },
  generic: {
    icon: SparklesIcon,
    title: 'Nothing Here Yet',
    description: 'This section will populate as you add more data to your trading journal.',
    actionLabel: 'Get Started',
    actionHref: '/app',
    tips: [],
    gradient: 'from-white/10 to-white/5',
  },
};

/**
 * Premium Empty State Component
 * 
 * Beautiful, animated empty state with contextual tips and clear CTAs.
 */
export function EmptyState({
  variant = 'generic',
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  showTips = true,
  tips: customTips,
  className = '',
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  const displayActionHref = actionHref || config.actionHref;
  const displayTips = customTips || config.tips;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] ${className}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`} />

      <div className="relative p-8 md:p-12">
        <div className="max-w-md mx-auto text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-6"
          >
            <div className="inline-flex p-4 rounded-2xl bg-white/5 border border-white/10">
              <Icon className="w-12 h-12 text-white/40" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-xl md:text-2xl font-bold text-white mb-3"
          >
            {displayTitle}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-white/50 mb-6 leading-relaxed"
          >
            {displayDescription}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {onAction ? (
              <button
                onClick={onAction}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-semibold hover:bg-accent/90 transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                {displayActionLabel}
              </button>
            ) : (
              <Link
                href={displayActionHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-black font-semibold hover:bg-accent/90 transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                {displayActionLabel}
              </Link>
            )}

            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-colors"
              >
                {secondaryLabel}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Tips Section */}
        {showTips && displayTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-10 pt-8 border-t border-white/10"
          >
            <div className="flex items-center gap-2 mb-4 justify-center">
              <LightBulbIcon className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-white/60">Quick Tips</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {displayTips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.3 }}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <p className="text-sm text-white/50 leading-relaxed">{tip}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
