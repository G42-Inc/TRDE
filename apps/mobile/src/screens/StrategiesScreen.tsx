import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useStorage } from '../contexts/StorageContext';
import { calculateAllMetrics, calculateWinRate, calculateExpectancy, calculateTotalPnLR } from '@trde/core';
import type { Strategy, StrategyVersion, Trade } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';

export function StrategiesScreen() {
  const { colors } = useTheme();
  const { strategies, versions, trades, saveStrategies, saveVersions } = useStorage();
  const [showNewStrategyModal, setShowNewStrategyModal] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [showStrategyDetail, setShowStrategyDetail] = useState(false);
  const [newStrategyForm, setNewStrategyForm] = useState({
    name: '',
    description: '',
  });
  const [newVersionForm, setNewVersionForm] = useState({
    definition: '',
    triggers: '',
  });

  const handleCreateStrategy = async () => {
    if (!newStrategyForm.name.trim()) {
      Alert.alert('Error', 'Strategy name is required');
      return;
    }

    const newStrategy: Strategy = {
      id: `strategy-${Date.now()}`,
      name: newStrategyForm.name.trim(),
      description: newStrategyForm.description.trim() || undefined,
      createdAt: Date.now(),
    };

    const updated = [...strategies, newStrategy];
    await saveStrategies(updated);
    setShowNewStrategyModal(false);
    setNewStrategyForm({ name: '', description: '' });
    Alert.alert('Success', 'Strategy created successfully');
  };

  const handleCreateVersion = async () => {
    if (!selectedStrategyId || !newVersionForm.definition.trim()) {
      Alert.alert('Error', 'Version definition is required');
      return;
    }

    const strategyVersions = versions.filter((v) => v.strategyId === selectedStrategyId);
    const nextVersion = `v${strategyVersions.length + 1}`;

    const newVersion: StrategyVersion = {
      id: `version-${Date.now()}`,
      strategyId: selectedStrategyId,
      version: nextVersion,
      definition: newVersionForm.definition.trim(),
      triggers: newVersionForm.triggers.trim() || undefined,
      createdAt: Date.now(),
    };

    const updated = [...versions, newVersion];
    await saveVersions(updated);
    setShowCreateVersionModal(false);
    setNewVersionForm({ definition: '', triggers: '' });
    Alert.alert('Success', 'Version created successfully');
  };

  // Helper to safely format numbers
  const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return value.toFixed(decimals);
  };

  const safeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return value;
  };

  const getStrategyStats = (strategyId: string) => {
    const strategyTrades = trades.filter(t => t.strategyId === strategyId);
    if (strategyTrades.length === 0) return null;

    const metrics = calculateAllMetrics(strategyTrades);
    return {
      totalTrades: strategyTrades.length,
      winRate: safeNumber(metrics.winRate),
      totalPnL: safeNumber(metrics.totalPnLUsd),
      totalPnLR: safeNumber(metrics.totalPnLR),
      expectancy: safeNumber(metrics.expectancy),
      profitFactor: safeNumber(metrics.profitFactor),
      avgWinR: safeNumber(metrics.avgWinR),
      avgLossR: safeNumber(metrics.avgLossR),
      wins: strategyTrades.filter(t => t.outcome === 'WIN').length,
      losses: strategyTrades.filter(t => t.outcome === 'LOSS').length,
    };
  };

  const selectedStrategy = selectedStrategyId ? strategies.find(s => s.id === selectedStrategyId) : null;
  const selectedStrategyVersions = selectedStrategyId ? versions.filter(v => v.strategyId === selectedStrategyId) : [];
  const selectedStrategyStats = selectedStrategyId ? getStrategyStats(selectedStrategyId) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Strategies</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your trading strategies
          </Text>
        </View>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setShowNewStrategyModal(true)}
        >
          + New
        </Button>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {strategies.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Strategies Yet</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Create your first trading strategy to start tracking
              </Text>
              <Button
                variant="primary"
                onPress={() => setShowNewStrategyModal(true)}
                style={{ marginTop: spacing.md }}
              >
                Create Strategy
              </Button>
            </View>
          </Card>
        ) : (
          <View style={styles.list}>
            {strategies.map((strategy) => {
              const stats = getStrategyStats(strategy.id);
              const strategyVersions = versions.filter(v => v.strategyId === strategy.id);
              const winRateColor = stats && stats.winRate >= 50 
                ? designColors.semantic.success 
                : designColors.semantic.warning;

              return (
                <TouchableOpacity
                  key={strategy.id}
                  onPress={() => {
                    setSelectedStrategyId(strategy.id);
                    setShowStrategyDetail(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Card style={styles.strategyCard}>
                    {/* Header with name and R badge */}
                    <View style={styles.strategyHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.strategyName, { color: colors.text }]}>
                          {strategy.name}
                        </Text>
                        {strategyVersions.length > 0 && (
                          <Text style={[styles.versionCount, { color: colors.textSecondary }]}>
                            {strategyVersions.length} {strategyVersions.length === 1 ? 'version' : 'versions'}
                          </Text>
                        )}
                      </View>
                      {stats && (
                        <View style={[
                          styles.rBadge,
                          { backgroundColor: stats.totalPnLR >= 0 ? designColors.semantic.success : designColors.semantic.error }
                        ]}>
                          <Text style={styles.rBadgeText}>
                            {stats.totalPnLR >= 0 ? '+' : ''}{safeFixed(stats.totalPnLR, 1)}R
                          </Text>
                        </View>
                      )}
                    </View>

                    {stats && (
                      <>
                        {/* Win Rate Progress Bar */}
                        <View style={styles.winRateSection}>
                          <View style={styles.winRateHeader}>
                            <Text style={[styles.winRateLabel, { color: colors.textSecondary }]}>Win Rate</Text>
                            <Text style={[styles.winRateValue, { color: colors.text }]}>{safeFixed(stats.winRate, 0)}%</Text>
                          </View>
                          <View style={[styles.winRateBar, { backgroundColor: colors.surfaceElevated }]}>
                            <View 
                              style={[
                                styles.winRateFill,
                                { 
                                  width: `${Math.min(stats.winRate, 100)}%`,
                                  backgroundColor: winRateColor,
                                }
                              ]} 
                            />
                          </View>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                          <View style={styles.gridStat}>
                            <Text style={[styles.gridStatValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{stats.totalTrades}</Text>
                            <Text style={[styles.gridStatLabel, { color: colors.textSecondary }]}>Trades</Text>
                          </View>
                          <View style={styles.gridStat}>
                            <Text 
                              style={[styles.gridStatValue, { color: stats.totalPnL >= 0 ? designColors.semantic.success : designColors.semantic.error }]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.5}
                            >
                              ${safeFixed(Math.abs(stats.totalPnL), 0)}
                            </Text>
                            <Text style={[styles.gridStatLabel, { color: colors.textSecondary }]}>P&L</Text>
                          </View>
                          <View style={styles.gridStat}>
                            <Text style={[styles.gridStatValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{safeFixed(stats.expectancy, 2)}R</Text>
                            <Text style={[styles.gridStatLabel, { color: colors.textSecondary }]}>Expectancy</Text>
                          </View>
                          <View style={styles.gridStat}>
                            <Text style={[styles.gridStatValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                              {stats.profitFactor === Infinity ? '∞' : safeFixed(stats.profitFactor, 2)}
                            </Text>
                            <Text style={[styles.gridStatLabel, { color: colors.textSecondary }]}>Profit Factor</Text>
                          </View>
                        </View>
                      </>
                    )}

                    {!stats && (
                      <View style={[styles.noTradesBox, { backgroundColor: colors.surfaceElevated }]}>
                        <Text style={[styles.noTradesText, { color: colors.textSecondary }]}>
                          No trades logged yet
                        </Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* New Strategy Modal */}
      <Modal
        visible={showNewStrategyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewStrategyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Strategy</Text>
              <TouchableOpacity onPress={() => setShowNewStrategyModal(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newStrategyForm.name}
                  onChangeText={(name) => setNewStrategyForm({ ...newStrategyForm, name })}
                  placeholder="e.g., Morning Breakout"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newStrategyForm.description}
                  onChangeText={(description) => setNewStrategyForm({ ...newStrategyForm, description })}
                  placeholder="Describe your strategy..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <Button variant="primary" onPress={handleCreateStrategy} style={{ marginTop: spacing.lg }}>
                Create Strategy
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Strategy Detail Modal */}
      <Modal
        visible={showStrategyDetail}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowStrategyDetail(false);
          setSelectedStrategyId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedStrategy?.name}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowStrategyDetail(false);
                setSelectedStrategyId(null);
              }}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedStrategy?.description && (
                <View style={[styles.descriptionBox, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    {selectedStrategy.description}
                  </Text>
                </View>
              )}

              {selectedStrategyStats && (
                <View style={styles.detailStatsContainer}>
                  {/* Big R Badge */}
                  <View style={[
                    styles.bigRBadge,
                    { backgroundColor: selectedStrategyStats.totalPnLR >= 0 ? designColors.semantic.success : designColors.semantic.error }
                  ]}>
                    <Text style={styles.bigRValue}>
                      {selectedStrategyStats.totalPnLR >= 0 ? '+' : ''}{safeFixed(selectedStrategyStats.totalPnLR, 1)}R
                    </Text>
                    <Text style={styles.bigRLabel}>Total Return</Text>
                  </View>

                  {/* Win/Loss Summary */}
                  <View style={[styles.winLossSummary, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={styles.winLossItem}>
                      <Text style={[styles.winLossValue, { color: designColors.semantic.success }]}>
                        {selectedStrategyStats.wins}
                      </Text>
                      <Text style={[styles.winLossLabel, { color: colors.textSecondary }]}>Wins</Text>
                    </View>
                    <View style={[styles.winLossDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.winLossItem}>
                      <Text style={[styles.winLossValue, { color: designColors.semantic.error }]}>
                        {selectedStrategyStats.losses}
                      </Text>
                      <Text style={[styles.winLossLabel, { color: colors.textSecondary }]}>Losses</Text>
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <Card style={styles.detailStats}>
                    <View style={styles.detailStatsGrid}>
                      <StatCard
                        label="Total Trades"
                        value={`${selectedStrategyStats.totalTrades}`}
                        style={{ flex: 1 }}
                      />
                      <StatCard
                        label="P&L"
                        value={`$${safeFixed(selectedStrategyStats.totalPnL, 0)}`}
                        variant={selectedStrategyStats.totalPnL >= 0 ? 'success' : 'error'}
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View style={styles.detailStatsGrid}>
                      <StatCard
                        label="Win Rate"
                        value={`${safeFixed(selectedStrategyStats.winRate, 0)}%`}
                        variant={selectedStrategyStats.winRate >= 50 ? 'success' : 'error'}
                        style={{ flex: 1 }}
                      />
                      <StatCard
                        label="Expectancy"
                        value={`${safeFixed(selectedStrategyStats.expectancy, 2)}R`}
                        variant={selectedStrategyStats.expectancy > 0 ? 'success' : 'error'}
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View style={styles.detailStatsGrid}>
                      <StatCard
                        label="Profit Factor"
                        value={selectedStrategyStats.profitFactor === Infinity ? '∞' : safeFixed(selectedStrategyStats.profitFactor, 2)}
                        variant={selectedStrategyStats.profitFactor >= 1 ? 'success' : 'error'}
                        style={{ flex: 1 }}
                      />
                      <StatCard
                        label="Avg Win / Loss"
                        value={`${safeFixed(selectedStrategyStats.avgWinR, 1)}R / ${safeFixed(selectedStrategyStats.avgLossR, 1)}R`}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </Card>
                </View>
              )}

              <View style={styles.versionsSection}>
                <View style={styles.versionsSectionHeader}>
                  <Text style={[styles.versionsSectionTitle, { color: colors.text }]}>Versions</Text>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setShowCreateVersionModal(true)}
                  >
                    + Version
                  </Button>
                </View>

                {selectedStrategyVersions.length === 0 ? (
                  <Card>
                    <Text style={[styles.noVersionsText, { color: colors.textSecondary }]}>
                      No versions yet. Create your first version to document strategy evolution.
                    </Text>
                  </Card>
                ) : (
                  <View style={styles.versionsList}>
                    {selectedStrategyVersions.map((version) => (
                      <Card key={version.id} style={styles.versionCard}>
                        <View style={styles.versionHeader}>
                          <Badge size="sm">{version.version}</Badge>
                          <Text style={[styles.versionDate, { color: colors.textTertiary }]}>
                            {new Date(version.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={[styles.versionDefinition, { color: colors.text }]}>
                          {version.definition}
                        </Text>
                        {version.triggers && (
                          <Text style={[styles.versionTriggers, { color: colors.textSecondary }]}>
                            Triggers: {version.triggers}
                          </Text>
                        )}
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Version Modal */}
      <Modal
        visible={showCreateVersionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateVersionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '75%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Version</Text>
              <TouchableOpacity onPress={() => setShowCreateVersionModal(false)}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Definition *</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newVersionForm.definition}
                  onChangeText={(definition) => setNewVersionForm({ ...newVersionForm, definition })}
                  placeholder="Define the strategy rules and setup..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Triggers</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newVersionForm.triggers}
                  onChangeText={(triggers) => setNewVersionForm({ ...newVersionForm, triggers })}
                  placeholder="What triggers this strategy?"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Button variant="primary" onPress={handleCreateVersion} style={{ marginTop: spacing.lg }}>
                Create Version
              </Button>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  strategyCard: {
    padding: spacing.lg,
    ...shadows.lg,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  strategyName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  versionCount: {
    ...typography.caption,
  },
  strategyDescription: {
    ...typography.body,
    lineHeight: 18,
  },
  rBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  rBadgeText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  winRateSection: {
    marginBottom: spacing.md,
  },
  winRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  winRateLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winRateValue: {
    ...typography.bodyBold,
  },
  winRateBar: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  winRateFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridStat: {
    width: '50%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  gridStatValue: {
    ...typography.h4,
    marginBottom: 2,
  },
  gridStatLabel: {
    ...typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noTradesBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  noTradesText: {
    ...typography.body,
  },
  strategyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.micro,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalClose: {
    ...typography.bodyMedium,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  textarea: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  descriptionBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  descriptionText: {
    ...typography.body,
    lineHeight: 20,
  },
  detailStatsContainer: {
    marginBottom: spacing.md,
  },
  bigRBadge: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  bigRValue: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  bigRLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  winLossSummary: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  winLossItem: {
    flex: 1,
    alignItems: 'center',
  },
  winLossValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  winLossLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  winLossDivider: {
    width: 1,
    marginVertical: spacing.sm,
  },
  detailStats: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  detailStatsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  versionsSection: {
    marginTop: spacing.md,
  },
  versionsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  versionsSectionTitle: {
    ...typography.h4,
  },
  noVersionsText: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.md,
  },
  versionsList: {
    gap: spacing.sm,
  },
  versionCard: {
    padding: spacing.md,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  versionDate: {
    ...typography.caption,
  },
  versionDefinition: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  versionTriggers: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
