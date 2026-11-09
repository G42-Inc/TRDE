import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, Animated, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import { useStorage } from '../contexts/StorageContext';
import { calculateDisciplineScore, calculateRiskCreep } from '@trde/core';
import type { Trade, RuleViolation } from '@trde/core';
import { Outcome } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../lib/currency';
import { format } from 'date-fns';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';

// Helper to get readable rule names
const RULE_NAMES: Record<string, string> = {
  respectedDailyLossLimit: 'Daily Loss Limit',
  respectedMaxTrades: 'Max Trades/Day',
  respectedMaxContracts: 'Max Position Size',
  hadStopDefined: 'Stop Loss Required',
  followedEntryRules: 'Entry Rules',
  followedExitRules: 'Exit Rules',
  journalCompleted: 'Journal Entry',
};

function getRuleName(ruleKey: string): string {
  return RULE_NAMES[ruleKey] || ruleKey;
}

const { width } = Dimensions.get('window');
// Chart width accounts for: content padding (md*2) + chart card padding (md*2) + extra margin
const chartWidth = width - spacing.md * 4 - 16;

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || isNaN(value)) return 0;
  return value;
};

const USD_TO_R_ESTIMATE = 44; // 1R ≈ $44 for display when only USD is available

function calculateRiskStats(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      avgRiskPerTrade: 0,
      avgRiskPerTradeR: 0,
      maxRiskPerTrade: 0,
      maxRiskPerTradeR: 0,
      minRiskPerTrade: 0,
      minRiskPerTradeR: 0,
      totalRisk: 0,
      totalRiskR: 0,
      avgRiskPerWin: 0,
      avgRiskPerLoss: 0,
      largestLoss: 0,
      largestLossR: 0,
      consecutiveLosses: 0,
    };
  }

  const risks = trades.map(t => safeNumber(t.plannedRiskUsd));
  const wins = trades.filter(t => t.outcome === Outcome.WIN);
  const losses = trades.filter(t => t.outcome === Outcome.LOSS);
  
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  for (const trade of trades.sort((a, b) => a.entryTime - b.entryTime)) {
    if (trade.outcome === Outcome.LOSS) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  const lossAmounts = losses.map(t => safeNumber(t.resultUsd));
  const lossRs = losses.map(t => safeNumber(t.resultR));
  const largestLoss = lossAmounts.length > 0 ? Math.min(...lossAmounts) : 0;
  const largestLossR = lossRs.length > 0 ? Math.min(...lossRs) : 0;

  const avgRiskPerTrade = risks.reduce((a, b) => a + b, 0) / risks.length;
  const maxRiskPerTrade = risks.length > 0 ? Math.max(...risks) : 0;
  const minRiskPerTrade = risks.length > 0 ? Math.min(...risks) : 0;
  const totalRisk = risks.reduce((a, b) => a + b, 0);
  
  return {
    avgRiskPerTrade,
    avgRiskPerTradeR: avgRiskPerTrade / USD_TO_R_ESTIMATE,
    maxRiskPerTrade,
    maxRiskPerTradeR: maxRiskPerTrade / USD_TO_R_ESTIMATE,
    minRiskPerTrade,
    minRiskPerTradeR: minRiskPerTrade / USD_TO_R_ESTIMATE,
    totalRisk,
    totalRiskR: totalRisk / USD_TO_R_ESTIMATE,
    avgRiskPerWin: wins.length > 0 ? wins.reduce((sum, t) => sum + safeNumber(t.plannedRiskUsd), 0) / wins.length : 0,
    avgRiskPerLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + safeNumber(t.plannedRiskUsd), 0) / losses.length : 0,
    largestLoss,
    largestLossR,
    consecutiveLosses: maxConsecutive,
  };
}

export function RiskScreen({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { trades, strategies, ruleViolations: violations, saveRuleViolations, isLoading } = useStorage();
  const { currency } = useCurrency();
  const [reviewingViolation, setReviewingViolation] = useState<RuleViolation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showDisciplineInfo, setShowDisciplineInfo] = useState(false);

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

  const disciplineScore = calculateDisciplineScore(trades);
  const riskStats = calculateRiskStats(trades);
  const riskCreep = calculateRiskCreep(trades);
  const tradesWithViolations = trades.filter(trade => {
    const violation = violations.find(v => v.tradeId === trade.id && !v.reviewed);
    return violation !== undefined;
  });

  const getRiskCreepChartData = () => {
    if (riskCreep.length === 0) return null;
    
    const dataPoints = riskCreep.slice(-20);
    
    return {
      labels: dataPoints
        .filter((_, i) => i % Math.ceil(dataPoints.length / 5) === 0)
        .map((_, i) => `${i * Math.ceil(dataPoints.length / 5) + 1}`),
      datasets: [{
        data: dataPoints.map(d => d.avgRisk),
        color: (opacity = 1) => `rgba(37, 99, 235, 1)`, // Full opacity for better visibility
        strokeWidth: 2,
      }],
    };
  };

  const handleReviewViolation = async (action: 'acknowledge' | 'dismiss') => {
    if (!reviewingViolation) return;
    
    const updated = violations.map(v => 
      v.id === reviewingViolation.id
        ? { ...v, reviewed: true, reviewedAt: Date.now(), reviewNotes: reviewNotes || undefined }
        : v
    );
    
    await saveRuleViolations(updated);
    setReviewingViolation(null);
    setReviewNotes('');
  };

  const riskCreepChart = getRiskCreepChartData();

  // Show premium skeleton while loading
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.md }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <SkeletonLoader variant="text" width={140} delay={0} />
            <SkeletonLoader variant="text" width={50} height={24} borderRadius={12} delay={30} />
          </View>
          {/* Discipline score card */}
          <SkeletonLoader variant="card" height={220} delay={60} style={{ marginBottom: spacing.xl }} />
          {/* Risk metrics header */}
          <SkeletonLoader variant="text" width={120} delay={150} style={{ marginBottom: spacing.md }} />
          {/* Risk metric grid */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <SkeletonLoader variant="card" height={90} delay={200} style={{ flex: 1 }} />
            <SkeletonLoader variant="card" height={90} delay={250} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <SkeletonLoader variant="card" height={90} delay={300} style={{ flex: 1 }} />
            <SkeletonLoader variant="card" height={90} delay={350} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }}>
            <SkeletonLoader variant="card" height={90} delay={400} style={{ flex: 1 }} />
            <SkeletonLoader variant="card" height={90} delay={450} style={{ flex: 1 }} />
          </View>
          {/* Chart */}
          <SkeletonLoader variant="text" width={180} delay={500} style={{ marginBottom: spacing.md }} />
          <SkeletonLoader variant="chart" delay={550} />
        </View>
      </View>
    );
  }

  if (trades.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Risk Data Yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Add trades to see your risk analytics
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
        {/* Discipline Score */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Discipline Score</Text>
            <TouchableOpacity 
              onPress={() => setShowDisciplineInfo(true)}
              style={[styles.infoButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.infoButtonText, { color: colors.textSecondary }]}>INFO</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.disciplineCard, { backgroundColor: colors.surface }]}>
            <View style={styles.disciplineScoreContainer}>
              <View style={styles.progressChartWrapper}>
                <ProgressChart
                  data={{
                    labels: ['Discipline'],
                    data: [disciplineScore / 100],
                  }}
                  width={chartWidth}
                  height={200}
                  strokeWidth={16}
                  radius={60}
                  chartConfig={{
                    backgroundColor: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientFrom: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientTo: isDark ? '#111111' : '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => {
                      if (disciplineScore >= 80) return `rgba(34, 197, 94, ${opacity})`;
                      if (disciplineScore >= 60) return `rgba(251, 191, 36, ${opacity})`;
                      return `rgba(239, 68, 68, ${opacity})`;
                    },
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  }}
                  hideLegend={true}
                />
              </View>
              <View style={styles.disciplineScoreOverlay}>
                <Text style={[styles.disciplineScoreValue, { color: colors.text }]}>
                  {safeFixed(disciplineScore, 0)}
                </Text>
                <Text style={[styles.disciplineScoreLabel, { color: colors.textSecondary }]}>
                  Score
                </Text>
              </View>
            </View>
            
            {tradesWithViolations.length > 0 && (
              <View style={[styles.violationsAlert, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)' }]}>
                <Text style={[styles.violationsText, { color: designColors.semantic.warning }]}>
                  {tradesWithViolations.length} unreviewed {tradesWithViolations.length === 1 ? 'violation' : 'violations'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Risk Metrics - Clean Grid Style */}
        <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Risk Metrics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>AVG RISK</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {formatCurrency(riskStats.avgRiskPerTradeR, riskStats.avgRiskPerTrade, currency, { decimals: 0 })}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                per trade
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>MAX RISK</Text>
              <Text style={[styles.statValue, { color: designColors.semantic.warning }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {formatCurrency(riskStats.maxRiskPerTradeR, riskStats.maxRiskPerTrade, currency, { decimals: 0 })}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                single trade
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>LARGEST LOSS</Text>
              <Text style={[styles.statValue, { color: designColors.semantic.error }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {formatCurrency(Math.abs(riskStats.largestLossR), Math.abs(riskStats.largestLoss), currency, { decimals: 0 })}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                realized
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>MAX STREAK</Text>
              <Text style={[styles.statValue, { color: designColors.semantic.error }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {riskStats.consecutiveLosses}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                consecutive losses
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>TOTAL RISK</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {formatCurrency(riskStats.totalRiskR, riskStats.totalRisk, currency, { decimals: 0 })}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                all trades
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>RISK RANGE</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {formatCurrency(riskStats.minRiskPerTradeR, riskStats.minRiskPerTrade, currency, { decimals: 0 })}
              </Text>
              <Text style={[styles.statChange, { color: colors.textSecondary }]} numberOfLines={1}>
                to {formatCurrency(riskStats.maxRiskPerTradeR, riskStats.maxRiskPerTrade, currency, { decimals: 0 })}
              </Text>
            </View>
          </View>
        </View>
        </Animated.View>

        {/* Risk Creep Chart */}
        {riskCreepChart && (
          <Animated.View style={{ opacity: chartOpacity, transform: [{ scale: chartScale }] }}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Risk Creep</Text>
            <View style={[styles.chartCard, { backgroundColor: isDark ? '#111111' : '#FFFFFF' }]}>
              <View style={{ alignItems: 'center', marginHorizontal: -spacing.md }}>
                <LineChart
                  data={riskCreepChart}
                  width={width - spacing.md * 2}
                  height={180}
                  chartConfig={{
                    backgroundColor: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientFrom: isDark ? '#111111' : '#FFFFFF',
                    backgroundGradientTo: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientFrom: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientTo: isDark ? '#111111' : '#FFFFFF',
                    fillShadowGradientFromOpacity: 0,
                    fillShadowGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.6})` : `rgba(0, 0, 0, ${opacity * 0.6})`,
                    propsForDots: { r: '0', strokeWidth: '0' },
                    propsForBackgroundLines: {
                      stroke: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      strokeWidth: 1,
                    },
                    propsForVerticalLabels: {
                      fontSize: 10,
                    },
                  }}
                  bezier
                  style={{ borderRadius: 12 }}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withInnerLines={true}
                  withOuterLines={false}
                  segments={3}
                  yAxisLabel={currency === 'USD' ? '$' : ''}
                  yAxisSuffix={currency === 'USD' ? '' : 'R'}
                  formatYLabel={(value) => `${safeFixed(parseFloat(value), 0)}`}
                />
              </View>
              <Text style={[styles.chartCaption, { color: colors.textTertiary }]}>
                20-trade rolling average - monitors risk creep over time
              </Text>
            </View>
          </View>
          </Animated.View>
        )}

        {/* Violations List */}
        {violations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Rule Violations</Text>
              <Badge variant="error" size="sm">
                {violations.filter(v => !v.reviewed).length}
              </Badge>
            </View>
            
            <View style={styles.violationsList}>
              {violations
                .filter(v => !v.reviewed)
                .slice(0, 10)
                .map((violation) => {
                  const trade = trades.find(t => t.id === violation.tradeId);
                  const instrumentName = trade?.assetClass === 'FUTURES' 
                    ? (trade as any).instrumentRoot 
                    : trade?.assetClass === 'OPTIONS' 
                      ? (trade as any).underlying 
                      : 'Unknown';
                  return (
                    <Card key={violation.id} style={styles.violationCard}>
                      <View style={styles.violationHeader}>
                        <View style={styles.violationBadges}>
                          {violation.violatedRules.slice(0, 2).map((rule, idx) => (
                            <Badge key={idx} variant="error" size="sm">
                              {getRuleName(rule)}
                            </Badge>
                          ))}
                          {violation.violatedRules.length > 2 && (
                            <Badge variant="neutral" size="sm">
                              +{violation.violatedRules.length - 2}
                            </Badge>
                          )}
                        </View>
                        {trade && (
                          <Text style={[styles.violationSymbol, { color: colors.text }]}>
                            {instrumentName}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.violationMessage, { color: colors.textSecondary }]}>
                        {violation.violatedRules.length} rule{violation.violatedRules.length > 1 ? 's' : ''} violated
                      </Text>
                      {trade && (
                        <Text style={[styles.violationDate, { color: colors.textTertiary }]}>
                          {format(new Date(trade.entryTime), 'MMM d, yyyy')}
                        </Text>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setReviewingViolation(violation)}
                        style={{ marginTop: spacing.md }}
                      >
                        Review
                      </Button>
                    </Card>
                  );
                })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Discipline Info Modal */}
      <Modal
        visible={showDisciplineInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisciplineInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Discipline Score</Text>
              <TouchableOpacity onPress={() => setShowDisciplineInfo(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                The discipline score measures how well you follow your trading rules and risk management plan.
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                {'\n'}• 80-100: Excellent discipline
                {'\n'}• 60-79: Good, some room for improvement
                {'\n'}• Below 60: Needs attention
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                {'\n'}Violations include oversizing, not using stop losses, revenge trading, and breaking other risk rules.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Violation Modal */}
      <Modal
        visible={!!reviewingViolation}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewingViolation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '70%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Review Violation</Text>
              <TouchableOpacity onPress={() => setReviewingViolation(null)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {reviewingViolation && (() => {
                const violationTrade = trades.find(t => t.id === reviewingViolation.tradeId);
                const instrumentName = violationTrade?.assetClass === 'FUTURES' 
                  ? (violationTrade as any).instrumentRoot 
                  : (violationTrade as any)?.underlying || 'Unknown';
                const strategy = violationTrade ? strategies.find(s => s.id === violationTrade.strategyId) : null;
                
                return (
                  <>
                    {/* Trade Details Section */}
                    <View style={[styles.violationDetail, { backgroundColor: colors.surfaceElevated, marginBottom: spacing.md }]}>
                      <Text style={[styles.violationDetailLabel, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Trade Details</Text>
                      
                      {violationTrade ? (
                        <>
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Symbol</Text>
                            <Text style={[styles.tradeDetailValue, { color: colors.text }]}>{instrumentName}</Text>
                          </View>
                          
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Date</Text>
                            <Text style={[styles.tradeDetailValue, { color: colors.text }]}>
                              {format(new Date(violationTrade.entryTime), 'MMM d, yyyy')}
                            </Text>
                          </View>
                          
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Time</Text>
                            <Text style={[styles.tradeDetailValue, { color: colors.text }]}>
                              {format(new Date(violationTrade.entryTime), 'h:mm a')} → {format(new Date(violationTrade.exitTime), 'h:mm a')}
                            </Text>
                          </View>
                          
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Direction</Text>
                            <Text style={[styles.tradeDetailValue, { color: colors.text }]}>
                              {violationTrade.direction === 'LONG' ? '↑ Long' : '↓ Short'}
                            </Text>
                          </View>
                          
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>P&L</Text>
                            <Text style={[
                              styles.tradeDetailValue, 
                              { color: violationTrade.resultUsd >= 0 ? designColors.semantic.success : designColors.semantic.error }
                            ]}>
                              {currency === 'USD' 
                                ? `${violationTrade.resultUsd >= 0 ? '+' : ''}$${violationTrade.resultUsd.toFixed(2)}`
                                : `${violationTrade.resultR >= 0 ? '+' : ''}${violationTrade.resultR.toFixed(2)}R`
                              }
                            </Text>
                          </View>
                          
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Outcome</Text>
                            <View style={[
                              styles.outcomeBadge,
                              { backgroundColor: violationTrade.outcome === Outcome.WIN ? designColors.success.bg : designColors.error.bg }
                            ]}>
                              <Text style={[
                                styles.outcomeBadgeText,
                                { color: violationTrade.outcome === Outcome.WIN ? designColors.semantic.success : designColors.semantic.error }
                              ]}>
                                {violationTrade.outcome === Outcome.WIN ? 'Win' : 'Loss'}
                              </Text>
                            </View>
                          </View>
                          
                          {strategy && (
                            <View style={styles.tradeDetailRow}>
                              <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Strategy</Text>
                              <Text style={[styles.tradeDetailValue, { color: colors.text }]}>{strategy.name}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <>
                          <View style={styles.tradeDetailRow}>
                            <Text style={[styles.tradeDetailLabelText, { color: colors.textTertiary }]}>Recorded</Text>
                            <Text style={[styles.tradeDetailValue, { color: colors.text }]}>
                              {format(new Date(reviewingViolation.createdAt), 'MMM d, yyyy h:mm a')}
                            </Text>
                          </View>
                          <Text style={[styles.tradeDetailValue, { color: colors.textTertiary, marginTop: spacing.sm, fontStyle: 'italic' }]}>
                            Trade details not available
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Violated Rules Section */}
                    <View style={[styles.violationDetail, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.violationDetailLabel, { color: colors.textSecondary }]}>Violated Rules</Text>
                      <View style={styles.violationRulesList}>
                        {reviewingViolation.violatedRules.map((rule, idx) => (
                          <Text key={idx} style={[styles.violationDetailValue, { color: designColors.semantic.error }]}>
                            • {getRuleName(rule)}
                          </Text>
                        ))}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>Notes (optional)</Text>
                      <TextInput
                        style={[styles.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        value={reviewNotes}
                        onChangeText={setReviewNotes}
                        placeholder="What went wrong? How will you improve?"
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    <View style={styles.reviewButtons}>
                      <Button
                        variant="primary"
                        onPress={() => handleReviewViolation('acknowledge')}
                        style={{ flex: 1 }}
                      >
                        Mark as Reviewed
                      </Button>
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  infoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoButtonText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disciplineCard: {
    padding: spacing.md,
    borderRadius: 16,
    ...shadows.sm,
  },
  disciplineScoreContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  progressChartWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disciplineScoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disciplineScoreValue: {
    ...typography.h1,
    fontSize: 48,
    lineHeight: 48,
  },
  disciplineScoreLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  violationsAlert: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  violationsText: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statBox: {
    width: (width - spacing.md * 2 - 16) / 2,
    margin: 4,
    padding: spacing.md,
    borderRadius: 16,
    ...shadows.sm,
    minHeight: 90,
  },
  statLabel: {
    ...typography.captionBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    fontSize: 24,
    marginBottom: 2,
  },
  statChange: {
    ...typography.caption,
    fontSize: 11,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: 16,
    ...shadows.sm,
  },
  chartCaption: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: 12,
  },
  violationsList: {
    gap: spacing.md,
  },
  violationCard: {
    padding: spacing.md,
    ...shadows.sm,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  violationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  violationSymbol: {
    ...typography.h4,
    marginLeft: spacing.sm,
  },
  violationMessage: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  violationDate: {
    ...typography.caption,
  },
  violationRulesList: {
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxHeight: '80%',
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
    ...typography.h3,
  },
  modalClose: {
    ...typography.bodyMedium,
  },
  modalScroll: {
    padding: spacing.md,
  },
  modalText: {
    ...typography.body,
    lineHeight: 22,
  },
  violationDetail: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  violationDetailLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  violationDetailValue: {
    ...typography.body,
    lineHeight: 20,
  },
  tradeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tradeDetailLabelText: {
    ...typography.bodySmall,
  },
  tradeDetailValue: {
    ...typography.bodySmallMedium,
    textAlign: 'right',
  },
  outcomeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  outcomeBadgeText: {
    ...typography.captionBold,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  textarea: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
