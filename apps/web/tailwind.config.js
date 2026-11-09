/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-family)', 'sans-serif'],
      },
      colors: {
        // TRDE Landing page tokens
        trde: {
          black: '#0B0B0D',
          white: '#FFFFFF',
          gold: '#C8A24A',
          'gold-soft': 'rgba(200, 162, 74, 0.18)',
          border: '#E5E7EB',
          muted: '#6B7280',
        },
        // Accent - Warm Gold (luxury touch, matches mobile app)
        accent: {
          light: '#D4B896',
          DEFAULT: '#C9A962',
          main: '#C9A962',
          dark: '#A68B4B',
          bg: 'rgba(201, 169, 98, 0.1)',
        },
        // Primary now uses gold accent for buttons
        primary: {
          50: '#faf8f5',
          100: '#f5f1e8',
          200: '#e9dfc8',
          300: '#dcc9a1',
          400: '#D4B896',
          500: '#C9A962',  // Main gold
          600: '#B89851',
          700: '#A68B4B',
          800: '#8a7340',
          900: '#6b5931',
        },
        // Trading Performance Colors (matches mobile app)
        positive: {
          DEFAULT: '#0D9488',  // Teal-600 - main positive color
          light: '#14B8A6',    // Teal-500 - lighter variant
          dark: '#0F766E',     // Teal-700 - darker variant
          bg: 'rgba(13, 148, 136, 0.1)',
          bgStrong: 'rgba(13, 148, 136, 0.2)',
        },
        negative: {
          DEFAULT: '#E57373',  // Muted coral - main negative color
          light: '#EF9A9A',    // Lighter coral
          dark: '#D32F2F',     // Darker coral
          bg: 'rgba(229, 115, 115, 0.1)',
          bgStrong: 'rgba(229, 115, 115, 0.2)',
        },
        // UI State Colors (keep for non-stat contexts)
        success: {
          DEFAULT: '#0D9488',  // Same as positive
          light: '#14B8A6',
          dark: '#0F766E',
        },
        danger: {
          DEFAULT: '#ef4444',  // Keep red for errors/warnings
          light: '#f87171',
          dark: '#dc2626',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
        'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
