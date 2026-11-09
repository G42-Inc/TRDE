// Timeframe utilities for EDGE

import { TIMEFRAME_MAP } from '../constants';
import type { ChartTimeframe } from '../types';

/**
 * Get ProjectX unit and unitNumber from timeframe string
 */
export function timeframeToProjectX(timeframe: ChartTimeframe): { unit: number; unitNumber: number } {
  return TIMEFRAME_MAP[timeframe];
}

/**
 * Get timeframe string from ProjectX unit and unitNumber
 */
export function projectXToTimeframe(unit: number, unitNumber: number): ChartTimeframe | null {
  for (const [tf, config] of Object.entries(TIMEFRAME_MAP)) {
    if (config.unit === unit && config.unitNumber === unitNumber) {
      return tf as ChartTimeframe;
    }
  }
  return null;
}

/**
 * Get milliseconds per bar for a timeframe
 */
export function timeframeToMs(timeframe: ChartTimeframe): number {
  const { unit, unitNumber } = TIMEFRAME_MAP[timeframe];
  
  switch (unit) {
    case 1: // Second
      return unitNumber * 1000;
    case 2: // Minute
      return unitNumber * 60 * 1000;
    case 3: // Hour
      return unitNumber * 60 * 60 * 1000;
    case 4: // Day
      return unitNumber * 24 * 60 * 60 * 1000;
    case 5: // Week
      return unitNumber * 7 * 24 * 60 * 60 * 1000;
    case 6: // Month
      return unitNumber * 30 * 24 * 60 * 60 * 1000; // approximate
    default:
      return 60000; // default to 1 minute
  }
}
