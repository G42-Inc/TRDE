'use client';

interface WinRateWidgetProps {
  winRate: number;
  totalTrades: number;
}

export function WinRateWidget({ winRate, totalTrades }: WinRateWidgetProps) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (winRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-48 h-48">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="theme-text-tertiary opacity-20"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke={winRate >= 50 ? '#10b981' : '#f59e0b'}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold theme-text">{winRate.toFixed(1)}%</div>
          <div className="text-sm theme-text-secondary mt-1">Win Rate</div>
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-sm theme-text-tertiary">{totalTrades} trades</div>
      </div>
    </div>
  );
}
