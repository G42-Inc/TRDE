// Full app theme system with comprehensive color palettes using muted/pastel backgrounds

export type ThemeName = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal' | 'mono' | 'cyan' | 'amber' | 'emerald' | 'violet' | 'rose';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    // Primary action colors
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryLight: string;
    primaryDark: string;
    
    // Background colors (muted/pastel)
    bg: string;              // Main background
    bgSecondary: string;    // Secondary background (cards, panels)
    bgTertiary: string;     // Tertiary background (hover states)
    
    // Text colors
    text: string;           // Primary text
    textSecondary: string;  // Secondary text (muted)
    textTertiary: string;   // Tertiary text (very muted)
    
    // Border colors
    border: string;         // Primary borders
    borderSecondary: string; // Secondary borders
    
    // Accent colors
    accent: string;         // Accent color for highlights
    accentHover: string;    // Accent hover
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // UI element colors
    ring: string;           // Focus ring
    shadow: string;         // Shadow color
  };
}

export const themes: Record<ThemeName, Theme> = {
  blue: {
    name: 'blue',
    displayName: 'Blue',
    colors: {
      primary: '#C9A962',      // Gold accent (matches mobile app FAB)
      primaryHover: '#A68B4B',
      primaryActive: '#8a7340',
      primaryLight: '#D4B896',
      primaryDark: '#A68B4B',
      bg: '#f8fafc',           // Very light blue-gray
      bgSecondary: '#f1f5f9', // Light blue-gray
      bgTertiary: '#e2e8f0',   // Muted blue-gray
      text: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#94a3b8',
      border: '#cbd5e1',      // Soft blue-gray border
      borderSecondary: '#e2e8f0',
      accent: '#C9A962',       // Gold accent
      accentHover: '#A68B4B',
      success: '#0D9488',      // Teal (matches mobile app)
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#C9A962',
      shadow: '#C9A962',
    },
  },
  purple: {
    name: 'purple',
    displayName: 'Purple',
    colors: {
      primary: '#9333ea',
      primaryHover: '#7e22ce',
      primaryActive: '#6b21a8',
      primaryLight: '#a855f7',
      primaryDark: '#581c87',
      bg: '#faf5ff',           // Very light lavender
      bgSecondary: '#f3e8ff', // Light lavender
      bgTertiary: '#e9d5ff',  // Muted lavender
      text: '#1e1b4b',
      textSecondary: '#5b21b6',
      textTertiary: '#a78bfa',
      border: '#d8b4fe',      // Soft purple border
      borderSecondary: '#e9d5ff',
      accent: '#a855f7',
      accentHover: '#9333ea',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#a855f7',
      shadow: '#9333ea',
    },
  },
  green: {
    name: 'green',
    displayName: 'Green',
    colors: {
      primary: '#16a34a',
      primaryHover: '#15803d',
      primaryActive: '#166534',
      primaryLight: '#22c55e',
      primaryDark: '#14532d',
      bg: '#f0fdf4',           // Very light mint
      bgSecondary: '#dcfce7', // Light mint
      bgTertiary: '#bbf7d0',  // Muted mint
      text: '#052e16',
      textSecondary: '#166534',
      textTertiary: '#86efac',
      border: '#86efac',      // Soft green border
      borderSecondary: '#bbf7d0',
      accent: '#22c55e',
      accentHover: '#16a34a',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#22c55e',
      shadow: '#16a34a',
    },
  },
  orange: {
    name: 'orange',
    displayName: 'Orange',
    colors: {
      primary: '#ea580c',
      primaryHover: '#c2410c',
      primaryActive: '#9a3412',
      primaryLight: '#f97316',
      primaryDark: '#7c2d12',
      bg: '#fff7ed',           // Very light peach
      bgSecondary: '#ffedd5', // Light peach
      bgTertiary: '#fed7aa',  // Muted peach
      text: '#431407',
      textSecondary: '#9a3412',
      textTertiary: '#fdba74',
      border: '#fdba74',      // Soft orange border
      borderSecondary: '#fed7aa',
      accent: '#f97316',
      accentHover: '#ea580c',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#f97316',
      shadow: '#ea580c',
    },
  },
  red: {
    name: 'red',
    displayName: 'Red',
    colors: {
      primary: '#dc2626',
      primaryHover: '#b91c1c',
      primaryActive: '#991b1b',
      primaryLight: '#ef4444',
      primaryDark: '#7f1d1d',
      bg: '#fef2f2',           // Very light rose
      bgSecondary: '#fee2e2', // Light rose
      bgTertiary: '#fecaca',  // Muted rose
      text: '#450a0a',
      textSecondary: '#991b1b',
      textTertiary: '#fca5a5',
      border: '#fca5a5',      // Soft red border
      borderSecondary: '#fecaca',
      accent: '#ef4444',
      accentHover: '#dc2626',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#ef4444',
      shadow: '#dc2626',
    },
  },
  pink: {
    name: 'pink',
    displayName: 'Pink',
    colors: {
      primary: '#db2777',
      primaryHover: '#be185d',
      primaryActive: '#9f1239',
      primaryLight: '#ec4899',
      primaryDark: '#831843',
      bg: '#fdf2f8',           // Very light pink
      bgSecondary: '#fce7f3', // Light pink
      bgTertiary: '#fbcfe8',  // Muted pink
      text: '#500724',
      textSecondary: '#9f1239',
      textTertiary: '#f9a8d4',
      border: '#f9a8d4',      // Soft pink border
      borderSecondary: '#fbcfe8',
      accent: '#ec4899',
      accentHover: '#db2777',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#ec4899',
      shadow: '#db2777',
    },
  },
  indigo: {
    name: 'indigo',
    displayName: 'Indigo',
    colors: {
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      primaryActive: '#3730a3',
      primaryLight: '#6366f1',
      primaryDark: '#312e81',
      bg: '#eef2ff',           // Very light indigo
      bgSecondary: '#e0e7ff', // Light indigo
      bgTertiary: '#c7d2fe',  // Muted indigo
      text: '#1e1b4b',
      textSecondary: '#4338ca',
      textTertiary: '#a5b4fc',
      border: '#a5b4fc',      // Soft indigo border
      borderSecondary: '#c7d2fe',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#6366f1',
      shadow: '#4f46e5',
    },
  },
  teal: {
    name: 'teal',
    displayName: 'Teal',
    colors: {
      primary: '#0d9488',
      primaryHover: '#0f766e',
      primaryActive: '#115e59',
      primaryLight: '#14b8a6',
      primaryDark: '#134e4a',
      bg: '#f0fdfa',           // Very light teal
      bgSecondary: '#ccfbf1', // Light teal
      bgTertiary: '#99f6e4',  // Muted teal
      text: '#042f2e',
      textSecondary: '#115e59',
      textTertiary: '#5eead4',
      border: '#5eead4',      // Soft teal border
      borderSecondary: '#99f6e4',
      accent: '#14b8a6',
      accentHover: '#0d9488',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#14b8a6',
      shadow: '#0d9488',
    },
  },
  mono: {
    name: 'mono',
    displayName: 'Monochrome',
    colors: {
      primary: '#C9A962',       // Gold accent (matches mobile app FAB)
      primaryHover: '#A68B4B',  // Darker gold on hover
      primaryActive: '#8a7340', // Even darker gold on active
      primaryLight: '#D4B896',  // Lighter gold variant
      primaryDark: '#A68B4B',   // Darker gold variant
      bg: '#ffffff',           // Pure white
      bgSecondary: '#ffffff',  // Pure white
      bgTertiary: '#e5e5e5',   // Light gray for inputs
      text: '#000000',         // Pure black
      textSecondary: '#1a1a1a', // Dark gray
      textTertiary: '#4a4a4a',  // Medium gray
      border: '#d4d4d4',        // Light gray border (softer than pure black)
      borderSecondary: '#e5e5e5',
      accent: '#C9A962',        // Gold accent (matches mobile app FAB)
      accentHover: '#A68B4B',
      success: '#0D9488',       // Teal (matches mobile app)
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#C9A962',          // Gold ring to match buttons
      shadow: '#C9A962',        // Gold shadow to match buttons
    },
  },
  cyan: {
    name: 'cyan',
    displayName: 'Cyan',
    colors: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      primaryActive: '#0e7490',
      primaryLight: '#22d3ee',
      primaryDark: '#155e75',
      bg: '#ecfeff',           // Very light cyan
      bgSecondary: '#cffafe', // Light cyan
      bgTertiary: '#a5f3fc',  // Muted cyan
      text: '#083344',
      textSecondary: '#155e75',
      textTertiary: '#67e8f9',
      border: '#67e8f9',      // Soft cyan border
      borderSecondary: '#a5f3fc',
      accent: '#22d3ee',
      accentHover: '#06b6d4',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#22d3ee',
      shadow: '#06b6d4',
    },
  },
  amber: {
    name: 'amber',
    displayName: 'Amber',
    colors: {
      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryActive: '#b45309',
      primaryLight: '#fbbf24',
      primaryDark: '#92400e',
      bg: '#fffbeb',           // Very light amber
      bgSecondary: '#fef3c7', // Light amber
      bgTertiary: '#fde68a',  // Muted amber
      text: '#78350f',
      textSecondary: '#92400e',
      textTertiary: '#fcd34d',
      border: '#fcd34d',      // Soft amber border
      borderSecondary: '#fde68a',
      accent: '#fbbf24',
      accentHover: '#f59e0b',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#fbbf24',
      shadow: '#f59e0b',
    },
  },
  emerald: {
    name: 'emerald',
    displayName: 'Emerald',
    colors: {
      primary: '#10b981',
      primaryHover: '#059669',
      primaryActive: '#047857',
      primaryLight: '#34d399',
      primaryDark: '#065f46',
      bg: '#ecfdf5',           // Very light emerald
      bgSecondary: '#d1fae5', // Light emerald
      bgTertiary: '#a7f3d0',  // Muted emerald
      text: '#064e3b',
      textSecondary: '#047857',
      textTertiary: '#6ee7b7',
      border: '#6ee7b7',      // Soft emerald border
      borderSecondary: '#a7f3d0',
      accent: '#34d399',
      accentHover: '#10b981',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#34d399',
      shadow: '#10b981',
    },
  },
  violet: {
    name: 'violet',
    displayName: 'Violet',
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryActive: '#6d28d9',
      primaryLight: '#a78bfa',
      primaryDark: '#5b21b6',
      bg: '#f5f3ff',           // Very light violet
      bgSecondary: '#ede9fe', // Light violet
      bgTertiary: '#ddd6fe',  // Muted violet
      text: '#4c1d95',
      textSecondary: '#5b21b6',
      textTertiary: '#c4b5fd',
      border: '#c4b5fd',      // Soft violet border
      borderSecondary: '#ddd6fe',
      accent: '#a78bfa',
      accentHover: '#8b5cf6',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#a78bfa',
      shadow: '#8b5cf6',
    },
  },
  rose: {
    name: 'rose',
    displayName: 'Rose',
    colors: {
      primary: '#f43f5e',
      primaryHover: '#e11d48',
      primaryActive: '#be123c',
      primaryLight: '#fb7185',
      primaryDark: '#9f1239',
      bg: '#fff1f2',           // Very light rose
      bgSecondary: '#ffe4e6', // Light rose
      bgTertiary: '#fecdd3',  // Muted rose
      text: '#881337',
      textSecondary: '#9f1239',
      textTertiary: '#fda4af',
      border: '#fda4af',      // Soft rose border
      borderSecondary: '#fecdd3',
      accent: '#fb7185',
      accentHover: '#f43f5e',
      success: '#0D9488',
      warning: '#ea580c',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#fb7185',
      shadow: '#f43f5e',
    },
  },
};

// Dark mode variants with muted backgrounds
export const darkThemes: Record<ThemeName, Theme> = {
  blue: {
    name: 'blue',
    displayName: 'Blue (Dark)',
    colors: {
      primary: '#C9A962',      // Gold accent (matches mobile app FAB)
      primaryHover: '#D4B896',
      primaryActive: '#A68B4B',
      primaryLight: '#D4B896',
      primaryDark: '#A68B4B',
      bg: '#0f172a',           // Dark blue-gray
      bgSecondary: '#1e293b',  // Darker blue-gray
      bgTertiary: '#334155',   // Muted dark blue-gray
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      textTertiary: '#64748b',
      border: '#334155',      // Dark blue-gray border
      borderSecondary: '#475569',
      accent: '#C9A962',       // Gold accent
      accentHover: '#D4B896',
      success: '#0D9488',      // Teal (matches mobile app)
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#C9A962',
      shadow: '#C9A962',
    },
  },
  purple: {
    name: 'purple',
    displayName: 'Purple (Dark)',
    colors: {
      primary: '#a855f7',
      primaryHover: '#9333ea',
      primaryActive: '#7e22ce',
      primaryLight: '#c084fc',
      primaryDark: '#581c87',
      bg: '#1e1b4b',           // Dark purple
      bgSecondary: '#312e81',  // Darker purple
      bgTertiary: '#4c1d95',   // Muted dark purple
      text: '#faf5ff',
      textSecondary: '#c084fc',
      textTertiary: '#a78bfa',
      border: '#4c1d95',      // Dark purple border
      borderSecondary: '#6d28d9',
      accent: '#a855f7',
      accentHover: '#9333ea',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#a855f7',
      shadow: '#9333ea',
    },
  },
  green: {
    name: 'green',
    displayName: 'Green (Dark)',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      primaryActive: '#15803d',
      primaryLight: '#4ade80',
      primaryDark: '#14532d',
      bg: '#052e16',           // Dark green
      bgSecondary: '#14532d',  // Darker green
      bgTertiary: '#166534',   // Muted dark green
      text: '#f0fdf4',
      textSecondary: '#86efac',
      textTertiary: '#4ade80',
      border: '#166534',      // Dark green border
      borderSecondary: '#15803d',
      accent: '#22c55e',
      accentHover: '#16a34a',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#22c55e',
      shadow: '#16a34a',
    },
  },
  orange: {
    name: 'orange',
    displayName: 'Orange (Dark)',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryActive: '#c2410c',
      primaryLight: '#fb923c',
      primaryDark: '#7c2d12',
      bg: '#431407',           // Dark orange
      bgSecondary: '#7c2d12',  // Darker orange
      bgTertiary: '#9a3412',   // Muted dark orange
      text: '#fff7ed',
      textSecondary: '#fdba74',
      textTertiary: '#fb923c',
      border: '#9a3412',      // Dark orange border
      borderSecondary: '#c2410c',
      accent: '#f97316',
      accentHover: '#ea580c',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#f97316',
      shadow: '#ea580c',
    },
  },
  red: {
    name: 'red',
    displayName: 'Red (Dark)',
    colors: {
      primary: '#ef4444',
      primaryHover: '#dc2626',
      primaryActive: '#b91c1c',
      primaryLight: '#f87171',
      primaryDark: '#7f1d1d',
      bg: '#450a0a',           // Dark red
      bgSecondary: '#7f1d1d',  // Darker red
      bgTertiary: '#991b1b',   // Muted dark red
      text: '#fef2f2',
      textSecondary: '#fca5a5',
      textTertiary: '#f87171',
      border: '#991b1b',      // Dark red border
      borderSecondary: '#b91c1c',
      accent: '#ef4444',
      accentHover: '#dc2626',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#ef4444',
      shadow: '#dc2626',
    },
  },
  pink: {
    name: 'pink',
    displayName: 'Pink (Dark)',
    colors: {
      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryActive: '#be185d',
      primaryLight: '#f472b6',
      primaryDark: '#831843',
      bg: '#500724',           // Dark pink
      bgSecondary: '#831843',  // Darker pink
      bgTertiary: '#9f1239',   // Muted dark pink
      text: '#fdf2f8',
      textSecondary: '#f9a8d4',
      textTertiary: '#f472b6',
      border: '#9f1239',      // Dark pink border
      borderSecondary: '#be185d',
      accent: '#ec4899',
      accentHover: '#db2777',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#ec4899',
      shadow: '#db2777',
    },
  },
  indigo: {
    name: 'indigo',
    displayName: 'Indigo (Dark)',
    colors: {
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryActive: '#4338ca',
      primaryLight: '#818cf8',
      primaryDark: '#312e81',
      bg: '#1e1b4b',           // Dark indigo
      bgSecondary: '#312e81',  // Darker indigo
      bgTertiary: '#3730a3',   // Muted dark indigo
      text: '#eef2ff',
      textSecondary: '#a5b4fc',
      textTertiary: '#818cf8',
      border: '#3730a3',      // Dark indigo border
      borderSecondary: '#4338ca',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#6366f1',
      shadow: '#4f46e5',
    },
  },
  teal: {
    name: 'teal',
    displayName: 'Teal (Dark)',
    colors: {
      primary: '#14b8a6',
      primaryHover: '#0d9488',
      primaryActive: '#0f766e',
      primaryLight: '#5eead4',
      primaryDark: '#134e4a',
      bg: '#042f2e',           // Dark teal
      bgSecondary: '#134e4a',  // Darker teal
      bgTertiary: '#115e59',   // Muted dark teal
      text: '#f0fdfa',
      textSecondary: '#5eead4',
      textTertiary: '#2dd4bf',
      border: '#115e59',      // Dark teal border
      borderSecondary: '#0f766e',
      accent: '#14b8a6',
      accentHover: '#0d9488',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#14b8a6',
      shadow: '#0d9488',
    },
  },
  mono: {
    name: 'mono',
    displayName: 'Monochrome (Dark)',
    colors: {
      primary: '#C9A962',       // Gold accent (matches mobile app FAB)
      primaryHover: '#D4B896',  // Lighter gold on hover (dark mode inverts)
      primaryActive: '#A68B4B', // Darker gold on active
      primaryLight: '#D4B896',  // Lighter gold variant
      primaryDark: '#A68B4B',   // Darker gold variant
      bg: '#000000',           // Pure black
      bgSecondary: '#000000',  // Pure black
      bgTertiary: '#333333',   // Dark gray for inputs
      text: '#ffffff',         // Pure white
      textSecondary: '#e5e5e5', // Light gray
      textTertiary: '#b3b3b3',  // Medium gray
      border: '#4a4a4a',       // Dark gray border (softer than pure white)
      borderSecondary: '#333333',
      accent: '#C9A962',       // Gold accent (matches mobile app FAB)
      accentHover: '#D4B896',
      success: '#0D9488',      // Teal (matches mobile app)
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#C9A962',         // Gold ring to match buttons
      shadow: '#C9A962',       // Gold shadow to match buttons
    },
  },
  cyan: {
    name: 'cyan',
    displayName: 'Cyan (Dark)',
    colors: {
      primary: '#22d3ee',
      primaryHover: '#06b6d4',
      primaryActive: '#0891b2',
      primaryLight: '#67e8f9',
      primaryDark: '#155e75',
      bg: '#083344',           // Dark cyan
      bgSecondary: '#155e75',  // Darker cyan
      bgTertiary: '#0e7490',   // Muted dark cyan
      text: '#ecfeff',
      textSecondary: '#67e8f9',
      textTertiary: '#22d3ee',
      border: '#0e7490',      // Dark cyan border
      borderSecondary: '#0891b2',
      accent: '#22d3ee',
      accentHover: '#06b6d4',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#22d3ee',
      shadow: '#06b6d4',
    },
  },
  amber: {
    name: 'amber',
    displayName: 'Amber (Dark)',
    colors: {
      primary: '#fbbf24',
      primaryHover: '#f59e0b',
      primaryActive: '#d97706',
      primaryLight: '#fcd34d',
      primaryDark: '#92400e',
      bg: '#78350f',           // Dark amber
      bgSecondary: '#92400e',  // Darker amber
      bgTertiary: '#b45309',   // Muted dark amber
      text: '#fffbeb',
      textSecondary: '#fcd34d',
      textTertiary: '#fbbf24',
      border: '#b45309',      // Dark amber border
      borderSecondary: '#d97706',
      accent: '#fbbf24',
      accentHover: '#f59e0b',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#fbbf24',
      shadow: '#f59e0b',
    },
  },
  emerald: {
    name: 'emerald',
    displayName: 'Emerald (Dark)',
    colors: {
      primary: '#34d399',
      primaryHover: '#10b981',
      primaryActive: '#059669',
      primaryLight: '#6ee7b7',
      primaryDark: '#065f46',
      bg: '#064e3b',           // Dark emerald
      bgSecondary: '#065f46',  // Darker emerald
      bgTertiary: '#047857',   // Muted dark emerald
      text: '#ecfdf5',
      textSecondary: '#6ee7b7',
      textTertiary: '#34d399',
      border: '#047857',      // Dark emerald border
      borderSecondary: '#059669',
      accent: '#34d399',
      accentHover: '#10b981',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#34d399',
      shadow: '#10b981',
    },
  },
  violet: {
    name: 'violet',
    displayName: 'Violet (Dark)',
    colors: {
      primary: '#a78bfa',
      primaryHover: '#8b5cf6',
      primaryActive: '#7c3aed',
      primaryLight: '#c4b5fd',
      primaryDark: '#5b21b6',
      bg: '#4c1d95',           // Dark violet
      bgSecondary: '#5b21b6',  // Darker violet
      bgTertiary: '#6d28d9',   // Muted dark violet
      text: '#f5f3ff',
      textSecondary: '#c4b5fd',
      textTertiary: '#a78bfa',
      border: '#6d28d9',      // Dark violet border
      borderSecondary: '#7c3aed',
      accent: '#a78bfa',
      accentHover: '#8b5cf6',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#a78bfa',
      shadow: '#8b5cf6',
    },
  },
  rose: {
    name: 'rose',
    displayName: 'Rose (Dark)',
    colors: {
      primary: '#fb7185',
      primaryHover: '#f43f5e',
      primaryActive: '#e11d48',
      primaryLight: '#fda4af',
      primaryDark: '#9f1239',
      bg: '#881337',           // Dark rose
      bgSecondary: '#9f1239',  // Darker rose
      bgTertiary: '#be123c',   // Muted dark rose
      text: '#fff1f2',
      textSecondary: '#fda4af',
      textTertiary: '#fb7185',
      border: '#be123c',      // Dark rose border
      borderSecondary: '#e11d48',
      accent: '#fb7185',
      accentHover: '#f43f5e',
      success: '#0D9488',
      warning: '#f97316',
      error: '#E57373',
      info: '#0ea5e9',
      ring: '#fb7185',
      shadow: '#f43f5e',
    },
  },
};

const DEFAULT_THEME: ThemeName = 'mono';

/**
 * Get the current dashboard theme from localStorage
 */
export function getTheme(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  try {
    // Check for dashboard theme first (new storage key)
    const dashboardTheme = localStorage.getItem('trde:dashboard-theme');
    if (dashboardTheme && dashboardTheme in themes) {
      return dashboardTheme as ThemeName;
    }
    // Fallback to old storage key for migration
    const stored = localStorage.getItem('trde:theme');
    if (stored && stored in themes) {
      // Migrate to new key
      localStorage.setItem('trde:dashboard-theme', stored);
      return stored as ThemeName;
    }
    return DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Get the dashboard theme (explicitly)
 */
export function getDashboardTheme(): ThemeName {
  return getTheme();
}

/**
 * Check if dark mode is enabled
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const theme = localStorage.getItem('trde-theme') || 'light';
    return theme === 'dark';
  } catch {
    return false;
  }
}

/**
 * Set the dashboard theme and apply it to the document
 */
export function setTheme(themeName: ThemeName): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('trde:dashboard-theme', themeName);
    applyDashboardTheme(themeName);
    // Trigger a custom event so components can react to theme changes
    window.dispatchEvent(new CustomEvent('dashboardThemeChanged', { detail: themeName }));
  } catch {
    // Ignore errors
  }
}

/**
 * Set the dashboard theme (explicitly)
 */
export function setDashboardTheme(themeName: ThemeName): void {
  setTheme(themeName);
}

/**
 * Apply dashboard theme colors to the document via CSS variables
 * Uses data-dashboard-theme attribute instead of data-theme
 */
export function applyDashboardTheme(themeName: ThemeName): void {
  if (typeof window === 'undefined') return;
  
  const isDark = isDarkMode();
  const themeSet = isDark ? darkThemes : themes;
  const theme = themeSet[themeName] || themeSet.mono; // Fallback to mono if theme not found
  const root = document.documentElement;
  
  // Set CSS variables for all theme colors
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-primary-active', theme.colors.primaryActive);
  root.style.setProperty('--theme-primary-light', theme.colors.primaryLight);
  root.style.setProperty('--theme-primary-dark', theme.colors.primaryDark);
  
  root.style.setProperty('--theme-bg', theme.colors.bg);
  root.style.setProperty('--theme-bg-secondary', theme.colors.bgSecondary);
  root.style.setProperty('--theme-bg-tertiary', theme.colors.bgTertiary);
  
  root.style.setProperty('--theme-text', theme.colors.text);
  root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--theme-text-tertiary', theme.colors.textTertiary);
  
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-border-secondary', theme.colors.borderSecondary);
  
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-accent-hover', theme.colors.accentHover);
  
  root.style.setProperty('--theme-success', theme.colors.success);
  root.style.setProperty('--theme-warning', theme.colors.warning);
  root.style.setProperty('--theme-error', theme.colors.error);
  root.style.setProperty('--theme-info', theme.colors.info);
  
  root.style.setProperty('--theme-ring', theme.colors.ring);
  root.style.setProperty('--theme-shadow', theme.colors.shadow);
  
  // Use data-dashboard-theme attribute for CSS selectors
  root.setAttribute('data-dashboard-theme', themeName);
}

/**
 * Apply theme colors to the document via CSS variables
 * @deprecated Use applyDashboardTheme instead
 */
export function applyTheme(themeName: ThemeName): void {
  applyDashboardTheme(themeName);
}

/**
 * Remove dashboard theme (for landing/public pages)
 */
export function removeDashboardTheme(): void {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  root.removeAttribute('data-dashboard-theme');
  root.removeAttribute('data-theme'); // Remove old attribute if present
}

/**
 * Initialize dashboard theme on page load
 * Only call this from dashboard routes
 */
export function initDashboardTheme(): void {
  if (typeof window === 'undefined') return;
  const theme = getDashboardTheme();
  applyDashboardTheme(theme);
  
  // Listen for dark/light mode changes and reapply color theme
  const observer = new MutationObserver(() => {
    // Only reapply if dashboard theme attribute is still present
    if (document.documentElement.hasAttribute('data-dashboard-theme')) {
      const currentTheme = getDashboardTheme();
      applyDashboardTheme(currentTheme);
    }
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  // Also listen for storage changes (when theme is changed via ThemeContext)
  window.addEventListener('storage', () => {
    if (document.documentElement.hasAttribute('data-dashboard-theme')) {
      const currentTheme = getDashboardTheme();
      applyDashboardTheme(currentTheme);
    }
  });
  
  // Listen for custom dashboard theme change events
  window.addEventListener('dashboardThemeChanged', () => {
    if (document.documentElement.hasAttribute('data-dashboard-theme')) {
      const currentTheme = getDashboardTheme();
      applyDashboardTheme(currentTheme);
    }
  });
}

/**
 * Initialize theme on page load
 * @deprecated Use initDashboardTheme instead - only call from dashboard routes
 */
export function initTheme(): void {
  initDashboardTheme();
}

// ---------------------------------------------------------------------------
// Scene-aware theme integration
// ---------------------------------------------------------------------------

/**
 * Re-export scene utilities so consumers can import from one place.
 */
export { deriveAccents, getScene, isSceneDark } from './dashboard/dashboardScenes';
export type { SceneDefinition, DerivedAccents } from './dashboard/dashboardScenes';
export { getActiveTimeSlot } from './dashboard/dashboardThemeConfig';
export type { TimeSlot, DashboardThemeMode } from './dashboard/dashboardThemeConfig';

/**
 * Apply scene-derived accents as CSS variables on a target element.
 * Called by DashboardSceneProvider when the scene changes.
 */
export function applySceneAccents(
  element: HTMLElement,
  accents: { accentPrimary: string; accentSecondary: string; focusRing: string; glassTint: string }
): void {
  element.style.setProperty('--dash-accent-primary', accents.accentPrimary);
  element.style.setProperty('--dash-accent-secondary', accents.accentSecondary);
  element.style.setProperty('--dash-focus-ring', accents.focusRing);
  element.style.setProperty('--dash-glass-tint', accents.glassTint);
}
