import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useStorage } from '../contexts/StorageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../lib/currency';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { AssetClass, Direction, Outcome } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

export function TradeDetailScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const { id } = route.params;
  const { trades, collections, strategies, saveTrades } = useStorage();
  
  const trade = useMemo(() => trades.find((t) => t.id === id) || null, [trades, id]);

  const toggleCollection = async (collectionId: string) => {
    if (!trade) return;
    
    const updated = trade.collections.includes(collectionId)
      ? trade.collections.filter((cid) => cid !== collectionId)
      : [...trade.collections, collectionId];

    const updatedTrades = trades.map((t) =>
      t.id === trade.id ? { ...t, collections: updated } : t
    );
    await saveTrades(updatedTrades);
  };

  if (!trade) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>Trade not found</Text>
          <Button variant="primary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
            Back to Trades
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isLong = trade.direction === Direction.LONG;
  const isFutures = trade.assetClass === AssetClass.FUTURES;
  const isWin = trade.outcome === Outcome.WIN;
  const isLoss = trade.outcome === Outcome.LOSS;
  const strategy = strategies.find(s => s.id === trade.strategyId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Trade Details</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('EditTrade', { id: trade.id })}
          >
            Edit
          </Button>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Symbol & P&L Header */}
        <Card style={styles.mainCard}>
          <View style={styles.symbolHeader}>
            <View>
              <Text style={[styles.symbol, { color: colors.text }]}>
                {isFutures ? (trade as FuturesTrade).instrumentRoot : (trade as OptionsTrade).underlying}
              </Text>
              <View style={styles.badges}>
                <Badge variant={isLong ? 'success' : 'error'} size="sm">
                  {isLong ? 'LONG' : 'SHORT'}
                </Badge>
                <Badge size="sm">{trade.assetClass}</Badge>
              </View>
            </View>
            <View style={styles.pnlColumn}>
              <Text style={[
                styles.pnlValue,
                { color: isWin ? designColors.semantic.success : isLoss ? designColors.semantic.error : colors.text }
              ]}>
                {formatCurrency(trade.resultR ?? 0, trade.resultUsd ?? 0, currency, { showSign: true, decimals: currency === 'R' ? 2 : 2 })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Trade Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trade Information</Text>
          
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {format(new Date(trade.entryTime), 'MMM d, yyyy')}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Symbol</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{trade.symbol}</Text>
            </View>

            {isFutures && (
              <>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Entry Price</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(trade as FuturesTrade).entryPrice}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Exit Price</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(trade as FuturesTrade).exitPrice}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contracts</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(trade as FuturesTrade).contracts}
                  </Text>
                </View>
              </>
            )}

            {!isFutures && (
              <>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Strike</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    ${(trade as OptionsTrade).strike}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(trade as OptionsTrade).optionType}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary}]}>Contracts</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(trade as OptionsTrade).contracts}
                  </Text>
                </View>
              </>
            )}

            {strategy && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Strategy</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{strategy.name}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Risk Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Risk Management</Text>
          
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Planned Risk</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                ${trade.plannedRiskUsd.toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Stop Loss</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {trade.stopLoss ? `$${trade.stopLoss}` : 'N/A'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Target</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {trade.target ? `$${trade.target}` : 'N/A'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Risk:Reward</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {trade.riskRewardRatio ? `1:${safeFixed(trade.riskRewardRatio, 1)}` : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Notes */}
        {trade.notes && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{trade.notes}</Text>
          </Card>
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Collections</Text>
            <View style={styles.collectionsGrid}>
              {collections.map((collection) => {
                const isInCollection = trade.collections.includes(collection.id);
                return (
                  <TouchableOpacity
                    key={collection.id}
                    style={[
                      styles.collectionChip,
                      {
                        backgroundColor: isInCollection ? colors.text : colors.surfaceElevated,
                        borderColor: isInCollection ? colors.text : colors.border,
                      }
                    ]}
                    onPress={() => toggleCollection(collection.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.collectionText,
                      { color: isInCollection ? colors.background : colors.text }
                    ]}>
                      {collection.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Screenshots */}
        {trade.setupScreenshot && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Setup Screenshot</Text>
            <Image source={{ uri: trade.setupScreenshot }} style={styles.screenshot} />
          </Card>
        )}

        {trade.exitScreenshot && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exit Screenshot</Text>
            <Image source={{ uri: trade.exitScreenshot }} style={styles.screenshot} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  header: {
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    ...typography.bodyMedium,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  mainCard: {
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: 24,
    ...shadows.xl,
  },
  symbolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  symbol: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pnlColumn: {
    alignItems: 'flex-end',
  },
  pnlValue: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  pnlR: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.bodyMedium,
  },
  notesText: {
    ...typography.body,
    lineHeight: 22,
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  collectionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  collectionText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  collectionCheck: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: spacing.xs,
  },
  screenshot: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F3F4F6',
  },
});
