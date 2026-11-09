// Chart preferences store

import type { ChartPreferences, ChartThemePreset } from '../types';
import { DEFAULT_CHART_PREFERENCES, TRDE_DARK_PRESET, TRDE_LIGHT_PRESET } from '../constants';

const STORAGE_KEY = 'edge:chartPreferences';

/**
 * Save chart preferences
 */
export function saveChartPreferences(prefs: ChartPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Get chart preferences
 */
export function getChartPreferences(): ChartPreferences {
  if (typeof window === 'undefined') return DEFAULT_CHART_PREFERENCES;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return DEFAULT_CHART_PREFERENCES;
  
  try {
    const parsed = JSON.parse(data);
    // Migrate old format if needed
    if (!parsed.preset) {
      return DEFAULT_CHART_PREFERENCES;
    }
    return parsed;
  } catch {
    return DEFAULT_CHART_PREFERENCES;
  }
}

/**
 * Load a preset theme
 */
export function loadPresetTheme(preset: ChartThemePreset, currentPrefs?: ChartPreferences): ChartPreferences {
  switch (preset) {
    case 'TRDE_DARK':
      return TRDE_DARK_PRESET;
    case 'TRDE_LIGHT':
      return TRDE_LIGHT_PRESET;
    case 'CUSTOM':
      // When switching to CUSTOM, keep current preferences but set preset to CUSTOM
      if (currentPrefs) {
        return { ...currentPrefs, preset: 'CUSTOM' };
      }
      const stored = getChartPreferences();
      return { ...stored, preset: 'CUSTOM' };
    default:
      return DEFAULT_CHART_PREFERENCES;
  }
}
