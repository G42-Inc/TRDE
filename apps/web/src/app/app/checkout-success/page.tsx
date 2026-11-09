'use client';

/**
 * Checkout Success Page
 * 
 * Luxury celebration experience after successful payment.
 * Shows confetti, optimistic progress, and smooth transition to app.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from '@/components/celebrations/Confetti';
import { useEntitlementPolling } from '@/hooks/useEntitlementPolling';
import { AppDownloadCards } from '@/components/AppDownloadCards';

// Tips to show while waiting
const TIPS = [
  { title: 'Track Your Edge', description: 'Log every trade to discover your most profitable setups.' },
  { title: 'Stay Disciplined', description: 'Set risk rules to protect your capital on tough days.' },
  { title: 'Review Weekly', description: 'Weekly reviews help identify patterns you might miss.' },
  { title: 'Journal Everything', description: 'Notes on your mindset reveal emotional trading patterns.' },
];

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const sessionId = searchParams.get('session_id');
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const {
    isReady,
    currentStep,
    progress,
    statusMessage,
    error,
    elapsedTime,
    retry,
  } = useEntitlementPolling({
    sessionId,
    enabled: isLoaded && !!user && !!sessionId,
    onReady: () => {
      // Auto-redirect after brief celebration
      setTimeout(() => {
        router.push('/app');
      }, 3000);
    },
  });

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (isReady) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isReady]);

  // Show main content after initial animation
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Stop confetti after duration
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No session ID
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Session</h1>
          <p className="text-white/60 mb-6">No checkout session found. Please try again.</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-black rounded-xl font-semibold"
          >
            Return to Pricing
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error && currentStep === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Almost There</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={retry}
              className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/app"
              className="px-6 py-3 bg-accent text-black rounded-xl font-semibold"
            >
              Go to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const firstName = user?.firstName || 'there';

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Confetti */}
      {showConfetti && <Confetti variant="burst" particleCount={150} duration={3500} />}

      {/* Subtle gradient background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201, 169, 98, 0.08) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 min-h-screen flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!isReady ? (
            // Processing State
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="mb-8"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                  <motion.svg
                    className="w-12 h-12 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </div>
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl sm:text-4xl font-bold text-white mb-3"
              >
                Payment Successful!
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 text-lg mb-10"
              >
                Welcome, {firstName}. Setting up your account...
              </motion.p>

              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-sm mx-auto mb-4"
              >
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent to-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/40">
                  <span>{statusMessage}</span>
                  <span>{progress}%</span>
                </div>
              </motion.div>

              {/* Tips Carousel */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">While you wait</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTipIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="font-semibold text-white mb-1">{TIPS[currentTipIndex].title}</h3>
                    <p className="text-sm text-white/50">{TIPS[currentTipIndex].description}</p>
                  </motion.div>
                </AnimatePresence>
                
                {/* Tip indicators */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {TIPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        index === currentTipIndex ? 'bg-accent' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>

              {elapsedTime > 15 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-xs text-white/30"
                >
                  Taking longer than expected? You can{' '}
                  <Link href="/app" className="text-accent hover:underline">
                    continue to dashboard
                  </Link>
                </motion.p>
              )}
            </motion.div>
          ) : (
            // Success State
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center"
            >
              {/* Big Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mb-8"
              >
                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <svg className="w-14 h-14 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl sm:text-5xl font-bold text-white mb-4"
              >
                You&apos;re All Set!
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-white/60 mb-8"
              >
                Your subscription is active. Redirecting to dashboard...
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-accent/25 transition-all"
                >
                  Go to Dashboard
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Loading…</div>}>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
