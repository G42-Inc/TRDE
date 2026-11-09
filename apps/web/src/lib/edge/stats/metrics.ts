// EDGE metrics computation

import type { RoundTripTrade, EdgeMetrics } from '../types';

/**
 * Calculate all EDGE metrics from round-trip trades
 */
export function calculateEdgeMetrics(trades: RoundTripTrade[]): EdgeMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      netPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      feesTotal: 0,
      bestDay: { date: '', pnl: 0 },
      worstDay: { date: '', pnl: 0 },
      contractLeaderboard: [],
      dayOfWeekPerformance: [],
      timeOfDayDistribution: [],
    };
  }

  const wins = trades.filter((t) => t.outcome === 'WIN');
  const losses = trades.filter((t) => t.outcome === 'LOSS');
  const totalPnL = trades.reduce((sum, t) => sum + t.pnlNet, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.feesTotal, 0);

  const winPnL = wins.reduce((sum, t) => sum + t.pnlNet, 0);
  const lossPnL = Math.abs(losses.reduce((sum, t) => sum + t.pnlNet, 0));

  // Day-by-day PnL
  const dayPnL = new Map<string, number>();
  trades.forEach((trade) => {
    const date = new Date(trade.entryTime).toISOString().split('T')[0];
    dayPnL.set(date, (dayPnL.get(date) || 0) + trade.pnlNet);
  });

  const dayEntries = Array.from(dayPnL.entries()).map(([date, pnl]) => ({ date, pnl }));
  const bestDay = dayEntries.reduce((best, day) => (day.pnl > best.pnl ? day : best), { date: '', pnl: -Infinity });
  const worstDay = dayEntries.reduce((worst, day) => (day.pnl < worst.pnl ? day : worst), { date: '', pnl: Infinity });

  // Contract leaderboard
  const contractPnL = new Map<string, { pnl: number; trades: number; name?: string }>();
  trades.forEach((trade) => {
    const existing = contractPnL.get(trade.contractId) || { pnl: 0, trades: 0, name: trade.contractName };
    existing.pnl += trade.pnlNet;
    existing.trades += 1;
    if (trade.contractName) existing.name = trade.contractName;
    contractPnL.set(trade.contractId, existing);
  });

  const contractLeaderboard = Array.from(contractPnL.entries())
    .map(([contractId, data]) => ({
      contractId,
      contractName: data.name,
      pnl: data.pnl,
      trades: data.trades,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Day of week performance
  const dayOfWeekPnL = new Map<string, { pnl: number; trades: number }>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  trades.forEach((trade) => {
    const day = dayNames[new Date(trade.entryTime).getDay()];
    const existing = dayOfWeekPnL.get(day) || { pnl: 0, trades: 0 };
    existing.pnl += trade.pnlNet;
    existing.trades += 1;
    dayOfWeekPnL.set(day, existing);
  });

  const dayOfWeekPerformance = dayNames.map((day) => ({
    day,
    pnl: dayOfWeekPnL.get(day)?.pnl || 0,
    trades: dayOfWeekPnL.get(day)?.trades || 0,
  }));

  // Time of day distribution (hour of entry)
  const hourCounts = new Map<number, number>();
  trades.forEach((trade) => {
    const hour = new Date(trade.entryTime).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const timeOfDayDistribution = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts.get(hour) || 0,
  }));

  // Max drawdown (from cumulative PnL)
  let runningPnL = 0;
  let peak = 0;
  let maxDD = 0;
  trades
    .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
    .forEach((trade) => {
      runningPnL += trade.pnlNet;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDD) maxDD = drawdown;
    });

  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    netPnL: totalPnL,
    avgWin: wins.length > 0 ? winPnL / wins.length : 0,
    avgLoss: losses.length > 0 ? lossPnL / losses.length : 0,
    profitFactor: lossPnL > 0 ? winPnL / lossPnL : wins.length > 0 ? Infinity : 0,
    maxDrawdown: maxDD,
    feesTotal: totalFees,
    bestDay: bestDay.date ? bestDay : { date: '', pnl: 0 },
    worstDay: worstDay.date ? worstDay : { date: '', pnl: 0 },
    contractLeaderboard,
    dayOfWeekPerformance,
    timeOfDayDistribution,
  };
}
