import type { Trade, Session, MarketRegime, NewsTag } from './types';
import { Outcome, MistakeTag } from './types';

export interface AnalyticsMetrics {
  winRate: number;
  expectancy: number; // avg R
  profitFactor: number;
  totalPnLUsd: number;
  totalPnLR: number;
  avgWinR: number;
  avgLossR: number;
  maxDrawdownUsd: number;
  maxDrawdownR: number;
  consistencyScore: number; // 0-100
  feeDrag: number;
  mistakeTaxUsd: number;
  mistakeTaxByType: Record<MistakeTag, number>;
  rollingExpectancy: number[]; // window=20
  rDistribution: { bucket: string; count: number; pct: number }[];
  dayOfWeekPerformance: Record<string, { count: number; pnl: number; r: number }>;
  timeOfDayHeatmap: Record<string, Record<string, { count: number; pnl: number }>>;
  strategyLeaderboard: { strategyId: string; count: number; pnl: number; r: number; winRate: number }[];
}

export function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.outcome === Outcome.WIN).length;
  return (wins / trades.length) * 100;
}

export function calculateExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const sumR = trades.reduce((acc, t) => acc + t.resultR, 0);
  return sumR / trades.length;
}

export function calculateProfitFactor(trades: Trade[]): number {
  const wins = trades.filter((t) => t.outcome === Outcome.WIN);
  const losses = trades.filter((t) => t.outcome === Outcome.LOSS);
  const grossProfit = wins.reduce((acc, t) => acc + Math.abs(t.resultUsd), 0);
  const grossLoss = losses.reduce((acc, t) => acc + Math.abs(t.resultUsd), 0);
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export function calculateTotalPnLUsd(trades: Trade[]): number {
  return trades.reduce((acc, t) => acc + t.resultUsd, 0);
}

export function calculateTotalPnLR(trades: Trade[]): number {
  return trades.reduce((acc, t) => acc + t.resultR, 0);
}

export function calculateAvgWinR(trades: Trade[]): number {
  const wins = trades.filter((t) => t.outcome === Outcome.WIN);
  if (wins.length === 0) return 0;
  const sumR = wins.reduce((acc, t) => acc + t.resultR, 0);
  return sumR / wins.length;
}

export function calculateAvgLossR(trades: Trade[]): number {
  const losses = trades.filter((t) => t.outcome === Outcome.LOSS);
  if (losses.length === 0) return 0;
  const sumR = losses.reduce((acc, t) => acc + t.resultR, 0);
  return sumR / losses.length;
}

export function calculateMaxDrawdownUsd(trades: Trade[]): number {
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  for (const trade of trades.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))) {
    running += trade.resultUsd;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function calculateMaxDrawdownR(trades: Trade[]): number {
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  for (const trade of trades.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))) {
    running += trade.resultR;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function calculateConsistencyScore(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const rValues = trades.map((t) => t.resultR);
  const mean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
  const variance = rValues.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / rValues.length;
  const stdDev = Math.sqrt(variance);
  // Normalize to 0-100: lower std dev = higher score
  // Assuming std dev of 0 = 100, std dev of 5 = 0
  const score = Math.max(0, 100 - (stdDev * 20));
  return Math.min(100, score);
}

export function calculateFeeDrag(trades: Trade[]): number {
  const totalFees = trades.reduce((acc, t) => acc + t.feesUsd, 0);
  const grossPnL = trades.reduce((acc, t) => acc + (t.resultUsd + t.feesUsd), 0);
  if (grossPnL === 0) return 0;
  return (totalFees / grossPnL) * 100;
}

export function calculateMistakeTaxUsd(trades: Trade[]): number {
  return trades
    .filter((t) => t.mistakes.length > 0)
    .reduce((acc, t) => acc + (t.outcome === Outcome.LOSS ? Math.abs(t.resultUsd) : 0), 0);
}

export function calculateMistakeTaxByType(trades: Trade[]): Record<MistakeTag, number> {
  const result = {} as Record<MistakeTag, number>;
  for (const trade of trades) {
    if (trade.mistakes.length > 0 && trade.outcome === Outcome.LOSS) {
      for (const mistake of trade.mistakes) {
        result[mistake] = (result[mistake] || 0) + Math.abs(trade.resultUsd);
      }
    }
  }
  return result;
}

export function calculateRollingExpectancy(trades: Trade[], window: number = 20): number[] {
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const result: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowTrades = sorted.slice(start, i + 1);
    result.push(calculateExpectancy(windowTrades));
  }
  return result;
}

export function calculateRDistribution(trades: Trade[]): { bucket: string; count: number; pct: number }[] {
  const buckets = [
    { label: '<-2R', min: -Infinity, max: -2 },
    { label: '-2R to -1R', min: -2, max: -1 },
    { label: '-1R to 0R', min: -1, max: 0 },
    { label: '0R to 1R', min: 0, max: 1 },
    { label: '1R to 2R', min: 1, max: 2 },
    { label: '2R to 3R', min: 2, max: 3 },
    { label: '>3R', min: 3, max: Infinity },
  ];
  const counts = buckets.map((b) => ({
    bucket: b.label,
    count: trades.filter((t) => t.resultR >= b.min && t.resultR < b.max).length,
    pct: 0,
  }));
  const total = trades.length;
  return counts.map((c) => ({ ...c, pct: total > 0 ? (c.count / total) * 100 : 0 }));
}

export function calculateDayOfWeekPerformance(trades: Trade[]): Record<string, { count: number; pnl: number; r: number }> {
  const result: Record<string, { count: number; pnl: number; r: number }> = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const day of days) {
    result[day] = { count: 0, pnl: 0, r: 0 };
  }
  for (const trade of trades) {
    const date = new Date(trade.tradeDate);
    const dayName = days[date.getDay()];
    result[dayName].count++;
    result[dayName].pnl += trade.resultUsd;
    result[dayName].r += trade.resultR;
  }
  return result;
}

export function calculateTimeOfDayHeatmap(trades: Trade[]): Record<string, Record<string, { count: number; pnl: number }>> {
  const result: Record<string, Record<string, { count: number; pnl: number }>> = {};
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const sessions = ['ASIA', 'LONDON', 'NEW_YORK'];
  for (const session of sessions) {
    result[session] = {};
    for (const hour of hours) {
      result[session][hour] = { count: 0, pnl: 0 };
    }
  }
  for (const trade of trades) {
    const entryDate = new Date(trade.entryTime);
    const hour = entryDate.getHours().toString().padStart(2, '0');
    const session = trade.session;
    if (result[session] && result[session][hour]) {
      result[session][hour].count++;
      result[session][hour].pnl += trade.resultUsd;
    }
  }
  return result;
}

export function calculateStrategyLeaderboard(trades: Trade[]): { strategyId: string; count: number; pnl: number; r: number; winRate: number }[] {
  const byStrategy: Record<string, Trade[]> = {};
  for (const trade of trades) {
    if (!byStrategy[trade.strategyId]) {
      byStrategy[trade.strategyId] = [];
    }
    byStrategy[trade.strategyId].push(trade);
  }
  return Object.entries(byStrategy).map(([strategyId, strategyTrades]) => ({
    strategyId,
    count: strategyTrades.length,
    pnl: calculateTotalPnLUsd(strategyTrades),
    r: calculateTotalPnLR(strategyTrades),
    winRate: calculateWinRate(strategyTrades),
  })).sort((a, b) => b.r - a.r);
}

export function calculateAllMetrics(trades: Trade[]): AnalyticsMetrics {
  return {
    winRate: calculateWinRate(trades),
    expectancy: calculateExpectancy(trades),
    profitFactor: calculateProfitFactor(trades),
    totalPnLUsd: calculateTotalPnLUsd(trades),
    totalPnLR: calculateTotalPnLR(trades),
    avgWinR: calculateAvgWinR(trades),
    avgLossR: calculateAvgLossR(trades),
    maxDrawdownUsd: calculateMaxDrawdownUsd(trades),
    maxDrawdownR: calculateMaxDrawdownR(trades),
    consistencyScore: calculateConsistencyScore(trades),
    feeDrag: calculateFeeDrag(trades),
    mistakeTaxUsd: calculateMistakeTaxUsd(trades),
    mistakeTaxByType: calculateMistakeTaxByType(trades),
    rollingExpectancy: calculateRollingExpectancy(trades),
    rDistribution: calculateRDistribution(trades),
    dayOfWeekPerformance: calculateDayOfWeekPerformance(trades),
    timeOfDayHeatmap: calculateTimeOfDayHeatmap(trades),
    strategyLeaderboard: calculateStrategyLeaderboard(trades),
  };
}

export function calculateDisciplineScore(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  let total = 0;
  let passed = 0;
  for (const trade of trades) {
    const flags = trade.disciplineFlags;
    const checks = [
      flags.respectedDailyLossLimit,
      flags.respectedMaxTrades,
      flags.respectedMaxContracts,
      flags.hadStopDefined,
      flags.followedEntryRules,
      flags.followedExitRules,
      flags.journalCompleted,
    ];
    total += checks.length;
    passed += checks.filter((c) => c).length;
  }
  return total > 0 ? (passed / total) * 100 : 0;
}

export function calculateRiskCreep(trades: Trade[], windowDays: number = 7): { date: string; avgRisk: number }[] {
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const result: { date: string; avgRisk: number }[] = [];
  const dateMap: Record<string, number[]> = {};
  for (const trade of sorted) {
    if (!dateMap[trade.tradeDate]) {
      dateMap[trade.tradeDate] = [];
    }
    dateMap[trade.tradeDate].push(trade.plannedRiskUsd);
  }
  const dates = Object.keys(dateMap).sort();
  for (let i = 0; i < dates.length; i++) {
    const windowStart = Math.max(0, i - windowDays + 1);
    const windowDates = dates.slice(windowStart, i + 1);
    const risks: number[] = [];
    for (const date of windowDates) {
      risks.push(...dateMap[date]);
    }
    const avgRisk = risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
    result.push({ date: dates[i], avgRisk });
  }
  return result;
}
