'use client';

interface QuickStatsWidgetProps {
  winRate: number;
  totalPnL: number;
  totalR: number;
  tradeCount: number;
}

export function QuickStatsWidget({ winRate, totalPnL, totalR, tradeCount }: QuickStatsWidgetProps) {
  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      <div className="text-center p-4 theme-bg-tertiary rounded-lg">
        <div className="text-2xl font-bold theme-text">{winRate.toFixed(1)}%</div>
        <div className="text-xs theme-text-secondary mt-1">Win Rate</div>
      </div>
      <div className="text-center p-4 theme-bg-tertiary rounded-lg">
        <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
          ${Math.abs(totalPnL).toFixed(0)}
        </div>
        <div className="text-xs theme-text-secondary mt-1">P&L</div>
      </div>
      <div className="text-center p-4 theme-bg-tertiary rounded-lg">
        <div className={`text-2xl font-bold ${totalR >= 0 ? 'text-positive' : 'text-negative'}`}>
          {totalR.toFixed(1)}R
        </div>
        <div className="text-xs theme-text-secondary mt-1">Total R</div>
      </div>
      <div className="text-center p-4 theme-bg-tertiary rounded-lg">
        <div className="text-2xl font-bold theme-text">{tradeCount}</div>
        <div className="text-xs theme-text-secondary mt-1">Trades</div>
      </div>
    </div>
  );
}
