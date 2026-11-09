import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, Animated, PanResponder } from 'react-native';
import { useStorage } from '../contexts/StorageContext';
import type { DailyBias, DailyQuickJournal, TradeJournal, Trade } from '@trde/core';
import { EmotionLabel } from '@trde/core';
import { format, formatDistanceToNow } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { Badge } from '../components/Badge';
import { colors as designColors, typography, spacing, borderRadius, shadows } from '../design/theme';
import Svg, { Path } from 'react-native-svg';
import { lightHaptic, mediumHaptic, successHaptic, selectionHaptic } from '../lib/haptics';

const { width } = Dimensions.get('window');

type TabType = 'biases' | 'notes' | 'trades';

export function JournalScreen() {
  const { theme } = useTheme();
  const { dailyBiases: biases, quickJournals: journals, journals: tradeJournals, trades, saveDailyBiases, saveQuickJournals } = useStorage();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  
  const [activeTab, setActiveTab] = useState<TabType>('biases');
  const [showBiasForm, setShowBiasForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBiasIndex, setSelectedBiasIndex] = useState<number | null>(null);
  const [selectedBiasDetail, setSelectedBiasDetail] = useState<{ bias: DailyBias; index: number } | null>(null);
  const [selectedTradeJournal, setSelectedTradeJournal] = useState<{ journal: TradeJournal; trade: Trade } | null>(null);
  
  // Use ref to track current tab for gesture handler (avoids stale closure)
  const activeTabRef = useRef<TabType>(activeTab);
  activeTabRef.current = activeTab;
  
  // Tab order for navigation
  const tabOrder: TabType[] = ['biases', 'notes', 'trades'];
  
  const navigateTab = (direction: 'next' | 'prev') => {
    const currentIndex = tabOrder.indexOf(activeTabRef.current);
    if (direction === 'next' && currentIndex < tabOrder.length - 1) {
      lightHaptic();
      setActiveTab(tabOrder[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      lightHaptic();
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };
  
  // Swipe gesture handling
  const swipePosition = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes that are clearly horizontal
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const hasMovedEnough = Math.abs(gestureState.dx) > 15;
        return isHorizontalSwipe && hasMovedEnough;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const hasMovedEnough = Math.abs(gestureState.dx) > 15;
        return isHorizontalSwipe && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        swipePosition.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        swipePosition.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = 40;
        const velocityThreshold = 0.2;
        
        const shouldNavigate = Math.abs(gestureState.dx) > swipeThreshold || 
                               Math.abs(gestureState.vx) > velocityThreshold;
        
        if (shouldNavigate) {
          if (gestureState.dx > 0) {
            // Swipe right - go to previous tab
            navigateTab('prev');
          } else {
            // Swipe left - go to next tab
            navigateTab('next');
          }
        }
        
        Animated.spring(swipePosition, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipePosition, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;
  
  const [biasForm, setBiasForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    bias: 'neutral' as 'bullish' | 'bearish' | 'neutral', 
    reason: '', 
    confidence: 50 
  });
  
  const [journalForm, setJournalForm] = useState({ 
    moodLabel: EmotionLabel.NEUTRAL, 
    moodIntensity: 3,
    shortNote: '' 
  });
  
  const [confirmationForm, setConfirmationForm] = useState({
    confirmed: true,
    notes: '',
  });

  const handleSaveBias = async () => {
    if (!biasForm.date || !biasForm.reason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    const newBias: DailyBias = { ...biasForm, confidence: biasForm.confidence };
    await saveDailyBiases([...biases, newBias]);
    successHaptic();
    setShowBiasForm(false);
    setBiasForm({ date: new Date().toISOString().split('T')[0], bias: 'neutral', reason: '', confidence: 50 });
  };

  const handleSaveJournal = async () => {
    if (!journalForm.shortNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }
    const newJournal: DailyQuickJournal = {
      timestamp: Date.now(),
      moodLabel: journalForm.moodLabel,
      moodIntensity: journalForm.moodIntensity,
      shortNote: journalForm.shortNote,
    };
    await saveQuickJournals([...journals, newJournal]);
    successHaptic();
    setShowJournalForm(false);
    setJournalForm({ moodLabel: EmotionLabel.NEUTRAL, moodIntensity: 3, shortNote: '' });
  };

  const handleConfirmBias = (index: number) => {
    setSelectedBiasIndex(index);
    setConfirmationForm({ confirmed: true, notes: '' });
    setShowConfirmModal(true);
  };

  const handleSaveConfirmation = async () => {
    if (selectedBiasIndex === null) return;
    
    const updated = [...biases];
    updated[selectedBiasIndex] = {
      ...updated[selectedBiasIndex],
      confirmed: confirmationForm.confirmed,
      confirmationNotes: confirmationForm.notes.trim() || undefined,
      confirmedAt: Date.now(),
    };
    
    await saveDailyBiases(updated);
    setShowConfirmModal(false);
    setSelectedBiasIndex(null);
    setConfirmationForm({ confirmed: true, notes: '' });
  };

  const sortedBiases = [...biases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedJournals = [...journals].sort((a, b) => b.timestamp - a.timestamp);
  
  // Get trade journals with their associated trades
  const tradeJournalsWithTrades = useMemo(() => {
    return tradeJournals
      .map(tj => {
        const trade = trades.find(t => t.id === tj.tradeId);
        return trade ? { journal: tj, trade } : null;
      })
      .filter((item): item is { journal: TradeJournal; trade: Trade } => item !== null)
      .sort((a, b) => b.trade.entryTime - a.trade.entryTime);
  }, [tradeJournals, trades]);

  // Combined timeline for "All" tab
  const allEntries = useMemo(() => {
    const entries: Array<{
      type: 'bias' | 'note' | 'trade';
      timestamp: number;
      data: any;
    }> = [];

    biases.forEach(b => entries.push({
      type: 'bias',
      timestamp: new Date(b.date).getTime(),
      data: b,
    }));

    journals.forEach(j => entries.push({
      type: 'note',
      timestamp: j.timestamp,
      data: j,
    }));

    tradeJournalsWithTrades.forEach(tj => entries.push({
      type: 'trade',
      timestamp: tj.trade.entryTime,
      data: tj,
    }));

    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }, [biases, journals, tradeJournalsWithTrades]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'biases', label: 'Biases', count: biases.length },
    { key: 'notes', label: 'Notes', count: journals.length },
    { key: 'trades', label: 'Trades', count: tradeJournalsWithTrades.length },
  ];

  const getInstrumentName = (trade: Trade) => {
    if (trade.assetClass === 'FUTURES') {
      return (trade as any).instrumentRoot || 'Unknown';
    } else if (trade.assetClass === 'OPTIONS') {
      return (trade as any).underlying || 'Unknown';
    }
    return 'Unknown';
  };

  const [showFABMenu, setShowFABMenu] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Journal</Text>
          <View style={styles.headerStats}>
            <Text style={[styles.headerStatsText, { color: colors.textTertiary }]}>
              {biases.length + journals.length + tradeJournalsWithTrades.length} entries
            </Text>
          </View>
        </View>

        {/* Segmented Control - Premium Style */}
        <View style={styles.segmentedControl}>
          <View style={[styles.segmentedControlTrack, { backgroundColor: colors.surfaceElevated }]}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentedControlItem,
                  activeTab === tab.key && [
                    styles.segmentedControlItemActive, 
                    { backgroundColor: colors.surface }
                  ],
                ]}
                onPress={() => { lightHaptic(); setActiveTab(tab.key); }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.segmentedControlText,
                  { color: activeTab === tab.key ? colors.text : colors.textTertiary },
                  activeTab === tab.key && styles.segmentedControlTextActive,
                ]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[
                    styles.segmentedControlCount,
                    { 
                      backgroundColor: activeTab === tab.key 
                        ? designColors.accent.main + '20' 
                        : 'transparent' 
                    }
                  ]}>
                    <Text style={[
                      styles.segmentedControlCountText,
                      { 
                        color: activeTab === tab.key 
                          ? designColors.accent.main 
                          : colors.textTertiary 
                      }
                    ]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.contentWrapper} {...panResponder.panHandlers}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
        >
        {/* BIASES TAB */}
        {activeTab === 'biases' && sortedBiases.length > 0 && (
          <View style={styles.section}>
            
            {sortedBiases.map((bias, idx) => {
              const actualIndex = biases.findIndex(b => b.date === bias.date && b.reason === bias.reason);
              const isConfirmed = bias.confirmed !== undefined;
              const isToday = bias.date === new Date().toISOString().split('T')[0];
              
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => setSelectedBiasDetail({ bias, index: actualIndex })}
                >
                  <View
                    style={[
                      styles.biasCard,
                      { backgroundColor: colors.surface },
                      isConfirmed && {
                        borderLeftWidth: 4,
                        borderLeftColor: bias.confirmed ? designColors.semantic.success : designColors.semantic.error,
                      }
                    ]}
                  >
                    <View style={styles.biasHeader}>
                      <Text style={[styles.biasDate, { color: isToday ? colors.text : colors.textSecondary }]}>
                        {format(new Date(bias.date), 'MMM d, yyyy')}
                        {isToday && <Text style={{ color: colors.text, fontWeight: '700' }}> · Today</Text>}
                      </Text>
                      <View style={styles.biasBadges}>
                        {isConfirmed && (
                          <Badge variant={bias.confirmed ? 'success' : 'error'} size="sm">
                            {bias.confirmed ? 'Correct' : 'Wrong'}
                          </Badge>
                        )}
                        <Badge 
                          variant={
                            bias.bias === 'bullish' ? 'success' : 
                            bias.bias === 'bearish' ? 'error' : 
                            undefined
                          }
                          size="sm"
                        >
                          {bias.bias === 'bullish' ? '↑' : bias.bias === 'bearish' ? '↓' : '→'} {bias.bias}
                        </Badge>
                      </View>
                    </View>

                    <Text style={[styles.biasReason, { color: colors.text }]} numberOfLines={2}>{bias.reason}</Text>

                    <View style={styles.biasFooter}>
                      <View style={styles.confidenceBar}>
                        <View style={[styles.confidenceBarBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.confidenceBarFill,
                              { 
                                width: `${bias.confidence}%`,
                                backgroundColor: colors.text
                              }
                            ]}
                          />
                        </View>
                        <Text style={[styles.confidenceText, { color: colors.textTertiary }]}>
                          {bias.confidence}% confidence
                        </Text>
                      </View>
                      
                      {!isConfirmed && (
                        <View style={[styles.needsConfirmDot, { backgroundColor: designColors.semantic.warning }]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && sortedJournals.length > 0 && (
          <View style={styles.section}>
            {sortedJournals.map((journal, idx) => (
              <View
                key={idx}
                style={[styles.noteCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.noteHeader}>
                  <Badge 
                    variant={
                      journal.moodLabel === EmotionLabel.CONFIDENT || journal.moodLabel === EmotionLabel.CALM ? 'success' :
                      journal.moodLabel === EmotionLabel.ANXIOUS || journal.moodLabel === EmotionLabel.FEAR ? 'error' :
                      journal.moodLabel === EmotionLabel.EXCITED ? 'warning' : undefined
                    }
                    size="sm"
                  >
                    {journal.moodLabel}
                  </Badge>
                  <Text style={[styles.noteTime, { color: colors.textTertiary }]}>
                    {formatDistanceToNow(journal.timestamp, { addSuffix: true })}
                  </Text>
                </View>
                <Text style={[styles.noteText, { color: colors.text }]}>{journal.shortNote}</Text>
                <View style={styles.intensityDots}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.intensityDot,
                        {
                          backgroundColor: level <= journal.moodIntensity 
                            ? colors.text 
                            : colors.border
                        }
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TRADES TAB - Trade Journals */}
        {activeTab === 'trades' && tradeJournalsWithTrades.length > 0 && (
          <View style={styles.section}>
            {tradeJournalsWithTrades.map(({ journal, trade }, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                onPress={() => setSelectedTradeJournal({ journal, trade })}
              >
                <View style={[styles.tradeJournalCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.tradeJournalHeader}>
                    <View style={styles.tradeJournalInfo}>
                      <Text style={[styles.tradeJournalSymbol, { color: colors.text }]}>
                        {getInstrumentName(trade)}
                      </Text>
                      <Badge variant={trade.outcome === 'WIN' ? 'success' : trade.outcome === 'LOSS' ? 'error' : undefined} size="sm">
                        {trade.outcome}
                      </Badge>
                    </View>
                    <Text style={[styles.tradeJournalDate, { color: colors.textTertiary }]}>
                      {format(trade.entryTime, 'MMM d, yyyy')}
                    </Text>
                  </View>
                  
                  <View style={styles.tradeJournalSections}>
                    {journal.preTrade && (
                      <View style={[styles.tradeJournalSection, { borderLeftColor: colors.primary }]}>
                        <Text style={[styles.tradeJournalSectionLabel, { color: colors.textSecondary }]}>Pre-Trade</Text>
                        <Text style={[styles.tradeJournalText, { color: colors.text }]} numberOfLines={2}>
                          {journal.preTrade.thesis}
                        </Text>
                      </View>
                    )}
                    
                    {journal.postTrade && (
                      <View style={[styles.tradeJournalSection, { borderLeftColor: designColors.semantic.success }]}>
                        <Text style={[styles.tradeJournalSectionLabel, { color: colors.textSecondary }]}>Post-Trade</Text>
                        <Text style={[styles.tradeJournalText, { color: colors.text }]} numberOfLines={2}>
                          {journal.postTrade.whatWentWell || journal.postTrade.whatToImprove}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={[styles.tapToView, { color: colors.textTertiary }]}>Tap to view full journal →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty States - Premium */}
        {activeTab === 'biases' && biases.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                <Path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Biases Yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Record your daily market bias before trading to track your market read accuracy
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.text }]}
              onPress={() => setShowBiasForm(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>Add First Bias</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'notes' && journals.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notes Yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Capture your mindset, emotions, and observations throughout the trading day
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.text }]}
              onPress={() => setShowJournalForm(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.emptyButtonText, { color: colors.background }]}>Add First Note</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'trades' && tradeJournalsWithTrades.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                <Path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Trade Journals</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Pre and post-trade journals appear here when you add them to your trades
            </Text>
          </View>
        )}
      </ScrollView>
    </View>

      {/* Floating Action Button with Menu */}
      <View style={styles.fabContainer}>
        {showFABMenu && (
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowBiasForm(true);
                setShowFABMenu(false);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: designColors.semantic.info + '15' }]}>
                <Text style={[styles.fabMenuIconText, { color: designColors.semantic.info }]}>↑</Text>
              </View>
              <View style={styles.fabMenuContent}>
                <Text style={[styles.fabMenuTitle, { color: colors.text }]}>Market Bias</Text>
                <Text style={[styles.fabMenuSubtitle, { color: colors.textTertiary }]}>Record daily direction</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowJournalForm(true);
                setShowFABMenu(false);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: designColors.semantic.warning + '15' }]}>
                <Text style={[styles.fabMenuIconText, { color: designColors.semantic.warning }]}>✎</Text>
              </View>
              <View style={styles.fabMenuContent}>
                <Text style={[styles.fabMenuTitle, { color: colors.text }]}>Quick Note</Text>
                <Text style={[styles.fabMenuSubtitle, { color: colors.textTertiary }]}>Log mood & thoughts</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.fab,
            { 
              backgroundColor: designColors.accent.main,
              transform: [{ rotate: showFABMenu ? '45deg' : '0deg' }]
            }
          ]}
          onPress={() => { lightHaptic(); setShowFABMenu(!showFABMenu); }}
          activeOpacity={0.85}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5}>
            <Path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Bias Detail Modal */}
      <Modal
        visible={!!selectedBiasDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBiasDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.biasDetailHeaderLeft}>
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  {selectedBiasDetail && format(new Date(selectedBiasDetail.bias.date), 'MMM d, yyyy')}
                </Text>
                {selectedBiasDetail && (
                  <Badge 
                    variant={
                      selectedBiasDetail.bias.bias === 'bullish' ? 'success' : 
                      selectedBiasDetail.bias.bias === 'bearish' ? 'error' : 
                      undefined
                    }
                    size="sm"
                  >
                    {selectedBiasDetail.bias.bias === 'bullish' ? '↑' : selectedBiasDetail.bias.bias === 'bearish' ? '↓' : '→'} {selectedBiasDetail.bias.bias}
                  </Badge>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedBiasDetail(null)}>
                <Text style={[styles.formClose, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {selectedBiasDetail && (
                <>
                  {/* Reasoning */}
                  <View style={styles.biasDetailSection}>
                    <Text style={[styles.biasDetailLabel, { color: colors.textSecondary }]}>Reasoning</Text>
                    <Text style={[styles.biasDetailText, { color: colors.text }]}>
                      {selectedBiasDetail.bias.reason}
                    </Text>
                  </View>

                  {/* Confidence */}
                  <View style={styles.biasDetailSection}>
                    <Text style={[styles.biasDetailLabel, { color: colors.textSecondary }]}>Confidence Level</Text>
                    <View style={styles.biasDetailConfidence}>
                      <View style={[styles.confidenceBarBg, { backgroundColor: colors.border, flex: 1 }]}>
                        <View
                          style={[
                            styles.confidenceBarFill,
                            { 
                              width: `${selectedBiasDetail.bias.confidence}%`,
                              backgroundColor: colors.text
                            }
                          ]}
                        />
                      </View>
                      <Text style={[styles.biasDetailConfidenceText, { color: colors.text }]}>
                        {selectedBiasDetail.bias.confidence}%
                      </Text>
                    </View>
                  </View>

                  {/* Confirmation Status */}
                  {selectedBiasDetail.bias.confirmed !== undefined ? (
                    <View style={styles.biasDetailSection}>
                      <Text style={[styles.biasDetailLabel, { color: colors.textSecondary }]}>Result</Text>
                      <View style={[
                        styles.biasDetailResult,
                        { 
                          backgroundColor: selectedBiasDetail.bias.confirmed 
                            ? designColors.semantic.success + '15' 
                            : designColors.semantic.error + '15' 
                        }
                      ]}>
                        <Text style={[
                          styles.biasDetailResultText,
                          { 
                            color: selectedBiasDetail.bias.confirmed 
                              ? designColors.semantic.success 
                              : designColors.semantic.error 
                          }
                        ]}>
                          {selectedBiasDetail.bias.confirmed ? '✓ Bias was correct' : '✗ Bias was incorrect'}
                        </Text>
                        {selectedBiasDetail.bias.confirmationNotes && (
                          <Text style={[styles.biasDetailResultNote, { color: colors.textSecondary }]}>
                            "{selectedBiasDetail.bias.confirmationNotes}"
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.biasDetailSection}>
                      <Text style={[styles.biasDetailLabel, { color: colors.textSecondary }]}>Confirm Result</Text>
                      <Text style={[styles.biasDetailHint, { color: colors.textTertiary }]}>
                        Was your market bias correct?
                      </Text>
                      
                      <View style={styles.biasDetailConfirmButtons}>
                        <TouchableOpacity
                          style={[
                            styles.biasDetailConfirmBtn,
                            { 
                              backgroundColor: confirmationForm.confirmed 
                                ? designColors.semantic.success 
                                : colors.surfaceElevated,
                              borderColor: confirmationForm.confirmed 
                                ? designColors.semantic.success 
                                : colors.border,
                            }
                          ]}
                          onPress={() => setConfirmationForm({ ...confirmationForm, confirmed: true })}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.biasDetailConfirmBtnText,
                            { color: confirmationForm.confirmed ? '#FFFFFF' : colors.text }
                          ]}>
                            ✓ Yes, Correct
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.biasDetailConfirmBtn,
                            { 
                              backgroundColor: !confirmationForm.confirmed 
                                ? designColors.semantic.error 
                                : colors.surfaceElevated,
                              borderColor: !confirmationForm.confirmed 
                                ? designColors.semantic.error 
                                : colors.border,
                            }
                          ]}
                          onPress={() => setConfirmationForm({ ...confirmationForm, confirmed: false })}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.biasDetailConfirmBtnText,
                            { color: !confirmationForm.confirmed ? '#FFFFFF' : colors.text }
                          ]}>
                            ✗ No, Wrong
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={[styles.biasDetailNoteInput, { 
                          backgroundColor: colors.surfaceElevated, 
                          color: colors.text, 
                          borderColor: colors.border 
                        }]}
                        value={confirmationForm.notes}
                        onChangeText={(notes) => setConfirmationForm({ ...confirmationForm, notes })}
                        placeholder="Add notes about what happened..."
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={3}
                      />

                      <TouchableOpacity
                        style={[styles.biasDetailSaveBtn, { backgroundColor: colors.text }]}
                        onPress={async () => {
                          if (selectedBiasDetail) {
                            const updated = [...biases];
                            updated[selectedBiasDetail.index] = {
                              ...updated[selectedBiasDetail.index],
                              confirmed: confirmationForm.confirmed,
                              confirmationNotes: confirmationForm.notes.trim() || undefined,
                              confirmedAt: Date.now(),
                            };
                            await saveDailyBiases(updated);
                            setSelectedBiasDetail(null);
                            setConfirmationForm({ confirmed: true, notes: '' });
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.biasDetailSaveBtnText, { color: colors.background }]}>
                          Save Confirmation
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bias Form Modal */}
      <Modal
        visible={showBiasForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBiasForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Daily Bias</Text>
              <TouchableOpacity onPress={() => setShowBiasForm(false)}>
                <Text style={[styles.formClose, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                  value={biasForm.date}
                  onChangeText={(date) => setBiasForm({ ...biasForm, date })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Direction</Text>
                <View style={styles.biasButtons}>
                  {(['bullish', 'neutral', 'bearish'] as const).map((biasType) => (
                    <TouchableOpacity
                      key={biasType}
                      style={[
                        styles.biasButton,
                        {
                          backgroundColor: biasForm.bias === biasType 
                            ? (biasType === 'bullish' ? designColors.semantic.success : 
                               biasType === 'bearish' ? designColors.semantic.error : 
                               colors.text)
                            : colors.surfaceElevated,
                          borderColor: biasForm.bias === biasType 
                            ? (biasType === 'bullish' ? designColors.semantic.success : 
                               biasType === 'bearish' ? designColors.semantic.error : 
                               colors.text)
                            : colors.border,
                        }
                      ]}
                      onPress={() => setBiasForm({ ...biasForm, bias: biasType })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.biasButtonText,
                        { color: biasForm.bias === biasType ? '#FFFFFF' : colors.text }
                      ]}>
                        {biasType === 'bullish' ? '↑ Bull' : biasType === 'bearish' ? '↓ Bear' : '→ Neutral'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Reasoning</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                  value={biasForm.reason}
                  onChangeText={(reason) => setBiasForm({ ...biasForm, reason })}
                  placeholder="Why do you have this bias?"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Confidence {biasForm.confidence}%
                </Text>
                <View style={styles.confidenceSlider}>
                  {[0, 25, 50, 75, 100].map((value) => (
                      <TouchableOpacity
                      key={value}
                      style={[
                        styles.confidenceButton,
                        {
                          backgroundColor: biasForm.confidence === value 
                            ? colors.text 
                            : colors.surfaceElevated,
                        }
                      ]}
                      onPress={() => setBiasForm({ ...biasForm, confidence: value })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.confidenceButtonText,
                        { color: biasForm.confidence === value ? '#FFFFFF' : colors.textSecondary }
                      ]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.text }]}
                onPress={handleSaveBias}
                activeOpacity={0.85}
              >
                <Text style={[styles.submitButtonText, { color: colors.background }]}>Save Bias</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Journal Form Modal */}
      <Modal
        visible={showJournalForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJournalForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Quick Note</Text>
              <TouchableOpacity onPress={() => setShowJournalForm(false)}>
                <Text style={[styles.formClose, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Mood</Text>
                <View style={styles.moodGrid}>
                  {Object.values(EmotionLabel).map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodChip,
                        {
                          backgroundColor: journalForm.moodLabel === mood 
                            ? colors.text 
                            : colors.surfaceElevated,
                          borderColor: journalForm.moodLabel === mood 
                            ? colors.text 
                            : colors.border,
                        }
                      ]}
                      onPress={() => setJournalForm({ ...journalForm, moodLabel: mood })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.moodChipText,
                        { color: journalForm.moodLabel === mood ? '#FFFFFF' : colors.text }
                      ]}>
                        {mood}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Intensity {journalForm.moodIntensity}
                </Text>
                <View style={styles.intensityButtons}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.intensityButton,
                        {
                          backgroundColor: journalForm.moodIntensity === level 
                            ? colors.text 
                            : colors.surfaceElevated,
                        }
                      ]}
                      onPress={() => setJournalForm({ ...journalForm, moodIntensity: level })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.intensityButtonText,
                        { color: journalForm.moodIntensity === level ? '#FFFFFF' : colors.text }
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Note</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                  value={journalForm.shortNote}
                  onChangeText={(shortNote) => setJournalForm({ ...journalForm, shortNote })}
                  placeholder="What's on your mind?"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.text }]}
                onPress={handleSaveJournal}
                activeOpacity={0.85}
              >
                <Text style={[styles.submitButtonText, { color: colors.background }]}>Save Note</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Trade Journal Detail Modal */}
      <Modal
        visible={!!selectedTradeJournal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTradeJournal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.tradeJournalModalTitle}>
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  {selectedTradeJournal ? getInstrumentName(selectedTradeJournal.trade) : ''} Journal
                </Text>
                {selectedTradeJournal && (
                  <Badge 
                    variant={selectedTradeJournal.trade.outcome === 'WIN' ? 'success' : selectedTradeJournal.trade.outcome === 'LOSS' ? 'error' : undefined} 
                    size="sm"
                  >
                    {selectedTradeJournal.trade.outcome}
                  </Badge>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedTradeJournal(null)}>
                <Text style={[styles.formClose, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {selectedTradeJournal?.journal.preTrade && (
                <View style={styles.journalDetailSection}>
                  <Text style={[styles.journalDetailLabel, { color: colors.primary }]}>Pre-Trade Analysis</Text>
                  
                  {selectedTradeJournal.journal.preTrade.thesis && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Thesis</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.preTrade.thesis}
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.preTrade.invalidation && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Invalidation</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.preTrade.invalidation}
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.preTrade.confidence && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Confidence</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.preTrade.confidence}%
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.preTrade.emotionalState && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Emotional State</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.preTrade.emotionalState}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedTradeJournal?.journal.postTrade && (
                <View style={styles.journalDetailSection}>
                  <Text style={[styles.journalDetailLabel, { color: designColors.semantic.success }]}>Post-Trade Review</Text>
                  
                  {selectedTradeJournal.journal.postTrade.whatWentWell && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>What Went Well</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.postTrade.whatWentWell}
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.postTrade.whatToImprove && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>What to Improve</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.postTrade.whatToImprove}
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.postTrade.lessonLearned && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Lesson Learned</Text>
                      <Text style={[styles.journalDetailItemText, { color: colors.text }]}>
                        {selectedTradeJournal.journal.postTrade.lessonLearned}
                      </Text>
                    </View>
                  )}
                  
                  {selectedTradeJournal.journal.postTrade.followedPlan !== undefined && (
                    <View style={styles.journalDetailItem}>
                      <Text style={[styles.journalDetailItemLabel, { color: colors.textSecondary }]}>Followed Plan</Text>
                      <Badge variant={selectedTradeJournal.journal.postTrade.followedPlan ? 'success' : 'error'} size="sm">
                        {selectedTradeJournal.journal.postTrade.followedPlan ? 'Yes' : 'No'}
                      </Badge>
                    </View>
                  )}
                </View>
              )}

              {selectedTradeJournal && (
                <View style={[styles.tradeMetaInfo, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.tradeMetaTitle, { color: colors.textSecondary }]}>Trade Details</Text>
                  <View style={styles.tradeMetaRow}>
                    <Text style={[styles.tradeMetaLabel, { color: colors.textTertiary }]}>Date</Text>
                    <Text style={[styles.tradeMetaValue, { color: colors.text }]}>
                      {format(selectedTradeJournal.trade.entryTime, 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.tradeMetaRow}>
                    <Text style={[styles.tradeMetaLabel, { color: colors.textTertiary }]}>Direction</Text>
                    <Text style={[styles.tradeMetaValue, { color: colors.text }]}>
                      {selectedTradeJournal.trade.direction}
                    </Text>
                  </View>
                  <View style={styles.tradeMetaRow}>
                    <Text style={[styles.tradeMetaLabel, { color: colors.textTertiary }]}>Result</Text>
                    <Text style={[styles.tradeMetaValue, { 
                      color: selectedTradeJournal.trade.resultUsd >= 0 ? designColors.semantic.success : designColors.semantic.error 
                    }]}>
                      ${selectedTradeJournal.trade.resultUsd.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Was your bias correct?</Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmChoice,
                  {
                    backgroundColor: confirmationForm.confirmed 
                      ? designColors.semantic.success 
                      : colors.surfaceElevated,
                    borderColor: confirmationForm.confirmed 
                      ? designColors.semantic.success 
                      : colors.border,
                  }
                ]}
                onPress={() => setConfirmationForm({ ...confirmationForm, confirmed: true })}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.confirmChoiceText,
                  { color: confirmationForm.confirmed ? '#FFFFFF' : colors.text }
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmChoice,
                  {
                    backgroundColor: !confirmationForm.confirmed 
                      ? designColors.semantic.error 
                      : colors.surfaceElevated,
                    borderColor: !confirmationForm.confirmed 
                      ? designColors.semantic.error 
                      : colors.border,
                  }
                ]}
                onPress={() => setConfirmationForm({ ...confirmationForm, confirmed: false })}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.confirmChoiceText,
                  { color: !confirmationForm.confirmed ? '#FFFFFF' : colors.text }
                ]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.textarea, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
              value={confirmationForm.notes}
              onChangeText={(notes) => setConfirmationForm({ ...confirmationForm, notes })}
              placeholder="Optional notes..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={2}
            />

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmAction, { backgroundColor: colors.text }]}
                onPress={handleSaveConfirmation}
                activeOpacity={0.85}
              >
                <Text style={[styles.confirmActionText, { color: colors.background }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmAction, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.confirmActionText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  // Premium Header
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerContent: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatsText: {
    ...typography.caption,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  // Segmented Control
  segmentedControl: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  segmentedControlTrack: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  segmentedControlItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  segmentedControlItemActive: {
    ...shadows.md,
  },
  segmentedControlText: {
    ...typography.bodyMedium,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  segmentedControlTextActive: {
    fontWeight: '600',
  },
  segmentedControlCount: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  segmentedControlCountText: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '600',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 120, // Extra space for FAB
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.lg,
  },
  biasCard: {
    padding: spacing.xl,
    borderRadius: 16,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  biasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  biasDate: {
    ...typography.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  biasBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  biasReason: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  confirmationNote: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  confirmationText: {
    ...typography.caption,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  biasFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  confidenceBar: {
    flex: 1,
  },
  confidenceBarBg: {
    height: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  confidenceBarFill: {
    height: 4,
  },
  confidenceText: {
    ...typography.micro,
    fontSize: 10,
  },
  needsConfirmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Bias Detail Modal
  biasDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  biasDetailSection: {
    marginBottom: spacing.xl,
  },
  biasDetailLabel: {
    ...typography.micro,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  biasDetailText: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
  },
  biasDetailHint: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  biasDetailConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  biasDetailConfidenceText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  biasDetailResult: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  biasDetailResultText: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  biasDetailResultNote: {
    ...typography.body,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  biasDetailConfirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  biasDetailConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  biasDetailConfirmBtnText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  biasDetailNoteInput: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  biasDetailSaveBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  biasDetailSaveBtnText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  noteCard: {
    padding: spacing.xl,
    borderRadius: 16,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  noteTime: {
    ...typography.micro,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  noteText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  intensityDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  emptyButtonText: {
    ...typography.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  formModal: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '85%',
    ...shadows.xl,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  formTitle: {
    ...typography.h3,
  },
  formClose: {
    ...typography.bodyMedium,
  },
  formScroll: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
    fontSize: 14,
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
  biasButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  biasButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  biasButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  confidenceSlider: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confidenceButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confidenceButtonText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  moodChipText: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  intensityButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  confirmModal: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xxl,
    ...shadows.xl,
  },
  confirmTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  confirmChoice: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  confirmChoiceText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  confirmAction: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  confirmActionText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  // Timeline styles
  timelineCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timelineDate: {
    ...typography.micro,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timelineContent: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  tradeJournalBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  // Trade Journal Card styles
  tradeJournalCard: {
    padding: spacing.xl,
    borderRadius: 16,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  tradeJournalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tradeJournalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tradeJournalSymbol: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tradeJournalDate: {
    ...typography.micro,
    fontSize: 11,
  },
  tradeJournalSections: {
    gap: spacing.md,
  },
  tradeJournalSection: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
  },
  tradeJournalSectionLabel: {
    ...typography.micro,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  tradeJournalText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  tapToView: {
    ...typography.micro,
    fontSize: 11,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  // Trade Journal Detail Modal styles
  tradeJournalModalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  journalDetailSection: {
    marginBottom: spacing.xl,
  },
  journalDetailLabel: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  journalDetailItem: {
    marginBottom: spacing.md,
  },
  journalDetailItemLabel: {
    ...typography.micro,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  journalDetailItemText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  tradeMetaInfo: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  tradeMetaTitle: {
    ...typography.micro,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tradeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tradeMetaLabel: {
    ...typography.body,
    fontSize: 13,
  },
  tradeMetaValue: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xxxl,
    right: spacing.xl,
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.xl,
    gap: spacing.md,
    minWidth: 200,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuIconText: {
    fontSize: 20,
    fontWeight: '600',
  },
  fabMenuContent: {
    flex: 1,
  },
  fabMenuTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  fabMenuSubtitle: {
    ...typography.micro,
    fontSize: 11,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
