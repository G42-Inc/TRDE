// Chart theme adapter - applies theme preferences to Lightweight Charts

import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { ChartPreferences } from '../types';

/**
 * Apply chart theme (layout, grid, scale colors)
 */
export function applyChartTheme(
  chart: IChartApi,
  prefs: ChartPreferences
): void {
  chart.applyOptions({
    layout: {
      background: { type: 'solid' as any, color: prefs.layout.backgroundColor },
      textColor: prefs.layout.textColor,
    },
    grid: {
      vertLines: { color: prefs.grid.vertLinesColor },
      horzLines: { color: prefs.grid.horzLinesColor },
    },
    rightPriceScale: {
      borderColor: prefs.scale.borderColor,
    },
    timeScale: {
      borderColor: prefs.scale.borderColor,
    },
  });
}

/**
 * Apply candle style colors
 */
export function applyCandleStyle(
  candlestickSeries: ISeriesApi<'Candlestick'>,
  prefs: ChartPreferences
): void {
  candlestickSeries.applyOptions({
    upColor: prefs.candles.upColor,
    downColor: prefs.candles.downColor,
    wickUpColor: prefs.candles.wickUpColor,
    wickDownColor: prefs.candles.wickDownColor,
    borderUpColor: prefs.candles.borderUpColor,
    borderDownColor: prefs.candles.borderDownColor,
  });
}

/**
 * Apply indicator line colors
 */
export function applyIndicatorStyles(
  indicatorSeries: Map<string, ISeriesApi<'Line'>>,
  prefs: ChartPreferences
): void {
  // Apply EMA20 color if series exists
  const ema20Series = Array.from(indicatorSeries.values()).find(
    (s) => s.options().title === 'EMA20' || s.options().title === 'EMA 20'
  );
  if (ema20Series) {
    ema20Series.applyOptions({
      color: prefs.indicators.ema20Color,
      lineWidth: 2,
    });
  }

  // Apply SMA200 color if series exists
  const sma200Series = Array.from(indicatorSeries.values()).find(
    (s) => s.options().title === 'SMA200' || s.options().title === 'SMA 200'
  );
  if (sma200Series) {
    sma200Series.applyOptions({
      color: prefs.indicators.sma200Color,
      lineWidth: 2,
    });
  }
}

/**
 * Apply indicator color by ID (for dynamic indicator management)
 */
export function applyIndicatorColorById(
  series: ISeriesApi<'Line'>,
  indicatorId: string,
  prefs: ChartPreferences
): void {
  // Map indicator IDs to colors
  const colorMap: Record<string, string> = {
    ema20: prefs.indicators.ema20Color,
    sma200: prefs.indicators.sma200Color,
  };

  const color = colorMap[indicatorId.toLowerCase()];
  if (color) {
    series.applyOptions({
      color,
      lineWidth: 2,
    });
  }
}
