'use client';

import { forwardRef } from 'react';
import { useDemo, useDemoFeature } from '@/contexts/DemoContext';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { DEMO_RESTRICTIONS } from '@/lib/demo/guards';

interface DemoLockedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The feature this button is gated behind */
  feature: keyof typeof DEMO_RESTRICTIONS;
  /** The click handler when user has access */
  onAllowedClick?: () => void;
  /** Custom locked message */
  lockedMessage?: string;
  /** Show lock icon on locked state */
  showLockIcon?: boolean;
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Demo-aware button that shows upgrade prompt when clicked in demo mode
 * 
 * Use this button for any action that should be gated in demo mode.
 * It will automatically show the upgrade modal when a demo user clicks it.
 */
export const DemoLockedButton = forwardRef<HTMLButtonElement, DemoLockedButtonProps>(
  function DemoLockedButton(
    {
      feature,
      onAllowedClick,
      lockedMessage,
      showLockIcon = true,
      variant = 'primary',
      size = 'md',
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) {
    const { allowed, triggerUpgrade } = useDemoFeature(feature);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!allowed) {
        e.preventDefault();
        triggerUpgrade();
        return;
      }
      onAllowedClick?.();
    };

    // Style variants
    const baseStyles = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
      primary: allowed
        ? 'bg-accent text-black hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/20'
        : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10',
      secondary: allowed
        ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10',
      ghost: allowed
        ? 'text-white hover:bg-white/10'
        : 'text-white/50 hover:bg-white/5',
    };

    const isLocked = !allowed;

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLocked && showLockIcon && (
          <SparklesIcon className="w-4 h-4 text-accent" />
        )}
        {children}
        {isLocked && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <LockClosedIcon className="w-2.5 h-2.5 text-accent" />
          </span>
        )}
      </button>
    );
  }
);
