'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { type DashboardMetricId } from '@/contexts/StorageContext';
import { calculateAllMetrics } from '@trde/core';
import type { Trade } from '@trde/core';
import { AssetClass, Outcome } from '@trde/core';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import { TodoList } from '@/components/TodoList';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { AnimatedView } from '@/components/AnimatedView';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useUser } from '@clerk/nextjs';
import { PersonalizedHeader } from '@/components/dashboard/PersonalizedHeader';
import { SetupProgress } from '@/components/ui';

// Helper to format large numbers compactly
const formatCompactNumber = (num: number, isCurrency = false): string => {
  const absNum = Math.abs(num);
  const prefix = isCurrency ? '$' : '';
  
  if (absNum >= 1000000) {
    return `${prefix}${(num / 1000000).toFixed(1)}M`;
  }
  if (absNum >= 100000) {
    return `${prefix}${(num / 1000).toFixed(0)}K`;
  }
  if (absNum >= 10000) {
    return `${prefix}${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (isCurrency) {
    return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trades, strategies, dashboardMetrics, isLoading: storageLoading, isSyncing, isDemo } = useAppData();
  const [mounted, setMounted] = useState(false);

  // Note: Checkout success is now handled directly via Stripe redirect to /app/checkout-success
  // No need to redirect from here anymore
  const [equityView, setEquityView] = useState<'R' | 'USD'>('R');
  const [xAxisView, setXAxisView] = useState<'trade' | 'date'>('trade');
  const [dateTimeframe, setDateTimeframe] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const { theme } = useTheme();

  // NOTE: Entitlement check is handled by EntitlementGate in app/layout.tsx
  // This useEffect is removed to avoid duplicate checks and potential race conditions

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Use empty array during SSR to prevent hydration mismatch
  const metrics = calculateAllMetrics(mounted ? trades : []);

  // Rest of the dashboard component remains the same...
  // (Copy the rest from the original page.tsx)

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen theme-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current theme-text mx-auto mb-4"></div>
          <p className="theme-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Theme-aware colors for charts
  const chartColors = {
    line: '#0D9488', // Teal
    grid: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Filter trades based on timeframe
  const filteredTrades = mounted ? (() => {
    if (dateTimeframe === 'all') return trades;
    const now = Date.now();
    const cutoff = dateTimeframe === 'weekly' ? now - 7 * 24 * 60 * 60 * 1000
      : dateTimeframe === 'monthly' ? now - 30 * 24 * 60 * 60 * 1000
      : now - 365 * 24 * 60 * 60 * 1000;
    return trades.filter(t => t.createdAt >= cutoff);
  })() : [];

  // Build equity curve data
  const equityData = filteredTrades
    .sort((a, b) => a.createdAt - b.createdAt)
    .reduce((acc, trade, index) => {
      const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 0;
      const tradeValue = equityView === 'R' ? trade.resultR : trade.resultUsd;
      acc.push({
        trade: index + 1,
        date: format(new Date(trade.createdAt), 'MMM d'),
        value: prevValue + tradeValue,
        tradeNumber: index + 1,
      });
      return acc;
    }, [] as Array<{ trade: number; date: string; value: number; tradeNumber: number }>);

  const renderMetricCard = (metricId: DashboardMetricId, index: number) => {
    if (!mounted) return null;

    switch (metricId) {
      case 'totalPnLUsd':
        return (
          <MetricCard
            key={metricId}
            label="TOTAL PNL"
            value={formatCompactNumber(metrics.totalPnLUsd, true)}
            subtitle={`${metrics.totalPnLR >= 0 ? '+' : ''}${metrics.totalPnLR.toFixed(1)}R Total`}
            positive={metrics.totalPnLR >= 0}
            metricId={metricId}
          />
        );
      case 'winRate':
        return (
          <MetricCard
            key={metricId}
            label="WIN RATE"
            value={`${metrics.winRate.toFixed(1)}%`}
            subtitle={`~Last ${trades.length.toLocaleString()} trades`}
            positive={metrics.winRate >= 50}
            metricId={metricId}
          />
        );
      case 'profitFactor':
        return (
          <MetricCard
            key={metricId}
            label="PROFIT FACTOR"
            value={metrics.profitFactor.toFixed(2)}
            subtitle={`~Exp: ${metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(2)}R`}
            positive={metrics.profitFactor >= 1}
            metricId={metricId}
          />
        );
      case 'mistakeTaxUsd':
        return (
          <MetricCard
            key={metricId}
            label="MISTAKE TAX"
            value={formatCompactNumber(metrics.mistakeTaxUsd, true)}
            subtitle="~Potential savings"
            positive={false}
            metricId={metricId}
          />
        );
      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="200px" height="2rem" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonLoader key={i} width="100%" height="120px" />
          ))}
        </div>
        <SkeletonLoader width="100%" height="400px" />
      </div>
    );
  }

  return (
    <div className="container-premium">
      {/* Personalized Header with tips and quick actions */}
      <div style={{ marginBottom: 'var(--space-3xl)' }}>
        <PersonalizedHeader 
          metrics={{
            winRate: metrics.winRate,
            totalPnLUsd: metrics.totalPnLUsd,
            totalPnLR: metrics.totalPnLR,
            expectancy: metrics.expectancy,
          }}
          tradeCount={trades.length}
        />
      </div>

      {/* Setup Progress - Show for new users */}
      {trades.length < 5 && (
        <div className="mb-8 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
          <SetupProgress
            hasFirstTrade={trades.length > 0}
            hasStrategy={strategies.length > 0}
            hasJournalEntry={false}
            compact={trades.length > 0}
          />
        </div>
      )}

      {/* Metrics Grid with premium styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {dashboardMetrics.map((metricId, index) => (
          <div key={metricId} className="animate-slide-in-up min-w-0" style={{ animationDelay: `${index * 50}ms` }}>
            {renderMetricCard(metricId as DashboardMetricId, index)}
          </div>
        ))}
      </div>

      {/* Equity Curve with premium styling */}
      <div className="card-premium hover-lift animate-slide-in-up" style={{ animationDelay: '200ms', marginBottom: '2rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h2 className="theme-text text-h2">Equity Curve</h2>
            <p className="theme-text-secondary text-body-sm" style={{ marginTop: 'var(--space-xs)' }}>Track your cumulative performance</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 p-1 theme-bg-secondary rounded-xl border theme-border">
              <button
                onClick={() => setXAxisView('trade')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  xAxisView === 'trade'
                    ? 'theme-button text-white shadow-md'
                    : 'theme-text hover:theme-bg-tertiary'
                }`}
              >
                Trade #
              </button>
              <button
                onClick={() => setXAxisView('date')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  xAxisView === 'date'
                    ? 'theme-button text-white shadow-md'
                    : 'theme-text hover:theme-bg-tertiary'
                }`}
              >
                Date
              </button>
            </div>
            <div className="flex items-center gap-2 p-1 theme-bg-secondary rounded-xl border theme-border">
              <button
                onClick={() => setEquityView('R')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  equityView === 'R'
                    ? 'theme-button text-white shadow-md'
                    : 'theme-text hover:theme-bg-tertiary'
                }`}
              >
                R
              </button>
              <button
                onClick={() => setEquityView('USD')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  equityView === 'USD'
                    ? 'theme-button text-white shadow-md'
                    : 'theme-text hover:theme-bg-tertiary'
                }`}
              >
                USD
              </button>
            </div>
            <select
              value={dateTimeframe}
              onChange={(e) => setDateTimeframe(e.target.value as any)}
              className="px-4 py-2 rounded-xl text-sm theme-bg-secondary theme-border border theme-text focus:outline-none focus:ring-2 theme-ring font-medium"
            >
              <option value="weekly">Last 7 days</option>
              <option value="monthly">Last 30 days</option>
              <option value="yearly">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={equityData}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.line} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey={xAxisView === 'trade' ? 'tradeNumber' : 'date'}
              stroke={chartColors.grid}
              tick={{ fill: chartColors.grid, fontSize: 12 }}
              axisLine={{ stroke: chartColors.grid }}
            />
            <YAxis
              stroke={chartColors.grid}
              tick={{ fill: chartColors.grid, fontSize: 12 }}
              axisLine={{ stroke: chartColors.grid }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: '8px', color: theme === 'dark' ? '#fff' : '#000' }}
              cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              formatter={(value: number) => [
                equityView === 'USD' 
                  ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${value.toFixed(2)}R`,
                equityView === 'USD' ? 'P&L' : 'R Value'
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.line}
              strokeWidth={3}
              dot={false}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Trades with premium styling */}
      <div className="card-premium hover-lift animate-slide-in-up" style={{ animationDelay: '300ms', marginTop: '1rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h2 className="theme-text text-h2">Recent Trades</h2>
            <p className="theme-text-secondary text-body-sm" style={{ marginTop: 'var(--space-xs)' }}>Latest {Math.min(5, trades.length)} trades</p>
          </div>
          <Link
            href="/trades"
            className="btn-premium"
            style={{ padding: 'var(--space-md) var(--space-xl)', color: 'white' }}
          >
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>Date</th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>Symbol</th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>Type</th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>Outcome</th>
                <th className="text-right theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>R</th>
                <th className="text-right theme-text-secondary text-caption" style={{ padding: 'var(--space-md) var(--space-lg)' }}>PnL</th>
              </tr>
            </thead>
            <tbody>
              {trades
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5)
                .map((trade, index) => (
                <tr key={trade.id} className="table-row-premium border-b animate-slide-in-up" style={{ animationDelay: `${index * 30}ms`, borderColor: 'var(--theme-border)' }}>
                  <td className="theme-text text-body-sm font-medium">
                    {format(parseISO(trade.tradeDate), 'M/dd HH:mm')}
                  </td>
                  <td className="theme-text text-body font-semibold">
                    {trade.assetClass === AssetClass.FUTURES
                      ? (trade as any).instrumentRoot
                      : (trade as any).underlying}
                  </td>
                  <td className="theme-text-secondary text-body-sm">
                    {trade.assetClass === AssetClass.FUTURES ? 'Futures' : 'Options'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${trade.outcome === Outcome.WIN ? 'success' : 'error'}`} />
                      <span className="text-body-sm font-medium" style={{ color: trade.outcome === Outcome.WIN ? 'var(--theme-success)' : 'var(--theme-error)' }}>
                        {trade.outcome}
                      </span>
                    </div>
                  </td>
                  <td className="text-body-sm text-right font-semibold">
                    <span style={{ color: trade.resultR >= 0 ? 'var(--theme-success)' : 'var(--theme-error)' }}>
                      {trade.resultR >= 0 ? '+' : ''}
                      {trade.resultR.toFixed(2)}R
                    </span>
                  </td>
                  <td className="text-body-sm text-right font-semibold">
                    <span style={{ color: trade.resultUsd >= 0 ? 'var(--theme-success)' : 'var(--theme-error)' }}>
                      {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
