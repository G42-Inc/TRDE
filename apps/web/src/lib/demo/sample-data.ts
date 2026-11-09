/**
 * Demo Mode Sample Data Generator
 * 
 * Generates realistic sample trades, strategies, and journals
 * for demo users to explore the app's features.
 */

import type { Trade, Strategy, FuturesTrade } from '@trde/core';
import {
  AssetClass,
  FuturesInstrument,
  Direction,
  Outcome,
  Grade,
  Session,
  MarketRegime,
  MarketHoursTag,
  RthEth,
  SetupTag,
  MistakeTag,
} from '@trde/core';

// Sample instruments for futures trading
const FUTURES_INSTRUMENTS = [
  { root: FuturesInstrument.ES, name: 'E-mini S&P 500', tickSize: 0.25, tickValue: 12.5 },
  { root: FuturesInstrument.NQ, name: 'E-mini Nasdaq', tickSize: 0.25, tickValue: 5 },
  { root: FuturesInstrument.CL, name: 'Crude Oil', tickSize: 0.01, tickValue: 10 },
  { root: FuturesInstrument.GC, name: 'Gold', tickSize: 0.1, tickValue: 10 },
];

// Sample strategies
const SAMPLE_STRATEGIES = [
  { name: 'Opening Range Breakout', description: 'Trade breakouts from the first 15-minute range' },
  { name: 'Mean Reversion', description: 'Fade extended moves back to VWAP' },
  { name: 'Trend Continuation', description: 'Enter on pullbacks in established trends' },
];

// Session times (using available values)
const SESSIONS = [Session.ASIA, Session.LONDON, Session.NEW_YORK];

// Grade distribution (weighted toward B/C for realism)
const GRADES = [Grade.A, Grade.A, Grade.B, Grade.B, Grade.B, Grade.C, Grade.C, Grade.C, Grade.F];

// Common mistakes (using available values)
const MISTAKES = [
  MistakeTag.MOVED_STOP_WIDER,
  MistakeTag.MISSED_ENTRY_FOMO,
  MistakeTag.OVERSIZED_POSITION,
  MistakeTag.REVENGE_TRADE,
  MistakeTag.IGNORED_SETUP_RULES,
  MistakeTag.TOOK_PROFIT_TOO_EARLY,
  MistakeTag.ENTERED_TOO_LATE,
];

// Setup tags (using available values)
const SETUP_TAGS = [
  SetupTag.BREAKOUT,
  SetupTag.PULLBACK,
  SetupTag.REVERSAL,
  SetupTag.MEAN_REVERSION,
  SetupTag.TREND_CONTINUATION,
  SetupTag.ORB,
  SetupTag.VWAP_RECLAIM,
];

/**
 * Generate sample strategies
 */
export function generateSampleStrategies(): Strategy[] {
  const now = Date.now();
  
  return SAMPLE_STRATEGIES.map((s, index) => ({
    id: `demo-strategy-${index + 1}`,
    name: s.name,
    description: s.description,
    createdAt: now - (30 - index) * 24 * 60 * 60 * 1000,
    updatedAt: now,
    versions: [{
      id: `demo-strategy-${index + 1}-v1`,
      name: 'v1.0',
      description: 'Initial version',
      createdAt: now - (30 - index) * 24 * 60 * 60 * 1000,
      updatedAt: now,
    }],
    metadata: {},
  }));
}

/**
 * Generate sample trades spanning 30 days
 * Creates a realistic distribution of wins/losses with varied outcomes
 */
export function generateSampleTrades(strategies: Strategy[]): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  // Generate 25-35 trades over 30 days
  const tradeCount = 25 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < tradeCount; i++) {
    // Random timestamp within last 30 days
    const tradeTime = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
    const tradeDate = new Date(tradeTime);
    
    // Random instrument
    const instrument = FUTURES_INSTRUMENTS[Math.floor(Math.random() * FUTURES_INSTRUMENTS.length)];
    
    // Random direction
    const direction = Math.random() > 0.5 ? Direction.LONG : Direction.SHORT;
    
    // Random outcome - 55% win rate is realistic
    const isWin = Math.random() < 0.55;
    const outcome = isWin ? Outcome.WIN : Outcome.LOSS;
    
    // Random grade
    const grade = GRADES[Math.floor(Math.random() * GRADES.length)];
    
    // Random strategy
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    
    // Calculate realistic P&L
    const plannedRisk = 100 + Math.floor(Math.random() * 200); // $100-$300 risk
    const rMultiple = isWin 
      ? 0.5 + Math.random() * 2.5 // 0.5R to 3R on wins
      : -(0.5 + Math.random() * 0.5); // -0.5R to -1R on losses
    const resultUsd = plannedRisk * rMultiple;
    
    // Points/ticks calculation
    const quantity = 1 + Math.floor(Math.random() * 3); // 1-3 contracts
    const ticksPnl = resultUsd / (instrument.tickValue * quantity);
    const pointsPnl = ticksPnl * instrument.tickSize;
    
    // Entry/exit prices
    const basePrice = instrument.root === FuturesInstrument.ES ? 4500 + Math.random() * 200 :
                      instrument.root === FuturesInstrument.NQ ? 15500 + Math.random() * 500 :
                      instrument.root === FuturesInstrument.CL ? 75 + Math.random() * 10 :
                      1900 + Math.random() * 100; // GC
    
    const entryPrice = Math.round(basePrice * 100) / 100;
    const exitPrice = direction === Direction.LONG
      ? Math.round((entryPrice + pointsPnl) * 100) / 100
      : Math.round((entryPrice - pointsPnl) * 100) / 100;
    
    // Random session
    const session = SESSIONS[Math.floor(Math.random() * SESSIONS.length)];
    
    // Random setup tags (1-3)
    const tagCount = 1 + Math.floor(Math.random() * 2);
    const setupTags: SetupTag[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = SETUP_TAGS[Math.floor(Math.random() * SETUP_TAGS.length)];
      if (!setupTags.includes(tag)) setupTags.push(tag);
    }
    
    // Random mistakes on losing trades (30% chance)
    const mistakes: MistakeTag[] = [];
    if (!isWin && Math.random() < 0.3) {
      mistakes.push(MISTAKES[Math.floor(Math.random() * MISTAKES.length)]);
    }
    
    // Duration: 5 minutes to 2 hours
    const durationMs = (5 + Math.floor(Math.random() * 115)) * 60 * 1000;
    const entryTime = tradeTime;
    const exitTime = tradeTime + durationMs;

    // Discipline flags
    const disciplineFlags = {
      respectedDailyLossLimit: Math.random() > 0.1,
      respectedMaxTrades: Math.random() > 0.1,
      respectedMaxContracts: Math.random() > 0.05,
      hadStopDefined: true,
      followedEntryRules: isWin ? Math.random() > 0.1 : Math.random() > 0.3,
      followedExitRules: isWin ? Math.random() > 0.1 : Math.random() > 0.3,
      journalCompleted: Math.random() > 0.2,
    };

    const trade: FuturesTrade = {
      id: `demo-trade-${i + 1}`,
      assetClass: AssetClass.FUTURES,
      createdAt: tradeTime,
      updatedAt: tradeTime,
      tradeDate: tradeDate.toISOString().split('T')[0],
      entryTime,
      exitTime,
      direction,
      quantity,
      feesUsd: 2.5 * quantity, // Standard futures commission
      plannedRiskUsd: plannedRisk,
      resultUsd: Math.round(resultUsd * 100) / 100,
      resultR: Math.round(rMultiple * 100) / 100,
      outcome,
      grade,
      strategyId: strategy.id,
      strategyVersionId: `${strategy.id}-v1`,
      session,
      marketRegime: Math.random() > 0.5 ? MarketRegime.TREND_UP : MarketRegime.RANGE,
      marketHoursTag: MarketHoursTag.RTH_OPEN,
      setupTags,
      newsTags: [],
      mistakes,
      notes: generateTradeNotes(isWin, grade),
      attachments: [],
      reviewFlag: Math.random() < 0.1, // 10% flagged for review
      collections: [],
      // Futures-specific
      instrumentRoot: instrument.root,
      entryPrice,
      exitPrice,
      tickSize: instrument.tickSize,
      tickValueUsd: instrument.tickValue,
      pointsPnL: Math.round(pointsPnl * 100) / 100,
      ticksPnL: Math.round(ticksPnl * 100) / 100,
      rthEth: RthEth.RTH,
      disciplineFlags,
    };

    trades.push(trade);
  }

  // Sort by entry time descending (newest first)
  trades.sort((a, b) => b.entryTime - a.entryTime);

  return trades;
}

/**
 * Generate realistic trade notes
 */
function generateTradeNotes(isWin: boolean, grade: Grade): string {
  const winNotes = [
    'Clean setup, waited for confirmation before entry.',
    'Stuck to the plan and let the trade work.',
    'Good entry timing, price moved quickly to target.',
    'Nice trend trade, held through minor pullbacks.',
    'Patient entry paid off, executed exactly as planned.',
  ];

  const lossNotes = [
    'Got stopped out, market reversed after my entry.',
    'Setup was valid but timing was off.',
    'Didn\'t wait for full confirmation before entering.',
    'Position sized appropriately, limited the damage.',
    'Market conditions changed after entry.',
  ];

  const notes = isWin ? winNotes : lossNotes;
  const note = notes[Math.floor(Math.random() * notes.length)];
  
  if (grade === Grade.A) {
    return note + ' Overall excellent execution.';
  } else if (grade === Grade.F) {
    return note + ' Need to review this trade carefully.';
  }
  
  return note;
}

/**
 * Generate sample journal entries
 */
export function generateSampleJournals(): Array<{
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
}> {
  const entries = [];
  const now = Date.now();
  
  const sampleEntries = [
    {
      content: 'Good trading day overall. Stuck to my rules and didn\'t overtrade. The opening range breakout on ES worked well. Need to continue being patient with entries.',
      mood: 'positive',
      tags: ['discipline', 'ES'],
    },
    {
      content: 'Struggled today with FOMO. Took two trades I shouldn\'t have. Going to review my criteria for valid setups and be more selective tomorrow.',
      mood: 'reflective',
      tags: ['improvement', 'fomo'],
    },
    {
      content: 'Market was choppy and I stayed mostly flat. Only took one high-conviction setup. Sometimes the best trade is no trade.',
      mood: 'neutral',
      tags: ['patience', 'discipline'],
    },
    {
      content: 'Excellent day! Hit my daily goal early and stopped trading. The trend continuation strategy is working well in this environment.',
      mood: 'positive',
      tags: ['goals', 'trend'],
    },
    {
      content: 'Tough session. Two stops hit in a row. Took a break after the second loss as planned. Came back with clearer head and recovered some.',
      mood: 'challenging',
      tags: ['risk management', 'psychology'],
    },
  ];

  for (let i = 0; i < sampleEntries.length; i++) {
    const entry = sampleEntries[i];
    const daysAgo = i * 5 + Math.floor(Math.random() * 3); // Spread out over month
    const entryTime = now - daysAgo * 24 * 60 * 60 * 1000;
    const entryDate = new Date(entryTime);

    entries.push({
      id: `demo-journal-${i + 1}`,
      date: entryDate.toISOString().split('T')[0],
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags,
      createdAt: entryTime,
    });
  }

  return entries;
}

/**
 * Calculate summary statistics for sample trades
 */
export function calculateSampleStats(trades: Trade[]): {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgR: number;
} {
  const wins = trades.filter(t => t.outcome === Outcome.WIN);
  const losses = trades.filter(t => t.outcome === Outcome.LOSS);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.resultUsd, 0);
  const totalWins = wins.reduce((sum, t) => sum + t.resultUsd, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.resultUsd, 0));
  
  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgWin: wins.length > 0 ? Math.round((totalWins / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((totalLosses / losses.length) * 100) / 100 : 0,
    profitFactor: totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : 0,
    avgR: trades.length > 0 
      ? Math.round((trades.reduce((sum, t) => sum + t.resultR, 0) / trades.length) * 100) / 100 
      : 0,
  };
}
