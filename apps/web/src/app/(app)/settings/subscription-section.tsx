'use client';

/**
 * Subscription Management Section
 * 
 * Displays current subscription status and allows users to manage their subscription
 * via Stripe Customer Portal (update plan, cancel, update payment method, etc.)
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface SubscriptionInfo {
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'comped';
  periodEnd: string | null;
  hasSubscription: boolean;
}

export function SubscriptionSection() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/billing/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        } else {
          setSubscription({
            plan: 'none',
            status: 'canceled',
            periodEnd: null,
            hasSubscription: false,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscription({
          plan: 'none',
          status: 'canceled',
          periodEnd: null,
          hasSubscription: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [isLoaded, user]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      alert('Failed to open subscription management portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-theme-bg-tertiary rounded w-1/3"></div>
          <div className="h-4 bg-theme-bg-tertiary rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription?.hasSubscription) {
    return (
      <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
        <div className="flex items-center gap-3 mb-4">
          <CreditCardIcon className="w-6 h-6 theme-text" />
          <h2 className="text-xl font-semibold theme-text">Subscription</h2>
        </div>
        <p className="text-sm theme-text-secondary mb-4">
          You don&apos;t have an active subscription. Choose a plan to get started.
        </p>
        <button
          onClick={() => router.push('/pricing')}
          className="w-full px-4 py-3 theme-button rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          View Plans
          <ArrowRightIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const statusColors = {
    active: 'text-success',
    past_due: 'text-yellow-500',
    canceled: 'text-danger',
    comped: 'text-accent',
  };

  const statusLabels = {
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    comped: 'Complimentary',
  };

  return (
    <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CreditCardIcon className="w-6 h-6 theme-text" />
          <h2 className="text-xl font-semibold theme-text">Subscription</h2>
        </div>
        <div className={`flex items-center gap-2 ${statusColors[subscription.status]}`}>
          {subscription.status === 'active' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : subscription.status === 'past_due' ? (
            <ExclamationTriangleIcon className="w-5 h-5" />
          ) : null}
          <span className="text-sm font-medium">{statusLabels[subscription.status]}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center py-2 border-b theme-border">
          <span className="text-sm theme-text-secondary">Plan</span>
          <span className="font-semibold theme-text capitalize">{subscription.plan}</span>
        </div>
        {subscription.periodEnd && (() => {
          try {
            const periodEndDate = new Date(subscription.periodEnd);
            if (isNaN(periodEndDate.getTime())) {
              return null; // Invalid date, don't render
            }
            return (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm theme-text-secondary">
                  {subscription.status === 'canceled' ? 'Expires' : 'Renews'}
                </span>
                <span className="font-semibold theme-text">
                  {format(periodEndDate, 'PPp')}
                </span>
              </div>
            );
          } catch (error) {
            console.error('Error formatting period end date:', error);
            return null;
          }
        })()}
      </div>

      <button
        onClick={handleManageSubscription}
        disabled={portalLoading}
        className="w-full px-4 py-3 theme-button rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {portalLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Opening...
          </>
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5" />
            Manage Subscription
          </>
        )}
      </button>

      <p className="text-xs theme-text-tertiary mt-3 text-center">
        Update payment method, change plan, or cancel subscription
      </p>
    </div>
  );
}
