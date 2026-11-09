'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

interface EquityCurveWidgetProps {
  data: Array<{ index: number; cumR: number; cumUSD: number; date: string }>;
  view: 'R' | 'USD';
}

export function EquityCurveWidget({ data, view }: EquityCurveWidgetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const tickColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 theme-text-secondary">
        No trades to display
      </div>
    );
  }

  const lastValue = data[data.length - 1];
  const isPositive = view === 'R' ? lastValue.cumR >= 0 : lastValue.cumUSD >= 0;

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.5} />
          <XAxis dataKey="index" stroke={axisColor} tick={{ fill: tickColor, fontSize: 12 }} />
          <YAxis stroke={axisColor} tick={{ fill: tickColor, fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#000' : '#fff',
              border: `1px solid ${gridColor}`,
              borderRadius: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey={view === 'R' ? 'cumR' : 'cumUSD'}
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={3}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
