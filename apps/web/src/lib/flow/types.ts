/**
 * Flow Tab Types
 * Type definitions for the Flow dashboard and AlphaVantage integration
 */

// Widget types supported by the Flow dashboard
export type FlowWidgetType = 
  | 'FUTURES_SNAPSHOT'
  | 'INDEX_SNAPSHOT'
  | 'INTRADAY_SERIES'
  | 'SESSION_LEVELS'
  | 'VOLATILITY_RANGE'
  | 'FLOW_FEED';

// Widget type allowlist (server-side validation)
export const ALLOWED_WIDGET_TYPES: FlowWidgetType[] = [
  'FUTURES_SNAPSHOT',
  'INDEX_SNAPSHOT',
  'INTRADAY_SERIES',
  'SESSION_LEVELS',
  'VOLATILITY_RANGE',
  'FLOW_FEED',
];

// Intraday intervals supported
export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '60min';

// Widget configuration stored in database
export interface FlowWidget {
  id: string;
  user_id: string;
  widget_type: FlowWidgetType;
  symbol: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: WidgetConfig;
  created_at: string;
  updated_at: string;
}

// Widget-specific configuration
export interface WidgetConfig {
  interval?: IntradayInterval;
  time_period?: number;
  extended_hours?: boolean;
}

// Sparkline data point
export interface SparklinePoint {
  time: number; // Unix timestamp
  price: number;
}

// Options flow item
export interface OptionsFlowItem {
  id: string;
  timestamp: string;
  symbol: string;
  expiration: string;
  strike: number;
  optionType: 'CALL' | 'PUT';
  volume: number;
  openInterest?: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
}

// Normalized widget data response
export interface WidgetData {
  widgetType: FlowWidgetType;
  symbol: string;
  data: {
    // FUTURES_SNAPSHOT / INDEX_SNAPSHOT
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    previousClose?: number;
    lastUpdate?: string;
    
    // INTRADAY_SERIES
    sparkline?: SparklinePoint[];
    
    // SESSION_LEVELS
    sessionHigh?: number;
    sessionLow?: number;
    sessionOpen?: number;
    vwap?: number;
    
    // VOLATILITY_RANGE
    volatility?: number;
    range?: { low: number; high: number };
    
    // FLOW_FEED
    feedItems?: OptionsFlowItem[];
  };
  cached: boolean;
  cachedAt?: string;
  nextRefreshAt: string;
  error?: string;
  warning?: string; // Non-blocking warning (e.g., demo data detected)
}

// AlphaVantage API response types (partial - for type safety)
export interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export interface AlphaVantageTimeSeries {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval'?: string;
    '5. Output Size'?: string;
    '6. Time Zone': string;
  };
  [key: string]: any; // Time Series (5min), Time Series (Daily), etc.
}

export interface AlphaVantageTechnicalIndicator {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval'?: string;
    '5. Time Period'?: string;
    '6. Series Type'?: string;
    '7. Time Zone': string;
  };
  [key: string]: any; // Technical Analysis: ATR, etc.
}

export interface AlphaVantageOptions {
  symbol: string;
  underlyingPrice?: number;
  options?: Array<{
    contractID: string;
    symbol: string;
    expiration: string;
    strike: string;
    type: string;
    last: string;
    mark: string;
    bid: string;
    bid_size: string;
    ask: string;
    ask_size: string;
    volume: string;
    open_interest: string;
    date: string;
    implied_volatility?: string;
    delta?: string;
    gamma?: string;
    theta?: string;
    vega?: string;
    rho?: string;
  }>;
}

// Error response from AlphaVantage
export interface AlphaVantageError {
  'Error Message'?: string;
  'Note'?: string; // Rate limit message
  'Information'?: string;
}

// Cache entry
export interface CacheEntry {
  id: string;
  cache_key: string;
  data: any;
  cached_at: string;
  expires_at: string;
}

// Refresh cooldown entry
export interface RefreshEntry {
  id: string;
  user_id: string;
  widget_key: string;
  refreshed_at: string;
  next_refresh_at: string;
}

// API request types
// Data mode for widget
export type DataMode = 'realtime' | 'historical';

export interface WidgetDataRequest {
  widgetType: FlowWidgetType;
  symbol: string;
  forceRefresh?: boolean;
  interval?: IntradayInterval;
  timePeriod?: number;
  dataMode?: DataMode;
  historicalDate?: string; // YYYY-MM-DD format for historical data
}
