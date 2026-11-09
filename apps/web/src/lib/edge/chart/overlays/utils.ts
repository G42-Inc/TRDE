// Utility functions for overlay positioning and coordinate conversion

import type { PositionOverlay } from './types';
import type { IChartApi, UTCTimestamp } from 'lightweight-charts';

/**
 * Convert a price value to a Y pixel coordinate on the chart
 */
export function priceToYCoordinate(
  chart: IChartApi | null,
  price: number,
  containerHeight: number
): number | null {
  if (!chart) return null;

  try {
    // Get the visible price range from the chart
    const priceScale = chart.priceScale('right');
    if (!priceScale) return null;

    // Use the chart's coordinate system
    // Get visible range
    // Note: priceToCoordinate exists at runtime but TypeScript types don't include it
    const coordinate = (priceScale as any).priceToCoordinate(price);
    if (coordinate === null) return null;

    // Lightweight Charts returns coordinates with 0 at top
    return coordinate;
  } catch (error) {
    console.error('Error converting price to coordinate:', error);
    return null;
  }
}

/**
 * Convert a time value to an X pixel coordinate on the chart
 */
export function timeToXCoordinate(
  chart: IChartApi | null,
  time: UTCTimestamp,
  containerWidth: number
): number | null {
  if (!chart) return null;

  try {
    const timeScale = chart.timeScale();
    const coordinate = timeScale.timeToCoordinate(time);
    if (coordinate === null) return null;
    return coordinate;
  } catch (error) {
    console.error('Error converting time to coordinate:', error);
    return null;
  }
}

/**
 * Convert a Y pixel coordinate back to a price value
 */
export function yCoordinateToPrice(
  chart: IChartApi | null,
  y: number
): number | null {
  if (!chart) return null;

  try {
    const priceScale = chart.priceScale('right');
    if (!priceScale) return null;
    // Note: coordinateToPrice exists at runtime but TypeScript types don't include it
    const price = (priceScale as any).coordinateToPrice(y);
    return price;
  } catch (error) {
    console.error('Error converting coordinate to price:', error);
    return null;
  }
}

/**
 * Convert an X pixel coordinate back to a time value
 */
export function xCoordinateToTime(
  chart: IChartApi | null,
  x: number
): UTCTimestamp | null {
  if (!chart) return null;

  try {
    const timeScale = chart.timeScale();
    const time = timeScale.coordinateToTime(x);
    // Convert Time to UTCTimestamp if needed
    return time as UTCTimestamp | null;
  } catch (error) {
    console.error('Error converting coordinate to time:', error);
    return null;
  }
}

/**
 * Create an overlay from a trade entry (auto-generate)
 */
export function createOverlayFromTradeEntry(
  entryPrice: number,
  entryTime: string,
  direction: 'LONG' | 'SHORT',
  tradeId: string,
  fillId: string
): PositionOverlay {
  // Default overlay extends from entry price down (long) or up (short)
  // User can resize it later
  const priceRange = entryPrice * 0.01; // 1% of entry price as default range
  
  return {
    id: `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: direction,
    topPrice: direction === 'LONG' ? entryPrice : entryPrice + priceRange,
    bottomPrice: direction === 'LONG' ? entryPrice - priceRange : entryPrice,
    startTime: new Date(entryTime).getTime() / 1000 as UTCTimestamp,
    endTime: new Date(entryTime).getTime() / 1000 as UTCTimestamp, // Will extend as replay progresses
    color: direction === 'LONG' ? 'rgba(20, 184, 166, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    opacity: 0.25,
    label: `${direction} Entry`,
    tradeId,
    linkedFillId: fillId,
  };
}

/**
 * Update overlay when trade is closed
 */
export function updateOverlayForTradeExit(
  overlay: PositionOverlay,
  exitPrice: number,
  exitTime: string
): PositionOverlay {
  return {
    ...overlay,
    endTime: new Date(exitTime).getTime() / 1000 as UTCTimestamp,
    topPrice: Math.max(overlay.topPrice, exitPrice, overlay.bottomPrice),
    bottomPrice: Math.min(overlay.bottomPrice, exitPrice, overlay.topPrice),
    label: overlay.label ? `${overlay.label} → Exit` : 'Trade Closed',
  };
}
