'use client';

import { Trade, Strategy } from '@trde/core';
import Link from 'next/link';

interface StrategyLeaderboardWidgetProps {
  strategies: Strategy[];
  trades: Trade[];
}

export function StrategyLeaderboardWidget({
  strategies,
  trades,
}: StrategyLeaderboardWidgetProps) {
  // Calculate P&L for each strategy
  const strategyStats = strategies.map((strategy) => {
    const strategyTrades = trades.filter((t) => t.strategyId === strategy.id);
    const totalR = strategyTrades.reduce((sum, t) => sum + t.resultR, 0);
    const tradeCount = strategyTrades.length;
    return { strategy, totalR, tradeCount };
  });

  // Sort by totalR descending
  const topStrategies = strategyStats
    .filter((s) => s.tradeCount > 0)
    .sort((a, b) => b.totalR - a.totalR)
    .slice(0, 5);

  if (topStrategies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full theme-text-secondary">
        No strategies with trades yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topStrategies.map((item, index) => (
        <Link
          key={item.strategy.id}
          href={`/strategies`}
          className="flex items-center gap-3 p-3 theme-bg-tertiary rounded-lg hover:theme-bg-tertiary transition-all cursor-pointer"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="theme-text font-semibold truncate">{item.strategy.name}</div>
            <div className="text-xs theme-text-tertiary">{item.tradeCount} trades</div>
          </div>
          <div
            className={`text-right font-bold ${
              item.totalR >= 0 ? 'text-positive' : 'text-negative'
            }`}
          >
            {item.totalR >= 0 ? '+' : ''}
            {item.totalR.toFixed(1)}R
          </div>
        </Link>
      ))}
    </div>
  );
}
