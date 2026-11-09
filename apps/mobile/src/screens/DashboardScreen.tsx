import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Switch, Animated, Platform, UIManager, Modal } from 'react-native';
import { lightHaptic, selectionHaptic } from '../lib/haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useStorage } from '../contexts/StorageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { calculateAllMetrics, calculateDisciplineScore, Outcome, AssetClass } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { AnimatedView } from '../components/AnimatedView';
import { FAB } from '../components/FAB';
import { EnhancedEmptyState } from '../components/EnhancedEmptyState';
import { colors as designColors, spacing, shadows, borderRadius, typography } from '../design/theme';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../lib/currency';
import { format, isToday, startOfDay } from 'date-fns';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || isNaN(value)) return 0;
  return value;
};

// Get display symbol from trade based on asset class
const getTradeSymbol = (trade: Trade): string => {
  if (trade.assetClass === AssetClass.FUTURES) {
    return (trade as FuturesTrade).instrumentRoot || 'Unknown';
  } else if (trade.assetClass === AssetClass.OPTIONS) {
    return (trade as OptionsTrade).underlying || 'Unknown';
  }
  return 'Unknown';
};

type MetricType = 'winRate' | 'profitFactor' | 'expectancy' | 'maxDD' | null;

export function DashboardScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { trades, isLoading } = useStorage();
  const { currency, toggleCurrency } = useCurrency();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  
  // Metric detail modal
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);

  // Animation for currency change
  const chartOpacity = useRef(new Animated.Value(1)).current;
  const chartScale = useRef(new Animated.Value(1)).current;
  const prevCurrency = useRef(currency);

  useEffect(() => {
    if (prevCurrency.current !== currency) {
      Animated.parallel([
        Animated.timing(chartOpacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(chartScale, { toValue: 0.98, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(chartOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(chartScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
      prevCurrency.current = currency;
    }
  }, [currency]);

  // Today's trades
  const todayStats = useMemo(() => {
    const todayTrades = trades.filter(t => isToday(new Date(t.entryTime)));
    const wins = todayTrades.filter(t => t.outcome === Outcome.WIN);
    const losses = todayTrades.filter(t => t.outcome === Outcome.LOSS);
    const totalPnLUsd = todayTrades.reduce((sum, t) => sum + safeNumber(t.resultUsd), 0);
    const totalPnLR = todayTrades.reduce((sum, t) => sum + safeNumber(t.resultR), 0);
    const winRate = todayTrades.length > 0 ? (wins.length / todayTrades.length) * 100 : 0;
    
    return {
      count: todayTrades.length,
      wins: wins.length,
      losses: losses.length,
      totalPnLUsd,
      totalPnLR,
      winRate,
    };
  }, [trades]);

  // Discipline score
  const disciplineScore = useMemo(() => {
    if (trades.length === 0) return 0;
    return calculateDisciplineScore(trades);
  }, [trades]);

  // All-time metrics with extended details
  const metrics = useMemo(() => {
    if (trades.length > 0) {
      const result = calculateAllMetrics(trades);
      const wins = trades.filter(t => t.outcome === Outcome.WIN);
      const losses = trades.filter(t => t.outcome === Outcome.LOSS);
      const breakeven = trades.filter(t => t.outcome === Outcome.BREAKEVEN);
      
      const totalWinUsd = wins.reduce((sum, t) => sum + safeNumber(t.resultUsd), 0);
      const totalLossUsd = Math.abs(losses.reduce((sum, t) => sum + safeNumber(t.resultUsd), 0));
      const avgWinUsd = wins.length > 0 ? totalWinUsd / wins.length : 0;
      const avgLossUsd = losses.length > 0 
        ? losses.reduce((sum, t) => sum + safeNumber(t.resultUsd), 0) / losses.length 
        : 0;
      const avgWinR = wins.length > 0 
        ? wins.reduce((sum, t) => sum + safeNumber(t.resultR), 0) / wins.length 
        : 0;
      const avgLossR = losses.length > 0 
        ? losses.reduce((sum, t) => sum + safeNumber(t.resultR), 0) / losses.length 
        : 0;
      
      const winRate = safeNumber(result.winRate) / 100;
      const expectancyUsd = (winRate * avgWinUsd) + ((1 - winRate) * avgLossUsd);
      
      // Calculate consecutive wins/losses
      let maxConsecWins = 0, maxConsecLosses = 0, currentWins = 0, currentLosses = 0;
      const sortedTrades = [...trades].sort((a, b) => a.entryTime - b.entryTime);
      sortedTrades.forEach(t => {
        if (t.outcome === Outcome.WIN) {
          currentWins++;
          currentLosses = 0;
          maxConsecWins = Math.max(maxConsecWins, currentWins);
        } else if (t.outcome === Outcome.LOSS) {
          currentLosses++;
          currentWins = 0;
          maxConsecLosses = Math.max(maxConsecLosses, currentLosses);
        }
      });
      
      return {
        // Basic
        winRate: safeNumber(result.winRate),
        expectancy: safeNumber(result.expectancy),
        expectancyUsd,
        profitFactor: safeNumber(result.profitFactor),
        totalPnLUsd: safeNumber(result.totalPnLUsd),
        totalPnLR: safeNumber(result.totalPnLR),
        maxDrawdownUsd: safeNumber(result.maxDrawdownUsd),
        maxDrawdownR: safeNumber(result.maxDrawdownR),
        // Extended for modals
        totalTrades: trades.length,
        totalWins: wins.length,
        totalLosses: losses.length,
        totalBreakeven: breakeven.length,
        totalWinUsd,
        totalLossUsd,
        avgWinUsd,
        avgLossUsd: Math.abs(avgLossUsd),
        avgWinR,
        avgLossR: Math.abs(avgLossR),
        maxConsecWins,
        maxConsecLosses,
      };
    }
    return {
      winRate: 0, expectancy: 0, expectancyUsd: 0, profitFactor: 0,
      totalPnLUsd: 0, totalPnLR: 0, maxDrawdownUsd: 0, maxDrawdownR: 0,
      totalTrades: 0, totalWins: 0, totalLosses: 0, totalBreakeven: 0,
      totalWinUsd: 0, totalLossUsd: 0, avgWinUsd: 0, avgLossUsd: 0,
      avgWinR: 0, avgLossR: 0, maxConsecWins: 0, maxConsecLosses: 0,
    };
  }, [trades]);

  // Recent trades (last 5)
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => b.entryTime - a.entryTime)
      .slice(0, 5);
  }, [trades]);

  // Cumulative P&L for sparkline
  const cumulativePnL = useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => a.entryTime - b.entryTime);
    let cumulative = 0;
    return sorted.map((trade) => {
      cumulative += currency === 'USD' ? safeNumber(trade.resultUsd) : safeNumber(trade.resultR);
      return cumulative;
    });
  }, [trades, currency]);

  // Insights calculation
  const insights = useMemo(() => {
    if (trades.length < 10) return null;
    
    const morningTrades = trades.filter(t => {
      const hour = new Date(t.entryTime).getHours();
      return hour >= 6 && hour < 12;
    });
    const afternoonTrades = trades.filter(t => {
      const hour = new Date(t.entryTime).getHours();
      return hour >= 12 && hour < 18;
    });
    
    const morningWinRate = morningTrades.length > 0 
      ? (morningTrades.filter(t => t.outcome === Outcome.WIN).length / morningTrades.length) * 100 
      : 0;
    const afternoonWinRate = afternoonTrades.length > 0 
      ? (afternoonTrades.filter(t => t.outcome === Outcome.WIN).length / afternoonTrades.length) * 100 
      : 0;
    
    if (morningTrades.length >= 5 && afternoonTrades.length >= 5) {
      const diff = morningWinRate - afternoonWinRate;
      if (Math.abs(diff) >= 10) {
        return {
          text: diff > 0 
            ? `Morning trades: +${Math.abs(diff).toFixed(0)}% better win rate`
            : `Afternoon trades: +${Math.abs(diff).toFixed(0)}% better win rate`,
          positive: true,
        };
      }
    }
    return null;
  }, [trades]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerGreeting, { color: colors.textTertiary }]}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
          </Text>
        </View>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <EnhancedEmptyState
          icon={<Text style={{ fontSize: 48, fontWeight: '700' }}>📈</Text>}
          title="Welcome to TRDE"
          message="Your trading edge starts here. Log your first trade to begin tracking your performance."
          bulletPoints={[
            'Track every trade with detailed metrics',
            'Build discipline with risk management',
            'Find your edge through analytics',
          ]}
          primaryAction={{
            label: 'Log First Trade',
            onPress: () => navigation.navigate('Trades', { screen: 'NewTrade' }),
          }}
        />
      </SafeAreaView>
    );
  }

  const todayProfitable = todayStats.totalPnLUsd >= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerGreeting, { color: colors.textTertiary }]}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
          </Text>
        </View>
        <View style={styles.currencyToggle}>
          <Text style={[styles.currencyLabel, { color: currency === 'R' ? colors.text : colors.textTertiary }]}>R</Text>
          <Switch
            value={currency === 'USD'}
            onValueChange={toggleCurrency}
            trackColor={{ false: colors.border, true: designColors.accent.main }}
            thumbColor="#FFFFFF"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
          <Text style={[styles.currencyLabel, { color: currency === 'USD' ? colors.text : colors.textTertiary }]}>$</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero Card - TODAY */}
        <AnimatedView fadeIn slideIn="up" delay={0}>
          <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
            <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>TODAY</Text>
              
              <Text 
                style={[
                  styles.heroValue, 
                  { color: todayStats.count === 0 ? colors.textTertiary : todayProfitable ? designColors.semantic.success : designColors.semantic.error }
                ]} 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.6}
              >
                {todayStats.count === 0 
                  ? 'No trades yet'
                  : formatCurrency(todayStats.totalPnLR, todayStats.totalPnLUsd, currency, { showSign: true, decimals: 2 })
                }
              </Text>
              
              <View style={styles.heroMeta}>
                <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>
                  {todayStats.count} trade{todayStats.count !== 1 ? 's' : ''} · {todayStats.wins}W / {todayStats.losses}L
                </Text>
              </View>
              
              {todayStats.count > 0 && (
                <View style={styles.heroWinRateBar}>
                  <View style={[styles.winRateTrack, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.winRateFill, 
                        { 
                          width: `${todayStats.winRate}%`,
                          backgroundColor: todayStats.winRate >= 50 ? designColors.semantic.success : designColors.semantic.error 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.winRateLabel, { color: colors.textTertiary }]}>
                    {safeFixed(todayStats.winRate, 0)}% win rate
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </AnimatedView>

        {/* Quick Actions Card */}
        <AnimatedView fadeIn slideIn="up" delay={100}>
          <View style={[styles.quickActionsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.quickActionsTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  lightHaptic()
                  navigation.navigate('Trades', { screen: 'NewTrade' })
                }}
                activeOpacity={0.7}
              >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={designColors.accent.main} strokeWidth={2}>
                  <Path d="M12 5v14m7-7H5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>Log Trade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  lightHaptic()
                  navigation.navigate('Journal')
                }}
                activeOpacity={0.7}
              >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={designColors.accent.main} strokeWidth={2}>
                  <Path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>Journal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  lightHaptic()
                  navigation.navigate('You', { screen: 'Risk' })
                }}
                activeOpacity={0.7}
              >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={designColors.accent.main} strokeWidth={2}>
                  <Path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>Risk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedView>

        {/* Key Metrics Row - 4 items horizontal, tappable */}
        <AnimatedView fadeIn slideIn="up" delay={50}>
          <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
            <View style={styles.metricsRow}>
              <TouchableOpacity 
                style={[styles.metricItem, { backgroundColor: colors.surface }]}
                onPress={() => { selectionHaptic(); setSelectedMetric('winRate'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>WIN RATE</Text>
                <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {safeFixed(metrics.winRate, 1)}%
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.metricItem, { backgroundColor: colors.surface }]}
                onPress={() => { selectionHaptic(); setSelectedMetric('profitFactor'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>PROFIT F.</Text>
                <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {metrics.profitFactor === Infinity ? '∞' : safeFixed(metrics.profitFactor, 2)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.metricItem, { backgroundColor: colors.surface }]}
                onPress={() => { selectionHaptic(); setSelectedMetric('expectancy'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>EXPECT.</Text>
                <Text 
                  style={[styles.metricValue, { color: metrics.expectancy >= 0 ? designColors.semantic.success : designColors.semantic.error }]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.5}
                >
                  {formatCurrency(metrics.expectancy, metrics.expectancyUsd, currency, { decimals: 1, showSign: true })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.metricItem, { backgroundColor: colors.surface }]}
                onPress={() => { selectionHaptic(); setSelectedMetric('maxDD'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>MAX DD</Text>
                <Text style={[styles.metricValue, { color: designColors.semantic.error }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {formatCurrency(metrics.maxDrawdownR, metrics.maxDrawdownUsd, currency, { decimals: 0 })}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </AnimatedView>

        {/* Risk Health Widget */}
        <AnimatedView fadeIn slideIn="up" delay={150}>
          <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
            <TouchableOpacity
              style={[styles.riskHealthCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                selectionHaptic()
                navigation.navigate('You', { screen: 'Risk' })
              }}
              activeOpacity={0.7}
            >
              <View style={styles.riskHealthHeader}>
                <Text style={[styles.riskHealthTitle, { color: colors.text }]}>Risk Health</Text>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                  <Path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              
              <View style={styles.riskHealthContent}>
                <View style={styles.riskScoreContainer}>
                  <Text style={[
                    styles.riskScoreValue, 
                    { color: disciplineScore >= 80 ? designColors.semantic.success : disciplineScore >= 60 ? designColors.semantic.warning : designColors.semantic.error }
                  ]}>
                    {disciplineScore.toFixed(0)}
                  </Text>
                  <Text style={[styles.riskScoreLabel, { color: colors.textSecondary }]}>
                    Discipline Score
                  </Text>
                </View>
                
                <View style={styles.riskMeta}>
                  <Text style={[styles.riskMetaText, { color: colors.textSecondary }]}>
                    {disciplineScore >= 80 ? '✓ Excellent discipline' : disciplineScore >= 60 ? '⚠ Good, keep improving' : '⚠ Review your rules'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </AnimatedView>

        {/* Equity Curve Sparkline */}
        {cumulativePnL.length > 1 && (
          <AnimatedView fadeIn slideIn="up" delay={100}>
            <TouchableOpacity
              style={[styles.equityCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Trades', { screen: 'TrackMain', params: { initialTab: 'analytics' } })}
              activeOpacity={0.7}
            >
              <View style={styles.equityHeader}>
                <Text style={[styles.equityTitle, { color: colors.text }]}>Equity Curve</Text>
                <Text style={[styles.equityLink, { color: colors.textSecondary }]}>View Analytics →</Text>
              </View>
              
              <View style={styles.sparklineContainer}>
                <LineChart
                  data={{
                    labels: [],
                    datasets: [{ 
                      data: cumulativePnL.length > 50 
                        ? cumulativePnL.filter((_, i) => i % Math.ceil(cumulativePnL.length / 50) === 0)
                        : cumulativePnL,
                      color: () => cumulativePnL[cumulativePnL.length - 1] >= 0 
                        ? designColors.semantic.success 
                        : designColors.semantic.error,
                      strokeWidth: 2,
                    }],
                  }}
                  width={width - spacing.md * 4}
                  height={80}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    fillShadowGradientFrom: cumulativePnL[cumulativePnL.length - 1] >= 0 
                      ? designColors.semantic.success 
                      : designColors.semantic.error,
                    fillShadowGradientTo: colors.surface,
                    fillShadowGradientFromOpacity: 0.2,
                    fillShadowGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: () => 'transparent',
                    labelColor: () => 'transparent',
                    propsForDots: { r: '0' },
                    propsForBackgroundLines: { stroke: 'transparent' },
                  }}
                  withVerticalLines={false}
                  withHorizontalLines={false}
                  withInnerLines={false}
                  withOuterLines={false}
                  bezier
                  style={{ paddingRight: 0 }}
                />
              </View>
              
              <Text style={[styles.equityTotal, { color: metrics.totalPnLUsd >= 0 ? designColors.semantic.success : designColors.semantic.error }]}>
                All time: {formatCurrency(metrics.totalPnLR, metrics.totalPnLUsd, currency, { showSign: true, decimals: 2 })}
              </Text>
            </TouchableOpacity>
          </AnimatedView>
        )}

        {/* Recent Trades - Horizontal ScrollView */}
        {recentTrades.length > 0 && (
          <AnimatedView fadeIn slideIn="up" delay={150}>
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trades</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Trades', { screen: 'TrackMain', params: { initialTab: 'trades' } })}>
                  <Text style={[styles.seeAllLink, { color: colors.textSecondary }]}>See All →</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentTradesScroll}
              >
                {recentTrades.map((trade) => {
                  const pnlUsd = safeNumber(trade.resultUsd);
                  const pnlR = safeNumber(trade.resultR);
                  const isWin = pnlUsd >= 0;
                  
                  return (
                    <TouchableOpacity
                      key={trade.id}
                      style={[
                        styles.recentTradeCard,
                        { 
                          backgroundColor: colors.surface,
                          borderLeftColor: isWin ? designColors.semantic.success : designColors.semantic.error,
                        }
                      ]}
                      onPress={() => navigation.navigate('Trades', { screen: 'TradeDetail', params: { id: trade.id } })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.recentTradeSymbol, { color: colors.text }]}>
                        {getTradeSymbol(trade)}
                      </Text>
                      <Text style={[
                        styles.recentTradePnl, 
                        { color: isWin ? designColors.semantic.success : designColors.semantic.error }
                      ]}>
                        {formatCurrency(pnlR, pnlUsd, currency, { showSign: true, decimals: currency === 'USD' ? 0 : 2 })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </AnimatedView>
        )}

        {/* Insights Card */}
        {insights && (
          <AnimatedView fadeIn slideIn="up" delay={200}>
            <View style={[styles.insightCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.insightLabel, { color: colors.textTertiary }]}>INSIGHT</Text>
              <Text style={[styles.insightText, { color: colors.text }]}>{insights.text}</Text>
            </View>
          </AnimatedView>
        )}
      </ScrollView>

      {/* Metric Detail Modal */}
      <Modal
        visible={selectedMetric !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMetric(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedMetric === 'winRate' && 'Win Rate'}
                  {selectedMetric === 'profitFactor' && 'Profit Factor'}
                  {selectedMetric === 'expectancy' && 'Expectancy'}
                  {selectedMetric === 'maxDD' && 'Max Drawdown'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMetric(null)}>
                  <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <View style={styles.modalBody}>
                {/* Win Rate Details */}
                {selectedMetric === 'winRate' && (
                  <>
                    <Text style={[styles.modalMainValue, { color: colors.text }]}>
                      {safeFixed(metrics.winRate, 1)}%
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      Percentage of trades that resulted in a profit
                    </Text>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Total Trades</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{metrics.totalTrades}</Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Winning Trades</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.success }]}>{metrics.totalWins}</Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Losing Trades</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>{metrics.totalLosses}</Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Breakeven</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{metrics.totalBreakeven}</Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Max Consecutive Wins</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.success }]}>{metrics.maxConsecWins}</Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Max Consecutive Losses</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>{metrics.maxConsecLosses}</Text>
                    </View>
                  </>
                )}

                {/* Profit Factor Details */}
                {selectedMetric === 'profitFactor' && (
                  <>
                    <Text style={[styles.modalMainValue, { color: colors.text }]}>
                      {metrics.profitFactor === Infinity ? '∞' : safeFixed(metrics.profitFactor, 2)}
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      Ratio of gross profit to gross loss. Above 1.5 is good, above 2.0 is excellent.
                    </Text>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Total Gross Profit</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.success }]}>
                        ${safeFixed(metrics.totalWinUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Total Gross Loss</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>
                        ${safeFixed(metrics.totalLossUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Average Win</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.success }]}>
                        ${safeFixed(metrics.avgWinUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Average Loss</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>
                        ${safeFixed(metrics.avgLossUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={[styles.modalNote, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.modalNoteText, { color: colors.textSecondary }]}>
                        {metrics.profitFactor >= 2 
                          ? '✓ Excellent - Your wins significantly outweigh your losses'
                          : metrics.profitFactor >= 1.5 
                          ? '✓ Good - Keep maintaining this ratio'
                          : metrics.profitFactor >= 1 
                          ? '⚠ Marginal - Consider improving win size or reducing losses'
                          : '✗ Below 1 - Losses exceed profits, review your strategy'}
                      </Text>
                    </View>
                  </>
                )}

                {/* Expectancy Details */}
                {selectedMetric === 'expectancy' && (
                  <>
                    <Text style={[styles.modalMainValue, { color: metrics.expectancy >= 0 ? designColors.semantic.success : designColors.semantic.error }]}>
                      {formatCurrency(metrics.expectancy, metrics.expectancyUsd, currency, { showSign: true, decimals: 2 })}
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      Average {currency === 'USD' ? 'dollars' : 'R'} you can expect to make per trade over time.
                    </Text>
                    <View style={styles.modalDivider} />
                    <Text style={[styles.modalFormulaLabel, { color: colors.textTertiary }]}>Formula</Text>
                    <Text style={[styles.modalFormula, { color: colors.text }]}>
                      (Win Rate × Avg Win) + (Loss Rate × Avg Loss)
                    </Text>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Win Rate</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{safeFixed(metrics.winRate, 1)}%</Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Avg Win ({currency})</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.success }]}>
                        {currency === 'USD' ? `$${safeFixed(metrics.avgWinUsd, 2)}` : `${safeFixed(metrics.avgWinR, 2)}R`}
                      </Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Avg Loss ({currency})</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>
                        {currency === 'USD' ? `-$${safeFixed(metrics.avgLossUsd, 2)}` : `-${safeFixed(metrics.avgLossR, 2)}R`}
                      </Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={[styles.modalNote, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.modalNoteText, { color: colors.textSecondary }]}>
                        {metrics.expectancy > 0 
                          ? '✓ Positive expectancy - Your edge is working'
                          : '✗ Negative expectancy - Review your strategy'}
                      </Text>
                    </View>
                  </>
                )}

                {/* Max Drawdown Details */}
                {selectedMetric === 'maxDD' && (
                  <>
                    <Text style={[styles.modalMainValue, { color: designColors.semantic.error }]}>
                      {formatCurrency(metrics.maxDrawdownR, metrics.maxDrawdownUsd, currency, { decimals: 2 })}
                    </Text>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      The largest peak-to-trough decline in your account equity.
                    </Text>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Max DD (USD)</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>
                        ${safeFixed(metrics.maxDrawdownUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Max DD (R)</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>
                        {safeFixed(metrics.maxDrawdownR, 2)}R
                      </Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Total P&L</Text>
                      <Text style={[styles.modalStatValue, { color: metrics.totalPnLUsd >= 0 ? designColors.semantic.success : designColors.semantic.error }]}>
                        ${safeFixed(metrics.totalPnLUsd, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalStatRow}>
                      <Text style={[styles.modalStatLabel, { color: colors.textTertiary }]}>Max Consec. Losses</Text>
                      <Text style={[styles.modalStatValue, { color: designColors.semantic.error }]}>{metrics.maxConsecLosses}</Text>
                    </View>
                    <View style={styles.modalDivider} />
                    <View style={[styles.modalNote, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.modalNoteText, { color: colors.textSecondary }]}>
                        💡 Understanding your max drawdown helps you size positions appropriately and prepare mentally for losing streaks.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FAB onPress={() => navigation.navigate('Trades', { screen: 'NewTrade' })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerGreeting: {
    ...typography.h3,
  },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyLabel: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 48,
    fontWeight: '700',
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  emptyButtonText: {
    ...typography.bodyBold,
  },
  
  // Hero Card - TODAY
  heroCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  heroLabel: {
    ...typography.micro,
    marginBottom: spacing.sm,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    marginBottom: spacing.md,
  },
  heroMetaText: {
    ...typography.bodySmall,
  },
  heroWinRateBar: {
    gap: spacing.xs,
  },
  winRateTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  winRateFill: {
    height: 6,
    borderRadius: 3,
  },
  winRateLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  
  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricLabel: {
    ...typography.micro,
    fontSize: 9,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Equity Curve
  equityCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  equityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  equityTitle: {
    ...typography.bodyBold,
  },
  equityLink: {
    ...typography.caption,
  },
  sparklineContainer: {
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.sm,
  },
  equityTotal: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  
  // Recent Trades
  recentSection: {
    gap: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
  },
  seeAllLink: {
    ...typography.bodySmall,
  },
  recentTradesScroll: {
    gap: spacing.sm,
  },
  recentTradeCard: {
    width: 100,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    alignItems: 'center',
    ...shadows.sm,
  },
  recentTradeSymbol: {
    ...typography.bodyBold,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  recentTradePnl: {
    ...typography.h5,
    fontSize: 15,
  },
  
  // Insights
  insightCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  insightLabel: {
    ...typography.micro,
    marginBottom: spacing.xs,
  },
  insightText: {
    ...typography.body,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h4,
  },
  modalClose: {
    ...typography.bodyMedium,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalMainValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: spacing.md,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  modalStatLabel: {
    ...typography.bodySmall,
  },
  modalStatValue: {
    ...typography.bodyBold,
  },
  modalFormulaLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  modalFormula: {
    ...typography.body,
    fontStyle: 'italic',
  },
  modalNote: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  modalNoteText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  
  // Quick Actions Card
  quickActionsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  quickActionsTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  
  // Risk Health Widget
  riskHealthCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  riskHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riskHealthTitle: {
    ...typography.h5,
  },
  riskHealthContent: {
    gap: spacing.sm,
  },
  riskScoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  riskScoreValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  riskScoreLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskMeta: {
    alignItems: 'center',
  },
  riskMetaText: {
    ...typography.bodySmall,
  },
});
