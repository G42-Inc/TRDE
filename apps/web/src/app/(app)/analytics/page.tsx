'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calculateAllMetrics, METRIC_EXPLAINERS } from '@trde/core';
import type { Trade } from '@trde/core';
import { MetricCard } from '@/components/MetricCard';
import { AnimatedMetricValue } from '@/components/AnimatedMetricValue';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, AreaChart, Area, PieChart, Pie, ComposedChart, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Outcome } from '@trde/core';
import Link from 'next/link';
import { InformationCircleIcon, ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, parseISO, subDays } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface MetricChartData {
  date: string;
  value: number;
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const { trades, isLoading } = useAppData();
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180'>('all');
  const [showChartFor, setShowChartFor] = useState<Record<string, boolean>>({});
  const [selectedChart, setSelectedChart] = useState<'rollingExpectancy' | 'winRate' | 'profitFactor' | 'avgWinR' | 'avgLossR' | 'consistencyScore' | 'rDistribution' | 'dayOfWeek'>('rollingExpectancy');
  const [equityView, setEquityView] = useState<'R' | 'USD'>('R');
  const [xAxisView, setXAxisView] = useState<'trade' | 'date'>('trade');
  const [dateTimeframe, setDateTimeframe] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const [chartTimeframe, setChartTimeframe] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const [showEdgeStats, setShowEdgeStats] = useState(false);
  
  // Helper function to format large numbers compactly
  const formatCompactNumber = (value: number, prefix: string = ''): string => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
      return `${sign}${prefix}${(absValue / 1000000).toFixed(2)}M`;
    } else if (absValue >= 10000) {
      return `${sign}${prefix}${(absValue / 1000).toFixed(1)}K`;
    } else {
      return `${sign}${prefix}${absValue.toFixed(2)}`;
    }
  };
  
  // Theme-aware colors
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const tickColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
  const tooltipBg = isDark ? '#000000' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipText = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="200px" height="2rem" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-0.5">
              <SkeletonLoader width="40%" height="0.875rem" className="mb-3" />
              <SkeletonLoader width="60%" height="2rem" className="mb-2" />
              <SkeletonLoader width="50%" height="0.75rem" />
            </div>
          ))}
        </div>
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-0.5">
          <SkeletonLoader width="150px" height="1.5rem" className="mb-4" />
          <SkeletonLoader width="100%" height="300px" />
        </div>
      </div>
    );
  }

  // Get collections to check for EDGE trades (not yet supported in demo)
  const collections: { id: string; name: string }[] = [];
  const edgeCollection = collections.find((c) => c.name === 'EDGE');

  // Filter trades based on date range and EDGE toggle
  let filteredTrades = dateRange === 'all' 
    ? trades 
    : trades.filter(t => {
        const tradeDate = parseISO(t.tradeDate);
        const cutoffDate = subDays(new Date(), parseInt(dateRange));
        return tradeDate >= cutoffDate;
      });

  // Filter for EDGE trades if toggle is on
  if (showEdgeStats) {
    filteredTrades = filteredTrades.filter((t) => 
      (edgeCollection && t.collections.includes(edgeCollection.id)) ||
      t.notes?.startsWith('[EDGE')
    );
  }

  const metrics = calculateAllMetrics(filteredTrades);

  // Generate chart data based on selected metric
  const getChartData = () => {
    if (!mounted || filteredTrades.length === 0) return [];
    
    // Filter trades based on chart timeframe
    let timeframeFilteredTrades = filteredTrades;
    if (chartTimeframe !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (chartTimeframe) {
        case 'weekly':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      timeframeFilteredTrades = filteredTrades.filter(t => parseISO(t.tradeDate) >= cutoffDate);
    }
    
    const sortedTrades = timeframeFilteredTrades.sort((a, b) => parseISO(a.tradeDate).getTime() - parseISO(b.tradeDate).getTime());
    
    switch (selectedChart) {
      case 'rollingExpectancy': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          const expectancy = windowTrades.length > 0 
            ? windowTrades.reduce((sum, t) => sum + t.resultR, 0) / windowTrades.length 
            : 0;
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(expectancy.toFixed(2)),
          };
        });
      }
      
      case 'winRate': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          const wins = windowTrades.filter(t => t.outcome === Outcome.WIN).length;
          const winRate = windowTrades.length > 0 ? (wins / windowTrades.length) * 100 : 0;
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(winRate.toFixed(1)),
          };
        });
      }
      
      case 'profitFactor': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          const wins = windowTrades.filter(t => t.outcome === Outcome.WIN);
          const losses = windowTrades.filter(t => t.outcome === Outcome.LOSS);
          const grossProfit = wins.reduce((sum, t) => sum + Math.abs(t.resultUsd), 0);
          const grossLoss = losses.reduce((sum, t) => sum + Math.abs(t.resultUsd), 0);
          const profitFactor = grossLoss === 0 
            ? (grossProfit > 0 ? 999 : 0)
            : grossProfit / grossLoss;
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(profitFactor.toFixed(2)),
          };
        });
      }
      
      case 'avgWinR': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          const wins = windowTrades.filter(t => t.outcome === Outcome.WIN);
          const avgWinR = wins.length > 0
            ? wins.reduce((sum, t) => sum + t.resultR, 0) / wins.length
            : 0;
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(avgWinR.toFixed(2)),
          };
        });
      }
      
      case 'avgLossR': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          const losses = windowTrades.filter(t => t.outcome === Outcome.LOSS);
          const avgLossR = losses.length > 0
            ? losses.reduce((sum, t) => sum + t.resultR, 0) / losses.length
            : 0;
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(avgLossR.toFixed(2)),
          };
        });
      }
      
      case 'consistencyScore': {
        return sortedTrades.map((trade, idx) => {
          const window = 20;
          const start = Math.max(0, idx - window + 1);
          const windowTrades = sortedTrades.slice(start, idx + 1);
          if (windowTrades.length === 0) return { trade: idx + 1, date: format(parseISO(trade.tradeDate), 'MMM dd'), value: 0 };
          const rValues = windowTrades.map(t => t.resultR);
          const mean = rValues.reduce((a, b) => a + b, 0) / rValues.length;
          const variance = rValues.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / rValues.length;
          const stdDev = Math.sqrt(variance);
          const score = Math.max(0, 100 - (stdDev * 20));
          return {
            trade: idx + 1,
            date: format(parseISO(trade.tradeDate), 'MMM dd'),
            value: Number(Math.min(100, score).toFixed(1)),
          };
        });
      }
      
      case 'rDistribution': {
        return metrics.rDistribution.map(bucket => ({
          name: bucket.bucket,
          value: bucket.count,
          percentage: bucket.pct,
        }));
      }
      
      case 'dayOfWeek': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.map(day => {
          const perf = metrics.dayOfWeekPerformance[day] || { count: 0, pnl: 0, r: 0 };
          return {
            name: day.slice(0, 3),
            fullName: day,
            r: Number(perf.r.toFixed(2)),
            pnl: Number(perf.pnl.toFixed(2)),
            count: perf.count,
          };
        });
      }
      
      default:
        return [];
    }
  };

  const getChartConfig = () => {
    switch (selectedChart) {
      case 'rDistribution':
      case 'dayOfWeek':
        return { type: 'bar' as const, yKey: selectedChart === 'rDistribution' ? 'value' : 'r' };
      default:
        return { type: 'line' as const, yKey: 'value' };
    }
  };

  const getChartTitle = () => {
    const titles: Record<string, string> = {
      rollingExpectancy: 'Rolling Expectancy (20 trades)',
      winRate: 'Rolling Win Rate (20 trades)',
      profitFactor: 'Rolling Profit Factor (20 trades)',
      avgWinR: 'Rolling Avg Win R (20 trades)',
      avgLossR: 'Rolling Avg Loss R (20 trades)',
      consistencyScore: 'Rolling Consistency Score (20 trades)',
      rDistribution: 'R Distribution',
      dayOfWeek: 'Day of Week Performance',
    };
    return titles[selectedChart] || 'Chart';
  };

  const getYAxisLabel = () => {
    const labels: Record<string, string> = {
      rollingExpectancy: 'Expectancy (R)',
      winRate: 'Win Rate (%)',
      profitFactor: 'Profit Factor',
      avgWinR: 'Avg Win (R)',
      avgLossR: 'Avg Loss (R)',
      consistencyScore: 'Score (0-100)',
      rDistribution: 'Count',
      dayOfWeek: 'Total R',
    };
    return labels[selectedChart] || 'Value';
  };

  // Generate time-series data for each metric
  const generateTimeSeriesData = (metricKey: string): MetricChartData[] => {
    const sortedTrades = [...filteredTrades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
    const data: MetricChartData[] = [];
    
    for (let i = 1; i <= sortedTrades.length; i++) {
      const tradesUpToNow = sortedTrades.slice(0, i);
      const metricsUpToNow = calculateAllMetrics(tradesUpToNow);
      
      let value = 0;
      switch (metricKey) {
        case 'winRate':
          value = metricsUpToNow.winRate;
          break;
        case 'expectancy':
          value = metricsUpToNow.expectancy;
          break;
        case 'profitFactor':
          value = metricsUpToNow.profitFactor === Infinity ? 0 : metricsUpToNow.profitFactor;
          break;
        case 'totalPnLUsd':
          value = metricsUpToNow.totalPnLUsd;
          break;
        case 'totalPnLR':
          value = metricsUpToNow.totalPnLR;
          break;
        case 'avgWinR':
          value = metricsUpToNow.avgWinR;
          break;
        case 'avgLossR':
          value = metricsUpToNow.avgLossR;
          break;
        case 'maxDrawdownUsd':
          value = metricsUpToNow.maxDrawdownUsd;
          break;
        case 'consistencyScore':
          value = metricsUpToNow.consistencyScore;
          break;
        case 'feeDrag':
          value = metricsUpToNow.feeDrag;
          break;
        case 'mistakeTax':
          value = metricsUpToNow.mistakeTaxUsd;
          break;
        default:
          value = 0;
      }
      
      data.push({
        date: tradesUpToNow[i - 1]?.tradeDate || '',
        value,
      });
    }
    
    return data;
  };

  const rollingData = metrics.rollingExpectancy.map((val, idx) => ({
    trade: idx + 1,
    expectancy: val,
  }));

  // Format R distribution data with proper bucket labels and colors
  const rDistData = metrics.rDistribution.reduce((acc, item) => {
    let label = item.bucket;
    let color = '#0D9488'; // Teal
    
    if (item.bucket === '<-2R') {
      label = '<-2R';
      color = '#E57373'; // Coral
    } else if (item.bucket === '-2R to -1R') {
      label = '-2 to -1';
      color = '#E57373'; // Coral
    } else if (item.bucket === '-1R to 0R') {
      label = '-1 to 0';
      color = '#E57373'; // Coral
    } else if (item.bucket === '0R to 1R') {
      label = '0 to 1';
      color = '#0D9488'; // Teal
    } else if (item.bucket === '1R to 2R') {
      label = '1 to 2';
      color = '#0D9488'; // Teal
    } else if (item.bucket === '2R to 3R' || item.bucket === '>3R') {
      const existing = acc.find((a) => a.bucket === '>2R');
      if (existing) {
        existing.count += item.count;
        existing.pct += item.pct;
      } else {
        acc.push({
          bucket: '>2R',
          count: item.count,
          pct: item.pct,
          color: '#0D9488', // Teal
        });
      }
      return acc;
    } else {
      return acc;
    }
    
    acc.push({
      ...item,
      bucket: label,
      color,
    });
    return acc;
  }, [] as { bucket: string; count: number; pct: number; color: string }[]);

  // Calculate equity curve data with moving average (both R and USD)
  const equityCurveData = (() => {
    const sortedTrades = filteredTrades.sort((a, b) => parseISO(a.tradeDate).getTime() - parseISO(b.tradeDate).getTime());
    
    // Filter trades based on timeframe if date view is selected
    let timeframeFilteredTrades = sortedTrades;
    if (xAxisView === 'date') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateTimeframe) {
        case 'weekly':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'yearly':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          // No filter
          break;
      }
      
      if (dateTimeframe !== 'all') {
        timeframeFilteredTrades = sortedTrades.filter(t => parseISO(t.tradeDate) >= cutoffDate);
      }
    }
    
    // Build base data points
    const data = timeframeFilteredTrades.reduce((acc, trade, idx) => {
      const prevEquityR = idx === 0 ? 0 : acc[idx - 1].equityR;
      const prevEquityUsd = idx === 0 ? 0 : acc[idx - 1].equityUsd;
      
      let dateLabel: string;
      if (xAxisView === 'date') {
        const tradeDate = parseISO(trade.tradeDate);
        switch (dateTimeframe) {
          case 'weekly':
          case 'monthly':
            dateLabel = format(tradeDate, 'MMM dd');
            break;
          case 'yearly':
          case 'all':
            dateLabel = format(tradeDate, 'MMM yyyy');
            break;
          default:
            dateLabel = format(tradeDate, 'MMM dd');
        }
      } else {
        dateLabel = format(parseISO(trade.tradeDate), 'MMM dd');
      }
      
      acc.push({
        trade: idx + 1,
        date: dateLabel,
        dateValue: parseISO(trade.tradeDate).getTime(),
        equityR: Number((prevEquityR + trade.resultR).toFixed(2)),
        equityUsd: Number((prevEquityUsd + trade.resultUsd).toFixed(2)),
      });
      return acc;
    }, [] as { trade: number; date: string; dateValue: number; equityR: number; equityUsd: number; movingAverageR?: number; movingAverageUsd?: number }[]);
    
    // Aggregate by date if needed (for yearly/all time monthly view)
    let aggregatedData = data;
    if (xAxisView === 'date' && (dateTimeframe === 'yearly' || dateTimeframe === 'all')) {
      const byMonth = new Map<string, { equityR: number; equityUsd: number; dateValue: number }>();
      
      for (const point of data) {
        const date = new Date(point.dateValue);
        const monthKey = format(date, 'MMM yyyy');
        
        // Keep the last point for each month (most recent equity value)
        if (!byMonth.has(monthKey) || point.dateValue > byMonth.get(monthKey)!.dateValue) {
          byMonth.set(monthKey, { 
            equityR: point.equityR, 
            equityUsd: point.equityUsd, 
            dateValue: point.dateValue 
          });
        }
      }
      
      aggregatedData = Array.from(byMonth.entries())
        .sort((a, b) => a[1].dateValue - b[1].dateValue)
        .map(([month, data], idx) => ({
          trade: idx + 1,
          date: month,
          dateValue: data.dateValue,
          equityR: data.equityR,
          equityUsd: data.equityUsd,
        }));
    }
    
    // Calculate 20-period moving average for both R and USD
    const period = 20;
    return aggregatedData.map((point, idx) => {
      if (idx < period - 1) {
        // For the first few points, calculate MA with available data
        const availableData = aggregatedData.slice(0, idx + 1);
        const sumR = availableData.reduce((sum, p) => sum + p.equityR, 0);
        const sumUsd = availableData.reduce((sum, p) => sum + p.equityUsd, 0);
        return { 
          ...point, 
          movingAverageR: Number((sumR / availableData.length).toFixed(2)),
          movingAverageUsd: Number((sumUsd / availableData.length).toFixed(2)),
        };
      } else {
        // For later points, use the last 'period' values
        const window = aggregatedData.slice(idx - period + 1, idx + 1);
        const sumR = window.reduce((sum, p) => sum + p.equityR, 0);
        const sumUsd = window.reduce((sum, p) => sum + p.equityUsd, 0);
        return { 
          ...point, 
          movingAverageR: Number((sumR / period).toFixed(2)),
          movingAverageUsd: Number((sumUsd / period).toFixed(2)),
        };
      }
    });
  })();

  const dayOfWeekData = Object.entries(metrics.dayOfWeekPerformance).map(([day, data]) => ({
    day: day.slice(0, 3),
    pnl: data.pnl,
    count: data.count,
  }));

  // Calculate additional statistics
  const calculateAdvancedStats = () => {
    if (filteredTrades.length === 0) return null;
    
    const sortedTrades = [...filteredTrades].sort((a, b) => 
      parseISO(a.tradeDate).getTime() - parseISO(b.tradeDate).getTime()
    );
    
    // Streak Analysis
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let streakHistory: { trade: number; winStreak: number; lossStreak: number }[] = [];
    
    sortedTrades.forEach((trade, idx) => {
      if (trade.outcome === Outcome.WIN) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
      streakHistory.push({ trade: idx + 1, winStreak: currentWinStreak, lossStreak: -currentLossStreak });
    });
    
    // Monthly Performance
    const monthlyPerf = new Map<string, { pnl: number; r: number; wins: number; losses: number; trades: number }>();
    sortedTrades.forEach(trade => {
      const month = format(parseISO(trade.tradeDate), 'MMM yyyy');
      const existing = monthlyPerf.get(month) || { pnl: 0, r: 0, wins: 0, losses: 0, trades: 0 };
      existing.pnl += trade.resultUsd;
      existing.r += trade.resultR;
      existing.trades++;
      if (trade.outcome === Outcome.WIN) existing.wins++;
      else existing.losses++;
      monthlyPerf.set(month, existing);
    });
    
    const monthlyData = Array.from(monthlyPerf.entries()).map(([month, data]) => ({
      month,
      pnl: Number(data.pnl.toFixed(2)),
      r: Number(data.r.toFixed(2)),
      winRate: Number(((data.wins / data.trades) * 100).toFixed(1)),
      trades: data.trades,
      wins: data.wins,
      losses: data.losses,
    }));
    
    // Hourly Performance (by entry hour)
    const hourlyPerf = new Map<number, { pnl: number; r: number; count: number; wins: number }>();
    sortedTrades.forEach(trade => {
      const hour = parseISO(trade.tradeDate).getHours();
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
        hourNum: hour,
        pnl: Number(data.pnl.toFixed(2)),
        r: Number(data.r.toFixed(2)),
        count: data.count,
        winRate: data.count > 0 ? Number(((data.wins / data.count) * 100).toFixed(1)) : 0,
      };
    }).filter(d => d.count > 0);
    
    // Drawdown Analysis
    let peak = 0;
    let drawdownData: { trade: number; equity: number; drawdown: number; drawdownPct: number }[] = [];
    let runningEquity = 0;
    
    sortedTrades.forEach((trade, idx) => {
      runningEquity += trade.resultUsd;
      peak = Math.max(peak, runningEquity);
      const drawdown = peak - runningEquity;
      const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;
      drawdownData.push({
        trade: idx + 1,
        equity: Number(runningEquity.toFixed(2)),
        drawdown: Number(drawdown.toFixed(2)),
        drawdownPct: Number(drawdownPct.toFixed(2)),
      });
    });
    
    // Win Rate Over Time (cumulative)
    let cumulativeWins = 0;
    const winRateOverTime = sortedTrades.map((trade, idx) => {
      if (trade.outcome === Outcome.WIN) cumulativeWins++;
      return {
        trade: idx + 1,
        winRate: Number(((cumulativeWins / (idx + 1)) * 100).toFixed(1)),
      };
    });
    
    // Risk/Reward Distribution
    const rrData = sortedTrades.map(trade => ({
      risk: Math.abs(trade.resultR < 0 ? trade.resultR : 0),
      reward: trade.resultR > 0 ? trade.resultR : 0,
      outcome: trade.outcome,
      resultR: trade.resultR,
    }));
    
    // Average Win/Loss by R buckets
    const winsBySize = { small: 0, medium: 0, large: 0, smallCount: 0, mediumCount: 0, largeCount: 0 };
    const lossesBySize = { small: 0, medium: 0, large: 0, smallCount: 0, mediumCount: 0, largeCount: 0 };
    
    sortedTrades.forEach(trade => {
      const absR = Math.abs(trade.resultR);
      if (trade.outcome === Outcome.WIN) {
        if (absR < 1) { winsBySize.small += trade.resultR; winsBySize.smallCount++; }
        else if (absR < 2) { winsBySize.medium += trade.resultR; winsBySize.mediumCount++; }
        else { winsBySize.large += trade.resultR; winsBySize.largeCount++; }
      } else {
        if (absR < 1) { lossesBySize.small += trade.resultR; lossesBySize.smallCount++; }
        else if (absR < 2) { lossesBySize.medium += trade.resultR; lossesBySize.mediumCount++; }
        else { lossesBySize.large += trade.resultR; lossesBySize.largeCount++; }
      }
    });
    
    // Consecutive analysis
    let consecutiveWins: number[] = [];
    let consecutiveLosses: number[] = [];
    let tempWin = 0, tempLoss = 0;
    
    sortedTrades.forEach(trade => {
      if (trade.outcome === Outcome.WIN) {
        tempWin++;
        if (tempLoss > 0) { consecutiveLosses.push(tempLoss); tempLoss = 0; }
      } else {
        tempLoss++;
        if (tempWin > 0) { consecutiveWins.push(tempWin); tempWin = 0; }
      }
    });
    if (tempWin > 0) consecutiveWins.push(tempWin);
    if (tempLoss > 0) consecutiveLosses.push(tempLoss);
    
    const avgConsecutiveWins = consecutiveWins.length > 0 
      ? consecutiveWins.reduce((a, b) => a + b, 0) / consecutiveWins.length : 0;
    const avgConsecutiveLosses = consecutiveLosses.length > 0 
      ? consecutiveLosses.reduce((a, b) => a + b, 0) / consecutiveLosses.length : 0;
    
    // Profit/Loss ratio over time
    const plRatioOverTime = sortedTrades.map((_, idx) => {
      const windowTrades = sortedTrades.slice(0, idx + 1);
      const wins = windowTrades.filter(t => t.outcome === Outcome.WIN);
      const losses = windowTrades.filter(t => t.outcome === Outcome.LOSS);
      const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.resultR, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.resultR, 0) / losses.length) : 0;
      return {
        trade: idx + 1,
        ratio: avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : avgWin > 0 ? 999 : 0,
      };
    });
    
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
      plRatioOverTime,
      totalWins: filteredTrades.filter(t => t.outcome === Outcome.WIN).length,
      totalLosses: filteredTrades.filter(t => t.outcome === Outcome.LOSS).length,
      biggestWin: Math.max(...filteredTrades.map(t => t.resultUsd)),
      biggestLoss: Math.min(...filteredTrades.map(t => t.resultUsd)),
      avgTradeSize: filteredTrades.reduce((s, t) => s + Math.abs(t.resultUsd), 0) / filteredTrades.length,
      sharpeApprox: metrics.expectancy / (metrics.consistencyScore > 0 ? (100 - metrics.consistencyScore) / 100 : 1),
    };
  };
  
  const advancedStats = mounted ? calculateAdvancedStats() : null;

  const toggleChart = (metricId: string) => {
    setShowChartFor(prev => ({
      ...prev,
      [metricId]: !prev[metricId],
    }));
  };

  const getChartLabel = (metricId: string): string => {
    const labels: Record<string, string> = {
      winRate: 'Win Rate (%)',
      expectancy: 'Expectancy (R)',
      profitFactor: 'Profit Factor',
      totalPnLUsd: 'Total P&L ($)',
      totalPnLR: 'Total P&L (R)',
      avgWinR: 'Avg Win (R)',
      avgLossR: 'Avg Loss (R)',
      maxDrawdownUsd: 'Max Drawdown ($)',
      consistencyScore: 'Consistency Score (%)',
      feeDrag: 'Fee Drag (%)',
      mistakeTax: 'Mistake Tax ($)',
    };
    return labels[metricId] || metricId;
  };

  return (
    <div className="container-premium">
      {/* Premium header */}
      <div className="flex items-center justify-between animate-slide-in-down" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div>
          <h1 className="theme-text text-h1">Analytics</h1>
          <p className="theme-text-secondary text-body" style={{ marginTop: 'var(--space-sm)' }}>
            Track your trading performance and identify areas for improvement
          </p>
        </div>
        <Link
          href="/analytics/glossary"
          className="btn-premium"
          style={{ color: 'white' }}
        >
          View Glossary
        </Link>
      </div>

      {/* Filters - Premium controls */}
      <div className="flex items-center animate-slide-in-up" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
          <span className="theme-text-secondary text-body-sm font-medium">Time Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="theme-bg-secondary border theme-text focus:outline-none focus:ring-2"
            style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-body-sm)', fontWeight: 'var(--font-weight-medium)', borderColor: 'var(--theme-border)', transitionDuration: 'var(--transition-base)' }}
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 180 Days</option>
          </select>
        </div>
        
        {/* EDGE Stats Toggle - Premium styling */}
        <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
          <span className="theme-text-secondary text-body-sm font-medium">Show EDGE Stats:</span>
          <button
            onClick={() => setShowEdgeStats(!showEdgeStats)}
            className={`relative inline-flex items-center transition-all focus:outline-none focus:ring-2 active:scale-95 ${
              showEdgeStats
                ? ''
                : ''
            }`}
            style={{ 
              height: '24px', 
              width: '44px', 
              borderRadius: 'var(--radius-full)', 
              background: showEdgeStats ? 'var(--theme-primary)' : 'var(--theme-border-secondary)',
              transitionDuration: 'var(--transition-base)'
            }}
          >
            <span
              className="inline-block transform rounded-full bg-white transition-transform"
              style={{ 
                height: '16px', 
                width: '16px',
                transform: showEdgeStats ? 'translateX(24px)' : 'translateX(4px)',
                transitionDuration: 'var(--transition-base)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards with Chart Toggle */}
      <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <MetricCardWithChart
          metricId="winRate"
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          trades={filteredTrades}
          showChart={showChartFor.winRate}
          onToggleChart={() => toggleChart('winRate')}
        />
        <MetricCardWithChart
          metricId="expectancy"
          label="Expectancy"
          value={`${metrics.expectancy.toFixed(2)}R`}
          trades={filteredTrades}
          showChart={showChartFor.expectancy}
          onToggleChart={() => toggleChart('expectancy')}
        />
        <MetricCardWithChart
          metricId="profitFactor"
          label="Profit Factor"
          value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          trades={filteredTrades}
          showChart={showChartFor.profitFactor}
          onToggleChart={() => toggleChart('profitFactor')}
        />
        <MetricCardWithChart
          metricId="totalPnLUsd"
          label="Total P&L"
          value={formatCompactNumber(metrics.totalPnLUsd, '$')}
          trades={filteredTrades}
          showChart={showChartFor.totalPnLUsd}
          onToggleChart={() => toggleChart('totalPnLUsd')}
        />
        <MetricCardWithChart
          metricId="totalPnLR"
          label="Total P&L (R)"
          value={`${metrics.totalPnLR.toFixed(2)}R`}
          trades={filteredTrades}
          showChart={showChartFor.totalPnLR}
          onToggleChart={() => toggleChart('totalPnLR')}
        />
        <MetricCardWithChart
          metricId="avgWinR"
          label="Avg Win"
          value={`${metrics.avgWinR.toFixed(2)}R`}
          trades={filteredTrades}
          showChart={showChartFor.avgWinR}
          onToggleChart={() => toggleChart('avgWinR')}
        />
        <MetricCardWithChart
          metricId="avgLossR"
          label="Avg Loss"
          value={`${metrics.avgLossR.toFixed(2)}R`}
          trades={filteredTrades}
          showChart={showChartFor.avgLossR}
          onToggleChart={() => toggleChart('avgLossR')}
        />
        <MetricCardWithChart
          metricId="maxDrawdownUsd"
          label="Max Drawdown"
          value={formatCompactNumber(metrics.maxDrawdownUsd, '$')}
          trades={filteredTrades}
          showChart={showChartFor.maxDrawdownUsd}
          onToggleChart={() => toggleChart('maxDrawdownUsd')}
        />
        <MetricCardWithChart
          metricId="consistencyScore"
          label="Consistency"
          value={`${metrics.consistencyScore.toFixed(0)}%`}
          trades={filteredTrades}
          showChart={showChartFor.consistencyScore}
          onToggleChart={() => toggleChart('consistencyScore')}
        />
        <MetricCardWithChart
          metricId="feeDrag"
          label="Fee Drag"
          value={`${metrics.feeDrag.toFixed(1)}%`}
          trades={filteredTrades}
          showChart={showChartFor.feeDrag}
          onToggleChart={() => toggleChart('feeDrag')}
        />
        <MetricCardWithChart
          metricId="mistakeTax"
          label="Mistake Tax"
          value={formatCompactNumber(metrics.mistakeTaxUsd, '$')}
          trades={filteredTrades}
          showChart={showChartFor.mistakeTax}
          onToggleChart={() => toggleChart('mistakeTax')}
        />
      </div>

      {/* Charts Section */}
      {Object.entries(showChartFor).some(([_, show]) => show) && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold theme-text">Metric Trends Over Time</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(showChartFor).map(([metricId, show]) => {
              if (!show) return null;
              const chartData = generateTimeSeriesData(metricId);
              return (
                <div key={metricId} className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold theme-text">
                      {METRIC_EXPLAINERS[metricId]?.title || metricId}
                    </h3>
                    <button
                      onClick={() => toggleChart(metricId)}
                      className="theme-text-secondary hover:theme-text text-sm"
                    >
                      Hide Chart
                    </button>
                  </div>
                  <ResponsiveContainer key={`metric-${metricId}-${theme}`} width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis 
                        dataKey="date" 
                        stroke={axisColor}
                        tick={{ fill: tickColor, fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
                      />
                      <YAxis 
                        stroke={axisColor}
                        tick={{ fill: tickColor, fontSize: 11 }}
                        label={{ value: getChartLabel(metricId), angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: tickColor } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: tooltipBg, 
                          border: `1px solid ${tooltipBorder}`, 
                          borderRadius: '8px',
                          color: tooltipText,
                        }}
                        labelStyle={{ color: tooltipText }}
                        itemStyle={{ color: tooltipText }}
                        formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, getChartLabel(metricId)]}
                        labelFormatter={(value) => format(parseISO(value), 'MMM dd, yyyy')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0D9488" 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Premium Charts Grid */}
      <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))' }}>
        <div className="card-premium hover-lift">
          <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>R-Multiple Distribution</h2>
          <ResponsiveContainer key={`rDist-${theme}`} width="100%" height={300}>
            <BarChart data={rDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="bucket" 
                stroke={axisColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                label={{ value: 'R-Multiple Bucket', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: tickColor } }}
              />
              <YAxis 
                stroke={axisColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: tickColor } }}
                domain={[0, 'dataMax']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '8px',
                  color: tooltipText,
                }}
                labelStyle={{ color: tooltipText }}
                itemStyle={{ color: tooltipText }}
                formatter={(value: any) => [value, 'Trades']}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                {rDistData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-premium hover-lift">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="theme-text text-h3">Equity Curve</h2>
            <div className="flex items-center space-x-6">
              {/* X-Axis Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setXAxisView('trade')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                    xAxisView === 'trade'
                      ? 'bg-accent text-white shadow-md'
                      : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                  }`}
                >
                  Trade #
                </button>
                <button
                  onClick={() => setXAxisView('date')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                    xAxisView === 'date'
                      ? 'bg-accent text-white shadow-md'
                      : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                  }`}
                >
                  Date
                </button>
              </div>
              {/* Date Timeframe Selector (only shown when date view is active) */}
              {xAxisView === 'date' && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setDateTimeframe('weekly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      dateTimeframe === 'weekly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setDateTimeframe('monthly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      dateTimeframe === 'monthly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setDateTimeframe('yearly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      dateTimeframe === 'yearly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Year
                  </button>
                  <button
                    onClick={() => setDateTimeframe('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      dateTimeframe === 'all'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    All
                  </button>
                </div>
              )}
              {/* Y-Axis Toggle */}
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${equityView === 'R' ? 'text-accent' : 'theme-text-secondary'}`}>
                  R
                </span>
                <button
                  onClick={() => setEquityView(equityView === 'R' ? 'USD' : 'R')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                    equityView === 'USD' ? 'bg-accent' : 'theme-bg-tertiary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      equityView === 'USD' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${equityView === 'USD' ? 'text-accent' : 'theme-text-secondary'}`}>
                  USD
                </span>
              </div>
            </div>
          </div>
          {equityCurveData.length > 0 ? (
            <ResponsiveContainer key={`equity-analytics-${theme}`} width="100%" height={300}>
              <LineChart data={equityCurveData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey={xAxisView === 'trade' ? 'trade' : 'date'}
                  stroke={axisColor}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  label={{ 
                    value: xAxisView === 'trade' ? 'Trade Number' : 'Date', 
                    position: 'insideBottom', 
                    offset: -5, 
                    fill: axisColor 
                  }}
                  height={xAxisView === 'date' ? 60 : 40}
                  angle={xAxisView === 'date' ? -45 : 0}
                  textAnchor={xAxisView === 'date' ? 'end' : 'middle'}
                  interval={xAxisView === 'trade' 
                    ? (equityCurveData.length > 30 ? Math.max(0, Math.floor(equityCurveData.length / 10)) : 0)
                    : 'preserveStartEnd'}
                  tickCount={xAxisView === 'trade' ? 10 : undefined}
                />
                <YAxis 
                  stroke={axisColor}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  label={{ 
                    value: equityView === 'R' ? 'Cumulative R' : 'Cumulative USD', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: axisColor 
                  }}
                  width={80}
                  tickFormatter={(value) => equityView === 'R' ? value.toFixed(2) : `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: tooltipText }}
                  labelFormatter={(label) => {
                    if (xAxisView === 'trade') {
                      return `Trade #${label}`;
                    } else {
                      return label;
                    }
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    
                    const equityData = payload.find(p => p.dataKey === (equityView === 'R' ? 'equityR' : 'equityUsd'));
                    const maData = payload.find(p => p.dataKey === (equityView === 'R' ? 'movingAverageR' : 'movingAverageUsd'));
                    
                    const equityValue = equityData?.value as number;
                    const maValue = maData?.value as number;
                    
                    const formatValue = (val: number) => {
                      if (equityView === 'R') {
                        return val.toFixed(2) + 'R';
                      } else {
                        return '$' + val.toFixed(2);
                      }
                    };
                    
                    return (
                      <div style={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        padding: '12px',
                      }}>
                        <p style={{ color: tooltipText, fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                          {xAxisView === 'trade' ? `Trade #${label}` : label}
                        </p>
                        {equityValue !== undefined && (
                          <p style={{ color: tooltipText, fontSize: '13px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 500 }}>Equity:</span>{' '}
                            <span style={{ 
                              fontWeight: 600,
                              color: equityValue >= 0 ? '#0D9488' : '#E57373'
                            }}>
                              {formatValue(equityValue)}
                            </span>
                          </p>
                        )}
                        {maValue !== undefined && (
                          <p style={{ color: tooltipText, fontSize: '13px', opacity: 0.8 }}>
                            <span style={{ fontWeight: 500 }}>MA (20):</span>{' '}
                            <span style={{ 
                              fontWeight: 600,
                              color: maValue >= 0 ? '#0D9488' : '#E57373'
                            }}>
                              {formatValue(maValue)}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={equityView === 'R' ? 'equityR' : 'equityUsd'}
                  stroke={(equityCurveData.length > 0 && equityCurveData[equityCurveData.length - 1][equityView === 'R' ? 'equityR' : 'equityUsd'] >= 0) ? '#0D9488' : '#E57373'}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  name="Equity"
                />
                <Line
                  type="monotone"
                  dataKey={equityView === 'R' ? 'movingAverageR' : 'movingAverageUsd'}
                  stroke="#0D9488" 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  name="MA (20)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
              <p className="theme-text-secondary">Not enough trades for Equity Curve</p>
            </div>
          )}
        </div>

        <div className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300 hover:-translate-y-0.5">
          <h2 className="text-xl font-semibold mb-4 theme-text">Day of Week Performance</h2>
          <ResponsiveContainer key={`dayOfWeek-${theme}`} width="100%" height={300}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="day" 
                stroke={axisColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                label={{ value: 'Day of Week', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: tickColor } }}
              />
              <YAxis 
                stroke={axisColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                label={{ value: 'P&L (R)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: tickColor } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '8px',
                  color: tooltipText,
                }}
                labelStyle={{ color: tooltipText }}
                itemStyle={{ color: tooltipText }}
                formatter={(value: any) => [value.toFixed(2) + 'R', 'P&L']}
              />
              <Bar dataKey="pnl" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                {dayOfWeekData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#0D9488' : '#E57373'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Drawdown Chart */}
        <div className="card-premium hover-lift">
          <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Drawdown Analysis</h2>
          {advancedStats && advancedStats.drawdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={advancedStats.drawdownData}>
                <defs>
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E57373" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E57373" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="trade" stroke={axisColor} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis 
                  stroke={axisColor} 
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  label={{ value: 'Drawdown ($)', angle: -90, position: 'insideLeft', fill: axisColor }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
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

        {/* Dynamic Analytics Chart */}
        <div className="card-premium hover-lift">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="theme-text text-h3">{getChartTitle()}</h2>
            <div className="flex items-center space-x-3">
              {/* Timeframe Selector (only shown for line charts) */}
              {getChartConfig().type === 'line' && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setChartTimeframe('weekly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      chartTimeframe === 'weekly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setChartTimeframe('monthly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      chartTimeframe === 'monthly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setChartTimeframe('yearly')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      chartTimeframe === 'yearly'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    Year
                  </button>
                  <button
                    onClick={() => setChartTimeframe('all')}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
                      chartTimeframe === 'all'
                        ? 'bg-accent text-white shadow-sm'
                        : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-tertiary hover:scale-105'
                    }`}
                  >
                    All
                  </button>
                </div>
              )}
              <select
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value as typeof selectedChart)}
                className="px-3 py-1.5 theme-bg-tertiary border theme-border rounded-lg text-sm theme-text focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95 transition-all duration-200"
              >
                <option value="rollingExpectancy">Rolling Expectancy</option>
                <option value="winRate">Rolling Win Rate</option>
                <option value="profitFactor">Rolling Profit Factor</option>
                <option value="avgWinR">Rolling Avg Win R</option>
                <option value="avgLossR">Rolling Avg Loss R</option>
                <option value="consistencyScore">Rolling Consistency</option>
                <option value="rDistribution">R Distribution</option>
                <option value="dayOfWeek">Day of Week</option>
              </select>
                  </div>
                </div>
          
          {(() => {
            const chartData = getChartData();
            const chartConfig = getChartConfig();
            
            // Determine line color based on metric type and final value
            const getLineColor = () => {
              if (chartConfig.type === 'bar') return '#0D9488';
              
              if (chartData.length === 0) return '#0D9488';
              
              // Type guard: only line charts have 'value' property
              const lastItem = chartData[chartData.length - 1];
              if (!lastItem || !('value' in lastItem)) return '#0D9488';
              
              const lastValue = (lastItem as { value: number }).value;
              
              switch (selectedChart) {
                case 'rollingExpectancy':
                  return lastValue >= 0 ? '#0D9488' : '#E57373';
                case 'winRate':
                  return lastValue >= 50 ? '#0D9488' : '#E57373';
                case 'profitFactor':
                  return lastValue >= 1 ? '#0D9488' : '#E57373';
                case 'avgWinR':
                  return '#0D9488'; // Wins are always good
                case 'avgLossR':
                  return '#E57373'; // Losses are always bad
                case 'consistencyScore':
                  return lastValue >= 50 ? '#0D9488' : '#E57373';
                default:
                  return '#0D9488';
              }
            };
            
            return chartData.length > 0 ? (
              <ResponsiveContainer key={`dynamic-chart-${selectedChart}-${theme}-${chartTimeframe}`} width="100%" height={300}>
                {chartConfig.type === 'bar' ? (
                  <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    stroke={axisColor}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <YAxis
                    stroke={axisColor}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    label={{ 
                      value: getYAxisLabel(), 
                      angle: -90, 
                      position: 'insideLeft', 
                      fill: axisColor 
                    }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: tooltipText }}
                    formatter={(value: any, name: string, props: any) => {
                      if (selectedChart === 'rDistribution') {
                        return [`${value} trades (${props.payload.percentage.toFixed(1)}%)`, 'Count'];
                      } else if (selectedChart === 'dayOfWeek') {
                        return [
                          [
                            `${props.payload.fullName}`,
                            `R: ${props.payload.r.toFixed(2)}R`,
                            `PnL: $${props.payload.pnl.toFixed(2)}`,
                            `Trades: ${props.payload.count}`,
                          ].join('\n'),
                          'Performance'
                        ];
                      }
                      return [value, name];
                    }}
                  />
                  <Bar dataKey={chartConfig.yKey} fill="#0D9488" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                    {chartData.map((entry, index) => {
                      let fillColor = '#0D9488';
                      if (selectedChart === 'dayOfWeek' && 'r' in entry) {
                        fillColor = (entry as { r: number }).r >= 0 ? '#0D9488' : '#E57373';
                      } else if (selectedChart === 'rDistribution' && 'name' in entry) {
                        const name = (entry as { name: string }).name;
                        fillColor = (name.includes('<-') || name.includes('-')) ? '#E57373' : '#0D9488';
                      }
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fillColor}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="trade"
                    stroke={axisColor}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    label={{ 
                      value: 'Trade Number', 
                      position: 'insideBottom', 
                      offset: -5, 
                      fill: axisColor 
                    }}
                  />
                  <YAxis
                    stroke={axisColor}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    label={{ 
                      value: getYAxisLabel(), 
                      angle: -90, 
                      position: 'insideLeft', 
                      fill: axisColor 
                    }}
                    width={80}
                    tickFormatter={(value) => {
                      if (selectedChart === 'winRate' || selectedChart === 'consistencyScore') {
                        return value.toFixed(0);
                      }
                      return value.toFixed(2);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: tooltipText }}
                    labelFormatter={(label) => `Trade #${label}`}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      
                      const value = payload[0]?.value as number;
                      const lineColor = getLineColor();
                      
                      const formatValue = (val: number) => {
                        if (selectedChart === 'winRate' || selectedChart === 'consistencyScore') {
                          return val.toFixed(1);
                        }
                        return val.toFixed(2);
                      };
                      
                      return (
                        <div style={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: '8px',
                          padding: '12px',
                        }}>
                          <p style={{ color: tooltipText, fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                            Trade #{label}
                          </p>
                          <p style={{ color: tooltipText, fontSize: '13px' }}>
                            <span style={{ fontWeight: 500 }}>{getYAxisLabel()}:</span>{' '}
                            <span style={{ 
                              fontWeight: 600,
                              color: lineColor
                            }}>
                              {formatValue(value)}
                            </span>
                          </p>
          </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={getLineColor()}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  {selectedChart === 'rollingExpectancy' && (
                    <Line
                      type="monotone"
                      dataKey={() => 0}
                      stroke={axisColor}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                      name="Break Even"
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                <p className="theme-text-secondary">Not enough data for chart</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Advanced Statistics Section */}
      {advancedStats && (
        <>
          {/* Key Statistics Cards */}
          <div style={{ marginTop: 'var(--space-2xl)' }}>
            <h2 className="theme-text text-h2" style={{ marginBottom: 'var(--space-xl)' }}>Advanced Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Max Win Streak</div>
                <div className="text-2xl font-bold text-positive">{advancedStats.maxWinStreak}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Max Loss Streak</div>
                <div className="text-2xl font-bold text-negative">{advancedStats.maxLossStreak}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Avg Win Streak</div>
                <div className="text-2xl font-bold text-positive">{advancedStats.avgConsecutiveWins}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Avg Loss Streak</div>
                <div className="text-2xl font-bold text-negative">{advancedStats.avgConsecutiveLosses}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Biggest Win</div>
                <div className="text-2xl font-bold text-positive">${advancedStats.biggestWin.toFixed(0)}</div>
              </div>
              <div className="card-premium text-center">
                <div className="text-caption theme-text-secondary mb-2">Biggest Loss</div>
                <div className="text-2xl font-bold text-negative">${advancedStats.biggestLoss.toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* Monthly Performance Chart */}
          <div className="grid-premium" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', marginTop: 'var(--space-xl)' }}>
            <div className="card-premium hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Monthly Performance</h2>
              {advancedStats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={advancedStats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey="month" 
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
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
            <div className="card-premium hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Performance by Hour</h2>
              {advancedStats.hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={advancedStats.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="hour" stroke={axisColor} tick={{ fill: tickColor, fontSize: 10 }} />
                    <YAxis 
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 11 }}
                      tickFormatter={(v) => `${v}R`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'r') return [`${value.toFixed(2)}R`, 'Total R'];
                        return [value, name];
                      }}
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

            {/* Streak History Chart */}
            <div className="card-premium hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Win/Loss Streak History</h2>
              {advancedStats.streakHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={advancedStats.streakHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="trade" stroke={axisColor} tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis stroke={axisColor} tick={{ fill: tickColor, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const absVal = Math.abs(value);
                        if (name === 'winStreak' && value > 0) return [`${absVal} wins`, 'Win Streak'];
                        if (name === 'lossStreak' && value < 0) return [`${absVal} losses`, 'Loss Streak'];
                        return [0, name];
                      }}
                      labelFormatter={(label) => `Trade #${label}`}
                    />
                    <ReferenceLine y={0} stroke={axisColor} />
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

            {/* Cumulative Win Rate Chart */}
            <div className="card-premium hover-lift">
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
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="trade" stroke={axisColor} tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis 
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                      labelFormatter={(label) => `After ${label} trades`}
                    />
                    <ReferenceLine y={50} stroke={axisColor} strokeDasharray="5 5" label={{ value: '50%', fill: axisColor, fontSize: 11 }} />
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

            {/* Profit/Loss Ratio Over Time */}
            <div className="card-premium hover-lift">
              <h2 className="theme-text text-h3" style={{ marginBottom: 'var(--space-lg)' }}>Win/Loss Ratio Over Time</h2>
              {advancedStats.plRatioOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={advancedStats.plRatioOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="trade" stroke={axisColor} tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis 
                      stroke={axisColor} 
                      tick={{ fill: tickColor, fontSize: 11 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number) => [value >= 999 ? '∞' : value.toFixed(2), 'W/L Ratio']}
                      labelFormatter={(label) => `After ${label} trades`}
                    />
                    <ReferenceLine y={1} stroke={axisColor} strokeDasharray="5 5" label={{ value: '1:1', fill: axisColor, fontSize: 11 }} />
                    <Line 
                      type="monotone" 
                      dataKey="ratio" 
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed theme-border rounded-xl">
                  <p className="theme-text-secondary">Not enough data</p>
                </div>
              )}
            </div>

            {/* Win/Loss Pie Chart */}
            <div className="card-premium hover-lift">
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
                    >
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-positive"></div>
                  <span className="text-sm theme-text">{advancedStats.totalWins} Wins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-negative"></div>
                  <span className="text-sm theme-text">{advancedStats.totalLosses} Losses</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCardWithChart({
  metricId,
  label,
  value,
  trades,
  showChart,
  onToggleChart,
}: {
  metricId: string;
  label: string;
  value: string;
  trades: Trade[];
  showChart: boolean;
  onToggleChart: () => void;
}) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const explainer = METRIC_EXPLAINERS[metricId];

  return (
    <div className="card-premium hover-lift relative group">
      <div className="flex items-start justify-between" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="text-caption theme-text-secondary">{label}</div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleChart();
            }}
            className={`p-1 rounded transition-colors ${
              showChart 
                ? 'text-accent bg-accent/10' 
                : 'theme-text-secondary hover:theme-text'
            }`}
            title="Toggle chart"
          >
            <ChartBarIcon className="h-4 w-4" />
          </button>
          {explainer && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowInfoModal(true);
              }}
              className="text-accent hover:text-accent dark:hover:text-accent-light transition-colors"
              title="Info"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="theme-text" style={{ 
        fontSize: 'clamp(1.5rem, 4vw, var(--font-size-display))', 
        fontWeight: 'var(--font-weight-extrabold)', 
        lineHeight: '1.1', 
        letterSpacing: 'var(--letter-spacing-tight)', 
        marginBottom: 'var(--space-sm)',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '100%'
      }}>
        <AnimatedMetricValue value={value} />
      </div>
      {explainer && (
        <div className="theme-text-tertiary" style={{ fontSize: 'var(--font-size-caption)', marginTop: 'var(--space-sm)', lineHeight: 'var(--line-height-caption)' }}>
          {explainer.definition}
        </div>
      )}

      {showInfoModal && explainer && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowInfoModal(false)}
        >
          <div 
            className="theme-bg-secondary p-6 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto border theme-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b theme-border pb-4">
              <h3 className="text-lg font-bold theme-text">{explainer.title}</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="theme-text-secondary hover:theme-text transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 theme-text">
              <div>
                <p className="text-sm theme-text leading-relaxed">{explainer.definition}</p>
              </div>
              <Link
                href="/analytics/glossary"
                className="inline-flex items-center text-sm text-accent hover:text-accent dark:hover:text-accent-light font-medium"
                onClick={() => setShowInfoModal(false)}
              >
                View full details in Glossary →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
