import { useState, useEffect } from 'react';
import { getThemeColor } from '@/lib/theme-color';

/**
 * Hook to get the current theme color and react to changes
 */
export function useThemeColor(): string {
  const [color, setColor] = useState(getThemeColor);

  useEffect(() => {
    const handleColorChange = (e: CustomEvent) => {
      setColor(e.detail);
    };

    // Listen for color changes
    window.addEventListener('themeColorChanged', handleColorChange as EventListener);

    // Also check on mount in case it changed in another tab
    const checkColor = () => {
      setColor(getThemeColor());
    };
    const interval = setInterval(checkColor, 1000);

    return () => {
      window.removeEventListener('themeColorChanged', handleColorChange as EventListener);
      clearInterval(interval);
    };
  }, []);

  return color;
}
