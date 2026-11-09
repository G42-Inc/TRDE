import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useStorage } from '../contexts/StorageContext';
import type { Trade, DailyBias, DailyQuickJournal } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { format, startOfMonth, endOfMonth, getDaysInMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';

// Helper to safely format numbers
const safeFixed = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return value.toFixed(decimals);
};

interface DayData {
  date: Date;
  pnl: number;
  pnlR: number;
  tradeCount: number;
  trades: Trade[];
  bias: DailyBias | null;
  journals: DailyQuickJournal[];
  strategies: Set<string>;
}

export function ReviewScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { trades, dailyBiases: biases, quickJournals: journals, strategies, collections } = useStorage();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEdgeTrades, setShowEdgeTrades] = useState(false);

  const isEdgeTrade = (trade: Trade): boolean => {
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    return (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
           trade.notes?.startsWith('[EDGE') || false;
  };

  const getStrategyName = (strategyId: string): string => {
    const strategy = strategies.find(s => s.id === strategyId);
    return strategy?.name || strategyId;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfWeek = monthStart.getDay();

  const calendarDays: (Date | null)[] = [];
  
  // Add trailing days from previous month
  const prevMonth = subMonths(currentMonth, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonth);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarDays.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day));
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }
  
  // Add leading days from next month
  const nextMonth = addMonths(currentMonth, 1);
  let nextDay = 1;
  while (calendarDays.length < 42) {
    calendarDays.push(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay));
    nextDay++;
  }

  const getDayData = (date: Date | null): DayData | null => {
    if (!date) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTrades = trades.filter(t => {
      if (t.tradeDate !== dateStr) return false;
      const isEdge = isEdgeTrade(t);
      return showEdgeTrades ? isEdge : !isEdge;
    });
    
    const dayBias = biases.find(b => b.date === dateStr) || null;
    const dayJournals = journals.filter(j => {
      const journalDate = format(new Date(j.timestamp), 'yyyy-MM-dd');
      return journalDate === dateStr;
    });
    
    const dayPnL = dayTrades.reduce((sum, t) => sum + t.resultUsd, 0);
    const dayPnLR = dayTrades.reduce((sum, t) => sum + t.resultR, 0);
    const strategySet = new Set(dayTrades.map(t => t.strategyId));
    
    return {
      date,
      pnl: dayPnL,
      pnlR: dayPnLR,
      tradeCount: dayTrades.length,
      trades: dayTrades,
      bias: dayBias,
      journals: dayJournals,
      strategies: strategySet,
    };
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDay(date);
    const data = getDayData(date);
    setDayData(data);
    setShowDayModal(true);
  };

  const closeDayModal = () => {
    setShowDayModal(false);
    setSelectedDay(null);
    setDayData(null);
  };

  const renderDay = (date: Date | null) => {
    if (!date) return <View style={styles.emptyDay} key={`empty-${Math.random()}`} />;

    const data = getDayData(date);
    const isToday = isSameDay(date, new Date());
    const hasTrades = data && data.tradeCount > 0;
    const pnl = data?.pnl || 0;
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

    // Determine background color
    let bgColor = colors.surfaceElevated;
    let textColor = colors.text;
    let showBorder = false;
    
    if (!isCurrentMonth) {
      // Different shade for other month days
      bgColor = colors.border;
      textColor = colors.textTertiary;
    } else if (hasTrades) {
      bgColor = pnl >= 0 ? designColors.semantic.success : designColors.semantic.error;
      textColor = '#FFFFFF';
      if (isToday) showBorder = true;
    } else if (isToday) {
      bgColor = colors.text + '20';
      showBorder = true;
    }

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.day,
          { backgroundColor: bgColor },
          showBorder && { borderWidth: 2, borderColor: colors.text },
        ]}
        onPress={() => handleDayClick(date)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dayNumber,
          { color: textColor }
        ]}>
          {format(date, 'd')}
        </Text>
        {hasTrades && isCurrentMonth && (
          <Text style={[
            styles.dayPnl,
            { color: '#FFFFFF' }
          ]}>
            ${Math.abs(pnl) >= 1000 ? `${safeFixed(Math.abs(pnl) / 1000, 1)}k` : safeFixed(Math.abs(pnl), 0)}
          </Text>
        )}
        {data?.bias && !hasTrades && (
          <View style={[
            styles.biasDot,
            { 
              backgroundColor: 
                data.bias.bias === 'bullish' ? designColors.semantic.success :
                data.bias.bias === 'bearish' ? designColors.semantic.error :
                colors.textTertiary
            }
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  // Calculate month stats
  const monthTrades = trades.filter(t => {
    const tradeDate = new Date(t.tradeDate);
    return tradeDate >= monthStart && tradeDate <= monthEnd;
  });
  const monthPnL = monthTrades.reduce((sum, t) => sum + (t.resultUsd || 0), 0);
  const monthWins = monthTrades.filter(t => t.outcome === 'WIN').length;
  const winRate = monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.monthInfo}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setShowEdgeTrades(!showEdgeTrades)}>
            <Badge size="sm" variant={showEdgeTrades ? 'info' : undefined}>
              {showEdgeTrades ? 'EDGE' : 'Standard'}
            </Badge>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Month Summary Bar */}
      <View style={[styles.monthSummary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{monthTrades.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Trades</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[
            styles.summaryValue,
            { color: monthPnL >= 0 ? designColors.semantic.success : designColors.semantic.error }
          ]}>
            ${monthPnL.toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>P&L</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{winRate.toFixed(0)}%</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Win</Text>
        </View>
      </View>

      {/* Quick Stats Filters */}
      <View style={[styles.quickFilters, { backgroundColor: colors.background }]}>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{monthWins}</Text>
          <Text style={[styles.quickStatLabel, { color: designColors.semantic.success }]}>WINS</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{monthTrades.length - monthWins}</Text>
          <Text style={[styles.quickStatLabel, { color: designColors.semantic.error }]}>LOSSES</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>
            {monthTrades.length > 0 ? safeFixed((monthWins / monthTrades.length) * (monthPnL / monthTrades.length), 1) : '0'}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>AVG R</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Calendar Glass Container */}
        <View style={[styles.calendarGlass, { backgroundColor: colors.surface + '60', borderColor: colors.text + '10' }]}>
          {/* Weekday Headers */}
          <View style={[styles.weekdays, { borderBottomColor: colors.text + '10' }]}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendar}>
            {calendarDays.map((date, idx) => renderDay(date))}
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="slide"
        onRequestClose={closeDayModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedDay && format(selectedDay, 'MMM d, yyyy')}
              </Text>
              <TouchableOpacity onPress={closeDayModal}>
                <Text style={[styles.modalClose, { color: colors.text }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {dayData && (
                <>
                  {/* Day P&L Summary */}
                  <View style={[styles.daySummary, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={styles.daySummaryItem}>
                      <Text style={[
                        styles.daySummaryValue,
                        { color: dayData.pnl >= 0 ? designColors.semantic.success : designColors.semantic.error }
                      ]}>
                        {dayData.pnl >= 0 ? '+' : ''}${safeFixed(dayData.pnl, 2)}
                      </Text>
                      <Text style={[styles.daySummaryLabel, { color: colors.textTertiary }]}>
                        {safeFixed(dayData.pnlR, 2)}R
                      </Text>
                    </View>
                    <View style={styles.daySummaryItem}>
                      <Text style={[styles.daySummaryValue, { color: colors.text }]}>
                        {dayData.tradeCount}
                      </Text>
                      <Text style={[styles.daySummaryLabel, { color: colors.textTertiary }]}>
                        {dayData.tradeCount === 1 ? 'Trade' : 'Trades'}
                      </Text>
                    </View>
                  </View>

                  {/* Bias */}
                  {dayData.bias && (
                    <View style={[styles.dayBias, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={styles.dayBiasHeader}>
                        <Text style={[styles.dayBiasLabel, { color: colors.textSecondary }]}>Market Bias</Text>
                        <Badge
                          variant={
                            dayData.bias.bias === 'bullish' ? 'success' :
                            dayData.bias.bias === 'bearish' ? 'error' :
                            undefined
                          }
                          size="sm"
                        >
                          {dayData.bias.bias}
                        </Badge>
                      </View>
                      <Text style={[styles.dayBiasReason, { color: colors.text }]}>
                        {dayData.bias.reason}
                      </Text>
                    </View>
                  )}

                  {/* Trades */}
                  {dayData.trades.length > 0 ? (
                    <View style={styles.dayTrades}>
                      {dayData.trades.map((trade) => (
                        <TouchableOpacity
                          key={trade.id}
                          style={[styles.dayTradeItem, { backgroundColor: colors.surfaceElevated }]}
                          onPress={() => {
                            closeDayModal();
                            navigation.navigate('Trades', {
                              screen: 'TradeDetail',
                              params: { id: trade.id }
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.dayTradeLeft}>
                            <Text style={[styles.dayTradeSymbol, { color: colors.text }]}>
                              {trade.symbol}
                            </Text>
                            <Badge variant={trade.direction === 'LONG' ? 'success' : 'error'} size="sm">
                              {trade.direction === 'LONG' ? 'L' : 'S'}
                            </Badge>
                          </View>
                          <Text style={[
                            styles.dayTradePnl,
                            { color: (trade.resultUsd || 0) >= 0 ? designColors.semantic.success : designColors.semantic.error }
                          ]}>
                            {(trade.resultUsd || 0) >= 0 ? '+' : ''}${safeFixed(trade.resultUsd, 0)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      
                      <TouchableOpacity
                        style={[styles.addTradeButton, { borderColor: colors.text, backgroundColor: colors.text }]}
                        onPress={() => {
                          closeDayModal();
                          navigation.navigate('Trades', {
                            screen: 'NewTrade',
                            params: { date: format(selectedDay!, 'yyyy-MM-dd') }
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.addTradeText, { color: colors.background }]}>
                          + Add Trade
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.emptyDayState, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.emptyDayText, { color: colors.textSecondary }]}>
                        No trades this day
                      </Text>
                      <TouchableOpacity
                        style={[styles.emptyDayButton, { backgroundColor: colors.text }]}
                        onPress={() => {
                          closeDayModal();
                          navigation.navigate('Trades', {
                            screen: 'NewTrade',
                            params: { date: format(selectedDay!, 'yyyy-MM-dd') }
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.emptyDayButtonText, { color: colors.background }]}>Add Trade</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Journal Entries */}
                  {dayData.journals.length > 0 && (
                    <View style={styles.dayJournals}>
                      <Text style={[styles.dayJournalsTitle, { color: colors.textSecondary }]}>
                        Journal Entries
                      </Text>
                      {dayData.journals.map((journal, idx) => (
                        <View key={idx} style={[styles.dayJournalItem, { backgroundColor: colors.surfaceElevated }]}>
                          <Badge size="sm">{journal.moodLabel}</Badge>
                          <Text style={[styles.dayJournalText, { color: colors.text }]}>
                            {journal.shortNote}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    ...typography.h3,
    fontSize: 20,
  },
  monthInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthTitle: {
    ...typography.h3,
    fontSize: 18,
  },
  monthSummary: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.h4,
    fontSize: 18,
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.micro,
    fontSize: 10,
  },
  quickFilters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickStatCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.md,
  },
  quickStatValue: {
    ...typography.h4,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickStatLabel: {
    ...typography.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  calendarGlass: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.lg,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    ...typography.bodyBold,
    fontSize: 12,
    fontWeight: '600',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 0.9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 0.9,
  },
  dayNumber: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
  dayPnl: {
    ...typography.micro,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  dayIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicatorText: {
    ...typography.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  biasDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
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
  },
  modalClose: {
    ...typography.bodyBold,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  daySummary: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  daySummaryValue: {
    ...typography.h2,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  daySummaryLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  dayBias: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  dayBiasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayBiasLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  dayBiasReason: {
    ...typography.body,
    lineHeight: 20,
  },
  dayTrades: {
    gap: spacing.sm,
  },
  dayTradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    ...shadows.md,
  },
  dayTradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayTradeSymbol: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  dayTradePnl: {
    ...typography.h4,
    fontSize: 16,
  },
  addTradeButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addTradeText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  emptyDayState: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyDayText: {
    ...typography.body,
  },
  emptyDayButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  emptyDayButtonText: {
    ...typography.bodyBold,
  },
  dayJournals: {
    marginTop: spacing.md,
  },
  dayJournalsTitle: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  dayJournalItem: {
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  dayJournalText: {
    ...typography.body,
    lineHeight: 18,
  },
});
