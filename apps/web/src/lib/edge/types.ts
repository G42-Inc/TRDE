// EDGE Types - ProjectX API and internal data structures

// ProjectX API Response Types
export interface ProjectXAuthResponse {
  token: string;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface ProjectXAccount {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
}

export interface ProjectXAccountsResponse {
  accounts: ProjectXAccount[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface ProjectXBar {
  t: string; // ISO timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export interface ProjectXBarsResponse {
  bars: ProjectXBar[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface ProjectXContract {
  id: string; // e.g., "CON.F.US.MNQ.U25"
  name: string; // e.g., "MNQU5"
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
  symbolId: string; // e.g., "F.US.MNQ"
}

export interface ProjectXContractsResponse {
  contracts: ProjectXContract[];
  success?: boolean;
  errorCode?: number;
  errorMessage?: string | null;
}

export interface ProjectXTrade {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string; // ISO timestamp
  price: number;
  profitAndLoss?: number;
  fees: number;
  side: number; // 1 = buy, 2 = sell
  size: number;
  voided: boolean;
  orderId?: number;
}

export interface ProjectXTradesResponse {
  trades: ProjectXTrade[];
  success?: boolean;
  errorCode?: number;
  errorMessage?: string | null;
}

// Internal Normalized Types
export interface NormalizedExecution {
  id: number;
  contractId: string;
  timestampUtc: string; // ISO timestamp
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  fees: number;
  profitAndLoss?: number;
  orderId?: number;
  voided: boolean;
}

export interface RoundTripTrade {
  tradeId: string; // generated UUID
  contractId: string;
  contractName?: string;
  entryTime: string; // ISO timestamp
  exitTime: string; // ISO timestamp
  avgEntryPrice: number; // weighted average
  avgExitPrice: number; // weighted average
  direction: 'LONG' | 'SHORT';
  qty: number;
  feesTotal: number;
  pnlGross: number; // before fees
  pnlNet: number; // after fees
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  executions: NormalizedExecution[];
  durationMs: number;
}

// Chart Types
export interface LightweightBar {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export type ChartThemePreset = 'TRDE_DARK' | 'TRDE_LIGHT' | 'CUSTOM';

export interface ChartPreferences {
  preset: ChartThemePreset;
  layout: {
    backgroundColor: string;
    textColor: string;
  };
  grid: {
    vertLinesColor: string;
    horzLinesColor: string;
  };
  scale: {
    borderColor: string;
  };
  candles: {
    upColor: string;
    downColor: string;
    wickUpColor: string;
    wickDownColor: string;
    borderUpColor: string;
    borderDownColor: string;
  };
  indicators: {
    ema20Color: string;
    sma200Color: string;
  };
}

// Replay Types
export interface ReplayState {
  isPlaying: boolean;
  currentTime: number; // unix timestamp in seconds
  speed: number; // multiplier (1x, 2x, 4x, etc.)
  hideFutureTrades: boolean;
}

// Manual Backtest Types
export interface HypotheticalTrade {
  id: string; // generated UUID
  contractId: string;
  contractName?: string;
  entryTime: number; // unix timestamp in seconds
  exitTime: number; // unix timestamp in seconds
  entryPrice: number;
  exitPrice: number;
  direction: 'LONG' | 'SHORT';
  qty: number;
  strategy?: string;
  setup?: string;
  notes?: string;
  fees: number; // assumed fees
  slippage: number; // assumed slippage
  pnlNet: number; // computed
  createdAt: string; // ISO timestamp
}

// Connection State
export interface ProjectXConnection {
  token: string; // stored server-side only
  accountId: number;
  live: boolean; // true = live, false = sim
  connected: boolean;
  connectedAt?: string; // ISO timestamp
}

// Sync State
export interface SyncState {
  lastSyncTime?: string; // ISO timestamp
  totalExecutions: number;
  totalTrades: number;
  dateRange?: {
    start: string; // ISO timestamp
    end: string; // ISO timestamp
  };
}

// EDGE Metrics
export interface EdgeMetrics {
  totalTrades: number;
  winRate: number; // percentage
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  feesTotal: number;
  bestDay: { date: string; pnl: number };
  worstDay: { date: string; pnl: number };
  contractLeaderboard: Array<{ contractId: string; contractName?: string; pnl: number; trades: number }>;
  dayOfWeekPerformance: Array<{ day: string; pnl: number; trades: number }>;
  timeOfDayDistribution: Array<{ hour: number; count: number }>;
}

// Trade Outcome Filter
export type TradeOutcome = 'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN';
