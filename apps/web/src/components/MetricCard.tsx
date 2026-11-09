'use client';

import { useState, useEffect, useId } from 'react';
import { ModalDialog } from './ModalDialog';
import { METRIC_EXPLAINERS } from '@trde/core';
import type { MetricExplainer } from '@trde/core';
import Link from 'next/link';
import { ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AnimatedMetricValue } from './AnimatedMetricValue';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle: string | React.ReactNode;
  positive?: boolean;
  showInfo?: boolean;
  showWarning?: boolean;
  metricId?: string;
  href?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  positive = true,
  showInfo = false,
  showWarning = false,
  metricId,
  href,
}: MetricCardProps) {
  const modalTitleId = useId();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const explainer = metricId ? (METRIC_EXPLAINERS[metricId] as MetricExplainer | undefined) : undefined;

  // Calculate font size based on value length to prevent overflow
  const getFontSize = (val: string) => {
    const len = val.length;
    if (len <= 6) return '2.25rem';      // $1,234 or 12.34R
    if (len <= 8) return '1.875rem';     // $12,345 or -12.34R
    if (len <= 10) return '1.5rem';      // $123,456 or $-12,345
    if (len <= 12) return '1.25rem';     // $1,234,567
    return '1.125rem';                    // Longer values
  };

  // Track mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Modal rendered via portal to avoid overflow clipping issues
  const infoModal = showInfoModal && explainer && mounted ? (
    <ModalDialog isOpen onClose={() => setShowInfoModal(false)} labelledBy={modalTitleId} className="items-center justify-center">
      <div 
        className="glass-surface-strong rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 'var(--space-2xl)', boxShadow: 'var(--glass-shadow-hover, 0 25px 50px -12px rgba(0, 0, 0, 0.5))', border: '1px solid var(--glass-border, var(--theme-border))' }}
      >
        <div className="flex items-center justify-between border-b" style={{ marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-lg)', borderColor: 'var(--theme-border)' }}>
          <h3 id={modalTitleId} className="theme-text" style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)' }}>{explainer.title}</h3>
          <button
            aria-label="Close metric details" onClick={() => setShowInfoModal(false)}
            className="theme-text-secondary hover:theme-text active:scale-95 transition-all focus:outline-none rounded-full"
            style={{ padding: 'var(--space-sm)', transitionDuration: 'var(--transition-fast)' }}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="theme-text" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <p style={{ fontSize: 'var(--font-size-body)', lineHeight: 'var(--line-height-body)' }} className="theme-text-secondary">{explainer.definition}</p>
          <Link
            href="/analytics/glossary"
            className="inline-flex items-center font-medium transition-all hover:gap-3"
            onClick={() => setShowInfoModal(false)}
            style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--theme-primary)', gap: 'var(--space-sm)', transitionDuration: 'var(--transition-base)' }}
          >
            View full details in Glossary →
          </Link>
        </div>
      </div>
    </ModalDialog>
  ) : null;

  const content = (
    <div className="relative group cursor-pointer hover:-translate-y-1 glass-surface" style={{ padding: '1.5rem', borderRadius: 'var(--glass-radius-lg, 16px)', transition: 'all 0.2s ease' }}>
      {/* Premium gradient overlay on hover (hidden when glass is active) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transitionDuration: '0.3s', background: 'linear-gradient(135deg, var(--glass-bg-subtle, var(--theme-bg-tertiary)) 0%, transparent 100%)', borderRadius: 'inherit' }} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col gap-3 min-w-0">
        {/* Label row */}
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-semibold tracking-wider theme-text-secondary uppercase">{label}</div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showWarning && (
              <ExclamationTriangleIcon className="h-4 w-4 transition-all duration-300 group-hover:scale-110 animate-pulse" style={{ color: 'var(--theme-warning)' }} title="Warning" />
            )}
            {showInfo && explainer && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInfoModal(true);
                }}
                className="transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none rounded-full"
                style={{ color: 'var(--theme-primary)' }}
                aria-label={`About ${label}`} title="Info"
              >
                <InformationCircleIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Metric value - scales based on length */}
        <div className="min-w-0" style={{ fontSize: getFontSize(value), lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }}>
          <span className="block transition-all duration-300" style={{ color: positive ? '#0D9488' : 'var(--theme-text)' }}>
            <AnimatedMetricValue value={value} positive={positive} />
          </span>
        </div>
        
        {/* Subtitle with status indicator */}
        <div className="flex items-center gap-2 text-sm theme-text-tertiary min-w-0">
          {positive && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#0D9488' }} />}
          <span className="truncate">{subtitle}</span>
        </div>
      </div>
      
      {/* Portal renders modal outside this DOM tree */}
      {infoModal}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
