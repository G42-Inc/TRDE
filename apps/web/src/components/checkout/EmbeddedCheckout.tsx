'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlanTier } from '@/lib/entitlements/types';

// Get Stripe key - don't load if not available
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface EmbeddedCheckoutProps {
  plan: PlanTier;
  onComplete?: () => void;
  onCancel?: () => void;
}

type CheckoutStatus = 'idle' | 'loading' | 'ready' | 'complete' | 'error';

/**
 * Embedded Stripe Checkout Component
 * 
 * Renders Stripe's embedded checkout form directly in the page
 * with premium animations and loading states.
 */
export function EmbeddedCheckout({ plan, onComplete, onCancel }: EmbeddedCheckoutProps) {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazily load Stripe only when needed and key is available
  const stripePromise = useMemo(() => {
    if (!STRIPE_KEY) {
      console.error('Stripe publishable key not configured');
      return null;
    }
    return loadStripe(STRIPE_KEY);
  }, []);

  // Fetch client secret on mount
  useEffect(() => {
    // Don't fetch if Stripe isn't available
    if (!STRIPE_KEY) {
      setError('Payment system not configured. Please contact support.');
      setStatus('error');
      return;
    }

    const fetchClientSecret = async () => {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ plan, mode: 'embedded' }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize checkout');
        }

        if (!data.clientSecret) {
          throw new Error('No client secret returned');
        }

        setClientSecret(data.clientSecret);
        setStatus('ready');
      } catch (err: any) {
        console.error('Checkout initialization error:', err);
        setError(err.message || 'Failed to initialize checkout');
        setStatus('error');
      }
    };

    fetchClientSecret();
  }, [plan]);

  // Handle checkout completion
  const handleComplete = useCallback(() => {
    setStatus('complete');
    onComplete?.();
  }, [onComplete]);

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white/60 text-sm">Preparing secure checkout...</p>
      </motion.div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Checkout Error</h3>
        <p className="text-white/50 text-sm mb-6 max-w-sm">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-accent text-black rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  // Complete state
  if (status === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
        >
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Payment Successful!</h3>
        <p className="text-white/50 text-sm">Redirecting to your dashboard...</p>
      </motion.div>
    );
  }

  // Ready - show embedded checkout
  if (!clientSecret || !stripePromise) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="embedded-checkout-container"
    >
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          clientSecret,
          onComplete: handleComplete,
        }}
      >
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </motion.div>
  );
}
