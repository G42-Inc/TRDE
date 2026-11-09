import { Outcome, type Trade } from '@trde/core';

export function filterPerformanceTrades(trades: Trade[], days: number | null, edgeOnly: boolean, edgeCollectionId?: string, now = Date.now()) {
  const cutoff = days === null ? -Infinity : now - days * 86_400_000;
  return trades.filter(trade => trade.entryTime >= cutoff && (!edgeOnly ||
    trade.notes?.startsWith('[EDGE') || (edgeCollectionId && trade.collections.includes(edgeCollectionId))));
}

/** Group executions by the viewer's local hour, never by a date-only midnight. */
export function calculateHourlyPerformance(trades: Pick<Trade, 'entryTime' | 'resultUsd' | 'resultR' | 'outcome'>[]) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`, hourNum: hour, pnl: 0, r: 0, count: 0, wins: 0,
  }));
  for (const trade of trades) {
    const hour = hours[new Date(trade.entryTime).getHours()];
    if (!hour) continue;
    hour.pnl += trade.resultUsd;
    hour.r += trade.resultR;
    hour.count++;
    if (trade.outcome === Outcome.WIN) hour.wins++;
  }
  return hours.filter(hour => hour.count > 0).map(hour => ({
    ...hour, pnl: Number(hour.pnl.toFixed(2)), r: Number(hour.r.toFixed(2)),
    winRate: Number((hour.wins / hour.count * 100).toFixed(1)),
  }));
}

/** Breakeven interrupts either streak without counting as a win or loss. */
export function calculateStreaks(trades: Pick<Trade, 'outcome'>[]) {
  const wins: number[] = [], losses: number[] = [];
  let win = 0, loss = 0;
  const streakHistory = trades.map((trade, index) => {
    if (trade.outcome !== Outcome.WIN && win) { wins.push(win); win = 0; }
    if (trade.outcome !== Outcome.LOSS && loss) { losses.push(loss); loss = 0; }
    if (trade.outcome === Outcome.WIN) win++;
    if (trade.outcome === Outcome.LOSS) loss++;
    return { trade: index + 1, winStreak: win, lossStreak: loss ? -loss : 0 };
  });
  if (win) wins.push(win);
  if (loss) losses.push(loss);
  const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return { streakHistory, maxWinStreak: Math.max(0, ...wins), maxLossStreak: Math.max(0, ...losses),
    avgConsecutiveWins: average(wins), avgConsecutiveLosses: average(losses) };
}
