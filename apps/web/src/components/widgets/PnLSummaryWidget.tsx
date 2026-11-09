'use client';

interface PnLSummaryWidgetProps {
  totalPnL: number;
  totalR: number;
}

export function PnLSummaryWidget({ totalPnL, totalR }: PnLSummaryWidgetProps) {
  const isPositive = totalPnL >= 0;

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="text-center">
        <div className="text-xs theme-text-secondary uppercase tracking-wide mb-2">
          Total P&L
        </div>
        <div className={`text-4xl font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
          {isPositive ? '+' : ''}${totalPnL.toFixed(0)}
        </div>
      </div>
      <div className="w-full h-px theme-border" />
      <div className="text-center">
        <div className="text-xs theme-text-secondary uppercase tracking-wide mb-2">
          Total R
        </div>
        <div className={`text-3xl font-bold ${totalR >= 0 ? 'text-positive' : 'text-negative'}`}>
          {totalR >= 0 ? '+' : ''}
          {totalR.toFixed(1)}R
        </div>
      </div>
    </div>
  );
}
