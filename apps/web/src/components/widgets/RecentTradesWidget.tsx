'use client';

import { Trade, Outcome, AssetClass } from '@trde/core';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface RecentTradesWidgetProps {
  trades: Trade[];
}

export function RecentTradesWidget({ trades }: RecentTradesWidgetProps) {
  const recentTrades = trades.slice(0, 5);

  if (recentTrades.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 theme-text-secondary">
        No trades yet
      </div>
    );
  }

  // Helper to get display symbol from trade
  const getSymbol = (trade: Trade): string => {
    if (trade.assetClass === AssetClass.FUTURES) {
      return trade.instrumentRoot;
    } else {
      return trade.underlying;
    }
  };

  return (
    <div className="space-y-2">
      {recentTrades.map((trade) => (
        <Link
          key={trade.id}
          href={`/trades/${trade.id}`}
          className="flex items-center justify-between p-3 theme-bg-tertiary rounded-lg hover:theme-bg-tertiary transition-all cursor-pointer"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="theme-text font-semibold truncate">{getSymbol(trade)}</span>
              <span className="text-xs theme-text-tertiary">
                {format(parseISO(trade.tradeDate), 'MMM d')}
              </span>
            </div>
          </div>
          <div className="text-right ml-4">
            <div
              className={`font-bold ${
                trade.outcome === Outcome.WIN ? 'text-positive' : 'text-negative'
              }`}
            >
              {trade.resultR >= 0 ? '+' : ''}
              {trade.resultR.toFixed(2)}R
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
