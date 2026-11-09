// TRDE Luxury Design System
// Premium fintech aesthetic with restrained elegance

export const colors = {
  // Brand Colors
  primary: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Accent - Warm Gold (luxury touch)
  accent: {
    light: '#D4B896',
    main: '#C9A962',
    dark: '#A68B4B',
    bg: 'rgba(201, 169, 98, 0.1)',
  },
  
  // Dark Mode Colors (Near-black)
  dark: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceElevated: '#141414',
    surfaceHover: '#1A1A1A',
    border: '#262626',
    borderLight: '#1F1F1F',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textTertiary: '#666666',
  },
  
  // Light Mode Colors (Near-white)
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F5F5',
    surfaceHover: '#EFEFEF',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    text: '#0A0A0A',
    textSecondary: '#525252',
    textTertiary: '#737373',
  },
  
  // Semantic Colors - Muted & Sophisticated
  semantic: {
    success: '#0D9488',  // Muted teal
    error: '#E57373',    // Muted coral
    warning: '#D97706',  // Warm amber
    info: '#6366F1',     // Muted indigo
  },
  
  // Extended semantic palettes
  success: {
    light: '#14B8A6',
    main: '#0D9488',
    dark: '#0F766E',
    bg: 'rgba(13, 148, 136, 0.1)',
    bgStrong: 'rgba(13, 148, 136, 0.2)',
  },
  error: {
    light: '#EF9A9A',
    main: '#E57373',
    dark: '#D32F2F',
    bg: 'rgba(229, 115, 115, 0.1)',
    bgStrong: 'rgba(229, 115, 115, 0.2)',
  },
  warning: {
    light: '#FBBF24',
    main: '#D97706',
    dark: '#B45309',
    bg: 'rgba(217, 119, 6, 0.1)',
    bgStrong: 'rgba(217, 119, 6, 0.2)',
  },
  info: {
    light: '#818CF8',
    main: '#6366F1',
    dark: '#4F46E5',
    bg: 'rgba(99, 102, 241, 0.1)',
    bgStrong: 'rgba(99, 102, 241, 0.2)',
  },
};

export const typography = {
  // Display - Hero numbers and statements
  display: {
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  
  // Large Number - For prominent stats
  largeNumber: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 42,
    letterSpacing: -0.75,
  },
  
  // Headings - Clear hierarchy
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 26,
    fontWeight: '600' as const,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  
  // Body - Increased base size for readability
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  
  // Body Small - Secondary content
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  bodySmallBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  
  // Small - Compact info
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  smallMedium: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  smallBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  
  // Caption - Labels and hints
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  
  // Micro - Tiny labels, badges
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  
  // Stat Value - For dashboard numbers
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  
  // Stat Label - For metric labels
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
};

// 8pt Grid Spacing System
export const spacing = {
  xxs: 2,
  xs: 4,      // Tight internal spacing
  sm: 8,      // Related elements
  md: 16,     // Standard padding
  lg: 24,     // Card margins
  xl: 32,     // Section gaps
  xxl: 48,    // Major sections
  xxxl: 64,   // Page sections
};

// Border Radius - Generous but not excessive
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,     // Standard cards
  xl: 20,     // Prominent cards
  xxl: 24,    // Hero cards
  full: 9999, // Pills and circles
};

// Shadow System - 4 Levels of Elevation
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Level 1: Subtle lift (default cards)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  // Level 2: Elevated (hover states, active cards)
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Level 3: Floating (modals, sheets)
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  // Level 4: Prominent (FAB, alerts, popovers)
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
};

// Animation Timing
export const animations = {
  timing: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 350,
    gentle: 500,
  },
  // Spring presets for React Native Animated
  spring: {
    snappy: { tension: 300, friction: 20 },
    default: { tension: 200, friction: 22 },
    gentle: { tension: 120, friction: 14 },
    bouncy: { tension: 400, friction: 10 },
  },
  easing: {
    easeIn: [0.4, 0, 1, 1],
    easeOut: [0, 0, 0.2, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    smooth: [0.25, 0.1, 0.25, 1],
  },
};

// Gradient colors
export const gradients = {
  primary: ['#0A0A0A', '#1A1A1A'],
  accent: ['#C9A962', '#A68B4B'],
  success: ['#14B8A6', '#0D9488'],
  error: ['#EF9A9A', '#E57373'],
  dark: ['#000000', '#0A0A0A', '#141414'],
  subtle: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'],
};

// Layout Constants
export const layout = {
  screenPaddingHorizontal: spacing.lg,  // 24pt
  screenPaddingVertical: spacing.md,    // 16pt
  cardPadding: spacing.lg,              // 24pt
  cardPaddingCompact: spacing.md,       // 16pt
  sectionSpacing: spacing.xl,           // 32pt
  sectionSpacingLarge: spacing.xxl,     // 48pt
  containerMaxWidth: 600,
  bottomTabHeight: 84,
  headerHeight: 56,
};

// Haptic feedback types (for reference)
export const haptics = {
  light: 'light',      // Tab changes, selections
  medium: 'medium',    // Successful actions
  heavy: 'heavy',      // Warnings, destructive
  success: 'success',  // Task completion
  warning: 'warning',  // Alerts
  error: 'error',      // Failures
} as const;
