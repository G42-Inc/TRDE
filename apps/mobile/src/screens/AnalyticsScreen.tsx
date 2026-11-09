import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useStorage } from '../contexts/StorageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../lib/currency';
import { calculateAllMetrics, Outcome } from '@trde/core';
import type { Trade } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { parseISO, subDays, format } from 'date-fns';
import { colors as designColors, spacing, shadows } from '../design/theme';

const { width } = Dimensions.get('window');
// Chart width accounts for: content padding (md*2) + chart card padding (md*2) + extra margin
const chartWidth = width - spacing.md * 4 - 16;

type DateRangeValue = 'all' | '30' | '90';

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || isNaN(value)) return 0;
  return value;
};

export function AnalyticsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { trades: allTrades, collections, isLoading } = useStorage();
  const { currency } = useCurrency();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  
  const [dateRange, setDateRange] = useState<DateRangeValue>('all');
  const [showEdgeStats, setShowEdgeStats] = useState(false);

  // Animation for currency or date range change
  const chartOpacity = useRef(new Animated.Value(1)).current;
  const chartScale = useRef(new Animated.Value(1)).current;
  const prevCurrency = useRef(currency);
  const prevDateRange = useRef(dateRange);

  const animateChartTransition = () => {
    Animated.parallel([
      Animated.timing(chartOpacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(chartScale, { toValue: 0.98, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(chartOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(chartScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    if (prevCurrency.current !== currency) {
      animateChartTransition();
      prevCurrency.current = currency;
    }
  }, [currency]);

  useEffect(() => {
    if (prevDateRange.current !== dateRange) {
      animateChartTransition();
      prevDateRange.current = dateRange;
    }
  }, [dateRange]);

  const isEdgeTrade = (trade: Trade): boolean => {
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    return (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
      trade.notes?.startsWith('[EDGE') || false;
  };

  const filteredTrades = useMemo(() => {
    let filtered = [...allTrades];
    
    if (dateRange !== 'all') {
      const cutoffDate = subDays(new Date(), parseInt(dateRange));
      filtered = filtered.filter(t => {
        const tradeDate = parseISO(t.tradeDate);
        return tradeDate >= cutoffDate;
      });
    }
    
    if (showEdgeStats) {
      filtered = filtered.filter((t) => isEdgeTrade(t));
    }
    
    return filtered;
  }, [allTrades, dateRange, showEdgeStats, collections]);

  const USD_TO_R_ESTIMATE = 44;

  // Calculate metrics with safe defaults
  const metrics = useMemo(() => {
    if (filteredTrades.length > 0) {
      const result = calculateAllMetrics(filteredTrades);
      const expectancy = safeNumber(result.expectancy);
      const avgWinR = safeNumber(result.avgWinR);
      const avgLossR = safeNumber(result.avgLossR);
      return {
        winRate: safeNumber(result.winRate),
        expectancy,
        expectancyUsd: expectancy * USD_TO_R_ESTIMATE,
        profitFactor: safeNumber(result.profitFactor),
        totalPnLUsd: safeNumber(result.totalPnLUsd),
        totalPnLR: safeNumber(result.totalPnLR),
        avgWinR,
        avgWinUsd: avgWinR * USD_TO_R_ESTIMATE,
        avgLossR,
        avgLossUsd: Math.abs(avgLossR) * USD_TO_R_ESTIMATE,
        maxDrawdownUsd: safeNumber(result.maxDrawdownUsd),
        maxDrawdownR: safeNumber(result.maxDrawdownR),
      };
    }
    return {
      winRate: 0,
      expectancy: 0,
      expectancyUsd: 0,
      profitFactor: 0,
      totalPnLUsd: 0,
      totalPnLR: 0,
      avgWinR: 0,
      avgWinUsd: 0,
      avgLossR: 0,
      avgLossUsd: 0,
      maxDrawdownUsd: 0,
      maxDrawdownR: 0,
    };
  }, [filteredTrades]);

  // Calculate additional stats directly from trades
  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.outcome === Outcome.WIN);
    const losses = filteredTrades.filter(t => t.outcome === Outcome.LOSS);
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const largestWinR = wins.length > 0 ? Math.max(...wins.map(t => safeNumber(t.resultR))) : 0;
    const largestWinUsd = wins.length > 0 ? Math.max(...wins.map(t => safeNumber(t.resultUsd))) : 0;
    const largestLossR = losses.length > 0 ? Math.min(...losses.map(t => safeNumber(t.resultR))) : 0;
    const largestLossUsd = losses.length > 0 ? Math.min(...losses.map(t => safeNumber(t.resultUsd))) : 0;
    return { totalTrades, totalWins, totalLosses, largestWinR, largestWinUsd, largestLossR, largestLossUsd };
  }, [filteredTrades]);

  const cumulativePnL = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    
    const sorted = [...filteredTrades].sort((a, b) => 
      parseISO(a.tradeDate).getTime() - parseISO(b.tradeDate).getTime()
    );
    
    let cumulativeR = 0;
    let cumulativeUsd = 0;
    return sorted.map((trade) => {
      cumulativeR += safeNumber(trade.resultR);
      cumulativeUsd += safeNumber(trade.resultUsd);
      return { 
        date: parseISO(trade.tradeDate), 
        valueR: cumulativeR,
        valueUsd: cumulativeUsd,
        value: currency === 'USD' ? cumulativeUsd : cumulativeR,
      };
    });
  }, [filteredTrades, currency]);

  const distributionData = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    
    const wins = filteredTrades.filter(t => t.outcome === Outcome.WIN).length;
    const losses = filteredTrades.filter(t => t.outcome === Outcome.LOSS).length;
    const breakeven = filteredTrades.filter(t => t.outcome === Outcome.BREAKEVEN).length;
    
    const data = [];
    if (wins > 0) data.push({
      name: `Wins ${wins}`,
      count: wins,
      color: designColors.semantic.success,
      legendFontColor: colors.text,
      legendFontSize: 12,
    });
    if (losses > 0) data.push({
      name: `Losses ${losses}`,
      count: losses,
      color: designColors.semantic.error,
      legendFontColor: colors.text,
      legendFontSize: 12,
    });
    if (breakeven > 0) data.push({
      name: `BE ${breakeven}`,
      count: breakeven,
      color: colors.textTertiary,
      legendFontColor: colors.text,
      legendFontSize: 12,
    });
    
    return data;
  }, [filteredTrades, colors]);

  const dayOfWeekData = useMemo(() => {
    if (filteredTrades.length === 0) return { labels: [], datasets: [{ data: [0] }] };
    
    const dayTotals = [0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0];
    
    filteredTrades.forEach(trade => {
      const day = parseISO(trade.tradeDate).getDay();
      if (day >= 1 && day <= 5) {
        dayTotals[day - 1] += safeNumber(trade.resultUsd);
        dayCounts[day - 1]++;
      }
    });
    
    const avgByDay = dayTotals.map((total, i) => 
      dayCounts[i] > 0 ? total / dayCounts[i] : 0
    );
    
    // Ensure at least one non-zero value for chart
    const hasData = avgByDay.some(v => v !== 0);
    
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [{ data: hasData ? avgByDay.map(v => v === 0 ? 0.01 : v) : [0.01, 0.01, 0.01, 0.01, 0.01] }],
    };
  }, [filteredTrades]);

  // Show premium skeleton while loading
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          {/* Filter tabs skeleton */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }}>
            <SkeletonLoader height={40} borderRadius={20} delay={0} style={{ flex: 1 }} />
            <SkeletonLoader height={40} borderRadius={20} delay={50} style={{ flex: 1 }} />
            <SkeletonLoader height={40} borderRadius={20} delay={100} style={{ flex: 1 }} />
          </View>
          {/* Main metric */}
          <SkeletonLoader variant="card" height={120} delay={150} style={{ marginBottom: spacing.lg }} />
          {/* Metric row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
            <SkeletonLoader variant="card" height={100} delay={200} style={{ flex: 1 }} />
            <SkeletonLoader variant="card" height={100} delay={250} style={{ flex: 1 }} />
          </View>
          {/* Metric grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xl }}>
            <SkeletonLoader variant="card" height={80} delay={300} style={{ width: '31%' }} />
            <SkeletonLoader variant="card" height={80} delay={350} style={{ width: '31%' }} />
            <SkeletonLoader variant="card" height={80} delay={400} style={{ width: '31%' }} />
            <SkeletonLoader variant="card" height={80} delay={450} style={{ width: '31%' }} />
            <SkeletonLoader variant="card" height={80} delay={500} style={{ width: '31%' }} />
            <SkeletonLoader variant="card" height={80} delay={550} style={{ width: '31%' }} />
          </View>
          {/* Charts */}
          <SkeletonLoader variant="text" width={150} delay={600} style={{ marginBottom: spacing.md }} />
          <SkeletonLoader variant="chart" delay={650} style={{ marginBottom: spacing.lg }} />
          <SkeletonLoader variant="chart" delay={750} />
        </View>
      </View>
    );
  }

  if (allTrades.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Add trades to see analytics
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', '30', '90'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterTab,
                dateRange === range && { backgroundColor: colors.text },
                dateRange !== range && { backgroundColor: colors.surfaceElevated }
              ]}
              onPress={() => setDateRange(range)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                { color: dateRange === range ? '#FFFFFF' : colors.text }
              ]}>
                {range === 'all' ? 'All Time' : `${range} Days`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Stats */}
        <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
        <View style={styles.metricsSection}>
          <View style={[styles.metricLarge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.metricLargeLabel, { color: colors.textSecondary }]}>Total P&L</Text>
            <Text 
              style={[
                styles.metricLargeValue,
                { color: metrics.totalPnLUsd >= 0 ? designColors.semantic.success : designColors.semantic.error }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(metrics.totalPnLR, metrics.totalPnLUsd, currency, { showSign: true, decimals: currency === 'R' ? 2 : 2 })}
            </Text>
            <Text style={[styles.metricLargeSub, { color: colors.textTertiary }]}>
              {stats.totalTrades} trades
            </Text>
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metricMedium, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricMediumLabel, { color: colors.textSecondary }]}>Win Rate</Text>
              <Text style={[styles.metricMediumValue, { color: colors.text }]}>
                {safeFixed(metrics.winRate, 1)}%
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(metrics.winRate, 100)}%`,
                      backgroundColor: metrics.winRate >= 50 ? designColors.semantic.success : designColors.semantic.error
                    }
                  ]}
                />
              </View>
            </View>

            <View style={[styles.metricMedium, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricMediumLabel, { color: colors.textSecondary }]}>Expectancy</Text>
              <Text style={[styles.metricMediumValue, { color: colors.text }]}>
                {formatCurrency(metrics.expectancy, metrics.expectancyUsd, currency, { decimals: 2 })}
              </Text>
              <Text style={[
                styles.metricMediumTag,
                { color: metrics.expectancy >= 0 ? designColors.semantic.success : designColors.semantic.error }
              ]}>
                {metrics.expectancy >= 0 ? 'Positive' : 'Negative'}
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Profit Factor</Text>
              <Text 
                style={[styles.metricSmallValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {metrics.profitFactor === Infinity ? '∞' : safeFixed(metrics.profitFactor, 2)}
              </Text>
            </View>

            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Avg Win</Text>
              <Text 
                style={[styles.metricSmallValue, { color: designColors.semantic.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatCurrency(metrics.avgWinR, metrics.avgWinUsd, currency, { decimals: 2 })}
              </Text>
            </View>

            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Avg Loss</Text>
              <Text 
                style={[styles.metricSmallValue, { color: designColors.semantic.error }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatCurrency(Math.abs(metrics.avgLossR), metrics.avgLossUsd, currency, { decimals: 2 })}
              </Text>
            </View>

            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Best Trade</Text>
              <Text 
                style={[styles.metricSmallValue, { color: designColors.semantic.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatCurrency(stats.largestWinR, stats.largestWinUsd, currency, { decimals: 2 })}
              </Text>
            </View>

            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Worst Trade</Text>
              <Text 
                style={[styles.metricSmallValue, { color: designColors.semantic.error }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatCurrency(Math.abs(stats.largestLossR), Math.abs(stats.largestLossUsd), currency, { decimals: 2 })}
              </Text>
            </View>

            <View style={[styles.metricSmall, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricSmallLabel, { color: colors.textTertiary }]}>Max DD</Text>
              <Text 
                style={[styles.metricSmallValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatCurrency(metrics.maxDrawdownR, metrics.maxDrawdownUsd, currency, { decimals: 2 })}
              </Text>
            </View>
          </View>
        </View>
        </Animated.View>

        {/* Charts Section */}
        <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
        <View style={styles.chartsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Charts</Text>

          {/* Cumulative P&L */}
          {cumulativePnL.length > 1 && (
            <View style={[styles.chartCard, { 
              backgroundColor: isDark ? colors.surface : colors.surface,
            }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Cumulative P&L</Text>
              <View style={styles.chartWrapper}>
                <LineChart
                  data={{
                    labels: cumulativePnL
                      .filter((_, i) => i === 0 || i === cumulativePnL.length - 1 || i % Math.ceil(cumulativePnL.length / 4) === 0)
                      .map(d => format(d.date, 'MMM d')),
                    datasets: [{
                      data: cumulativePnL.map(d => d.value),
                      color: (opacity = 1) => {
                        const lastValue = cumulativePnL[cumulativePnL.length - 1]?.value ?? 0;
                        return lastValue >= 0 
                          ? `rgba(16, 185, 129, 1)` 
                          : `rgba(239, 68, 68, 1)`;
                      },
                      strokeWidth: 2,
                    }],
                  }}
                  width={chartWidth + 32}
                  height={200}
                  chartConfig={{
                    backgroundColor: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientFrom: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientTo: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientFrom: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientTo: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientOpacity: 0,
                    decimalPlaces: 0,
                    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.1})` : `rgba(0, 0, 0, ${opacity * 0.1})`,
                    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.6})` : `rgba(0, 0, 0, ${opacity * 0.6})`,
                    propsForDots: { r: '0' },
                    propsForBackgroundLines: {
                      stroke: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      strokeWidth: 1,
                    },
                    propsForVerticalLabels: {
                      fontSize: 10,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withInnerLines={true}
                  withOuterLines={false}
                  segments={3}
                  formatYLabel={(value) => {
                    const numValue = parseFloat(value);
                    return currency === 'USD' 
                      ? `$${numValue.toFixed(0)}`
                      : `${numValue.toFixed(0)}R`;
                  }}
                />
              </View>
            </View>
          )}

          {/* Win/Loss Distribution */}
          {distributionData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Win/Loss Distribution</Text>
              <View style={styles.pieContainer}>
                <PieChart
                  data={distributionData}
                  width={chartWidth}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  }}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  hasLegend={true}
                />
              </View>
            </View>
          )}

          {/* Day of Week Performance */}
          {dayOfWeekData.datasets[0].data.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Avg P&L by Day</Text>
              <View style={styles.chartWrapper}>
                <BarChart
                  data={dayOfWeekData}
                  width={chartWidth + 32}
                  height={200}
                  yAxisLabel={currency === 'USD' ? '$' : ''}
                  yAxisSuffix={currency === 'USD' ? '' : 'R'}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.5})` : `rgba(0, 0, 0, ${opacity * 0.5})`,
                    propsForBackgroundLines: {
                      stroke: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                      strokeWidth: 1,
                    },
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars={false}
                  fromZero
                  segments={3}
                />
              </View>
            </View>
          )}
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 16,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsSection: {
    marginBottom: spacing.xl,
  },
  metricLarge: {
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  metricLargeLabel: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  metricLargeValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricLargeSub: {
    fontSize: 13,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricMedium: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
  },
  metricMediumLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricMediumValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricMediumTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricSmall: {
    width: (width - spacing.md * 2 - spacing.sm * 2) / 3,
    padding: spacing.md,
    borderRadius: 12,
    ...shadows.sm,
  },
  metricSmallLabel: {
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  metricSmallValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chartWrapper: {
    alignItems: 'center',
    marginHorizontal: -spacing.md,
    overflow: 'hidden',
    borderRadius: 12,
  },
  chart: {
    borderRadius: 12,
  },
  pieContainer: {
    alignItems: 'center',
  },
});
