'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { EmbeddedCheckout } from './EmbeddedCheckout';
import type { PlanTier } from '@/lib/entitlements/types';

interface CheckoutModalProps {
  isOpen: boolean;
  plan: PlanTier;
  planName: string;
  price: string;
  onClose: () => void;
}

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  basic: [
    'Unlimited trade logging',
    'Performance analytics',
    'Strategy tracking',
    'Journal entries',
    'Weekly reviews',
  ],
  edge: [
    'Everything in Basic',
    'Advanced analytics',
    'ProjectX integration',
    'Priority support',
    'Early access to new features',
  ],
  pro: [
    'Everything in Edge',
    'Custom integrations',
    'Team features',
    'Dedicated support',
    'Custom development',
  ],
};

/**
 * Checkout Modal with Embedded Stripe Checkout
 * 
 * Full-screen modal that displays embedded Stripe checkout
 * with premium glass-morphism styling.
 */
export function CheckoutModal({ isOpen, plan, planName, price, onClose }: CheckoutModalProps) {
  const router = useRouter();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleComplete = () => {
    // Redirect to success page after short delay for animation
    setTimeout(() => {
      router.push('/app/checkout-success');
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass-surface-strong"
            style={{
              borderRadius: 'var(--glass-radius-xl, 16px)',
              background: 'var(--glass-bg-strong, #0a0a0a)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.10))',
              boxShadow: 'var(--glass-shadow-hover, 0 25px 50px rgba(0,0,0,0.5))',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col lg:flex-row h-full">
              {/* Left side - Plan info */}
              <div className="lg:w-2/5 p-8 bg-gradient-to-br from-accent/5 to-transparent border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium mb-4">
                    {planName} Plan
                  </span>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Upgrade to {planName}
                  </h2>
                  <p className="text-white/50 text-sm">
                    Unlock powerful features to take your trading to the next level.
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    <span className="text-white/40">/month</span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">Billed monthly. Cancel anytime.</p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    What&apos;s included
                  </p>
                  {PLAN_FEATURES[plan].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-white/70 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Guarantee */}
                <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">30-day money-back guarantee</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Not satisfied? Get a full refund, no questions asked.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Checkout form */}
              <div className="lg:w-3/5 p-8 overflow-y-auto max-h-[60vh] lg:max-h-none">
                <h3 className="text-lg font-semibold text-white mb-6">Payment Details</h3>
                <EmbeddedCheckout
                  plan={plan}
                  onComplete={handleComplete}
                  onCancel={onClose}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
