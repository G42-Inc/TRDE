import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, ScrollView, TouchableOpacity, TextInput, Dimensions, Animated, PanResponder } from 'react-native';
import { useStorage } from '../contexts/StorageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '../lib/currency';
import type { Trade, Collection, FuturesTrade, OptionsTrade } from '@trde/core';
import { AssetClass, Direction, Outcome } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedView } from '../components/AnimatedView';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { EnhancedEmptyState } from '../components/EnhancedEmptyState';
import { colors as designColors, typography, spacing, shadows, borderRadius } from '../design/theme';
import { ListSkeleton, SkeletonLoader } from '../components/SkeletonLoader';
import { format } from 'date-fns';
import Svg, { Path } from 'react-native-svg';
import { lightHaptic, mediumHaptic, selectionHaptic } from '../lib/haptics';

const { width } = Dimensions.get('window');

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
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

type AssetFilterValue = 'all' | 'FUTURES' | 'OPTIONS' | 'edge';
type OutcomeFilterValue = 'all' | 'WIN' | 'LOSS' | 'BREAKEVEN';

export function TradesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const { trades: allTrades, collections, isLoading } = useStorage();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  
  // Filter states
  const [assetFilter, setAssetFilter] = useState<AssetFilterValue>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilterValue>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  
  // Trade detail sheet state
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const isEdgeTrade = (trade: Trade): boolean => {
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    return (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
      trade.notes?.startsWith('[EDGE') || false;
  };

  const filteredTrades = useMemo(() => {
    let filtered = [...allTrades];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const symbol = getTradeSymbol(t).toLowerCase();
        const notes = t.notes?.toLowerCase() || '';
        const strategyName = t.strategyId ? getStrategyName(t.strategyId).toLowerCase() : '';
        const dateStr = format(t.entryTime, 'MMM dd, yyyy').toLowerCase();
        
        return symbol.includes(query) ||
               notes.includes(query) ||
               strategyName.includes(query) ||
               dateStr.includes(query);
      });
    }
    
    if (assetFilter !== 'all') {
      if (assetFilter === 'edge') {
        filtered = filtered.filter((t) => isEdgeTrade(t));
      } else {
        filtered = filtered.filter((t) => t.assetClass === assetFilter);
      }
    }
    
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter((t) => t.outcome === outcomeFilter);
    }
    
    if (collectionFilter !== 'all') {
      filtered = filtered.filter((t) => t.collections.includes(collectionFilter));
    }
    
    filtered = filtered.sort((a, b) => {
      const aSortTime = isEdgeTrade(a) ? a.createdAt : a.entryTime;
      const bSortTime = isEdgeTrade(b) ? b.createdAt : b.entryTime;
      return bSortTime - aSortTime;
    });
    
    return filtered;
  }, [allTrades, searchQuery, assetFilter, outcomeFilter, collectionFilter, collections]);

  const stats = useMemo(() => {
    const wins = filteredTrades.filter(t => t.outcome === 'WIN').length;
    const losses = filteredTrades.filter(t => t.outcome === 'LOSS').length;
    const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.resultUsd || 0), 0);
    const totalPnLR = filteredTrades.reduce((sum, t) => sum + (t.resultR ?? 0), 0);
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;
    
    return { wins, losses, totalPnL, totalPnLR, winRate, total: filteredTrades.length };
  }, [filteredTrades]);

  const getAssetFilterLabel = (): string => {
    switch (assetFilter) {
      case 'all': return 'All';
      case 'FUTURES': return 'Futures';
      case 'OPTIONS': return 'Options';
      case 'edge': return 'EDGE';
    }
  };

  const getOutcomeFilterLabel = (): string => {
    switch (outcomeFilter) {
      case 'all': return 'All';
      case 'WIN': return 'Wins';
      case 'LOSS': return 'Losses';
      case 'BREAKEVEN': return 'BE';
    }
  };

  const getCollectionFilterLabel = (): string => {
    if (collectionFilter === 'all') return 'All';
    const collection = collections.find((c) => c.id === collectionFilter);
    return collection?.name || 'All';
  };

  // Trade detail sheet functions
  const openTradeDetail = (trade: Trade) => {
    selectionHaptic();
    setSelectedTrade(trade);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeTradeDetail = () => {
    mediumHaptic();
    Animated.timing(sheetTranslateY, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedTrade(null);
    });
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeTradeDetail();
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  // Get strategy name helper
  const { strategies } = useStorage();
  const getStrategyName = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    return strategy?.name || 'Unknown';
  };

  const renderFilterModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { label: string; value: string }[],
    currentValue: string,
    onSelect: (value: any) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalDone, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  currentValue === option.value && { backgroundColor: colors.surfaceElevated }
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  { color: currentValue === option.value ? colors.text : colors.text }
                ]}>
                  {option.label}
                </Text>
                {currentValue === option.value && (
                  <View style={[styles.checkmark, { backgroundColor: colors.text }]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTradeItem = ({ item: trade, index }: { item: Trade; index: number }) => {
    const isWin = trade.outcome === 'WIN';
    const isLoss = trade.outcome === 'LOSS';
    const tradeDate = isEdgeTrade(trade) 
      ? format(new Date(trade.createdAt), 'MMM d, h:mm a')
      : format(new Date(trade.entryTime), 'MMM d, h:mm a');
    const borderColor = isWin ? designColors.semantic.success : isLoss ? designColors.semantic.error : colors.border;

    return (
      <AnimatedView fadeIn slideIn="up" delay={Math.min(index * 15, 150)}>
        <TouchableOpacity
          style={[
            styles.tradeItem, 
            { 
              backgroundColor: colors.surface,
              borderLeftWidth: 3,
              borderLeftColor: borderColor,
            }
          ]}
          onPress={() => openTradeDetail(trade)}
          activeOpacity={0.7}
        >
          <View style={styles.tradeMain}>
            {/* Left: Symbol + Direction */}
            <View style={styles.tradeLeft}>
              <View style={styles.tradeSymbolRow}>
                <Text style={[styles.tradeSymbol, { color: colors.text }]}>{getTradeSymbol(trade)}</Text>
                <View style={[styles.tradeDirectionBadge, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.tradeDirectionText, { color: colors.textSecondary }]}>
                    {trade.direction}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tradeDate, { color: colors.textTertiary }]}>
                {tradeDate}
              </Text>
            </View>
            
            {/* Right: P&L + R-multiple */}
            <View style={styles.tradeRight}>
              <Text style={[
                styles.tradePnl,
                { color: isWin ? designColors.semantic.success : isLoss ? designColors.semantic.error : colors.textSecondary }
              ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {trade.resultUsd >= 0 ? '+' : ''}${Math.abs(trade.resultUsd).toFixed(0)}
              </Text>
              <Text style={[
                styles.tradeR,
                { color: isWin ? designColors.semantic.success : isLoss ? designColors.semantic.error : colors.textTertiary }
              ]}>
                {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header skeleton */}
        <View style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
            <SkeletonLoader variant="card" height={80} delay={0} style={{ flex: 1 }} />
            <SkeletonLoader variant="card" height={80} delay={60} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
            <SkeletonLoader height={36} borderRadius={18} delay={120} style={{ flex: 1 }} />
            <SkeletonLoader height={36} borderRadius={18} delay={150} style={{ flex: 1 }} />
            <SkeletonLoader height={36} borderRadius={18} delay={180} style={{ flex: 1 }} />
          </View>
        </View>
        <ListSkeleton count={6} />
      </View>
    );
  }

  if (allTrades.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EnhancedEmptyState
          icon={<Text style={{ fontSize: 48, fontWeight: '700' }}>📊</Text>}
          title="No Trades Yet"
          message="Start tracking your trades to build your edge"
          bulletPoints={[
            'Log every trade for accurate analytics',
            'Track your discipline and risk',
            'Find patterns in your performance',
          ]}
          primaryAction={{
            label: 'Add Trade',
            onPress: () => { mediumHaptic(); navigation.navigate('NewTrade'); },
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Header with Stats Cards */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>TRADES</Text>
            <Text style={[styles.statCardValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>P&L</Text>
            <Text style={[
              styles.statCardValue,
              { color: stats.totalPnL >= 0 ? designColors.semantic.success : designColors.semantic.error }
            ]}>
              {formatCurrency(stats.totalPnLR, stats.totalPnL, currency, { showSign: true, decimals: currency === 'R' ? 2 : 0 })}
            </Text>
            <Text style={[styles.statCardSubtext, { 
              color: stats.totalPnL >= 0 ? designColors.semantic.success : designColors.semantic.error 
            }]}>
              {stats.totalPnL >= 0 ? '↑' : '↓'} {safeFixed(stats.winRate, 1)}% Win
            </Text>
          </View>
        </View>

      {/* Filter Bar - Full Width */}
      <View style={styles.filterContainer}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search trades..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>

        {searchQuery && (
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''} found
          </Text>
        )}

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: assetFilter !== 'all' ? colors.text : colors.surface }
            ]}
            onPress={() => { lightHaptic(); setShowAssetModal(true); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipLabel, { color: assetFilter !== 'all' ? colors.background : colors.textTertiary }]}>
              ASSET
            </Text>
            <Text style={[styles.filterChipValue, { color: assetFilter !== 'all' ? colors.background : colors.text }]}>
              {getAssetFilterLabel()} ▾
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: outcomeFilter !== 'all' ? colors.text : colors.surface }
            ]}
            onPress={() => { lightHaptic(); setShowOutcomeModal(true); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipLabel, { color: outcomeFilter !== 'all' ? colors.background : colors.textTertiary }]}>
              RESULT
            </Text>
            <Text style={[styles.filterChipValue, { color: outcomeFilter !== 'all' ? colors.background : colors.text }]}>
              {getOutcomeFilterLabel()} ▾
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: collectionFilter !== 'all' ? colors.text : colors.surface }
            ]}
            onPress={() => { lightHaptic(); setShowCollectionModal(true); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipLabel, { color: collectionFilter !== 'all' ? colors.background : colors.textTertiary }]}>
              COLLECTION
            </Text>
            <Text style={[styles.filterChipValue, { color: collectionFilter !== 'all' ? colors.background : colors.text }]}>
              {getCollectionFilterLabel()} ▾
            </Text>
          </TouchableOpacity>
        </View>
        
        {(assetFilter !== 'all' || outcomeFilter !== 'all' || collectionFilter !== 'all') && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => {
              setAssetFilter('all');
              setOutcomeFilter('all');
              setCollectionFilter('all');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
      </View>

      {/* Trades List */}
      <FlatList
        data={filteredTrades}
        renderItem={renderTradeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <EnhancedEmptyState
              icon={<Text style={{ fontSize: 48 }}>🔍</Text>}
              title="No Trades Found"
              message={searchQuery || assetFilter !== 'all' || outcomeFilter !== 'all' 
                ? "Try adjusting your filters or search query"
                : "Start logging trades to see them here"
              }
              primaryAction={{
                label: searchQuery ? 'Clear Search' : 'Log Trade',
                onPress: searchQuery 
                  ? () => setSearchQuery('')
                  : () => navigation.navigate('NewTrade'),
              }}
            />
          </View>
        }
      />

      {/* Filter Modals */}
      {renderFilterModal(
        showAssetModal,
        () => setShowAssetModal(false),
        'Filter by Type',
        [
          { label: 'All Types', value: 'all' },
          { label: 'Futures', value: 'FUTURES' },
          { label: 'Options', value: 'OPTIONS' },
          { label: 'EDGE', value: 'edge' },
        ],
        assetFilter,
        setAssetFilter
      )}

      {renderFilterModal(
        showOutcomeModal,
        () => setShowOutcomeModal(false),
        'Filter by Outcome',
        [
          { label: 'All Outcomes', value: 'all' },
          { label: 'Wins', value: 'WIN' },
          { label: 'Losses', value: 'LOSS' },
          { label: 'Breakeven', value: 'BREAKEVEN' },
        ],
        outcomeFilter,
        setOutcomeFilter
      )}

      {renderFilterModal(
        showCollectionModal,
        () => setShowCollectionModal(false),
        'Filter by Collection',
        [
          { label: 'All Collections', value: 'all' },
          ...collections.map((c) => ({ label: c.name, value: c.id })),
        ],
        collectionFilter,
        setCollectionFilter
      )}

      {/* Trade Detail Bottom Sheet */}
      <Modal
        visible={!!selectedTrade}
        transparent
        animationType="none"
        onRequestClose={closeTradeDetail}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={closeTradeDetail}
        >
          <Animated.View 
            style={[
              styles.sheetContainer,
              { 
                backgroundColor: colors.surface,
                transform: [{ translateY: sheetTranslateY }],
              }
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              {/* Drag Indicator */}
              <View style={styles.sheetDragIndicator}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>

              {selectedTrade && (
                <ScrollView 
                  style={styles.sheetScroll}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Header: Symbol + P&L */}
                  <View style={styles.sheetHeader}>
                    <View>
                      <View style={styles.sheetSymbolRow}>
                        <Text style={[styles.sheetSymbol, { color: colors.text }]}>
                          {getTradeSymbol(selectedTrade)}
                        </Text>
                        <View style={[
                          styles.sheetDirectionBadge,
                          { backgroundColor: selectedTrade.direction === 'LONG' ? designColors.success.bg : designColors.error.bg }
                        ]}>
                          <Text style={[
                            styles.sheetDirectionText,
                            { color: selectedTrade.direction === 'LONG' ? designColors.semantic.success : designColors.semantic.error }
                          ]}>
                            {selectedTrade.direction}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.sheetDate, { color: colors.textSecondary }]}>
                        {format(new Date(selectedTrade.entryTime), 'EEEE, MMM d, yyyy')}
                      </Text>
                    </View>
                    <View style={styles.sheetPnlContainer}>
                      <Text style={[
                        styles.sheetPnl,
                        { color: selectedTrade.outcome === 'WIN' ? designColors.semantic.success : selectedTrade.outcome === 'LOSS' ? designColors.semantic.error : colors.text }
                      ]}>
                        {formatCurrency(selectedTrade.resultR, selectedTrade.resultUsd, currency, { showSign: true, decimals: 2 })}
                      </Text>
                      <Text style={[styles.sheetPnlR, { color: colors.textSecondary }]}>
                        {selectedTrade.resultR >= 0 ? '+' : ''}{selectedTrade.resultR.toFixed(2)}R
                      </Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={[styles.sheetStatsRow, { borderColor: colors.border }]}>
                    <View style={styles.sheetStat}>
                      <Text style={[styles.sheetStatLabel, { color: colors.textTertiary }]}>Entry</Text>
                      <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                        {format(new Date(selectedTrade.entryTime), 'h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.sheetStat}>
                      <Text style={[styles.sheetStatLabel, { color: colors.textTertiary }]}>Exit</Text>
                      <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                        {format(new Date(selectedTrade.exitTime), 'h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.sheetStat}>
                      <Text style={[styles.sheetStatLabel, { color: colors.textTertiary }]}>Risk</Text>
                      <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                        ${selectedTrade.plannedRiskUsd?.toFixed(0) || '0'}
                      </Text>
                    </View>
                    <View style={styles.sheetStat}>
                      <Text style={[styles.sheetStatLabel, { color: colors.textTertiary }]}>Grade</Text>
                      <Text style={[styles.sheetStatValue, { color: colors.text }]}>
                        {selectedTrade.grade || '-'}
                      </Text>
                    </View>
                  </View>

                  {/* Trade Details */}
                  <View style={styles.sheetSection}>
                    <Text style={[styles.sheetSectionTitle, { color: colors.text }]}>Details</Text>
                    <View style={styles.sheetDetailsGrid}>
                      {selectedTrade.assetClass === 'FUTURES' && (
                        <>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Entry Price</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              {(selectedTrade as FuturesTrade).entryPrice}
                            </Text>
                          </View>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Exit Price</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              {(selectedTrade as FuturesTrade).exitPrice}
                            </Text>
                          </View>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Contracts</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              {(selectedTrade as FuturesTrade).contracts}
                            </Text>
                          </View>
                        </>
                      )}
                      {selectedTrade.assetClass === 'OPTIONS' && (
                        <>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Strike</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              ${(selectedTrade as OptionsTrade).strike}
                            </Text>
                          </View>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Type</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              {(selectedTrade as OptionsTrade).optionType}
                            </Text>
                          </View>
                          <View style={styles.sheetDetailItem}>
                            <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Contracts</Text>
                            <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                              {(selectedTrade as OptionsTrade).contracts}
                            </Text>
                          </View>
                        </>
                      )}
                      <View style={styles.sheetDetailItem}>
                        <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Strategy</Text>
                        <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                          {getStrategyName(selectedTrade.strategyId)}
                        </Text>
                      </View>
                      <View style={styles.sheetDetailItem}>
                        <Text style={[styles.sheetDetailLabel, { color: colors.textTertiary }]}>Session</Text>
                        <Text style={[styles.sheetDetailValue, { color: colors.text }]}>
                          {selectedTrade.session || '-'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes */}
                  {selectedTrade.notes && (
                    <View style={styles.sheetSection}>
                      <Text style={[styles.sheetSectionTitle, { color: colors.text }]}>Notes</Text>
                      <Text style={[styles.sheetNotes, { color: colors.textSecondary }]}>
                        {selectedTrade.notes}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.sheetActions}>
                    <TouchableOpacity
                      style={[styles.sheetActionButton, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => {
                        closeTradeDetail();
                        navigation.navigate('EditTrade', { id: selectedTrade.id });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sheetActionText, { color: colors.text }]}>Edit Trade</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sheetActionButton, { backgroundColor: colors.text }]}
                      onPress={() => {
                        closeTradeDetail();
                        navigation.navigate('TradeDetail', { id: selectedTrade.id });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sheetActionText, { color: colors.background }]}>Full Details</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyAddButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  emptyAddButtonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    ...shadows.lg,
    minHeight: 80,
    justifyContent: 'center',
  },
  statCardLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  statCardValue: {
    ...typography.h2,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  statCardSubtext: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xxs,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
  resultCount: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  filterChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  filterChipValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
  },
  tradeItem: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  tradeMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeLeft: {
    flex: 1,
  },
  tradeSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tradeSymbol: {
    ...typography.bodyBold,
    fontSize: 17,
  },
  tradeDirectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tradeDirectionText: {
    ...typography.captionBold,
    fontSize: 10,
  },
  tradeRight: {
    alignItems: 'flex-end',
  },
  tradePnl: {
    ...typography.h4,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tradeDate: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  tradeR: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '70%',
    ...shadows.xl,
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
    fontSize: 18,
  },
  modalDone: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalOptionText: {
    ...typography.body,
    fontSize: 16,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
  },
  // FAB container - allows pass-through of touches except on FAB itself
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%',
    minHeight: 400,
    ...shadows.xl,
  },
  sheetDragIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetScroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  sheetSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetSymbol: {
    ...typography.h2,
  },
  sheetDirectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sheetDirectionText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  sheetDate: {
    ...typography.bodySmall,
  },
  sheetPnlContainer: {
    alignItems: 'flex-end',
  },
  sheetPnl: {
    ...typography.h2,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sheetPnlR: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  sheetStatsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  sheetStat: {
    flex: 1,
    alignItems: 'center',
  },
  sheetStatLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 2,
  },
  sheetStatValue: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  sheetSection: {
    marginBottom: spacing.md,
  },
  sheetSectionTitle: {
    ...typography.h5,
    marginBottom: spacing.sm,
  },
  sheetDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sheetDetailItem: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  sheetDetailLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 2,
  },
  sheetDetailValue: {
    ...typography.bodyMedium,
  },
  sheetNotes: {
    ...typography.body,
    lineHeight: 22,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetActionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  sheetActionText: {
    ...typography.bodyBold,
  },
});
