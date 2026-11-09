'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  isComplete: boolean;
}

interface SetupProgressProps {
  /** Whether user has logged at least 1 trade */
  hasFirstTrade: boolean;
  /** Whether user has at least 1 strategy */
  hasStrategy: boolean;
  /** Whether user has written a journal entry */
  hasJournalEntry: boolean;
  /** Whether user has customized settings */
  hasCustomizedSettings?: boolean;
  /** Whether user has completed profile */
  hasCompletedProfile?: boolean;
  /** Show only incomplete steps */
  showOnlyIncomplete?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Setup Progress Component
 * 
 * Shows user's progress through initial setup tasks.
 */
export function SetupProgress({
  hasFirstTrade,
  hasStrategy,
  hasJournalEntry,
  hasCustomizedSettings = false,
  hasCompletedProfile = true,
  showOnlyIncomplete = false,
  compact = false,
  className = '',
}: SetupProgressProps) {
  const steps: SetupStep[] = [
    {
      id: 'trade',
      label: 'Log Your First Trade',
      description: 'Start tracking your trading performance',
      icon: ChartBarIcon,
      href: '/trades/new',
      isComplete: hasFirstTrade,
    },
    {
      id: 'strategy',
      label: 'Create a Strategy',
      description: 'Define your trading approach',
      icon: ClipboardDocumentListIcon,
      href: '/strategies/new',
      isComplete: hasStrategy,
    },
    {
      id: 'journal',
      label: 'Write Journal Entry',
      description: 'Document your trading mindset',
      icon: DocumentTextIcon,
      href: '/journal/new',
      isComplete: hasJournalEntry,
    },
    {
      id: 'settings',
      label: 'Customize Settings',
      description: 'Personalize your experience',
      icon: Cog6ToothIcon,
      href: '/settings',
      isComplete: hasCustomizedSettings,
    },
  ];

  const displaySteps = showOnlyIncomplete 
    ? steps.filter(s => !s.isComplete)
    : steps;

  const completedCount = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedCount / totalSteps) * 100;

  // Don't render if all complete
  if (completedCount === totalSteps) {
    return null;
  }

  /* ── Glass tokens for setup cards ──────────────────────────── */
  const glassCard = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow), var(--glass-highlight)',
    borderRadius: 16,
  } as React.CSSProperties;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 ${className}`}
        style={glassCard}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium theme-text">Getting Started</span>
          <span className="text-xs theme-text-secondary">{completedCount}/{totalSteps}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--glass-bg-subtle)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9A962, #D4B896)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="space-y-2">
          {displaySteps.slice(0, 2).map(step => (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 p-2 rounded-lg transition-colors"
              style={{ ':hover': { background: 'rgba(255,255,255,0.08)' } } as any}
            >
              {step.isComplete ? (
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
              ) : (
                <step.icon className="w-5 h-5 theme-text-tertiary" />
              )}
              <span className={`text-sm ${step.isComplete ? 'theme-text-tertiary line-through' : 'theme-text-secondary'}`}>
                {step.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 ${className}`}
      style={glassCard}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold theme-text">Getting Started</h3>
          <p className="text-sm theme-text-secondary mt-0.5">Complete these steps to get the most out of your journal</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold theme-text">{completedCount}</span>
          <span className="theme-text-tertiary">/{totalSteps}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: 'var(--glass-bg-subtle)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #C9A962, #D4B896)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {displaySteps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={step.href}
              className="flex items-center gap-4 p-4 transition-all"
              style={{
                borderRadius: 14,
                background: step.isComplete
                  ? 'rgba(22, 163, 106, 0.12)'
                  : 'var(--glass-bg-subtle)',
                border: step.isComplete
                  ? '1px solid rgba(22, 163, 106, 0.25)'
                  : '1px solid var(--glass-border-subtle)',
                boxShadow: 'var(--glass-highlight)',
              }}
            >
              <div
                className="flex-shrink-0 p-2.5"
                style={{
                  borderRadius: 12,
                  background: step.isComplete
                    ? 'rgba(22, 163, 106, 0.18)'
                    : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {step.isComplete ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-400" />
                ) : (
                  <step.icon className="w-6 h-6 theme-text-tertiary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${step.isComplete ? 'text-green-400' : 'theme-text'}`}>
                  {step.label}
                </h4>
                <p className="text-sm theme-text-secondary mt-0.5">{step.description}</p>
              </div>
              {!step.isComplete && (
                <span
                  className="flex-shrink-0 px-3 py-1.5 text-sm font-medium"
                  style={{
                    borderRadius: 10,
                    background: 'rgba(201, 169, 98, 0.18)',
                    backdropFilter: 'blur(12px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                    color: '#C9A962',
                    border: '1px solid rgba(201, 169, 98, 0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  Start
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
