'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { calculateEdgeMetrics } from '@/lib/edge/stats/metrics';
import { EDGE_EXPLAINERS } from '@/lib/edge/stats/explainers';
import { getTrades, getSyncState } from '@/lib/edge/store/edgeStore';
import { format, parseISO } from 'date-fns';
import { 
  InformationCircleIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts';

export default function EdgePage() {
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncState, setSyncState] = useState(getSyncState());
  const [metrics, setMetrics] = useState(calculateEdgeMetrics(getTrades()));
  const [trades, setTrades] = useState(getTrades());
  const { theme } = useTheme();

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/edge/projectx/connect');
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    checkConnection();
    const refresh = () => {
      if (document.hidden) return;
      setSyncState(getSyncState());
      const latestTrades = getTrades();
      setTrades(latestTrades);
      setMetrics(calculateEdgeMetrics(latestTrades));
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [checkConnection]);

  // Chart data calculations
  const chartData = useMemo(() => {
    if (trades.length === 0) return null;

    // Cumulative P&L
    let cumulativePnL = 0;
    const equityCurve = trades.map((trade, index) => {
      cumulativePnL += trade.pnlNet || 0;
      return {
        index: index + 1,
        pnl: cumulativePnL,
        tradePnl: trade.pnlNet || 0,
        date: trade.entryTime ? format(parseISO(trade.entryTime), 'MMM d') : `Trade ${index + 1}`,
      };
    });

    // Daily P&L aggregation
    const dailyPnL: Record<string, { date: string; pnl: number; trades: number; wins: number; losses: number }> = {};
    trades.forEach((trade) => {
      const date = trade.entryTime ? format(parseISO(trade.entryTime), 'MMM d, yyyy') : 'Unknown';
      if (!dailyPnL[date]) {
        dailyPnL[date] = { date, pnl: 0, trades: 0, wins: 0, losses: 0 };
      }
      dailyPnL[date].pnl += trade.pnlNet || 0;
      dailyPnL[date].trades += 1;
      if ((trade.pnlNet || 0) > 0) {
        dailyPnL[date].wins += 1;
      } else if ((trade.pnlNet || 0) < 0) {
        dailyPnL[date].losses += 1;
      }
    });
    const dailyData = Object.values(dailyPnL);

    // Win/Loss distribution
    const winningTrades = trades.filter(t => (t.pnlNet || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnlNet || 0) < 0);
    const breakEvenTrades = trades.filter(t => (t.pnlNet || 0) === 0);
    
    const winLossData = [
      { name: 'Wins', value: winningTrades.length, color: '#0D9488' }, // Teal
      { name: 'Losses', value: losingTrades.length, color: '#E57373' }, // Coral
      { name: 'Break Even', value: breakEvenTrades.length, color: '#6b7280' },
    ].filter(item => item.value > 0);

    // P&L Distribution (histogram-style)
    const pnlBuckets = [
      { range: '< -500', min: -Infinity, max: -500, count: 0, color: '#ea580c' }, // Dark coral
      { range: '-500 to -250', min: -500, max: -250, count: 0, color: '#E57373' }, // Coral
      { range: '-250 to -100', min: -250, max: -100, count: 0, color: '#fb923c' }, // Light coral
      { range: '-100 to 0', min: -100, max: 0, count: 0, color: '#fdba74' }, // Very light coral
      { range: '0 to 100', min: 0, max: 100, count: 0, color: '#5eead4' }, // Very light teal
      { range: '100 to 250', min: 100, max: 250, count: 0, color: '#2dd4bf' }, // Light teal
      { range: '250 to 500', min: 250, max: 500, count: 0, color: '#0D9488' }, // Teal
      { range: '> 500', min: 500, max: Infinity, count: 0, color: '#0d9488' }, // Dark teal
    ];
    
    trades.forEach((trade) => {
      const pnl = trade.pnlNet || 0;
      for (const bucket of pnlBuckets) {
        if (pnl > bucket.min && pnl <= bucket.max) {
          bucket.count += 1;
          break;
        }
      }
    });

    // Hourly performance
    const hourlyPnL: Record<number, { hour: number; pnl: number; trades: number }> = {};
    trades.forEach((trade) => {
      if (trade.entryTime) {
        const hour = parseISO(trade.entryTime).getHours();
        if (!hourlyPnL[hour]) {
          hourlyPnL[hour] = { hour, pnl: 0, trades: 0 };
        }
        hourlyPnL[hour].pnl += trade.pnlNet || 0;
        hourlyPnL[hour].trades += 1;
      }
    });
    const hourlyData = Object.values(hourlyPnL).sort((a, b) => a.hour - b.hour);

    // Drawdown calculation
    let peak = 0;
    let maxDD = 0;
    const drawdownData = equityCurve.map((point) => {
      if (point.pnl > peak) peak = point.pnl;
      const dd = peak - point.pnl;
      if (dd > maxDD) maxDD = dd;
      return {
        ...point,
        drawdown: -dd,
        drawdownPercent: peak !== 0 ? -(dd / peak) * 100 : 0,
      };
    });

    return {
      equityCurve,
      dailyData,
      winLossData,
      pnlBuckets: pnlBuckets.filter(b => b.count > 0),
      hourlyData,
      drawdownData,
      stats: {
        totalWins: winningTrades.length,
        totalLosses: losingTrades.length,
        totalBreakEven: breakEvenTrades.length,
        biggestWin: Math.max(...trades.map(t => t.pnlNet || 0)),
        biggestLoss: Math.min(...trades.map(t => t.pnlNet || 0)),
        avgTradePnL: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.pnlNet || 0), 0) / trades.length : 0,
      }
    };
  }, [trades]);

  // Chart theme colors
  const chartColors = {
    primary: '#0D9488', // Teal
    success: '#0D9488', // Teal for positive
    error: '#E57373', // Coral for negative
    grid: 'rgba(255, 255, 255, 0.10)',
    axis: 'rgba(255, 255, 255, 0.50)',
    tick: 'rgba(255, 255, 255, 0.70)',
    tooltipBg: 'rgba(255, 255, 255, 0.12)',
    tooltipBorder: 'rgba(255, 255, 255, 0.18)',
    tooltipText: '#f8fafc',
  };

  /* Shared glass tooltip style for Recharts */
  const glassTooltipStyle: React.CSSProperties = {
    backgroundColor: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: '14px',
    padding: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255,255,255,0.12)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  };

  const MetricCard = ({ id, label, value, formatter = (v: any) => v, trend }: {
    id: string;
    label: string;
    value: any;
    formatter?: (v: any) => string;
    trend?: 'up' | 'down' | 'neutral';
  }) => {
    const explainer = EDGE_EXPLAINERS[id];
    const [showTooltip, setShowTooltip] = useState(false);
    const formattedValue = formatter(value);

    return (
      <div className="relative group rounded-2xl overflow-hidden theme-bg-secondary" style={{ padding: '1.25rem', border: '1px solid var(--theme-border)', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease' }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" style={{ transitionDuration: '0.3s', background: 'linear-gradient(135deg, var(--theme-bg-tertiary) 0%, transparent 100%)' }} />
        
        <div className="relative z-10 flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wider theme-text-secondary uppercase truncate">{label}</span>
            {explainer && (
              <div className="relative flex-shrink-0">
                <InformationCircleIcon
                  className="h-4 w-4 theme-text-secondary cursor-help hover:theme-text transition-colors hover:scale-110"
                  style={{ transitionDuration: '0.2s' }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div className="absolute z-20 right-0 glass-container animate-scale-in" style={{ top: '28px', width: '280px', padding: '0.75rem' }}>
                    <div className="theme-text font-bold text-sm mb-1">{explainer.title}</div>
                    <div className="theme-text-secondary text-xs leading-relaxed">{explainer.description}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <div 
              className="text-gradient font-extrabold truncate" 
              style={{ 
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', 
                lineHeight: '1.1', 
                letterSpacing: '-0.02em',
                maxWidth: '100%'
              }}
              title={formattedValue}
            >
              {formattedValue}
            </div>
            {trend && (
              <div className="flex-shrink-0" style={{ color: trend === 'up' ? 'var(--theme-success)' : trend === 'down' ? 'var(--theme-error)' : 'var(--theme-text-secondary)' }}>
                {trend === 'up' && <ArrowTrendingUpIcon className="h-5 w-5" />}
                {trend === 'down' && <ArrowTrendingDownIcon className="h-5 w-5" />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-4">
          <SkeletonLoader width="300px" height="3rem" />
          <SkeletonLoader width="200px" height="1.5rem" />
        </div>
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border space-y-4">
          <SkeletonLoader width="150px" height="1.5rem" />
          <SkeletonLoader width="100%" height="1rem" lines={5} />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonLoader width="100%" height="3rem" />
            <SkeletonLoader width="100%" height="3rem" />
          </div>
          <SkeletonLoader width="200px" height="3rem" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-premium">
      {/* Premium Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-slide-in-down" style={{ marginBottom: 'var(--space-3xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-lg)' }}>
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700" style={{ padding: 'var(--space-md)', boxShadow: 'var(--shadow-lg)' }}>
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="theme-text text-h1">
              EDGE
            </h1>
            <p className="theme-text-secondary text-body" style={{ marginTop: 'var(--space-xs)' }}>Broker-linked analytics and chart review</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connected && metrics.totalTrades > 0 && (
            <div className="flex items-center border-2" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', background: 'rgba(13, 148, 136, 0.08)', borderColor: 'rgba(13, 148, 136, 0.2)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
              <CheckCircleIcon className="h-6 w-6" style={{ color: 'var(--theme-success)' }} />
              <span className="font-bold" style={{ fontSize: 'var(--font-size-body)', color: 'var(--theme-success)' }}>
                {metrics.totalTrades} trades synced
              </span>
            </div>
          )}
          <Link
            href="/settings?tab=api"
            className="flex items-center gap-2 px-4 py-2.5 theme-bg-tertiary rounded-xl font-medium hover:opacity-80 transition-all"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            <span className="text-sm">Manage Connection</span>
          </Link>
        </div>
      </div>

      {/* EDGE Dashboard - Premium Metrics */}
      {metrics.totalTrades > 0 && (
        <>
          <div className="section-premium animate-slide-in-up">
            <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 'var(--space-2xl)' }}>
              <h2 className="theme-text text-h2">Your Trading Performance</h2>
              {syncState && (
                <div className="theme-bg-tertiary" style={{ padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-xl)' }}>
                  <span className="theme-text-secondary font-medium text-body-sm">
                    Last synced: {syncState.lastSyncTime ? format(new Date(syncState.lastSyncTime), 'MMM d, h:mm a') : 'Never'}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                id="totalTrades"
                label="Total Trades"
                value={metrics.totalTrades}
                formatter={(v) => v.toLocaleString()}
              />
              <MetricCard
                id="winRate"
                label="Win Rate"
                value={metrics.winRate}
                formatter={(v) => `${v.toFixed(1)}%`}
                trend={metrics.winRate >= 50 ? 'up' : 'down'}
              />
              <MetricCard
                id="netPnL"
                label="Net P&L"
                value={metrics.netPnL}
                formatter={(v) => `$${v.toFixed(2)}`}
                trend={metrics.netPnL >= 0 ? 'up' : 'down'}
              />
              <MetricCard
                id="profitFactor"
                label="Profit Factor"
                value={metrics.profitFactor}
                formatter={(v) => v === Infinity ? '∞' : v.toFixed(2)}
                trend={metrics.profitFactor >= 1 ? 'up' : 'down'}
              />
              <MetricCard
                id="avgWin"
                label="Avg Win"
                value={metrics.avgWin}
                formatter={(v) => `$${v.toFixed(2)}`}
              />
              <MetricCard
                id="avgLoss"
                label="Avg Loss"
                value={metrics.avgLoss}
                formatter={(v) => `$${v.toFixed(2)}`}
              />
              <MetricCard
                id="maxDrawdown"
                label="Max Drawdown"
                value={metrics.maxDrawdown}
                formatter={(v) => `$${v.toFixed(2)}`}
              />
              <MetricCard
                id="feesTotal"
                label="Total Fees"
                value={metrics.feesTotal}
                formatter={(v) => `$${v.toFixed(2)}`}
              />
            </div>

            {/* Quick Actions - Premium buttons */}
            <div className="flex flex-wrap" style={{ gap: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
              <Link
                href="/edge/trades"
                className="btn-premium"
                style={{ color: 'white', background: 'linear-gradient(135deg, var(--theme-primary) 0%, #6366F1 100%)' }}
              >
                <span>View All Trades</span>
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                href="/edge/chart"
                className="btn-premium"
                style={{ color: 'white', background: 'linear-gradient(135deg, #9333EA 0%, #EC4899 100%)' }}
              >
                <span>Open Chart Review</span>
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Charts Section */}
          {chartData && (
            <div className="space-y-8 animate-slide-in-up" style={{ marginTop: 'var(--space-3xl)' }}>
              {/* Equity Curve */}
              <div className="card-premium min-w-0 hover-lift">
                <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                  Cumulative P&L
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData.equityCurve}>
                    <defs>
                      <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="date" 
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.tick, fontSize: 12 }}
                    />
                    <YAxis 
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.tick, fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={glassTooltipStyle}
                      labelStyle={{ fontWeight: 600, marginBottom: '8px', color: chartColors.tooltipText }}
                      formatter={(value: number, name: string) => [
                        name === 'pnl' ? `$${value.toFixed(2)}` : value,
                        name === 'pnl' ? 'Cumulative P&L' : name
                      ]}
                    />
                    <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke={chartColors.primary} 
                      strokeWidth={3}
                      fill="url(#colorPnL)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Daily P&L and Win/Loss Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily P&L */}
                <div className="card-premium min-w-0 hover-lift">
                  <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                    Daily Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis 
                        dataKey="date" 
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.tick, fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.tick, fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={glassTooltipStyle}
                        labelStyle={{ fontWeight: 600, marginBottom: '8px', color: chartColors.tooltipText }}
                        formatter={(value: number, name: string) => {
                          if (name === 'pnl') return [`$${value.toFixed(2)}`, 'P&L'];
                          if (name === 'trades') return [value, 'Trades'];
                          if (name === 'wins') return [value, 'Wins'];
                          if (name === 'losses') return [value, 'Losses'];
                          return [value, name];
                        }}
                      />
                      <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="3 3" />
                      <Bar 
                        dataKey="pnl" 
                        fill={chartColors.primary}
                        radius={[8, 8, 0, 0]}
                      >
                        {chartData.dailyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? chartColors.success : chartColors.error} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Win/Loss Distribution */}
                <div className="card-premium min-w-0 hover-lift">
                  <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                    Win/Loss Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.winLossData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={glassTooltipStyle}
                        formatter={(value: number, name: string) => [value, 'Trades']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>{chartData.stats.totalWins}</div>
                      <div className="text-xs theme-text-secondary uppercase tracking-wide">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#E57373' }}>{chartData.stats.totalLosses}</div>
                      <div className="text-xs theme-text-secondary uppercase tracking-wide">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold theme-text">{chartData.stats.totalBreakEven}</div>
                      <div className="text-xs theme-text-secondary uppercase tracking-wide">Break Even</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* P&L Distribution Histogram */}
              <div className="card-premium min-w-0 hover-lift">
                <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                  P&L Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.pnlBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="range" 
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke={chartColors.axis}
                      tick={{ fill: chartColors.tick, fontSize: 12 }}
                      label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft', fill: chartColors.tick }}
                    />
                    <Tooltip
                      contentStyle={glassTooltipStyle}
                      labelStyle={{ fontWeight: 600, marginBottom: '8px', color: chartColors.tooltipText }}
                      formatter={(value: number) => [value, 'Trades']}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.pnlBuckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Hourly Performance and Drawdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Performance */}
                {chartData.hourlyData.length > 0 && (
                  <div className="card-premium min-w-0 hover-lift">
                    <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                      Performance by Hour
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis 
                          dataKey="hour" 
                          stroke={chartColors.axis}
                          tick={{ fill: chartColors.tick, fontSize: 12 }}
                          tickFormatter={(hour) => `${hour}:00`}
                        />
                        <YAxis 
                          stroke={chartColors.axis}
                          tick={{ fill: chartColors.tick, fontSize: 12 }}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={glassTooltipStyle}
                          labelStyle={{ fontWeight: 600, marginBottom: '8px', color: chartColors.tooltipText }}
                          labelFormatter={(hour) => `${hour}:00`}
                          formatter={(value: number, name: string) => {
                            if (name === 'pnl') return [`$${value.toFixed(2)}`, 'P&L'];
                            if (name === 'trades') return [value, 'Trades'];
                            return [value, name];
                          }}
                        />
                        <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="3 3" />
                        <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                          {chartData.hourlyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? chartColors.success : chartColors.error} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Drawdown Chart */}
                <div className="card-premium min-w-0 hover-lift">
                  <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                    Drawdown Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.drawdownData}>
                      <defs>
                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors.error} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={chartColors.error} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis 
                        dataKey="date" 
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.tick, fontSize: 12 }}
                      />
                      <YAxis 
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.tick, fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={glassTooltipStyle}
                        labelStyle={{ fontWeight: 600, marginBottom: '8px', color: chartColors.tooltipText }}
                        formatter={(value: number, name: string) => [
                          name === 'drawdown' ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`,
                          name === 'drawdown' ? 'Drawdown' : 'Drawdown %'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="drawdown" 
                        stroke={chartColors.error} 
                        strokeWidth={3}
                        fill="url(#colorDD)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Key Statistics Summary */}
              <div className="card-premium">
                <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
                  Key Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-xl theme-bg-tertiary">
                    <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>
                      ${chartData.stats.biggestWin.toFixed(2)}
                    </div>
                    <div className="text-xs theme-text-secondary uppercase tracking-wide mt-1">Biggest Win</div>
                  </div>
                  <div className="text-center p-4 rounded-xl theme-bg-tertiary">
                    <div className="text-2xl font-bold" style={{ color: '#E57373' }}>
                      ${chartData.stats.biggestLoss.toFixed(2)}
                    </div>
                    <div className="text-xs theme-text-secondary uppercase tracking-wide mt-1">Biggest Loss</div>
                  </div>
                  <div className="text-center p-4 rounded-xl theme-bg-tertiary">
                    <div className="text-2xl font-bold theme-text">
                      ${chartData.stats.avgTradePnL.toFixed(2)}
                    </div>
                    <div className="text-xs theme-text-secondary uppercase tracking-wide mt-1">Avg Trade P&L</div>
                  </div>
                  <div className="text-center p-4 rounded-xl theme-bg-tertiary">
                    <div className="text-2xl font-bold theme-text">
                      {metrics.totalTrades}
                    </div>
                    <div className="text-xs theme-text-secondary uppercase tracking-wide mt-1">Total Trades</div>
                  </div>
                  <div className="text-center p-4 rounded-xl theme-bg-tertiary">
                    <div className="text-2xl font-bold theme-text">
                      ${metrics.feesTotal.toFixed(2)}
                    </div>
                    <div className="text-xs theme-text-secondary uppercase tracking-wide mt-1">Total Fees</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State - Show when no data */}
      {metrics.totalTrades === 0 && (
        <div className="text-center py-20 theme-bg-secondary rounded-2xl border theme-border animate-slide-in-up" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <ChartBarIcon className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold theme-text mb-3">No Trade Data Yet</h3>
            <p className="theme-text-secondary text-lg leading-relaxed mb-6">
              {connected 
                ? "Sync your trades from ProjectX to see detailed analytics and performance metrics."
                : "Connect your ProjectX account to start syncing your trades and viewing analytics."
              }
            </p>
            <Link
              href="/settings?tab=api"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              {connected ? 'Sync Trades in Settings' : 'Connect ProjectX'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
