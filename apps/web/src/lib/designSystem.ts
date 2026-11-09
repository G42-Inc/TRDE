/**
 * Premium Design System
 * Consistent spacing, typography, shadows, and animations
 */

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  xxl: '2rem',     // 32px
  xxxl: '3rem',    // 48px
};

export const typography = {
  h1: {
    fontSize: '2rem',      // 32px
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: '1.25',
  },
  h2: {
    fontSize: '1.5rem',    // 24px
    fontWeight: '700',
    letterSpacing: '-0.01em',
    lineHeight: '1.33',
  },
  h3: {
    fontSize: '1.25rem',   // 20px
    fontWeight: '600',
    letterSpacing: '-0.01em',
    lineHeight: '1.4',
  },
  h4: {
    fontSize: '1.125rem',  // 18px
    fontWeight: '600',
    letterSpacing: '0',
    lineHeight: '1.33',
  },
  body: {
    fontSize: '1rem',      // 16px
    fontWeight: '400',
    letterSpacing: '0',
    lineHeight: '1.5',
  },
  bodyBold: {
    fontSize: '1rem',
    fontWeight: '600',
    letterSpacing: '0',
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '0.875rem',  // 14px
    fontWeight: '400',
    letterSpacing: '0.01em',
    lineHeight: '1.43',
  },
  captionBold: {
    fontSize: '0.875rem',
    fontWeight: '600',
    letterSpacing: '0.01em',
    lineHeight: '1.43',
  },
  small: {
    fontSize: '0.75rem',   // 12px
    fontWeight: '400',
    letterSpacing: '0.02em',
    lineHeight: '1.33',
  },
  smallBold: {
    fontSize: '0.75rem',
    fontWeight: '600',
    letterSpacing: '0.02em',
    lineHeight: '1.33',
  },
  metric: {
    fontSize: '1.75rem',   // 28px
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: '1.29',
  },
  metricLarge: {
    fontSize: '2.25rem',   // 36px
    fontWeight: '700',
    letterSpacing: '-0.03em',
    lineHeight: '1.22',
  },
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
  'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
};

export const borderRadius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  xxl: '1.5rem',    // 24px
  full: '9999px',
};

export const animation = {
  timing: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #C9A962 0%, #A68B4B 100%)',  // Gold accent
  success: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',  // Teal (matches mobile)
  danger: 'linear-gradient(135deg, #E57373 0%, #D32F2F 100%)',   // Coral (matches mobile)
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  purple: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  dark: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
  light: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
};
