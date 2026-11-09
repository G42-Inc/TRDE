'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import type { PlanTier } from '@/lib/entitlements/types';

interface PlanStepProps {
  selectedPath: 'demo' | 'subscribe' | null;
  onSelectPath: (path: 'demo' | 'subscribe') => void;
  onComplete: (path?: 'demo' | 'subscribe') => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

/* ── Glass tokens ──────────────────────────────────────────────── */
const glass = {
  card: {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    borderRadius: 18,
  } as React.CSSProperties,
  cardGold: {
    background: 'rgba(200, 162, 74, 0.06)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(200, 162, 74, 0.25)',
    boxShadow: '0 4px 24px rgba(200, 162, 74, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    borderRadius: 18,
  } as React.CSSProperties,
  iconBox: {
    background: 'rgba(200, 162, 74, 0.10)',
    border: '1px solid rgba(200, 162, 74, 0.18)',
    borderRadius: 14,
  } as React.CSSProperties,
  iconBoxMuted: {
    background: 'rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: 14,
  } as React.CSSProperties,
  badge: {
    background: 'rgba(0, 0, 0, 0.05)',
    color: '#64748b',
    borderRadius: 20,
    border: '1px solid rgba(0, 0, 0, 0.06)',
  } as React.CSSProperties,
  badgeGold: {
    background: 'rgba(200, 162, 74, 0.12)',
    color: '#B89851',
    borderRadius: 20,
    border: '1px solid rgba(200, 162, 74, 0.2)',
  } as React.CSSProperties,
  loadingOverlay: {
    background: 'rgba(250, 250, 248, 0.80)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  } as React.CSSProperties,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

const checkIcon = (color: string) => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const crossIcon = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function PlanStep({ 
  selectedPath, 
  onSelectPath, 
  onComplete, 
  onBack,
  isSubmitting 
}: PlanStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('basic');

  const handleDemoPath = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Demo setup failed:', response.status, errorData);
        alert(`Setup failed: ${errorData.error || response.status}. Please try again.`);
        setIsLoading(false);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = '/app';
    } catch (error) {
      console.error('Error setting up demo:', error);
      alert('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  const handleSubscribePath = async () => {
    onSelectPath('subscribe');
    setIsLoading(true);
    try {
      await onComplete('subscribe');
      setSelectedPlan('basic');
      setShowCheckout(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    onSelectPath(null as any);
  };

  return (
    <motion.div
      className="flex flex-col items-center text-center px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.h1
        className="text-2xl sm:text-3xl font-semibold mb-2"
        style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
        variants={itemVariants}
      >
        Choose your path.
      </motion.h1>
      
      <motion.p
        className="mb-8 max-w-sm"
        style={{ color: '#64748b', fontSize: 15 }}
        variants={itemVariants}
      >
        Start free, or unlock everything from day one.
      </motion.p>

      {/* Path Options */}
      <motion.div className="grid gap-4 w-full max-w-lg mb-8" variants={containerVariants}>
        {/* Demo Path */}
        <motion.button
          onClick={handleDemoPath}
          disabled={isLoading}
          className="relative flex items-start gap-4 p-5 text-left transition-all duration-300 disabled:opacity-50"
          style={glass.card}
          variants={itemVariants}
          whileHover={{ scale: 1.01, boxShadow: '0 6px 32px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8)' }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Badge */}
          <div className="absolute top-3.5 right-3.5 px-2.5 py-0.5 text-xs font-medium" style={glass.badge}>
            Free
          </div>

          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
            style={{ ...glass.iconBoxMuted, color: '#64748b' }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 pr-12">
            <h3 className="font-semibold mb-1" style={{ color: '#1e293b' }}>Explore First</h3>
            <p className="text-sm mb-3" style={{ color: '#64748b' }}>
              See the full TRDE experience with sample trades. Upgrade whenever you&apos;re ready.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                {checkIcon('#16a34a')}
                Full analytics with sample data
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                {checkIcon('#16a34a')}
                Every feature, fully interactive
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: '#cbd5e1' }}>
                {crossIcon}
                Cannot log your own trades
              </li>
            </ul>
          </div>
        </motion.button>

        {/* Subscribe Path — gold tint */}
        <motion.button
          onClick={handleSubscribePath}
          disabled={isLoading || isSubmitting}
          className="relative flex items-start gap-4 p-5 text-left transition-all duration-300 disabled:opacity-50"
          style={glass.cardGold}
          variants={itemVariants}
          whileHover={{ scale: 1.01, boxShadow: '0 6px 32px rgba(200, 162, 74, 0.12), 0 1px 2px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)' }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Badge */}
          <div className="absolute top-3.5 right-3.5 px-2.5 py-0.5 text-xs font-medium" style={glass.badgeGold}>
            Recommended
          </div>

          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
            style={{ ...glass.iconBox, color: '#B89851' }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 pr-16">
            <h3 className="font-semibold mb-1" style={{ color: '#1e293b' }}>Start Trading</h3>
            <p className="text-sm mb-3" style={{ color: '#64748b' }}>
              Full access to your personal trading journal. Log, analyze, improve.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                {checkIcon('#B89851')}
                Unlimited trade logging
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                {checkIcon('#B89851')}
                Personal analytics and insights
              </li>
              <li className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                {checkIcon('#B89851')}
                Weekly reviews and journaling
              </li>
            </ul>
            <p className="mt-3 text-xs font-medium" style={{ color: '#B89851' }}>
              From $9.99/month
            </p>
          </div>
        </motion.button>
      </motion.div>

      {/* Back link */}
      <motion.button
        onClick={onBack}
        disabled={isLoading}
        className="text-sm font-medium transition-colors disabled:opacity-50"
        style={{ color: '#94a3b8' }}
        variants={itemVariants}
      >
        ← Back to goals
      </motion.button>

      {/* Loading overlay — glass */}
      {isLoading && !showCheckout && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={glass.loadingOverlay}>
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full animate-spin"
              style={{ border: '2px solid rgba(200, 162, 74, 0.2)', borderTopColor: '#C9A962' }}
            />
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>Setting up your account…</p>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          plan={selectedPlan}
          planName={selectedPlan === 'basic' ? 'Basic' : selectedPlan === 'edge' ? 'Edge' : 'Pro'}
          price={selectedPlan === 'basic' ? '$9.99' : selectedPlan === 'edge' ? '$19.99' : '$49.99'}
          onClose={handleCheckoutClose}
        />
      )}
    </motion.div>
  );
}
