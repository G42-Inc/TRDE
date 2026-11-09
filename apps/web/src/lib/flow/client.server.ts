/**
 * AlphaVantage API Client (Server-Side Only)
 * All AlphaVantage calls must go through this module to keep API key secure
 * Supports per-user API keys for data access
 */

import { env, isAlphaVantageConfigured } from '@/lib/env.server';
import type { IntradayInterval } from './types';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

interface AlphaVantageRequestParams {
  function: string;
  symbol?: string;
  interval?: string;
  outputsize?: 'compact' | 'full';
  datatype?: 'json' | 'csv';
  time_period?: number;
  series_type?: 'close' | 'open' | 'high' | 'low';
  require_greeks?: boolean;
  date?: string;
  from_symbol?: string;
  to_symbol?: string;
  [key: string]: any;
}

// Store current request context (API key to use)
let currentApiKey: string | null = null;

/**
 * Set the API key for the current request context
 * Call this before making requests to use a user's API key
 */
export function setRequestApiKey(apiKey: string | null) {
  currentApiKey = apiKey;
}

/**
 * Get the API key to use for requests
 * Priority: 1. Current context key (user's key), 2. Environment variable (fallback)
 */
function getApiKey(): string | null {
  return currentApiKey || (isAlphaVantageConfigured() ? env.ALPHA_VANTAGE_API_KEY : null);
}

/**
 * Check if any API key is available
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

/**
 * Make a request to AlphaVantage API
 * Uses current context API key or falls back to environment variable
 */
export async function alphaVantageRequest<T = any>(
  params: AlphaVantageRequestParams
): Promise<T> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('AlphaVantage API key not configured. Please add your API key in Settings.');
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  
  // Add all params to URL
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  
  // Add API key
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'TRDE-App/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`AlphaVantage API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as T;
}

/**
 * Get global quote for a symbol
 */
export async function getGlobalQuote(symbol: string) {
  return alphaVantageRequest({
    function: 'GLOBAL_QUOTE',
    symbol,
  });
}

/**
 * Get intraday time series
 */
export async function getIntradaySeries(
  symbol: string,
  interval: IntradayInterval = '5min',
  outputsize: 'compact' | 'full' = 'compact',
  extendedHours: boolean = true
) {
  return alphaVantageRequest({
    function: 'TIME_SERIES_INTRADAY',
    symbol,
    interval,
    outputsize,
    extended_hours: extendedHours,
    adjusted: true,
  });
}

/**
 * Get VWAP indicator
 */
export async function getVWAP(
  symbol: string,
  interval: IntradayInterval = '15min'
) {
  return alphaVantageRequest({
    function: 'VWAP',
    symbol,
    interval,
  });
}

/**
 * Get ATR (Average True Range) indicator
 */
export async function getATR(
  symbol: string,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  timePeriod: number = 14
) {
  return alphaVantageRequest({
    function: 'ATR',
    symbol,
    interval,
    time_period: timePeriod,
  });
}

/**
 * Get realtime options chain
 */
export async function getRealtimeOptions(
  symbol: string,
  requireGreeks: boolean = true
) {
  return alphaVantageRequest({
    function: 'REALTIME_OPTIONS',
    symbol,
    require_greeks: requireGreeks,
  });
}

/**
 * Get historical options chain
 */
export async function getHistoricalOptions(
  symbol: string,
  date?: string // YYYY-MM-DD format
) {
  const params: AlphaVantageRequestParams = {
    function: 'HISTORICAL_OPTIONS',
    symbol,
  };
  
  if (date) {
    params.date = date;
  }
  
  return alphaVantageRequest(params);
}

/**
 * Search for symbols
 */
export async function searchSymbols(keywords: string) {
  return alphaVantageRequest({
    function: 'SYMBOL_SEARCH',
    keywords,
  });
}

/**
 * Get market status
 */
export async function getMarketStatus() {
  return alphaVantageRequest({
    function: 'MARKET_STATUS',
  });
}
