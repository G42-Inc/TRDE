// Theme color management for buttons and toggles

const DEFAULT_THEME_COLOR = '#C9A962'; // gold accent (matches mobile app)

/**
 * Get the user's custom theme color from localStorage
 * Defaults to blue-600 if not set
 */
export function getThemeColor(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_COLOR;
  
  try {
    const stored = localStorage.getItem('trde:themeColor');
    return stored || DEFAULT_THEME_COLOR;
  } catch {
    return DEFAULT_THEME_COLOR;
  }
}

/**
 * Save the user's custom theme color to localStorage
 */
export function setThemeColor(color: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('trde:themeColor', color);
    // Trigger a custom event so components can react to color changes
    window.dispatchEvent(new CustomEvent('themeColorChanged', { detail: color }));
  } catch {
    // Ignore errors
  }
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate Tailwind-compatible color classes from a hex color
 * Returns an object with color variants for buttons and toggles
 */
export function getThemeColorClasses(color: string): {
  button: string;
  buttonHover: string;
  buttonActive: string;
  toggle: string;
  toggleHover: string;
  ring: string;
  shadow: string;
} {
  const rgb = hexToRgb(color);
  if (!rgb) {
    // Fallback to default gold accent
    return {
      button: 'bg-accent',
      buttonHover: 'hover:bg-accent-dark',
      buttonActive: 'active:bg-accent-dark',
      toggle: 'bg-accent',
      toggleHover: 'hover:bg-accent-dark',
      ring: 'ring-accent',
      shadow: 'shadow-accent/20',
    };
  }

  // For custom colors, we'll use inline styles
  // Return classes that can be combined with inline styles
  return {
    button: '', // Will use inline style
    buttonHover: '', // Will use inline style
    buttonActive: '', // Will use inline style
    toggle: '', // Will use inline style
    toggleHover: '', // Will use inline style
    ring: '', // Will use inline style
    shadow: '', // Will use inline style
  };
}

/**
 * Get inline style for button background
 */
export function getButtonStyle(color: string, hover: boolean = false, active: boolean = false): React.CSSProperties {
  const rgb = hexToRgb(color);
  if (!rgb) return {};

  // Darken for hover/active states
  const factor = active ? 0.8 : hover ? 0.9 : 1;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
  };
}

/**
 * Get inline style for shadow
 */
export function getShadowStyle(color: string): React.CSSProperties {
  const rgb = hexToRgb(color);
  if (!rgb) return {};

  return {
    boxShadow: `0 10px 15px -3px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2), 0 4px 6px -2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
  };
}
