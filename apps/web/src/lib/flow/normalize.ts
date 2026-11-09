/**
 * AlphaVantage Response Normalization
 * Converts raw AlphaVantage API responses to standardized widget data format
 */

import type {
  WidgetData,
  FlowWidgetType,
  SparklinePoint,
  OptionsFlowItem,
  AlphaVantageGlobalQuote,
  AlphaVantageTimeSeries,
  AlphaVantageTechnicalIndicator,
  AlphaVantageOptions,
  AlphaVantageError,
} from './types';

const COOLDOWN_SECONDS = 300; // 5 minutes

/**
 * Check if response contains an error
 */
export function isErrorResponse(response: any): response is AlphaVantageError {
  return !!(response?.['Error Message'] || response?.['Note'] || response?.['Information']);
}

/**
 * Extract error message from AlphaVantage response
 */
export function getErrorMessage(response: AlphaVantageError): string {
  return response['Error Message'] || response['Note'] || response['Information'] || 'Unknown error';
}

/**
 * Calculate next refresh time (current time + cooldown)
 */
function getNextRefreshAt(): string {
  return new Date(Date.now() + COOLDOWN_SECONDS * 1000).toISOString();
}

/**
 * Normalize GLOBAL_QUOTE response for FUTURES_SNAPSHOT / INDEX_SNAPSHOT
 */
export function normalizeGlobalQuote(
  response: AlphaVantageGlobalQuote,
  symbol: string,
  widgetType: 'FUTURES_SNAPSHOT' | 'INDEX_SNAPSHOT',
  cached: boolean = false,
  cachedAt?: string
): WidgetData {
  const quote = response['Global Quote'];
  
  if (!quote) {
    return {
      widgetType,
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: 'Invalid response: missing Global Quote',
    };
  }

  const changePercentStr = quote['10. change percent'] || '0%';
  const changePercent = parseFloat(changePercentStr.replace('%', '')) || 0;

  return {
    widgetType,
    symbol,
    data: {
      price: parseFloat(quote['05. price']) || 0,
      change: parseFloat(quote['09. change']) || 0,
      changePercent,
      open: parseFloat(quote['02. open']) || 0,
      high: parseFloat(quote['03. high']) || 0,
      low: parseFloat(quote['04. low']) || 0,
      volume: parseInt(quote['06. volume'], 10) || 0,
      previousClose: parseFloat(quote['08. previous close']) || 0,
      lastUpdate: quote['07. latest trading day'],
    },
    cached,
    cachedAt,
    nextRefreshAt: getNextRefreshAt(),
  };
}

/**
 * Normalize TIME_SERIES_INTRADAY response for INTRADAY_SERIES
 */
export function normalizeIntradaySeries(
  response: AlphaVantageTimeSeries,
  symbol: string,
  interval: string = '5min',
  cached: boolean = false,
  cachedAt?: string
): WidgetData {
  const timeSeriesKey = `Time Series (${interval})`;
  const timeSeries = response[timeSeriesKey];

  if (!timeSeries) {
    return {
      widgetType: 'INTRADAY_SERIES',
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: `Invalid response: missing ${timeSeriesKey}`,
    };
  }

  // Convert to sparkline format
  const sparkline: SparklinePoint[] = [];
  const timestamps = Object.keys(timeSeries).sort(); // Sort ascending

  for (const timestamp of timestamps) {
    const bar = timeSeries[timestamp];
    const closePrice = parseFloat(bar['4. close']);
    const timeMs = new Date(timestamp).getTime();
    
    if (!isNaN(closePrice) && !isNaN(timeMs)) {
      sparkline.push({
        time: Math.floor(timeMs / 1000), // Unix timestamp in seconds
        price: closePrice,
      });
    }
  }

  return {
    widgetType: 'INTRADAY_SERIES',
    symbol,
    data: {
      sparkline,
      lastUpdate: response['Meta Data']?.['3. Last Refreshed'],
    },
    cached,
    cachedAt,
    nextRefreshAt: getNextRefreshAt(),
  };
}

/**
 * Normalize TIME_SERIES_INTRADAY + VWAP response for SESSION_LEVELS
 */
export function normalizeSessionLevels(
  intradayResponse: AlphaVantageTimeSeries,
  vwapResponse: AlphaVantageTechnicalIndicator | null,
  symbol: string,
  interval: string = '1min',
  cached: boolean = false,
  cachedAt?: string
): WidgetData {
  const timeSeriesKey = `Time Series (${interval})`;
  const timeSeries = intradayResponse[timeSeriesKey];

  if (!timeSeries) {
    return {
      widgetType: 'SESSION_LEVELS',
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: `Invalid response: missing ${timeSeriesKey}`,
    };
  }

  // Filter to current trading day
  const today = new Date().toISOString().split('T')[0];
  const todayBars = Object.entries(timeSeries).filter(([timestamp]) => 
    timestamp.startsWith(today)
  );

  if (todayBars.length === 0) {
    // Fall back to most recent trading day
    const allTimestamps = Object.keys(timeSeries).sort().reverse();
    if (allTimestamps.length > 0) {
      const mostRecentDay = allTimestamps[0].split(' ')[0];
      const recentBars = Object.entries(timeSeries).filter(([timestamp]) =>
        timestamp.startsWith(mostRecentDay)
      );
      
      if (recentBars.length > 0) {
        return calculateSessionLevels(recentBars, vwapResponse, symbol, cached, cachedAt);
      }
    }
    
    return {
      widgetType: 'SESSION_LEVELS',
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: 'No trading data available for session',
    };
  }

  return calculateSessionLevels(todayBars, vwapResponse, symbol, cached, cachedAt);
}

function calculateSessionLevels(
  bars: [string, any][],
  vwapResponse: AlphaVantageTechnicalIndicator | null,
  symbol: string,
  cached: boolean,
  cachedAt?: string
): WidgetData {
  let sessionHigh = -Infinity;
  let sessionLow = Infinity;
  let sessionOpen: number | undefined;
  
  // Sort by timestamp ascending
  const sortedBars = bars.sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [timestamp, bar] of sortedBars) {
    const high = parseFloat(bar['2. high']);
    const low = parseFloat(bar['3. low']);
    const open = parseFloat(bar['1. open']);
    
    if (!isNaN(high) && high > sessionHigh) sessionHigh = high;
    if (!isNaN(low) && low < sessionLow) sessionLow = low;
    if (sessionOpen === undefined && !isNaN(open)) sessionOpen = open;
  }

  // Extract VWAP
  let vwap: number | undefined;
  if (vwapResponse) {
    const vwapKey = 'Technical Analysis: VWAP';
    const vwapData = vwapResponse[vwapKey];
    if (vwapData) {
      const latestVwapTime = Object.keys(vwapData).sort().reverse()[0];
      if (latestVwapTime) {
        vwap = parseFloat(vwapData[latestVwapTime]['VWAP']);
      }
    }
  }

  return {
    widgetType: 'SESSION_LEVELS',
    symbol,
    data: {
      sessionHigh: sessionHigh === -Infinity ? undefined : sessionHigh,
      sessionLow: sessionLow === Infinity ? undefined : sessionLow,
      sessionOpen,
      vwap: isNaN(vwap!) ? undefined : vwap,
    },
    cached,
    cachedAt,
    nextRefreshAt: getNextRefreshAt(),
  };
}

/**
 * Normalize ATR response for VOLATILITY_RANGE
 */
export function normalizeVolatilityRange(
  atrResponse: AlphaVantageTechnicalIndicator,
  currentPrice: number,
  symbol: string,
  cached: boolean = false,
  cachedAt?: string
): WidgetData {
  const atrKey = 'Technical Analysis: ATR';
  const atrData = atrResponse[atrKey];

  if (!atrData) {
    return {
      widgetType: 'VOLATILITY_RANGE',
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: 'Invalid response: missing ATR data',
    };
  }

  // Get latest ATR value
  const latestTime = Object.keys(atrData).sort().reverse()[0];
  if (!latestTime) {
    return {
      widgetType: 'VOLATILITY_RANGE',
      symbol,
      data: {},
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: 'No ATR data available',
    };
  }

  const atr = parseFloat(atrData[latestTime]['ATR']);
  
  return {
    widgetType: 'VOLATILITY_RANGE',
    symbol,
    data: {
      volatility: atr,
      range: {
        low: currentPrice - atr,
        high: currentPrice + atr,
      },
    },
    cached,
    cachedAt,
    nextRefreshAt: getNextRefreshAt(),
  };
}

/**
 * Normalize REALTIME_OPTIONS / HISTORICAL_OPTIONS response for FLOW_FEED
 * AlphaVantage returns options in "data" array, not "options"
 */
export function normalizeOptionsFlow(
  response: any,
  symbol: string,
  cached: boolean = false,
  cachedAt?: string
): WidgetData {
  // Check for error/info messages first (rate limits, no access, etc.)
  const errorMsg = response?.['Error Message'] || response?.['Note'] || response?.['Information'];
  if (errorMsg) {
    // Check for premium access message
    const isPremiumRequired = errorMsg.toLowerCase().includes('premium') || 
                              errorMsg.toLowerCase().includes('subscribe') ||
                              errorMsg.toLowerCase().includes('upgrade');
    return {
      widgetType: 'FLOW_FEED',
      symbol,
      data: { feedItems: [] },
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: isPremiumRequired 
        ? 'Premium API key required for real-time options data. Please upgrade your AlphaVantage subscription.'
        : errorMsg,
    };
  }

  // AlphaVantage uses "data" for the options array
  const optionsData = response?.data || response?.options || [];
  
  if (!Array.isArray(optionsData) || optionsData.length === 0) {
    return {
      widgetType: 'FLOW_FEED',
      symbol,
      data: { feedItems: [] },
      cached,
      cachedAt,
      nextRefreshAt: getNextRefreshAt(),
      error: 'No options data available for this symbol',
    };
  }

  // Check if this looks like demo/sample data (2099 dates, all same values)
  const firstItem = optionsData[0];
  const looksLikeDemoData = firstItem?.expiration?.includes('2099') || 
                            firstItem?.expiration?.includes('99-99') ||
                            (optionsData.length > 1 && 
                             optionsData.every((o: any) => o.volume === optionsData[0].volume && 
                                                          o.open_interest === optionsData[0].open_interest));

  const feedItems: OptionsFlowItem[] = optionsData
    .filter((opt: any) => {
      // Filter for contracts with volume
      const volume = parseInt(opt.volume, 10) || 0;
      return volume > 0;
    })
    .slice(0, 50) // Limit to top 50 items
    .map((opt: any, index: number) => ({
      id: opt.contractID || `${symbol}-${index}`,
      timestamp: opt.date || opt.last_trade_date,
      symbol: opt.symbol || symbol,
      expiration: opt.expiration,
      strike: parseFloat(opt.strike) || 0,
      optionType: (opt.type?.toUpperCase() === 'CALL' || opt.type?.toLowerCase() === 'call') ? 'CALL' : 'PUT',
      volume: parseInt(opt.volume, 10) || 0,
      openInterest: parseInt(opt.open_interest, 10) || undefined,
      bid: parseFloat(opt.bid) || undefined,
      ask: parseFloat(opt.ask) || undefined,
      lastPrice: parseFloat(opt.last) || parseFloat(opt.lastPrice) || undefined,
      delta: opt.delta ? parseFloat(opt.delta) : undefined,
      gamma: opt.gamma ? parseFloat(opt.gamma) : undefined,
      theta: opt.theta ? parseFloat(opt.theta) : undefined,
      vega: opt.vega ? parseFloat(opt.vega) : undefined,
      iv: opt.implied_volatility ? parseFloat(opt.implied_volatility) : undefined,
    }));

  // Sort by volume descending
  feedItems.sort((a, b) => b.volume - a.volume);

  return {
    widgetType: 'FLOW_FEED',
    symbol,
    data: {
      feedItems,
    },
    cached,
    cachedAt,
    nextRefreshAt: getNextRefreshAt(),
    // Show warning if demo/sample data detected
    warning: looksLikeDemoData 
      ? 'Sample data detected. Real options data requires a Premium AlphaVantage API key.'
      : undefined,
  };
}

/**
 * Create error widget data
 */
export function createErrorWidgetData(
  widgetType: FlowWidgetType,
  symbol: string,
  error: string
): WidgetData {
  return {
    widgetType,
    symbol,
    data: {},
    cached: false,
    nextRefreshAt: getNextRefreshAt(),
    error,
  };
}
