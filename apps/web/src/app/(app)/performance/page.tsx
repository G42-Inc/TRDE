'use client';

import { PerformanceHubTabs } from '@/components/PerformanceHubTabs';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calculateStreaks, filterPerformanceTrades } from '@/lib/trades/performance';
import { calculateAllMetrics, Outcome } from '@trde/core';
import type { Strategy, Trade } from '@trde/core';
import Link from 'next/link';
import { MetricCard } from '@/components/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, ComposedChart, Cell, Legend, ReferenceLine } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { ModalDialog } from '@/components/ModalDialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getMyStrategies, type Strategy as SupabaseStrategy } from '@/lib/actions/strategies.server';
import { useUser } from '@clerk/nextjs';

export default function PerformanceHub() {
  const { user } = useUser();
  const { trades, versions, collections, strategies: userStrategies, isLoading } = useAppData();
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180'>('all');
  const [showEdgeStats, setShowEdgeStats] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [selectedStrategyType, setSelectedStrategyType] = useState<'local' | 'supabase' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [supabaseStrategies, setSupabaseStrategies] = useState<SupabaseStrategy[]>([]);
  const [loadingSupabaseStrategies, setLoadingSupabaseStrategies] = useState(true);

  const loadSupabaseStrategies = useCallback(async () => {
    if (user) {
      try {
        setLoadingSupabaseStrategies(true);
        const result = await getMyStrategies();
        if (result.success && result.strategies) {
          setSupabaseStrategies(result.strategies);
        }
      } catch (error) {
        console.error('Error loading Supabase strategies:', error);
      } finally {
        setLoadingSupabaseStrategies(false);
      }
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
    loadSupabaseStrategies();
  }, [loadSupabaseStrategies]);

  const filteredTrades = filterPerformanceTrades(trades, dateRange === 'all' ? null : Number(dateRange), showEdgeStats, collections.find(c => c.name === 'EDGE')?.id);

  const metrics = calculateAllMetrics(filteredTrades);
  
  // Calculate winning/losing trades count
  const winningTrades = filteredTrades.filter(t => t.outcome === 'WIN').length;
  const losingTrades = filteredTrades.filter(t => t.outcome === 'LOSS').length;

  const chartColors = {
    line: '#0D9488',
    positive: '#0D9488',
    negative: '#E57373',
    grid: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    axis: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    tick: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
    tooltipBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    tooltipBorder: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Calculate advanced statistics
  const advancedStats = useMemo(() => {
    if (filteredTrades.length === 0) return null;
    
    const sortedTrades = [...filteredTrades].sort((a, b) => 
      a.entryTime - b.entryTime
    );
    
    const { maxWinStreak, maxLossStreak, streakHistory, avgConsecutiveWins, avgConsecutiveLosses } = calculateStreaks(sortedTrades);

    // Monthly Performance
    const monthlyPerf = new Map<string, { pnl: number; r: number; wins: number; losses: number; trades: number }>();
    sortedTrades.forEach(trade => {
      const month = format(parseISO(trade.tradeDate), 'MMM yyyy');
      const existing = monthlyPerf.get(month) || { pnl: 0, r: 0, wins: 0, losses: 0, trades: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.trades++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      else if (trade.outcome === Outcome.LOSS) existing.losses++;
      monthlyPerf.set(month, existing);
    });
    
    const monthlyData = Array.from(monthlyPerf.entries()).map(([month, data]) => ({
      month,
      pnl: Number(data.pnl.toFixed(2)),
      r: Number(data.r.toFixed(2)),
      winRate: Number(((data.wins / data.trades) * 100).toFixed(1)),
      trades: data.trades,
    }));
    
    // Hourly Performance
    const hourlyPerf = new Map<number, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      const hour = new Date(trade.entryTime).getHours();
      const existing = hourlyPerf.get(hour) || { pnl: 0, r: 0, count: 0, wins: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      hourlyPerf.set(hour, existing);
    });
    
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyPerf.get(hour) || { pnl: 0, r: 0, count: 0, wins: 0 };
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        r: Number(data.r.toFixed(2)),
        count: data.count,
      };
    }).filter(d => d.count > 0);
    
    // Drawdown Analysis
    let peak = 0;
    let drawdownData: { trade: number; equity: number; drawdown: number }[] = [];
    let runningEquity = 0;
    
    sortedTrades.forEach((trade, idx) => {
      runningEquity += trade.resultUsd;
      peak = Math.max(peak, runningEquity);
      const drawdown = peak - runningEquity;
      drawdownData.push({
        trade: idx + 1,
        equity: Number(runningEquity.toFixed(2)),
        drawdown: Number(drawdown.toFixed(2)),
      });
    });
    
    // Win Rate Over Time
    let cumulativeWins = 0;
    const winRateOverTime = sortedTrades.map((trade, idx) => {
      if (trade.outcome === Outcome.WIN) cumulativeWins++;
      return {
        trade: idx + 1,
        winRate: Number(((cumulativeWins / (idx + 1)) * 100).toFixed(1)),
      };
    });
    
    // Equity Curve
    let equityR = 0;
    let equityUsd = 0;
    const equityCurveData = sortedTrades.map((trade, idx) => {
      equityR += trade.resultR;
      equityUsd += trade.resultUsd;
      return {
        trade: idx + 1,
        date: format(parseISO(trade.tradeDate), 'MMM dd'),
        equityR: Number(equityR.toFixed(2)),
        equityUsd: Number(equityUsd.toFixed(2)),
      };
    });

    // Day of Week Performance
    const dayOfWeekPerf = new Map<string, { pnl: number; r: number; count: number }>();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    sortedTrades.forEach(trade => {
      const dayIndex = parseISO(trade.tradeDate).getDay();
      const day = days[dayIndex];
      const existing = dayOfWeekPerf.get(day) || { pnl: 0, r: 0, count: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      dayOfWeekPerf.set(day, existing);
    });

    const dayOfWeekData = days.map(day => {
      const data = dayOfWeekPerf.get(day) || { pnl: 0, r: 0, count: 0 };
      return {
        day: day.slice(0, 3),
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
      };
    });
    
    // Week of Month Performance
    const weekOfMonthPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      const date = parseISO(trade.tradeDate);
      const dayOfMonth = date.getDate();
      const weekNum = Math.ceil(dayOfMonth / 7);
      const weekLabel = `Week ${weekNum}`;
      const existing = weekOfMonthPerf.get(weekLabel) || { pnl: 0, r: 0, count: 0, wins: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      weekOfMonthPerf.set(weekLabel, existing);
    });
    const weekOfMonthData = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map(week => {
      const data = weekOfMonthPerf.get(week) || { pnl: 0, r: 0, count: 0, wins: 0 };
      return {
        week,
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: data.count > 0 ? Number(((data.wins / data.count) * 100).toFixed(1)) : 0,
      };
    }).filter(d => d.count > 0);

    // Quarter Performance
    const quarterPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      const date = parseISO(trade.tradeDate);
      const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      const existing = quarterPerf.get(quarter) || { pnl: 0, r: 0, count: 0, wins: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      quarterPerf.set(quarter, existing);
    });
    const quarterData = Array.from(quarterPerf.entries()).map(([quarter, data]) => ({
      quarter,
      pnl: Number(data.pnl.toFixed(2)),
      r: Number(data.r.toFixed(2)),
      count: data.count,
      winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
    }));

    // Setup Tag Performance
    const setupTagPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      if (trade.setupTags && trade.setupTags.length > 0) {
        trade.setupTags.forEach(tag => {
          const existing = setupTagPerf.get(tag) || { pnl: 0, r: 0, count: 0, wins: 0 };
          existing.pnl += trade.resultUsd;
          existing.r += trade.resultR;
          existing.count++;
          if (trade.outcome === Outcome.WIN) existing.wins++;
          setupTagPerf.set(tag, existing);
        });
      }
    });
    const setupTagData = Array.from(setupTagPerf.entries())
      .map(([tag, data]) => ({
        tag: tag.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
        avgR: Number((data.r / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.r - a.r);

    // Session Performance
    const sessionPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      if (trade.session) {
        const existing = sessionPerf.get(trade.session) || { pnl: 0, r: 0, count: 0, wins: 0 };
        existing.pnl += trade.resultUsd;
        existing.r += trade.resultR;
        existing.count++;
        if (trade.outcome === Outcome.WIN) existing.wins++;
        sessionPerf.set(trade.session, existing);
      }
    });
    const sessionData = Array.from(sessionPerf.entries())
      .map(([session, data]) => ({
        session: session.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.r - a.r);

    // Market Hours Tag Performance
    const marketHoursPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      if (trade.marketHoursTag) {
        const existing = marketHoursPerf.get(trade.marketHoursTag) || { pnl: 0, r: 0, count: 0, wins: 0 };
        existing.pnl += trade.resultUsd;
        existing.r += trade.resultR;
        existing.count++;
        if (trade.outcome === Outcome.WIN) existing.wins++;
        marketHoursPerf.set(trade.marketHoursTag, existing);
      }
    });
    const marketHoursData = Array.from(marketHoursPerf.entries())
      .map(([hours, data]) => ({
        hours: hours.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.r - a.r);

    // Asset Class Performance
    const assetClassPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      const assetClass = trade.assetClass || 'Unknown';
      const existing = assetClassPerf.get(assetClass) || { pnl: 0, r: 0, count: 0, wins: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      assetClassPerf.set(assetClass, existing);
    });
    const assetClassData = Array.from(assetClassPerf.entries())
      .map(([assetClass, data]) => ({
        assetClass,
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.r - a.r);

    // Instrument Performance (top 10)
    const instrumentPerf = new Map<string, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      // Get instrument name based on asset class
      let instrument = 'Unknown';
      if (trade.assetClass === 'FUTURES' && 'instrumentRoot' in trade) {
        instrument = (trade as any).instrumentRoot || 'Unknown';
      } else if (trade.assetClass === 'OPTIONS' && 'underlying' in trade) {
        instrument = (trade as any).underlying || 'Unknown';
      }
      const existing = instrumentPerf.get(instrument) || { pnl: 0, r: 0, count: 0, wins: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      instrumentPerf.set(instrument, existing);
    });
    const instrumentData = Array.from(instrumentPerf.entries())
      .map(([instrument, data]) => ({
        instrument,
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
        avgR: Number((data.r / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Mistake Analysis
    const mistakePerf = new Map<string, { pnl: number; r: number; count: number }>();
    let tradesWithMistakes = 0;
    let tradesWithoutMistakes = 0;
    let pnlWithMistakes = 0;
    let pnlWithoutMistakes = 0;
    
    sortedTrades.forEach(trade => {
      if (trade.mistakes && trade.mistakes.length > 0) {
        tradesWithMistakes++;
        pnlWithMistakes += trade.resultR;
        trade.mistakes.forEach(mistake => {
          const existing = mistakePerf.get(mistake) || { pnl: 0, r: 0, count: 0 };
          existing.pnl += trade.resultUsd;
          existing.r += trade.resultR;
          existing.count++;
          mistakePerf.set(mistake, existing);
        });
      } else {
        tradesWithoutMistakes++;
        pnlWithoutMistakes += trade.resultR;
      }
    });
    const mistakeData = Array.from(mistakePerf.entries())
      .map(([mistake, data]) => ({
        mistake: mistake.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        avgR: Number((data.r / data.count).toFixed(2)),
      }))
      .sort((a, b) => a.r - b.r); // Sort by worst impact first

    // Statistical Analysis
    const rValues = sortedTrades.map(t => t.resultR);
    const mean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
    const variance = rValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe Ratio (assuming risk-free rate of 0)
    const sharpeRatio = stdDev > 0 ? mean / stdDev : 0;
    
    // Sortino Ratio (only downside deviation)
    const negativeReturns = rValues.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0 
      ? negativeReturns.reduce((sum, val) => sum + Math.pow(val, 2), 0) / negativeReturns.length 
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? mean / downsideDeviation : 0;

    // Skewness (positive = more large wins, negative = more large losses)
    const skewness = stdDev > 0 
      ? (rValues.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / rValues.length)
      : 0;

    // Recovery Factor
    const totalProfit = sortedTrades.reduce((sum, t) => sum + t.resultUsd, 0);
    const maxDD = Math.abs(metrics.maxDrawdownUsd);
    const recoveryFactor = maxDD > 0 ? totalProfit / maxDD : 0;

    // Trade Duration Analysis (if available)
    const tradeDurations: number[] = [];
    sortedTrades.forEach(trade => {
      if (trade.entryTime && trade.exitTime) {
        const entryDate = new Date(trade.entryTime);
        const exitDate = new Date(trade.exitTime);
        const durationMins = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60);
        if (durationMins > 0 && durationMins < 1440) { // Less than 24 hours
          tradeDurations.push(durationMins);
        }
      }
    });
    const avgTradeDuration = tradeDurations.length > 0 
      ? tradeDurations.reduce((a, b) => a + b, 0) / tradeDurations.length 
      : 0;

    // Rolling 7-day Performance
    const rolling7DayData: { date: string; pnl: number; r: number }[] = [];
    if (sortedTrades.length >= 7) {
      for (let i = 6; i < sortedTrades.length; i++) {
        const windowTrades = sortedTrades.slice(i - 6, i + 1);
        const windowPnl = windowTrades.reduce((sum, t) => sum + t.resultUsd, 0);
        const windowR = windowTrades.reduce((sum, t) => sum + t.resultR, 0);
        rolling7DayData.push({
          date: format(parseISO(sortedTrades[i].tradeDate), 'MMM dd'),
          pnl: Number(windowPnl.toFixed(2)),
          r: Number(windowR.toFixed(2)),
        });
      }
    }

    // Calendar Heatmap Data
    const calendarData = new Map<string, { pnl: number; r: number; count: number }>();
    sortedTrades.forEach(trade => {
      const dateKey = format(parseISO(trade.tradeDate), 'yyyy-MM-dd');
      const existing = calendarData.get(dateKey) || { pnl: 0, r: 0, count: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.count++;
      calendarData.set(dateKey, existing);
    });
    const calendarHeatmapData = Array.from(calendarData.entries())
      .map(([date, data]) => ({
        date,
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      maxWinStreak,
      maxLossStreak,
      avgConsecutiveWins: Number(avgConsecutiveWins.toFixed(1)),
      avgConsecutiveLosses: Number(avgConsecutiveLosses.toFixed(1)),
      streakHistory,
      monthlyData,
      hourlyData,
      drawdownData,
      winRateOverTime,
      equityCurveData,
      dayOfWeekData,
      weekOfMonthData,
      quarterData,
      setupTagData,
      sessionData,
      marketHoursData,
      assetClassData,
      instrumentData,
      mistakeData,
      tradesWithMistakes,
      tradesWithoutMistakes,
      pnlWithMistakes: Number(pnlWithMistakes.toFixed(2)),
      pnlWithoutMistakes: Number(pnlWithoutMistakes.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      skewness: Number(skewness.toFixed(2)),
      recoveryFactor: Number(recoveryFactor.toFixed(2)),
      avgTradeDuration: Number(avgTradeDuration.toFixed(0)),
      rolling7DayData,
      calendarHeatmapData,
      totalWins: filteredTrades.filter(t => t.outcome === Outcome.WIN).length,
      totalLosses: filteredTrades.filter(t => t.outcome === Outcome.LOSS).length,
      biggestWin: Math.max(...filteredTrades.map(t => t.resultUsd)),
      biggestLoss: Math.min(...filteredTrades.map(t => t.resultUsd)),
    };
  }, [filteredTrades]);

  // R-Multiple Distribution Data
  const rMultipleData = [
    { range: '-3R+', count: filteredTrades.filter(t => t.resultR < -3).length, color: '#E57373' },
    { range: '-2R to -3R', count: filteredTrades.filter(t => t.resultR >= -3 && t.resultR < -2).length, color: '#E57373' },
    { range: '-1R to -2R', count: filteredTrades.filter(t => t.resultR >= -2 && t.resultR < -1).length, color: '#E57373' },
    { range: '-0R to -1R', count: filteredTrades.filter(t => t.resultR >= -1 && t.resultR < 0).length, color: '#E57373' },
    { range: '0R to 1R', count: filteredTrades.filter(t => t.resultR >= 0 && t.resultR < 1).length, color: '#0D9488' },
    { range: '1R to 2R', count: filteredTrades.filter(t => t.resultR >= 1 && t.resultR < 2).length, color: '#0D9488' },
    { range: '2R to 3R', count: filteredTrades.filter(t => t.resultR >= 2 && t.resultR < 3).length, color: '#0D9488' },
    { range: '3R+', count: filteredTrades.filter(t => t.resultR >= 3).length, color: '#0D9488' },
  ];

  // Get selected strategy data
  // Combine local + Supabase strategies for the strategies tab
  const allStrategies = useMemo(() => [
    ...userStrategies.map((s) => ({
      strategy: s,
      type: 'local' as const,
      trades: trades.filter((t) => t.strategyId === s.id),
      metrics: calculateAllMetrics(trades.filter((t) => t.strategyId === s.id)),
    })),
    ...supabaseStrategies.map((s) => ({
      strategy: {
        id: s.id,
        name: s.title,
        description: s.summary,
        createdAt: new Date(s.created_at).getTime(),
      } as Strategy,
      type: 'supabase' as const,
      tradeCount: s.trade_count ?? 0,
      trades: [] as Trade[],
      metrics: {
        totalPnLUsd: s.total_pnl_usd ?? 0,
        totalPnLR: s.total_pnl_r ?? 0,
        winRate: s.win_rate ?? 0,
        expectancy: s.expectancy ?? 0,
        profitFactor: s.profit_factor ?? 0,
        avgWinR: 0,
        avgLossR: 0,
        maxDrawdownUsd: 0,
        maxDrawdownR: 0,
      },
    })),
  ], [userStrategies, supabaseStrategies, trades]);

  const selectedStrategyEntry = selectedStrategyId
    ? allStrategies.find((s) => s.strategy.id === selectedStrategyId)
    : null;

  const selectedStrategy = selectedStrategyEntry?.strategy ?? null;
  
  const selectedStrategyTrades = selectedStrategyEntry?.trades ?? [];
  
  const selectedStrategyMetrics = selectedStrategyEntry?.metrics ?? null;

  const selectedStrategyVersions = selectedStrategy
    ? versions.filter(v => v.strategyId === selectedStrategy.id)
    : [];

  // Analytics Tab Content
  const analyticsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      {/* Filters */}
      <div className="flex items-center flex-wrap animate-slide-in-up" style={{ gap: 'var(--space-lg)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
          <span className="theme-text-secondary text-body-sm font-medium">Time Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="theme-bg-secondary border theme-text focus:outline-none focus:ring-2"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-body-sm)',
              fontWeight: 'var(--font-weight-medium)',
              borderColor: 'var(--theme-border)',
              transitionDuration: 'var(--transition-base)',
            }}
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 180 Days</option>
          </select>
        </div>

        <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
          <span className="theme-text-secondary text-body-sm font-medium">Show EDGE Stats:</span>
          <button
            role="switch" aria-label="Show EDGE Stats" aria-checked={showEdgeStats}
            onClick={() => setShowEdgeStats(!showEdgeStats)}
            className="relative inline-flex items-center transition-all focus:outline-none focus:ring-2 active:scale-95"
            style={{
              height: '24px',
              width: '44px',
              borderRadius: 'var(--radius-full)',
              background: showEdgeStats ? 'var(--theme-primary)' : 'var(--theme-border-secondary)',
              transitionDuration: 'var(--transition-base)',
            }}
          >
            <span
              className="inline-block transform rounded-full bg-white transition-transform"
              style={{
                height: '16px',
                width: '16px',
                transform: showEdgeStats ? 'translateX(24px)' : 'translateX(4px)',
                transitionDuration: 'var(--transition-base)',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        <MetricCard
          label="Total P&L"
          value={`$${metrics.totalPnLUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`${metrics.totalPnLR.toFixed(2)}R total`}
          positive={metrics.totalPnLUsd >= 0}
          showInfo={true}
          metricId="totalPnLUsd"
        />
        <MetricCard
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          subtitle={`${winningTrades}W / ${losingTrades}L`}
          positive={metrics.winRate >= 50}
          showInfo={true}
          metricId="winRate"
        />
        <MetricCard
          label="Expectancy"
          value={`${metrics.expectancy.toFixed(2)}R`}
          subtitle="Per trade average"
          positive={metrics.expectancy > 0}
          showInfo={true}
          metricId="expectancy"
        />
        <MetricCard
          label="Profit Factor"
          value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          subtitle="Wins vs losses ratio"
          positive={metrics.profitFactor > 1}
          showInfo={true}
          metricId="profitFactor"
        />
        <MetricCard
          label="Avg Win"
          value={`${metrics.avgWinR.toFixed(2)}R`}
          subtitle="Average winning trade"
          positive={true}
          showInfo={true}
          metricId="avgWinR"
        />
        <MetricCard
          label="Avg Loss"
          value={`${metrics.avgLossR.toFixed(2)}R`}
          subtitle="Average losing trade"
          positive={false}
          showInfo={true}
          metricId="avgLossR"
        />
        <MetricCard
          label="Max Drawdown"
          value={`$${metrics.maxDrawdownUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`${metrics.maxDrawdownR.toFixed(2)}R`}
          positive={false}
          showInfo={true}
          metricId="maxDrawdownUsd"
        />
        <MetricCard
          label="Consistency"
          value={`${metrics.consistencyScore.toFixed(0)}%`}
          subtitle="Trade consistency score"
          positive={metrics.consistencyScore >= 50}
          showInfo={true}
          metricId="consistencyScore"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))' }}>
        {/* R-Multiple Distribution */}
        <div className="card-premium min-w-0 hover-lift">
          <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
            R-Multiple Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rMultipleData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} strokeOpacity={0.5} />
              <XAxis
                dataKey="range"
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick, fontSize: 11 }}
              />
              <YAxis
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick, fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {rMultipleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Equity Curve */}
        {advancedStats && advancedStats.equityCurveData.length > 0 && (
          <div className="card-premium min-w-0 hover-lift">
            <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
              Equity Curve
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={advancedStats.equityCurveData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={advancedStats.equityCurveData[advancedStats.equityCurveData.length - 1]?.equityUsd >= 0 ? '#0D9488' : '#E57373'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={advancedStats.equityCurveData[advancedStats.equityCurveData.length - 1]?.equityUsd >= 0 ? '#0D9488' : '#E57373'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="trade" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                <YAxis 
                  stroke={chartColors.axis} 
                  tick={{ fill: chartColors.tick, fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Equity']}
                  labelFormatter={(label) => `Trade #${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="equityUsd" 
                  stroke={advancedStats.equityCurveData[advancedStats.equityCurveData.length - 1]?.equityUsd >= 0 ? '#0D9488' : '#E57373'}
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Day of Week Performance */}
        {advancedStats && advancedStats.dayOfWeekData.length > 0 && (
          <div className="card-premium min-w-0 hover-lift">
            <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>
              Day of Week Performance
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={advancedStats.dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="day" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                <YAxis 
                  stroke={chartColors.axis} 
                  tick={{ fill: chartColors.tick, fontSize: 11 }}
                  tickFormatter={(v) => `${v}R`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'r') return [`${value.toFixed(2)}R`, 'Total R'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {advancedStats.dayOfWeekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.r >= 0 ? '#0D9488' : '#E57373'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Advanced Statistics Section */}
      {advancedStats && (
        <>
          {/* Key Statistics Cards */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Advanced Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Max Win Streak</div>
                <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>{advancedStats.maxWinStreak}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Max Loss Streak</div>
                <div className="text-2xl font-bold" style={{ color: '#E57373' }}>{advancedStats.maxLossStreak}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Avg Win Streak</div>
                <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>{advancedStats.avgConsecutiveWins}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Avg Loss Streak</div>
                <div className="text-2xl font-bold" style={{ color: '#E57373' }}>{advancedStats.avgConsecutiveLosses}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Biggest Win</div>
                <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>${advancedStats.biggestWin.toFixed(0)}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Biggest Loss</div>
                <div className="text-2xl font-bold" style={{ color: '#E57373' }}>${advancedStats.biggestLoss.toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* More Charts Grid */}
          <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', marginTop: 'var(--space-xl)' }}>
            {/* Monthly Performance Chart */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Monthly Performance</h2>
              {advancedStats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={advancedStats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="month" 
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'pnl') return [`$${value.toFixed(2)}`, 'P&L'];
                        if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {advancedStats.monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#0D9488' : '#E57373'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate" stroke="#0D9488" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Hourly Performance Chart */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Performance by Hour</h2>
              {advancedStats.hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={advancedStats.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="hour" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 10 }} />
                    <YAxis 
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      tickFormatter={(v) => `${v}R`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(2)}R`, 'Total R']}
                      labelFormatter={(label) => `Entry Hour: ${label}`}
                    />
                    <Bar dataKey="r" name="Total R" radius={[4, 4, 0, 0]}>
                      {advancedStats.hourlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.r >= 0 ? '#0D9488' : '#E57373'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Drawdown Analysis Chart */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Drawdown Analysis</h2>
              {advancedStats.drawdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={advancedStats.drawdownData}>
                    <defs>
                      <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E57373" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#E57373" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="trade" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                    <YAxis 
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Drawdown']}
                      labelFormatter={(label) => `Trade #${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#E57373" 
                      fill="url(#drawdownGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Win/Loss Streak History */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Win/Loss Streak History</h2>
              {advancedStats.streakHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={advancedStats.streakHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="trade" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                    <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const absVal = Math.abs(value);
                        if (name === 'winStreak' && value > 0) return [`${absVal} wins`, 'Win Streak'];
                        if (name === 'lossStreak' && value < 0) return [`${absVal} losses`, 'Loss Streak'];
                        return [0, name];
                      }}
                      labelFormatter={(label) => `Trade #${label}`}
                    />
                    <ReferenceLine y={0} stroke={chartColors.axis} />
                    <Bar dataKey="winStreak" stackId="stack" fill="#0D9488" name="Win Streak" />
                    <Bar dataKey="lossStreak" stackId="stack" fill="#E57373" name="Loss Streak" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Cumulative Win Rate */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Cumulative Win Rate</h2>
              {advancedStats.winRateOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={advancedStats.winRateOverTime}>
                    <defs>
                      <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="trade" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                    <YAxis 
                      stroke={chartColors.axis} 
                      tick={{ fill: chartColors.tick, fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                      labelFormatter={(label) => `After ${label} trades`}
                    />
                    <ReferenceLine y={50} stroke={chartColors.axis} strokeDasharray="5 5" />
                    <Area 
                      type="monotone" 
                      dataKey="winRate" 
                      stroke="#0D9488" 
                      fill="url(#winRateGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Win/Loss Distribution Pie Chart */}
            <div className="card-premium min-w-0 hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Win/Loss Distribution</h2>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Wins', value: advancedStats.totalWins, fill: '#0D9488' },
                        { name: 'Losses', value: advancedStats.totalLosses, fill: '#E57373' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0D9488' }}></div>
                  <span className="text-sm theme-text">{advancedStats.totalWins} Wins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E57373' }}></div>
                  <span className="text-sm theme-text">{advancedStats.totalLosses} Losses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk-Adjusted Metrics */}
          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Risk-Adjusted Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Sharpe Ratio</div>
                <div className="text-2xl font-bold" style={{ color: advancedStats.sharpeRatio >= 1 ? '#0D9488' : advancedStats.sharpeRatio >= 0 ? '#C9A962' : '#E57373' }}>
                  {advancedStats.sharpeRatio}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">Risk-adjusted return</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Sortino Ratio</div>
                <div className="text-2xl font-bold" style={{ color: advancedStats.sortinoRatio >= 1.5 ? '#0D9488' : advancedStats.sortinoRatio >= 0 ? '#C9A962' : '#E57373' }}>
                  {advancedStats.sortinoRatio}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">Downside-adjusted</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Recovery Factor</div>
                <div className="text-2xl font-bold" style={{ color: advancedStats.recoveryFactor >= 2 ? '#0D9488' : advancedStats.recoveryFactor >= 1 ? '#C9A962' : '#E57373' }}>
                  {advancedStats.recoveryFactor}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">Profit / Max DD</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Std Deviation</div>
                <div className="text-2xl font-bold theme-text">{advancedStats.stdDev}R</div>
                <div className="text-xs theme-text-tertiary mt-1">Return volatility</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Skewness</div>
                <div className="text-2xl font-bold" style={{ color: advancedStats.skewness > 0 ? '#0D9488' : '#E57373' }}>
                  {advancedStats.skewness}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">{advancedStats.skewness > 0 ? 'More big wins' : 'More big losses'}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Avg Duration</div>
                <div className="text-2xl font-bold theme-text">
                  {advancedStats.avgTradeDuration > 60 
                    ? `${Math.floor(advancedStats.avgTradeDuration / 60)}h ${advancedStats.avgTradeDuration % 60}m`
                    : `${advancedStats.avgTradeDuration}m`
                  }
                </div>
                <div className="text-xs theme-text-tertiary mt-1">Per trade</div>
              </div>
            </div>
          </div>

          {/* Time-Based Analysis */}
          <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', marginTop: 'var(--space-2xl)' }}>
            {/* Week of Month Performance */}
            {advancedStats.weekOfMonthData.length > 0 && (
              <div className="card-premium min-w-0 hover-lift">
                <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Week of Month Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={advancedStats.weekOfMonthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="week" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}R`} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'r') return [`${value.toFixed(2)}R`, 'Total R'];
                        if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="r" name="Total R" radius={[4, 4, 0, 0]}>
                      {advancedStats.weekOfMonthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.r >= 0 ? '#0D9488' : '#E57373'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate" stroke="#C9A962" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quarter Performance */}
            {advancedStats.quarterData.length > 0 && (
              <div className="card-premium min-w-0 hover-lift">
                <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Quarterly Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={advancedStats.quarterData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="quarter" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'pnl') return [`$${value.toFixed(2)}`, 'P&L'];
                        if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {advancedStats.quarterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#0D9488' : '#E57373'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate" stroke="#C9A962" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rolling 7-Day Performance */}
            {advancedStats.rolling7DayData.length > 0 && (
              <div className="card-premium min-w-0 hover-lift">
                <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Rolling 7-Trade Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={advancedStats.rolling7DayData}>
                    <defs>
                      <linearGradient id="rollingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 10 }} />
                    <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}R`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(2)}R`, 'Rolling 7-Trade P&L']}
                    />
                    <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="r" stroke="#0D9488" fill="url(#rollingGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Setup & Session Analysis */}
          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Setup & Session Analysis</h2>
            <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))' }}>
              {/* Setup Tag Performance */}
              {advancedStats.setupTagData.length > 0 && (
                <div className="card-premium min-w-0 hover-lift">
                  <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Setup Tag Performance</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b theme-border">
                          <th className="text-left py-2 px-3 theme-text-secondary">Setup</th>
                          <th className="text-right py-2 px-3 theme-text-secondary">Trades</th>
                          <th className="text-right py-2 px-3 theme-text-secondary">Win Rate</th>
                          <th className="text-right py-2 px-3 theme-text-secondary">Avg R</th>
                          <th className="text-right py-2 px-3 theme-text-secondary">Total R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedStats.setupTagData.slice(0, 8).map((item, idx) => (
                          <tr key={idx} className="border-b theme-border">
                            <td className="py-2 px-3 theme-text font-medium">{item.tag}</td>
                            <td className="py-2 px-3 text-right theme-text-secondary">{item.count}</td>
                            <td className="py-2 px-3 text-right" style={{ color: item.winRate >= 50 ? '#0D9488' : '#E57373' }}>{item.winRate}%</td>
                            <td className="py-2 px-3 text-right" style={{ color: item.avgR >= 0 ? '#0D9488' : '#E57373' }}>{item.avgR}R</td>
                            <td className="py-2 px-3 text-right font-semibold" style={{ color: item.r >= 0 ? '#0D9488' : '#E57373' }}>{item.r}R</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Session Performance */}
              {advancedStats.sessionData.length > 0 && (
                <div className="card-premium min-w-0 hover-lift">
                  <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Session Performance</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={advancedStats.sessionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}R`} />
                      <YAxis type="category" dataKey="session" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)}R`, 'Total R']}
                      />
                      <Bar dataKey="r" radius={[0, 4, 4, 0]}>
                        {advancedStats.sessionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.r >= 0 ? '#0D9488' : '#E57373'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Market Hours Performance */}
              {advancedStats.marketHoursData.length > 0 && (
                <div className="card-premium min-w-0 hover-lift">
                  <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Market Hours Performance</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={advancedStats.marketHoursData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 11 }} tickFormatter={(v) => `${v}R`} />
                      <YAxis type="category" dataKey="hours" stroke={chartColors.axis} tick={{ fill: chartColors.tick, fontSize: 10 }} width={120} />
                      <Tooltip
                        contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(2)}R`, 'Total R']}
                      />
                      <Bar dataKey="r" radius={[0, 4, 4, 0]}>
                        {advancedStats.marketHoursData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.r >= 0 ? '#0D9488' : '#E57373'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Asset Class Performance */}
              {advancedStats.assetClassData.length > 0 && (
                <div className="card-premium min-w-0 hover-lift">
                  <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Asset Class Performance</h2>
                  <div className="space-y-4">
                    {advancedStats.assetClassData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 theme-bg-tertiary rounded-xl">
                        <div>
                          <div className="font-semibold theme-text">{item.assetClass}</div>
                          <div className="text-sm theme-text-secondary">{item.count} trades • {item.winRate}% win rate</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold" style={{ color: item.r >= 0 ? '#0D9488' : '#E57373' }}>
                            {item.r >= 0 ? '+' : ''}{item.r}R
                          </div>
                          <div className="text-sm" style={{ color: item.pnl >= 0 ? '#0D9488' : '#E57373' }}>
                            ${item.pnl.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instrument Analysis */}
          {advancedStats.instrumentData.length > 0 && (
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Instrument Breakdown</h2>
              <div className="card-premium">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b theme-border">
                        <th className="text-left py-3 px-4 theme-text-secondary font-semibold">Instrument</th>
                        <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Trades</th>
                        <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Win Rate</th>
                        <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Avg R</th>
                        <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Total R</th>
                        <th className="text-right py-3 px-4 theme-text-secondary font-semibold">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancedStats.instrumentData.map((item, idx) => (
                        <tr key={idx} className="border-b theme-border hover:theme-bg-tertiary transition-colors">
                          <td className="py-3 px-4 theme-text font-semibold">{item.instrument}</td>
                          <td className="py-3 px-4 text-right theme-text-secondary">{item.count}</td>
                          <td className="py-3 px-4 text-right" style={{ color: item.winRate >= 50 ? '#0D9488' : '#E57373' }}>{item.winRate}%</td>
                          <td className="py-3 px-4 text-right" style={{ color: item.avgR >= 0 ? '#0D9488' : '#E57373' }}>{item.avgR}R</td>
                          <td className="py-3 px-4 text-right font-semibold" style={{ color: item.r >= 0 ? '#0D9488' : '#E57373' }}>{item.r >= 0 ? '+' : ''}{item.r}R</td>
                          <td className="py-3 px-4 text-right font-semibold" style={{ color: item.pnl >= 0 ? '#0D9488' : '#E57373' }}>${item.pnl.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Mistake Analysis */}
          {(advancedStats.mistakeData.length > 0 || advancedStats.tradesWithMistakes > 0) && (
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Mistake Analysis</h2>
              
              {/* Mistake Impact Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card-premium text-center">
                  <div className="text-caption theme-text-secondary mb-2">Trades with Mistakes</div>
                  <div className="text-2xl font-bold" style={{ color: '#E57373' }}>{advancedStats.tradesWithMistakes}</div>
                  <div className="text-sm theme-text-tertiary mt-1">
                    {filteredTrades.length > 0 ? ((advancedStats.tradesWithMistakes / filteredTrades.length) * 100).toFixed(1) : 0}% of trades
                  </div>
                </div>
                <div className="card-premium text-center">
                  <div className="text-caption theme-text-secondary mb-2">Trades without Mistakes</div>
                  <div className="text-2xl font-bold" style={{ color: '#0D9488' }}>{advancedStats.tradesWithoutMistakes}</div>
                  <div className="text-sm theme-text-tertiary mt-1">
                    {filteredTrades.length > 0 ? ((advancedStats.tradesWithoutMistakes / filteredTrades.length) * 100).toFixed(1) : 0}% of trades
                  </div>
                </div>
                <div className="card-premium text-center">
                  <div className="text-caption theme-text-secondary mb-2">Mistake Cost</div>
                  <div className="text-2xl font-bold" style={{ color: advancedStats.pnlWithMistakes < advancedStats.pnlWithoutMistakes ? '#E57373' : '#0D9488' }}>
                    {advancedStats.pnlWithMistakes}R
                  </div>
                  <div className="text-sm theme-text-tertiary mt-1">
                    vs {advancedStats.pnlWithoutMistakes}R without
                  </div>
                </div>
              </div>

              {/* Mistake Breakdown Table */}
              {advancedStats.mistakeData.length > 0 && (
                <div className="card-premium">
                  <h3 className="theme-text text-h3 mb-4">Mistake Impact Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b theme-border">
                          <th className="text-left py-3 px-4 theme-text-secondary font-semibold">Mistake Type</th>
                          <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Occurrences</th>
                          <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Avg Impact</th>
                          <th className="text-right py-3 px-4 theme-text-secondary font-semibold">Total Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedStats.mistakeData.map((item, idx) => (
                          <tr key={idx} className="border-b theme-border hover:theme-bg-tertiary transition-colors">
                            <td className="py-3 px-4 theme-text font-medium">{item.mistake}</td>
                            <td className="py-3 px-4 text-right theme-text-secondary">{item.count}</td>
                            <td className="py-3 px-4 text-right" style={{ color: item.avgR >= 0 ? '#0D9488' : '#E57373' }}>{item.avgR}R</td>
                            <td className="py-3 px-4 text-right font-semibold" style={{ color: item.r >= 0 ? '#0D9488' : '#E57373' }}>{item.r}R</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calendar Heatmap */}
          {advancedStats.calendarHeatmapData.length > 0 && (
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Trading Calendar</h2>
              <div className="card-premium">
                <div className="flex flex-wrap gap-1" style={{ maxWidth: '100%' }}>
                  {advancedStats.calendarHeatmapData.slice(-90).map((day, idx) => {
                    const intensity = Math.min(Math.abs(day.r) / 3, 1); // Normalize to max 3R
                    const color = day.r >= 0 
                      ? `rgba(13, 148, 136, ${0.2 + intensity * 0.8})` 
                      : `rgba(229, 115, 115, ${0.2 + intensity * 0.8})`;
                    return (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125"
                        style={{ backgroundColor: color }}
                        title={`${day.date}: ${day.r >= 0 ? '+' : ''}${day.r}R (${day.count} trades)`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs theme-text-secondary">
                  <span>Last 90 trading days</span>
                  <div className="flex items-center gap-2">
                    <span>Loss</span>
                    <div className="flex gap-0.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(229, 115, 115, 0.2)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(229, 115, 115, 0.5)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(229, 115, 115, 0.8)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(229, 115, 115, 1)' }} />
                    </div>
                    <span className="mx-2">|</span>
                    <div className="flex gap-0.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(13, 148, 136, 0.2)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(13, 148, 136, 0.5)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(13, 148, 136, 0.8)' }} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(13, 148, 136, 1)' }} />
                    </div>
                    <span>Win</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Strategies Tab Content
  const strategiesContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="theme-text-secondary text-body">
          Manage and track your trading strategies
        </p>
        <Link
          href="/strategies"
          className="px-5 py-2.5 rounded-xl font-semibold theme-text transition-all duration-200 hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          + New Strategy
        </Link>
      </div>

      {allStrategies.length === 0 ? (
        <div className="text-center rounded-2xl" style={{
          padding: 'var(--space-4xl)',
          background: 'var(--theme-bg-secondary)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
          <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-sm)' }}>
            No Strategies Yet
          </h3>
          <p className="theme-text-secondary text-body" style={{ marginBottom: 'var(--space-xl)' }}>
            Create your first trading strategy to start tracking performance
          </p>
          <Link
            href="/strategies"
            className="inline-block px-6 py-3 rounded-xl font-semibold theme-text transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            Create Strategy
          </Link>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))' }}>
          {allStrategies.map((entry) => {
            const { strategy, type, trades: strategyTrades, metrics: strategyMetrics } = entry;

            return (
              <button
                type="button"
                key={`${type}-${strategy.id}`}
                onClick={() => {
                  setSelectedStrategyId(strategy.id);
                  setSelectedStrategyType(type);
                }}
                className="text-left cursor-pointer rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  padding: 'var(--space-xl)',
                  background: 'var(--theme-bg-secondary)',
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <div className="flex items-center gap-2">
                    <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-xs)' }}>
                      {strategy.name}
                    </h3>
                    {type === 'supabase' && (
                      <span className="text-xs px-2 py-0.5 rounded-full theme-text-secondary" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>Cloud</span>
                    )}
                  </div>
                  {strategy.description && (
                    <p className="theme-text-secondary text-body-sm line-clamp-2">
                      {strategy.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                  <div>
                    <div className="theme-text-tertiary text-caption">Trades</div>
                    <div className="theme-text text-body-lg font-bold">{type === 'supabase' ? ('tradeCount' in entry ? (entry as any).tradeCount : 0) : strategyTrades.length}</div>
                  </div>
                  <div>
                    <div className="theme-text-tertiary text-caption">Win Rate</div>
                    <div
                      className="text-body-lg font-bold"
                      style={{ color: strategyMetrics.winRate >= 50 ? '#0D9488' : '#E57373' }}
                    >
                      {strategyMetrics.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="theme-text-tertiary text-caption">Total P&L</div>
                    <div
                      className="text-body-lg font-bold"
                      style={{ color: strategyMetrics.totalPnLR >= 0 ? '#0D9488' : '#E57373' }}
                    >
                      {strategyMetrics.totalPnLR >= 0 ? '+' : ''}
                      {strategyMetrics.totalPnLR.toFixed(1)}R
                    </div>
                  </div>
                  <div>
                    <div className="theme-text-tertiary text-caption">Expectancy</div>
                    <div
                      className="text-body-lg font-bold"
                      style={{ color: strategyMetrics.expectancy > 0 ? '#0D9488' : '#E57373' }}
                    >
                      {strategyMetrics.expectancy.toFixed(2)}R
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Strategy Detail Modal */}
      {mounted && selectedStrategy && selectedStrategyMetrics && (
        <ModalDialog isOpen onClose={() => { setSelectedStrategyId(null); setSelectedStrategyType(null); }} labelledBy="strategy-detail-title" className="items-center justify-center">
          <div
            className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--theme-bg-secondary)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 p-6 flex items-center justify-between z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div>
                <h2 id="strategy-detail-title" className="text-2xl font-bold theme-text">{selectedStrategy.name}</h2>
                {selectedStrategy.description && (
                  <p className="theme-text-secondary text-sm mt-1">{selectedStrategy.description}</p>
                )}
              </div>
              <button
                onClick={() => { setSelectedStrategyId(null); setSelectedStrategyType(null); }}
                aria-label="Close strategy details" className="p-2 rounded-xl hover:opacity-80 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <XMarkIcon className="h-6 w-6 theme-text" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total PnL', value: `${selectedStrategyMetrics.totalPnLUsd >= 0 ? '+' : ''}$${selectedStrategyMetrics.totalPnLUsd.toFixed(2)}`, sub: `${selectedStrategyMetrics.totalPnLR.toFixed(1)}R`, color: selectedStrategyMetrics.totalPnLUsd >= 0 ? 'text-positive' : 'text-negative' },
                  { label: 'Win Rate', value: `${selectedStrategyMetrics.winRate.toFixed(1)}%`, sub: `${selectedStrategyTrades.length} trades`, color: selectedStrategyMetrics.winRate >= 50 ? 'text-positive' : 'text-warning' },
                  { label: 'Expectancy', value: `${selectedStrategyMetrics.expectancy >= 0 ? '+' : ''}${selectedStrategyMetrics.expectancy.toFixed(2)}R`, sub: 'Avg per trade', color: selectedStrategyMetrics.expectancy >= 0 ? 'text-positive' : 'text-negative' },
                  { label: 'Profit Factor', value: selectedStrategyMetrics.profitFactor === Infinity ? '∞' : selectedStrategyMetrics.profitFactor.toFixed(2), sub: 'Gross P / Gross L', color: selectedStrategyMetrics.profitFactor >= 1 ? 'text-positive' : 'text-negative' },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                    <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                    <div className="text-xs theme-text-tertiary mt-1">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Avg Win', value: `${selectedStrategyMetrics.avgWinR.toFixed(2)}R`, color: 'text-positive' },
                  { label: 'Avg Loss', value: `${selectedStrategyMetrics.avgLossR.toFixed(2)}R`, color: 'text-negative' },
                  { label: 'Max Drawdown', value: `$${selectedStrategyMetrics.maxDrawdownUsd.toFixed(2)}`, color: 'text-negative' },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                    <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Strategy Versions */}
              {selectedStrategyVersions.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Strategy Versions</h3>
                  <div className="space-y-3">
                    {selectedStrategyVersions.map((version) => (
                      <div key={version.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold theme-text">{version.version}</span>
                          <span className="text-xs theme-text-tertiary">
                            {new Date(version.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {version.definition && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold theme-text-secondary mb-1">Definition</div>
                            <p className="text-sm theme-text whitespace-pre-wrap">{version.definition}</p>
                          </div>
                        )}
                        {version.triggers && (
                          <div>
                            <div className="text-xs font-semibold theme-text-secondary mb-1">Triggers</div>
                            <p className="text-sm theme-text whitespace-pre-wrap">{version.triggers}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Trades */}
              {selectedStrategyTrades.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Recent Trades</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b theme-border">
                          <th className="text-left py-2 px-3 theme-text-secondary font-semibold">Date</th>
                          <th className="text-left py-2 px-3 theme-text-secondary font-semibold">Outcome</th>
                          <th className="text-right py-2 px-3 theme-text-secondary font-semibold">Result (R)</th>
                          <th className="text-right py-2 px-3 theme-text-secondary font-semibold">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStrategyTrades.slice(0, 10).map((trade) => (
                          <tr key={trade.id} className="border-b theme-border hover:theme-bg-tertiary transition-colors">
                            <td className="py-2 px-3 theme-text">{parseISO(trade.tradeDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                trade.outcome === Outcome.WIN 
                                  ? 'bg-positive/20 text-positive' 
                                  : 'bg-negative/20 text-negative'
                              }`}>
                                {trade.outcome}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${trade.resultR >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${trade.resultUsd >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedStrategyTrades.length > 10 && (
                      <p className="text-center text-sm theme-text-secondary mt-3">
                        Showing 10 of {selectedStrategyTrades.length} trades
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t theme-border">
                <Link 
                  href="/strategies"
                  className="flex-1 px-5 py-3 rounded-xl font-semibold text-center theme-text transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  Manage Strategies
                </Link>
                <button
                  onClick={() => { setSelectedStrategyId(null); setSelectedStrategyType(null); }}
                  className="px-5 py-3 rounded-xl font-semibold theme-text transition-all hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );

  if (isLoading) return <p role="status" className="theme-text-secondary py-12">Loading performance…</p>;
  return <PerformanceHubTabs analyticsContent={analyticsContent} strategiesContent={strategiesContent} />;
}
