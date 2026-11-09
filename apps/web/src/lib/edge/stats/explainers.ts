// EDGE metric explainers

export const EDGE_EXPLAINERS: Record<string, { title: string; description: string }> = {
  totalTrades: {
    title: 'Total Trades',
    description: 'The total number of round-trip trades (complete entry and exit cycles) synced from your broker account.',
  },
  winRate: {
    title: 'Win Rate',
    description: 'The percentage of trades that resulted in a profit. Calculated as (Winning Trades / Total Trades) × 100.',
  },
  netPnL: {
    title: 'Net P&L',
    description: 'Total profit and loss after all fees. This is the sum of all trade P&L minus total fees.',
  },
  avgWin: {
    title: 'Average Win',
    description: 'The average profit per winning trade. Calculated as total winning P&L divided by number of winning trades.',
  },
  avgLoss: {
    title: 'Average Loss',
    description: 'The average loss per losing trade. Calculated as total losing P&L (absolute value) divided by number of losing trades.',
  },
  profitFactor: {
    title: 'Profit Factor',
    description: 'The ratio of gross profit to gross loss. A value above 1.0 indicates profitability. Calculated as (Total Winning P&L) / (Total Losing P&L).',
  },
  maxDrawdown: {
    title: 'Maximum Drawdown',
    description: 'The largest peak-to-trough decline in cumulative P&L. Measures the worst losing streak from a previous high.',
  },
  feesTotal: {
    title: 'Total Fees',
    description: 'The sum of all fees paid across all trades. Includes commissions, exchange fees, and other transaction costs.',
  },
  bestDay: {
    title: 'Best Day',
    description: 'The trading day with the highest net P&L. Shows your most profitable single day.',
  },
  worstDay: {
    title: 'Worst Day',
    description: 'The trading day with the lowest net P&L. Shows your least profitable single day.',
  },
  contractLeaderboard: {
    title: 'Contract Leaderboard',
    description: 'Ranking of contracts by total P&L. Shows which instruments have been most profitable for you.',
  },
  dayOfWeekPerformance: {
    title: 'Day of Week Performance',
    description: 'Breakdown of P&L and trade count by day of the week. Helps identify which days are most profitable.',
  },
  timeOfDayDistribution: {
    title: 'Time of Day Distribution',
    description: 'Histogram showing the number of trades entered at each hour of the day (UTC). Helps identify trading patterns.',
  },
};
