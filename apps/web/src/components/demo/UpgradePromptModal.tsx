'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '@/contexts/DemoContext';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import {
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const UPGRADE_BENEFITS = [
  { icon: ChartBarIcon, text: 'Log unlimited trades' },
  { icon: DocumentTextIcon, text: 'Full analytics on your data' },
  { icon: ShieldCheckIcon, text: 'Custom risk rules' },
  { icon: RocketLaunchIcon, text: 'Weekly performance reviews' },
];

/**
 * Upgrade Prompt Modal
 * 
 * A luxury modal that appears when demo users try to access
 * blocked features. Provides clear value proposition and
 * smooth path to checkout.
 */
export function UpgradePromptModal() {
  const { upgradePromptState, hideUpgradePrompt } = useDemo();
  const { isOpen, feature, message } = upgradePromptState;
  const [showCheckout, setShowCheckout] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCheckout) {
          setShowCheckout(false);
        } else {
          hideUpgradePrompt();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, showCheckout, hideUpgradePrompt]);

  const handleUpgradeClick = useCallback(() => {
    setShowCheckout(true);
  }, []);

  const handleCheckoutClose = useCallback(() => {
    setShowCheckout(false);
    hideUpgradePrompt();
  }, [hideUpgradePrompt]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      hideUpgradePrompt();
    }
  }, [hideUpgradePrompt]);

  // Get feature-specific icon and title
  const getFeatureDetails = () => {
    const featureMap: Record<string, { icon: typeof SparklesIcon; title: string }> = {
      create_trade: { icon: ChartBarIcon, title: 'Log Your Trades' },
      edit_trade: { icon: ChartBarIcon, title: 'Edit Trades' },
      create_strategy: { icon: RocketLaunchIcon, title: 'Create Strategies' },
      create_journal: { icon: DocumentTextIcon, title: 'Keep a Journal' },
      import_data: { icon: ChartBarIcon, title: 'Import Data' },
      export_data: { icon: ChartBarIcon, title: 'Export Data' },
      connect_broker: { icon: ShieldCheckIcon, title: 'Connect Broker' },
      set_risk_rules: { icon: ShieldCheckIcon, title: 'Set Risk Rules' },
    };

    return featureMap[feature] || { icon: SparklesIcon, title: 'Unlock Full Access' };
  };

  const { icon: FeatureIcon, title } = getFeatureDetails();

  return (
    <>
      <AnimatePresence>
        {isOpen && !showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md"
            >
              <div 
                className="relative overflow-hidden rounded-2xl border border-white/10"
                style={{
                  background: 'linear-gradient(180deg, rgba(30, 30, 30, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Accent glow at top */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(201, 169, 98, 0.5), transparent)',
                  }}
                />

                {/* Close button */}
                <button
                  onClick={hideUpgradePrompt}
                  className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors z-10"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="p-8 pt-10">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center"
                    >
                      <FeatureIcon className="w-8 h-8 text-accent" />
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-white text-center mb-2">
                    {title}
                  </h2>

                  {/* Message */}
                  <p className="text-white/50 text-center mb-8">
                    {message}
                  </p>

                  {/* Benefits */}
                  <div className="space-y-3 mb-8">
                    {UPGRADE_BENEFITS.map((benefit, index) => (
                      <motion.div
                        key={benefit.text}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                          <CheckIcon className="w-3.5 h-3.5 text-accent" />
                        </div>
                        <span className="text-sm text-white/70">{benefit.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleUpgradeClick}
                      className="w-full py-3.5 px-6 rounded-xl font-semibold text-black transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, #C9A962 0%, #A68B4B 100%)',
                      }}
                    >
                      Upgrade Now — $9.99/mo
                    </button>

                    <button
                      onClick={hideUpgradePrompt}
                      className="w-full py-3 px-6 rounded-xl font-medium text-white/50 hover:text-white/70 transition-colors"
                    >
                      Continue Exploring Demo
                    </button>
                  </div>

                  {/* Trust badge */}
                  <p className="text-center text-xs text-white/30 mt-6">
                    Cancel anytime • 7-day money back guarantee
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        plan="basic"
        planName="Basic"
        price="$9.99"
        onClose={handleCheckoutClose}
      />
    </>
  );
}
