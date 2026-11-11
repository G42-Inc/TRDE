'use client';

import { Suspense, createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import type { PlanTier } from '@/lib/entitlements/types';

const CheckoutContext = createContext<{
  processingPlan: PlanTier | null;
  selectPlan: (plan: PlanTier) => Promise<void>;
} | null>(null);

export function PricingCheckout({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [processingPlan, setProcessingPlan] = useState<PlanTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutInProgress = useRef(false);

  useEffect(() => {
    if (!checkoutError) return;
    const timeout = window.setTimeout(() => setCheckoutError(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [checkoutError]);

  async function selectPlan(plan: PlanTier) {
    if (checkoutInProgress.current) return;
    if (!user) {
      router.push('/sign-in?redirect_url=/pricing');
      return;
    }

    checkoutInProgress.current = true;
    setProcessingPlan(plan);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'include',
      });
      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.redirectToPortal && data.currentPlan) {
        setCheckoutError(`You already have an active ${data.currentPlan} subscription. Manage it in Settings.`);
      } else {
        setCheckoutError(data.error || 'Failed to create checkout session. Please try again.');
      }
    } catch {
      setCheckoutError('Network error. Please check your connection.');
    }

    checkoutInProgress.current = false;
    setProcessingPlan(null);
  }

  return (
    <CheckoutContext.Provider value={{ processingPlan, selectPlan }}>
      <Suspense fallback={null}>
        <PricingEntryNotices userId={isLoaded ? user?.id : undefined} />
      </Suspense>
      {checkoutError && (
        <p role="alert" className="mx-auto mb-12 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center font-semibold text-red-800 shadow-lg shadow-red-100/50">
          {checkoutError}
        </p>
      )}
      {children}
    </CheckoutContext.Provider>
  );
}

function PricingEntryNotices({ userId }: { userId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locked = searchParams.get('locked') === 'true';
  const upgrade = searchParams.get('upgrade');
  const checkoutCanceled = searchParams.get('checkout') === 'canceled';

  useEffect(() => {
    if (!userId || upgrade || locked) return;

    const controller = new AbortController();
    fetch('/api/auth/check-access?plan=basic', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!controller.signal.aborted && data.hasAccess && data.entitlement?.status !== 'demo') {
          router.push('/app');
        }
      })
      .catch(() => {
        // Pricing remains available when the access check fails.
      });

    return () => controller.abort();
  }, [userId, router, upgrade, locked]);

  if (!locked && !upgrade && !checkoutCanceled) return null;

  return (
    <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center font-semibold">
      {locked && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-lg shadow-red-100/50">
          ⚡ Choose a plan to unlock full access
        </p>
      )}
      {upgrade && (
        <p className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-5 text-blue-900 shadow-lg shadow-blue-100/50">
          Upgrade to unlock advanced features
        </p>
      )}
      {checkoutCanceled && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-lg shadow-amber-100/50">
          Ready when you are! Your checkout is waiting
        </p>
      )}
    </div>
  );
}

export function PricingPlanButton({ plan, className, children }: {
  plan: PlanTier;
  className: string;
  children: ReactNode;
}) {
  const checkout = useContext(CheckoutContext);
  if (!checkout) throw new Error('PricingPlanButton requires PricingCheckout');

  const { processingPlan, selectPlan } = checkout;
  const isProcessing = processingPlan === plan;

  return (
    <button
      type="button"
      onClick={() => selectPlan(plan)}
      disabled={processingPlan !== null}
      aria-busy={isProcessing}
      className={`group flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold shadow-lg motion-safe:transition-all motion-safe:duration-300 ${className} ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
      style={{ color: '#ffffff' }}
    >
      {isProcessing ? (
        <>
          <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white motion-safe:animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {children}
          <ArrowRightIcon aria-hidden="true" className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}
