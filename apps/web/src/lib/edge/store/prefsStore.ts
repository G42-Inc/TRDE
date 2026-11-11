import { readEdgeJson, writeEdgeStorage, getEdgeAccountScope, type EdgeAccountScope } from './accountScope';
// Chart preferences store

import type { ChartPreferences, ChartThemePreset } from '../types';
import { DEFAULT_CHART_PREFERENCES, TRDE_DARK_PRESET, TRDE_LIGHT_PRESET } from '../constants';

const STORAGE_KEY = 'edge:chartPreferences';

/**
 * Save chart preferences
 */
export function saveChartPreferences(prefs: ChartPreferences, scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage(STORAGE_KEY, JSON.stringify(prefs), scope);
}

/**
 * Get chart preferences
 */
export function getChartPreferences(scope: EdgeAccountScope | null = getEdgeAccountScope()): ChartPreferences {
  if (typeof window === 'undefined') return DEFAULT_CHART_PREFERENCES;
  const parsed = readEdgeJson(STORAGE_KEY, DEFAULT_CHART_PREFERENCES, scope);
  return parsed.preset ? parsed : DEFAULT_CHART_PREFERENCES;
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
