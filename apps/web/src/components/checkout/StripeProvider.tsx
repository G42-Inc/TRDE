'use client';

import { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Load Stripe outside of component to avoid recreating on re-renders
const getStripe = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    return null;
  }
  return loadStripe(key);
};

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * Stripe Elements Provider
 * 
 * Wraps children with Stripe Elements context for embedded checkout
 * and payment forms. Uses premium dark theme styling.
 */
export function StripeProvider({ children }: StripeProviderProps) {
  const stripePromise = useMemo(() => getStripe(), []);

  const options = useMemo(() => ({
    appearance: {
      theme: 'night' as const,
      variables: {
        // Gold accent color
        colorPrimary: '#C9A962',
        // Dark background
        colorBackground: '#0a0a0a',
        colorBackgroundSecondary: '#141414',
        // Text colors
        colorText: '#ffffff',
        colorTextSecondary: '#a1a1a1',
        colorTextPlaceholder: '#6b6b6b',
        // Borders and inputs
        colorDanger: '#ef4444',
        borderRadius: '12px',
        spacingUnit: '4px',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSizeBase: '14px',
        fontWeightNormal: '400',
        fontWeightMedium: '500',
        fontWeightBold: '600',
      },
      rules: {
        '.Input': {
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          boxShadow: 'none',
          padding: '12px 14px',
        },
        '.Input:focus': {
          border: '1px solid #C9A962',
          boxShadow: '0 0 0 1px #C9A962',
        },
        '.Input--invalid': {
          border: '1px solid #ef4444',
        },
        '.Label': {
          color: '#a1a1a1',
          fontWeight: '500',
          marginBottom: '8px',
        },
        '.Tab': {
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
        },
        '.Tab:hover': {
          backgroundColor: '#242424',
        },
        '.Tab--selected': {
          backgroundColor: '#C9A962',
          borderColor: '#C9A962',
          color: '#000000',
        },
        '.CheckboxInput': {
          backgroundColor: '#1a1a1a',
          borderColor: '#2a2a2a',
        },
        '.CheckboxInput--checked': {
          backgroundColor: '#C9A962',
          borderColor: '#C9A962',
        },
      },
    },
  }), []);

  if (!stripePromise) {
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
