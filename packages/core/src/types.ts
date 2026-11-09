// Asset Classes
export enum AssetClass {
  FUTURES = 'FUTURES',
  OPTIONS = 'OPTIONS',
}

// Futures Instruments
export enum FuturesInstrument {
  // Equity Index Futures (CME)
  ES = 'ES',
  MES = 'MES',
  NQ = 'NQ',
  MNQ = 'MNQ',
  YM = 'YM',
  MYM = 'MYM',
  RTY = 'RTY',
  M2K = 'M2K',
  // Metals (COMEX)
  GC = 'GC',
  MGC = 'MGC',
  SI = 'SI',
  SIL = 'SIL',
  PL = 'PL',
  PA = 'PA',
  // Energy (NYMEX)
  CL = 'CL',
  MCL = 'MCL',
  NG = 'NG',
  RB = 'RB',
  HO = 'HO',
  // Agriculture (CBOT/ICE)
  ZC = 'ZC',
  ZW = 'ZW',
  ZS = 'ZS',
  KC = 'KC',
  CT = 'CT',
  SB = 'SB',
  CC = 'CC',
  // Rates / Bonds (CBOT)
  ZN = 'ZN',
  ZB = 'ZB',
  ZF = 'ZF',
  ZT = 'ZT',
  // FX Futures (CME)
  '6E' = '6E',
  '6B' = '6B',
  '6J' = '6J',
  '6A' = '6A',
  '6C' = '6C',
  '6S' = '6S',
  // Crypto Futures (CME)
  BTC = 'BTC',
  MBT = 'MBT',
  ETH = 'ETH',
  MET = 'MET',
}

export const FUTURES_GROUPS = {
  EQUITY_INDEX: [FuturesInstrument.ES, FuturesInstrument.MES, FuturesInstrument.NQ, FuturesInstrument.MNQ, FuturesInstrument.YM, FuturesInstrument.MYM, FuturesInstrument.RTY, FuturesInstrument.M2K],
  METALS: [FuturesInstrument.GC, FuturesInstrument.MGC, FuturesInstrument.SI, FuturesInstrument.SIL, FuturesInstrument.PL, FuturesInstrument.PA],
  ENERGY: [FuturesInstrument.CL, FuturesInstrument.MCL, FuturesInstrument.NG, FuturesInstrument.RB, FuturesInstrument.HO],
  AGRICULTURE: [FuturesInstrument.ZC, FuturesInstrument.ZW, FuturesInstrument.ZS, FuturesInstrument.KC, FuturesInstrument.CT, FuturesInstrument.SB, FuturesInstrument.CC],
  RATES: [FuturesInstrument.ZN, FuturesInstrument.ZB, FuturesInstrument.ZF, FuturesInstrument.ZT],
  FX: [FuturesInstrument['6E'], FuturesInstrument['6B'], FuturesInstrument['6J'], FuturesInstrument['6A'], FuturesInstrument['6C'], FuturesInstrument['6S']],
  CRYPTO: [FuturesInstrument.BTC, FuturesInstrument.MBT, FuturesInstrument.ETH, FuturesInstrument.MET],
};

// Options Underlyings
export enum OptionsUnderlying {
  SPY = 'SPY',
  QQQ = 'QQQ',
  IWM = 'IWM',
  AAPL = 'AAPL',
  TSLA = 'TSLA',
}

// Sessions
export enum Session {
  ASIA = 'ASIA',
  LONDON = 'LONDON',
  NEW_YORK = 'NEW_YORK',
}

// Market Hours
export enum MarketHoursTag {
  PREMARKET = 'PREMARKET',
  RTH_OPEN = 'RTH_OPEN',
  MIDDAY = 'MIDDAY',
  POWER_HOUR = 'POWER_HOUR',
  AFTER_HOURS = 'AFTER_HOURS',
  ETH = 'ETH',
}

// Futures RTH/ETH
export enum RthEth {
  RTH = 'RTH',
  ETH = 'ETH',
}

// Market Regime
export enum MarketRegime {
  TREND_UP = 'TREND_UP',
  TREND_DOWN = 'TREND_DOWN',
  RANGE = 'RANGE',
  HIGH_VOLATILITY = 'HIGH_VOLATILITY',
  LOW_VOLATILITY = 'LOW_VOLATILITY',
}

// Setup Tags
export enum SetupTag {
  ORB = 'ORB',
  PULLBACK = 'PULLBACK',
  BREAKOUT = 'BREAKOUT',
  BREAKDOWN = 'BREAKDOWN',
  MEAN_REVERSION = 'MEAN_REVERSION',
  TREND_CONTINUATION = 'TREND_CONTINUATION',
  REVERSAL = 'REVERSAL',
  LIQUIDITY_SWEEP = 'LIQUIDITY_SWEEP',
  VWAP_RECLAIM = 'VWAP_RECLAIM',
  VWAP_REJECT = 'VWAP_REJECT',
  SUPPORT_BOUNCE = 'SUPPORT_BOUNCE',
  RESISTANCE_REJECT = 'RESISTANCE_REJECT',
  MA_CROSS = 'MA_CROSS',
  FAIR_VALUE_GAP = 'FAIR_VALUE_GAP',
  INVERSE_FVG = 'INVERSE_FVG',
  DOUBLE_TOP = 'DOUBLE_TOP',
  DOUBLE_BOTTOM = 'DOUBLE_BOTTOM',
}

// Mistake Tags
export enum MistakeTag {
  CHASED_ENTRY = 'CHASED_ENTRY',
  ENTERED_TOO_EARLY = 'ENTERED_TOO_EARLY',
  ENTERED_TOO_LATE = 'ENTERED_TOO_LATE',
  MOVED_STOP_WIDER = 'MOVED_STOP_WIDER',
  REMOVED_STOP = 'REMOVED_STOP',
  NO_STOP_DEFINED = 'NO_STOP_DEFINED',
  OVERSIZED_POSITION = 'OVERSIZED_POSITION',
  REVENGE_TRADE = 'REVENGE_TRADE',
  OVERTRADING = 'OVERTRADING',
  TOOK_PROFIT_TOO_EARLY = 'TOOK_PROFIT_TOO_EARLY',
  HELD_LOSER_TOO_LONG = 'HELD_LOSER_TOO_LONG',
  IGNORED_SETUP_RULES = 'IGNORED_SETUP_RULES',
  TRADED_OUTSIDE_PLAN = 'TRADED_OUTSIDE_PLAN',
  TRADED_DURING_NEWS_WITHOUT_PLAN = 'TRADED_DURING_NEWS_WITHOUT_PLAN',
  MISSED_ENTRY_FOMO = 'MISSED_ENTRY_FOMO',
  DID_NOT_RESPECT_DAILY_LIMIT = 'DID_NOT_RESPECT_DAILY_LIMIT',
  DID_NOT_RESPECT_MAX_TRADES = 'DID_NOT_RESPECT_MAX_TRADES',
  SLIPPAGE_IGNORED = 'SLIPPAGE_IGNORED',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
}

// Execution Grade
export enum Grade {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  F = 'F',
}

// Emotion/Mood
export enum EmotionLabel {
  CALM = 'CALM',
  FOCUSED = 'FOCUSED',
  CONFIDENT = 'CONFIDENT',
  NEUTRAL = 'NEUTRAL',
  ANXIOUS = 'ANXIOUS',
  IMPATIENT = 'IMPATIENT',
  FOMO = 'FOMO',
  FRUSTRATED = 'FRUSTRATED',
  ANGRY = 'ANGRY',
  TIRED = 'TIRED',
  STRESSED = 'STRESSED',
}

// News Tags
export enum NewsTag {
  NONE = 'NONE',
  CPI = 'CPI',
  FOMC = 'FOMC',
  NFP = 'NFP',
  PPI = 'PPI',
  JOBLESS_CLAIMS = 'JOBLESS_CLAIMS',
  EARNINGS = 'EARNINGS',
  OTHER_HIGH_IMPACT = 'OTHER_HIGH_IMPACT',
}

// Trade Management Style
export enum ManagementStyle {
  SCALP = 'SCALP',
  INTRADAY = 'INTRADAY',
  SWING = 'SWING',
}

// Direction
export enum Direction {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

// Outcome
export enum Outcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAKEVEN = 'BREAKEVEN',
}

// Option Type
export enum OptionType {
  CALL = 'CALL',
  PUT = 'PUT',
}

// Trade Base
export interface TradeBase {
  id: string;
  assetClass: AssetClass;
  createdAt: number;
  updatedAt: number;
  tradeDate: string; // YYYY-MM-DD
  entryTime: number;
  exitTime: number;
  direction: Direction;
  quantity: number;
  feesUsd: number;
  plannedRiskUsd: number;
  resultUsd: number;
  resultR: number;
  outcome: Outcome;
  grade: Grade;
  strategyId: string;
  strategyVersionId: string;
  setupTags: SetupTag[];
  session: Session;
  marketHoursTag: MarketHoursTag;
  marketRegime: MarketRegime;
  newsTags: NewsTag[];
  mistakes: MistakeTag[];
  managementStyle?: ManagementStyle;
  notes: string;
  attachments: { id: string; type: 'image'; uri: string; caption?: string }[];
  reviewFlag: boolean;
  collections: string[];
  disciplineFlags: {
    respectedDailyLossLimit: boolean;
    respectedMaxTrades: boolean;
    respectedMaxContracts: boolean;
    hadStopDefined: boolean;
    followedEntryRules: boolean;
    followedExitRules: boolean;
    journalCompleted: boolean;
  };
}

// Futures Trade
export interface FuturesTrade extends TradeBase {
  assetClass: AssetClass.FUTURES;
  instrumentRoot: FuturesInstrument;
  contractSymbol?: string;
  entryPrice: number;
  exitPrice: number;
  tickSize?: number;
  tickValueUsd?: number;
  pointsPnL: number;
  ticksPnL: number;
  rthEth: RthEth;
}

// Options Trade
export interface OptionsTrade extends TradeBase {
  assetClass: AssetClass.OPTIONS;
  underlying: OptionsUnderlying;
  expiration: string; // YYYY-MM-DD
  dte: number;
  strike: number;
  optionType: OptionType;
  entryPremium: number;
  exitPremium: number;
  contractMultiplier: number;
  netPremiumPnLUsd: number;
}

export type Trade = FuturesTrade | OptionsTrade;

// Journal
export interface PreTradeJournal {
  thesis: string;
  invalidation: string;
  confidence: number; // 0-100
  moodLabel: EmotionLabel;
  moodIntensity: number; // 1-5
  checklist: {
    stopPlanned: boolean;
    sizeWithinRules: boolean;
    entryMatchesStrategy: boolean;
    newsChecked: boolean;
    notRevenge: boolean;
  };
  attachments?: { id: string; type: 'image'; uri: string; caption?: string }[];
}

export interface PostTradeJournal {
  whatWentWell: string;
  whatToImprove: string;
  executionNotes: string;
  emotionAfterLabel: EmotionLabel;
  emotionAfterIntensity: number; // 1-5
  ruleBreakExplanation?: string;
  attachments?: { id: string; type: 'image'; uri: string; caption?: string }[];
}

export interface TradeJournal {
  tradeId: string;
  preTrade?: PreTradeJournal;
  postTrade?: PostTradeJournal;
}

// Daily Bias
export interface DailyBias {
  date: string; // YYYY-MM-DD
  bias: 'bullish' | 'bearish' | 'neutral';
  reason: string;
  confidence: number; // 0-100
  confirmed?: boolean; // true if bias was correct, false if incorrect, undefined if not confirmed
  confirmationNotes?: string; // Notes explaining why bias was correct or incorrect
  confirmedAt?: number; // Timestamp when bias was confirmed
}

// Daily Quick Journal
export interface DailyQuickJournal {
  timestamp: number;
  moodLabel: EmotionLabel;
  moodIntensity: number;
  shortNote: string;
  stressLevel?: number; // 1-10
  sleepQuality?: number; // 1-10
}

// Risk Rules
export interface RiskRules {
  dailyLossLimitUsd: number;
  maxTradesPerDay: number;
  maxContractsPerTrade: number;
  stopAfterConsecutiveLosses?: number;
  stopAfterDownR?: number;
  requirePlannedRisk: boolean;
  requireStopDefined: boolean;
}

// Rule Violation

// Strategy
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface StrategyVersion {
  id: string;
  strategyId: string;
  version: string;
  description?: string;
  definition?: string; // Strategy definition/rules
  triggers?: string; // Entry/exit triggers
  createdAt: number;
}

// Saved Filter
export interface SavedFilter {
  id: string;
  name: string;
  filters: TradeFilters;
  createdAt: number;
}

// Trade Filters
export interface TradeFilters {
  edgeOnly?: boolean;
  assetClass?: AssetClass[];
  dateRange?: { start: string; end: string };
  outcome?: Outcome[];
  grade?: Grade[];
  strategyId?: string[];
  setupTags?: SetupTag[];
  mistakes?: MistakeTag[];
  session?: Session[];
  marketRegime?: MarketRegime[];
  newsTags?: NewsTag[];
  reviewFlag?: boolean;
  collections?: string[];
  instrumentRoot?: FuturesInstrument[];
  underlying?: OptionsUnderlying[];
}

// Collection
export interface Collection {
  id: string;
  name: string;
  description?: string;
  tradeIds: string[];
  createdAt: number;
}

// Weekly Review
export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  summary: string;
  wins: string[];
  losses: string[];
  improvements: string[];
  nextWeekPlan: string;
  createdAt: number;
}

// Todo Item
export enum TodoCategory {
  VIDEO = 'VIDEO',
  NEWS = 'NEWS',
  EDUCATION = 'EDUCATION',
  REVIEW = 'REVIEW',
  PLANNING = 'PLANNING',
  OTHER = 'OTHER',
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  category: TodoCategory;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  dueDate?: string; // YYYY-MM-DD
}

// Rule Violation
export interface RuleViolation {
  id: string;
  tradeId: string;
  violatedRules: string[]; // e.g., ['respectedDailyLossLimit', 'hadStopDefined']
  createdAt: number;
  reviewed: boolean;
  reviewNotes?: string; // User's explanation of what happened and how they'll improve
  reviewedAt?: number;
}
