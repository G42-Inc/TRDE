'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanTier } from '@/lib/entitlements/types';

interface CheckoutState {
  isOpen: boolean;
  plan: PlanTier | null;
  isLoading: boolean;
  error: string | null;
}

interface UseCheckoutReturn {
  // State
  checkoutState: CheckoutState;
  
  // Actions
  openCheckout: (plan: PlanTier) => void;
  closeCheckout: () => void;
  startRedirectCheckout: (plan: PlanTier) => Promise<void>;
  
  // Modal props helper
  modalProps: {
    isOpen: boolean;
    plan: PlanTier;
    planName: string;
    price: string;
    onClose: () => void;
  } | null;
}

const PLAN_INFO: Record<PlanTier, { name: string; price: string }> = {
  basic: { name: 'Basic', price: '$9.99' },
  edge: { name: 'Edge', price: '$19.99' },
  pro: { name: 'Pro', price: '$49.99' },
};

/**
 * Hook for managing checkout flow
 * Supports both embedded (modal) and redirect checkout modes
 */
export function useCheckout(): UseCheckoutReturn {
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({
    isOpen: false,
    plan: null,
    isLoading: false,
    error: null,
  });

  // Open embedded checkout modal
  const openCheckout = useCallback((plan: PlanTier) => {
    setState({
      isOpen: true,
      plan,
      isLoading: false,
      error: null,
    });
  }, []);

  // Close checkout modal
  const closeCheckout = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Start redirect checkout (alternative to embedded)
  const startRedirectCheckout = useCallback(async (plan: PlanTier) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, mode: 'redirect' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      if (data.redirectToPortal) {
        // User already has subscription - redirect to portal
        const portalResponse = await fetch('/api/billing/portal', {
          method: 'POST',
          credentials: 'include',
        });
        const portalData = await portalResponse.json();
        if (portalData.url) {
          window.location.href = portalData.url;
          return;
        }
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to start checkout',
      }));
    }
  }, []);

  // Generate modal props if checkout is open
  const modalProps = state.isOpen && state.plan ? {
    isOpen: state.isOpen,
    plan: state.plan,
    planName: PLAN_INFO[state.plan].name,
    price: PLAN_INFO[state.plan].price,
    onClose: closeCheckout,
  } : null;

  return {
    checkoutState: state,
    openCheckout,
    closeCheckout,
    startRedirectCheckout,
    modalProps,
  };
}
