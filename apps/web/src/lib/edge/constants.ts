// EDGE Constants

export const PROJECTX_API_BASE = 'https://api.topstepx.com';

export const PROJECTX_ENDPOINTS = {
  AUTH_LOGIN_KEY: '/api/Auth/loginKey',
  CONTRACT_SEARCH: '/api/Contract/search',
  CONTRACT_SEARCH_BY_ID: '/api/Contract/searchById',
  CONTRACT_AVAILABLE: '/api/Contract/available',
  HISTORY_BARS: '/api/History/retrieveBars',
  TRADE_SEARCH: '/api/Trade/search',
  ORDER_SEARCH: '/api/Order/search',
  ORDER_SEARCH_OPEN: '/api/Order/searchOpen',
  POSITION_SEARCH_OPEN: '/api/Position/searchOpen',
  ACCOUNT_SEARCH: '/api/Account/search',
} as const;

export const MAX_BARS_PER_REQUEST = 20000;

export const TIMEFRAME_MAP: Record<string, { unit: number; unitNumber: number }> = {
  '1m': { unit: 2, unitNumber: 1 }, // Minute
  '5m': { unit: 2, unitNumber: 5 },
  '15m': { unit: 2, unitNumber: 15 },
  '1h': { unit: 3, unitNumber: 1 }, // Hour
  '4h': { unit: 3, unitNumber: 4 },
  '1D': { unit: 4, unitNumber: 1 }, // Day
};

export const SIDE_MAP: Record<number, 'BUY' | 'SELL'> = {
  1: 'BUY',
  2: 'SELL',
};

export const BREAKEVEN_THRESHOLD = 0.01; // $0.01 threshold for breakeven

export const REPLAY_SPEEDS = [1, 2, 4, 8, 16] as const;

// Chart Theme Presets
export const TRDE_DARK_PRESET: import('./types').ChartPreferences = {
  preset: 'TRDE_DARK',
  layout: {
    backgroundColor: '#131722',
    textColor: '#d1d5db',
  },
  grid: {
    vertLinesColor: 'rgba(255, 255, 255, 0.06)',
    horzLinesColor: 'rgba(255, 255, 255, 0.06)',
  },
  scale: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  candles: {
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
  },
  indicators: {
    ema20Color: '#2196f3',
    sma200Color: '#ff9800',
  },
};

export const TRDE_LIGHT_PRESET: import('./types').ChartPreferences = {
  preset: 'TRDE_LIGHT',
  layout: {
    backgroundColor: '#ffffff',
    textColor: '#111827',
  },
  grid: {
    vertLinesColor: 'rgba(0, 0, 0, 0.06)',
    horzLinesColor: 'rgba(0, 0, 0, 0.06)',
  },
  scale: {
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  candles: {
    upColor: '#26a69a',
    downColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
  },
  indicators: {
    ema20Color: '#2196f3',
    sma200Color: '#ff9800',
  },
};

export const DEFAULT_CHART_PREFERENCES: import('./types').ChartPreferences = TRDE_DARK_PRESET;

export const DEFAULT_BACKTEST_FEES = 1.4; // $1.40 per round trip
export const DEFAULT_BACKTEST_SLIPPAGE = 0; // no slippage by default
