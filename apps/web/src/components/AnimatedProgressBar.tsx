'use client';

import { useEffect, useState } from 'react';

interface AnimatedProgressBarProps {
  value: number; // 0-100
  height?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export function AnimatedProgressBar({
  value,
  height = 'h-3',
  color = 'blue',
  showValue = false,
  animated = true,
  className = '',
}: AnimatedProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    // Animate from 0 to value
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.min(value, currentStep * increment));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value, animated]);

  const colorClasses = {
    green: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600',
    yellow: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600',
    red: 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600',
    blue: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600',
    purple: 'bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600',
  };

  const glowColorClasses = {
    green: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
    yellow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
    red: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    blue: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    purple: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`w-full ${height} theme-bg-tertiary rounded-full overflow-hidden relative`}>
        {/* Background glow */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute inset-0 ${colorClasses[color]} blur-sm`} />
        </div>

        {/* Progress bar */}
        <div
          className={`${height} ${colorClasses[color]} rounded-full transition-all duration-700 ease-out relative overflow-hidden ${glowColorClasses[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, displayValue))}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>

          {/* Pulse effect at the edge */}
          <div
            className="absolute right-0 inset-y-0 w-1 bg-white/50 animate-pulse"
            style={{ animationDuration: '1.5s' }}
          />
        </div>
      </div>

      {/* Value display */}
      {showValue && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12">
          <span className="text-xs font-semibold theme-text">
            {Math.round(displayValue)}%
          </span>
        </div>
      )}
    </div>
  );
}
