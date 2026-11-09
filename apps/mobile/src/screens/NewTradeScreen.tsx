import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useStorage } from '../contexts/StorageContext';
import { AssetClass, Direction, Grade, Outcome, Session, MarketRegime, MarketHoursTag, SetupTag, NewsTag, RthEth, FuturesInstrument, OptionsUnderlying, OptionType } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { calculateDisciplineFlags } from '../lib/discipline-flags';
import { colors as designColors, typography, spacing, shadows, borderRadius } from '../design/theme';
import Svg, { Path } from 'react-native-svg';
import { lightHaptic, successHaptic } from '../lib/haptics';

export function NewTradeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  const { trades, strategies, versions, riskRules, saveTrades } = useStorage();
  
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.FUTURES);
  const [showDetailedMode, setShowDetailedMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEntryTimePicker, setShowEntryTimePicker] = useState(false);
  const [showExitTimePicker, setShowExitTimePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    tradeDate: new Date().toISOString().split('T')[0],
    entryTime: '09:30',
    exitTime: '10:30',
    direction: Direction.LONG,
    quantity: 1,
    plannedRiskUsd: 100,
    grade: Grade.B,
    strategyId: '',
    strategyVersionId: '',
    session: Session.NEW_YORK,
    marketRegime: MarketRegime.RANGE,
    marketHoursTag: MarketHoursTag.MIDDAY,
    setupTags: [] as SetupTag[],
    notes: '',
    // Futures
    instrumentRoot: FuturesInstrument.ES,
    entryPrice: 4000,
    exitPrice: 4010,
    // Options
    underlying: OptionsUnderlying.SPY,
    strike: 400,
    optionType: OptionType.CALL,
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryPremium: 5,
    exitPremium: 6,
  });

  const strategyVersions = formData.strategyId
    ? versions.filter((v) => v.strategyId === formData.strategyId)
    : [];

  const handleSave = async () => {
    const now = Date.now();
    const entryTime = new Date(`${formData.tradeDate}T${formData.entryTime}:00`).getTime();
    const exitTime = new Date(`${formData.tradeDate}T${formData.exitTime}:00`).getTime();

    let newTrade: Trade;

    if (assetClass === AssetClass.FUTURES) {
      const pointsPnL = formData.direction === Direction.LONG
        ? (formData.exitPrice - formData.entryPrice) * formData.quantity
        : (formData.entryPrice - formData.exitPrice) * formData.quantity;
      const resultUsd = pointsPnL * 12.5 - 10;
      const resultR = resultUsd / formData.plannedRiskUsd;
      const outcome = resultR > 0.1 ? Outcome.WIN : resultR < -0.1 ? Outcome.LOSS : Outcome.BREAKEVEN;

      const tempTrade = {
        id: `trade-${now}`,
        assetClass: AssetClass.FUTURES,
        createdAt: now,
        updatedAt: now,
        tradeDate: formData.tradeDate,
        entryTime,
        exitTime,
        direction: formData.direction,
        quantity: formData.quantity,
        feesUsd: 10,
        plannedRiskUsd: formData.plannedRiskUsd,
        resultUsd,
        resultR,
        outcome,
        grade: formData.grade,
        strategyId: formData.strategyId || undefined,
        strategyVersionId: formData.strategyVersionId || undefined,
        session: formData.session,
        marketRegime: formData.marketRegime,
        marketHoursTag: formData.marketHoursTag,
        setupTags: formData.setupTags,
        newsTags: [NewsTag.NONE],
        mistakes: [],
        notes: formData.notes,
        attachments: [],
        reviewFlag: false,
        collections: [],
        instrumentRoot: formData.instrumentRoot,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        tickSize: 0.25,
        tickValueUsd: 12.5,
        pointsPnL,
        ticksPnL: pointsPnL / 0.25,
        rthEth: RthEth.RTH,
        disciplineFlags: {
          respectedDailyLossLimit: true,
          respectedMaxTrades: true,
          respectedMaxContracts: true,
          hadStopDefined: true,
          followedEntryRules: true,
          followedExitRules: true,
          journalCompleted: false,
        },
      } as FuturesTrade;
      
      const disciplineFlags = calculateDisciplineFlags(tempTrade, trades, riskRules, false);
      newTrade = { ...tempTrade, disciplineFlags };
    } else {
      const contractMultiplier = 100;
      const netPremiumPnLUsd = (formData.exitPremium - formData.entryPremium) * formData.quantity * contractMultiplier - 10;
      const resultUsd = netPremiumPnLUsd;
      const resultR = resultUsd / (formData.entryPremium * formData.quantity * contractMultiplier);
      const outcome = resultR > 0.1 ? Outcome.WIN : resultR < -0.1 ? Outcome.LOSS : Outcome.BREAKEVEN;

      newTrade = {
        id: `trade-${now}`,
        assetClass: AssetClass.OPTIONS,
        createdAt: now,
        updatedAt: now,
        tradeDate: formData.tradeDate,
        entryTime,
        exitTime,
        direction: Direction.LONG,
        quantity: formData.quantity,
        feesUsd: 10,
        plannedRiskUsd: formData.entryPremium * formData.quantity * contractMultiplier,
        resultUsd,
        resultR,
        outcome,
        grade: formData.grade,
        strategyId: formData.strategyId || undefined,
        strategyVersionId: formData.strategyVersionId || undefined,
        session: formData.session,
        marketRegime: formData.marketRegime,
        marketHoursTag: formData.marketHoursTag,
        setupTags: formData.setupTags,
        newsTags: [NewsTag.NONE],
        mistakes: [],
        notes: formData.notes,
        attachments: [],
        reviewFlag: false,
        collections: [],
        underlying: formData.underlying,
        expiration: formData.expiration,
        dte: Math.ceil((new Date(formData.expiration).getTime() - new Date(formData.tradeDate).getTime()) / (1000 * 60 * 60 * 24)),
        strike: formData.strike,
        optionType: formData.optionType,
        entryPremium: formData.entryPremium,
        exitPremium: formData.exitPremium,
        netPremiumPnLUsd,
        contractMultiplier,
        disciplineFlags: {
          respectedDailyLossLimit: true,
          respectedMaxTrades: true,
          respectedMaxContracts: true,
          hadStopDefined: true,
          followedEntryRules: true,
          followedExitRules: true,
          journalCompleted: false,
        },
      } as OptionsTrade;
    }

    const updatedTrades = [...trades, newTrade];
    await saveTrades(updatedTrades);
    successHaptic();
    Alert.alert('Success', 'Trade created successfully', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const toggleSetupTag = (tag: SetupTag) => {
    setFormData({
      ...formData,
      setupTags: formData.setupTags.includes(tag)
        ? formData.setupTags.filter((t) => t !== tag)
        : [...formData.setupTags, tag],
    });
  };

  // Chip component for selections
  const SelectChip = ({ label, selected, onPress, variant = 'default' }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void;
    variant?: 'default' | 'long' | 'short';
  }) => {
    let selectedBg = colors.text;
    let selectedText = colors.background;
    
    if (variant === 'long' && selected) {
      selectedBg = designColors.semantic.success;
      selectedText = '#FFFFFF';
    } else if (variant === 'short' && selected) {
      selectedBg = designColors.semantic.error;
      selectedText = '#FFFFFF';
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          { 
            backgroundColor: selected ? selectedBg : colors.surfaceElevated,
            borderColor: selected ? selectedBg : colors.border,
          }
        ]}
        onPress={() => { lightHaptic(); onPress(); }}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.chipText,
          { color: selected ? selectedText : colors.text }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
            <Path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Trade</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.saveButton, { color: designColors.accent.main }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Asset Class Toggle */}
          <View style={styles.section}>
            <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  assetClass === AssetClass.FUTURES && { backgroundColor: colors.surface }
                ]}
                onPress={() => setAssetClass(AssetClass.FUTURES)}
              >
                <Text style={[
                  styles.segmentText,
                  { color: assetClass === AssetClass.FUTURES ? colors.text : colors.textSecondary }
                ]}>Futures</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  assetClass === AssetClass.OPTIONS && { backgroundColor: colors.surface }
                ]}
                onPress={() => setAssetClass(AssetClass.OPTIONS)}
              >
                <Text style={[
                  styles.segmentText,
                  { color: assetClass === AssetClass.OPTIONS ? colors.text : colors.textSecondary }
                ]}>Options</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trade Details Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Trade Details</Text>
            
            {/* Instrument */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                {assetClass === AssetClass.FUTURES ? 'INSTRUMENT' : 'UNDERLYING'}
              </Text>
              <TextInput
                style={[styles.input, styles.inputLarge, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                value={assetClass === AssetClass.FUTURES ? formData.instrumentRoot : formData.underlying}
                onChangeText={(text) => assetClass === AssetClass.FUTURES 
                  ? setFormData({ ...formData, instrumentRoot: text as FuturesInstrument })
                  : setFormData({ ...formData, underlying: text as OptionsUnderlying })
                }
                placeholder={assetClass === AssetClass.FUTURES ? "ES, NQ, CL..." : "SPY, QQQ..."}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Direction */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DIRECTION</Text>
              <View style={styles.chipRow}>
                <SelectChip 
                  label="Long" 
                  selected={formData.direction === Direction.LONG}
                  onPress={() => setFormData({ ...formData, direction: Direction.LONG })}
                  variant="long"
                />
                <SelectChip 
                  label="Short" 
                  selected={formData.direction === Direction.SHORT}
                  onPress={() => setFormData({ ...formData, direction: Direction.SHORT })}
                  variant="short"
                />
              </View>
            </View>

            {/* Date & Time Row */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DATE</Text>
                <TouchableOpacity
                  style={[styles.dateDisplay, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    lightHaptic();
                    setShowDatePicker(true);
                  }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                    <Path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {format(new Date(formData.tradeDate), 'MMM dd, yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(formData.tradeDate)}
                mode="date"
                display="default"
                onChange={(_event: any, selectedDate?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setFormData({ ...formData, tradeDate: selectedDate.toISOString().split('T')[0] });
                  }
                }}
              />
            )}

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ENTRY TIME</Text>
                <TouchableOpacity
                  style={[styles.dateDisplay, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    lightHaptic();
                    setShowEntryTimePicker(true);
                  }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                    <Path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formData.entryTime}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXIT TIME</Text>
                <TouchableOpacity
                  style={[styles.dateDisplay, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    lightHaptic();
                    setShowExitTimePicker(true);
                  }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                    <Path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formData.exitTime}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showEntryTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${formData.entryTime}:00`)}
                mode="time"
                display="default"
                onChange={(_event: any, selectedTime?: Date) => {
                  setShowEntryTimePicker(Platform.OS === 'ios');
                  if (selectedTime) {
                    const hours = selectedTime.getHours().toString().padStart(2, '0');
                    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                    setFormData({ ...formData, entryTime: `${hours}:${minutes}` });
                  }
                }}
              />
            )}

            {showExitTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${formData.exitTime}:00`)}
                mode="time"
                display="default"
                onChange={(_event: any, selectedTime?: Date) => {
                  setShowExitTimePicker(Platform.OS === 'ios');
                  if (selectedTime) {
                    const hours = selectedTime.getHours().toString().padStart(2, '0');
                    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                    setFormData({ ...formData, exitTime: `${hours}:${minutes}` });
                  }
                }}
              />
            )}
          </View>

          {/* Pricing Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Pricing</Text>
            
            {assetClass === AssetClass.FUTURES ? (
              <>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ENTRY PRICE</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.entryPrice.toString()}
                      onChangeText={(text) => setFormData({ ...formData, entryPrice: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXIT PRICE</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.exitPrice.toString()}
                      onChangeText={(text) => setFormData({ ...formData, exitPrice: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CONTRACTS</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.quantity.toString()}
                      onChangeText={(text) => setFormData({ ...formData, quantity: parseInt(text) || 1 })}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>PLANNED RISK ($)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.plannedRiskUsd.toString()}
                      onChangeText={(text) => setFormData({ ...formData, plannedRiskUsd: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>STRIKE</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.strike.toString()}
                      onChangeText={(text) => setFormData({ ...formData, strike: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TYPE</Text>
                    <View style={styles.chipRow}>
                      <SelectChip 
                        label="Call" 
                        selected={formData.optionType === OptionType.CALL}
                        onPress={() => setFormData({ ...formData, optionType: OptionType.CALL })}
                      />
                      <SelectChip 
                        label="Put" 
                        selected={formData.optionType === OptionType.PUT}
                        onPress={() => setFormData({ ...formData, optionType: OptionType.PUT })}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXPIRATION</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                    value={formData.expiration}
                    onChangeText={(text) => setFormData({ ...formData, expiration: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ENTRY PREMIUM</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.entryPremium.toString()}
                      onChangeText={(text) => setFormData({ ...formData, entryPremium: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>EXIT PREMIUM</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.exitPremium.toString()}
                      onChangeText={(text) => setFormData({ ...formData, exitPremium: parseFloat(text) || 0 })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>CONTRACTS</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                      value={formData.quantity.toString()}
                      onChangeText={(text) => setFormData({ ...formData, quantity: parseInt(text) || 1 })}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>

          {/* Strategy & Grade Card - DETAILED MODE ONLY */}
          {showDetailedMode && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Strategy & Grade</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>STRATEGY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  <SelectChip 
                    label="None" 
                    selected={!formData.strategyId}
                    onPress={() => setFormData({ ...formData, strategyId: '', strategyVersionId: '' })}
                  />
                  {strategies.map((s) => (
                    <SelectChip 
                      key={s.id}
                      label={s.name} 
                      selected={formData.strategyId === s.id}
                      onPress={() => setFormData({ ...formData, strategyId: s.id, strategyVersionId: '' })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {strategyVersions.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>VERSION</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  <View style={styles.chipRow}>
                    {strategyVersions.map((v) => (
                      <SelectChip 
                        key={v.id}
                        label={v.version} 
                        selected={formData.strategyVersionId === v.id}
                        onPress={() => setFormData({ ...formData, strategyVersionId: v.id })}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>GRADE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {Object.values(Grade).map((g) => (
                    <SelectChip 
                      key={g}
                      label={g} 
                      selected={formData.grade === g}
                      onPress={() => setFormData({ ...formData, grade: g })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          )}

          {/* Market Context Card - DETAILED MODE ONLY */}
          {showDetailedMode && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Market Context</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>SESSION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {Object.values(Session).map((s) => (
                    <SelectChip 
                      key={s}
                      label={s.replace(/_/g, ' ')} 
                      selected={formData.session === s}
                      onPress={() => setFormData({ ...formData, session: s })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>MARKET REGIME</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {Object.values(MarketRegime).map((r) => (
                    <SelectChip 
                      key={r}
                      label={r.replace(/_/g, ' ')} 
                      selected={formData.marketRegime === r}
                      onPress={() => setFormData({ ...formData, marketRegime: r })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>TIME OF DAY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {Object.values(MarketHoursTag).map((h) => (
                    <SelectChip 
                      key={h}
                      label={h.replace(/_/g, ' ')} 
                      selected={formData.marketHoursTag === h}
                      onPress={() => setFormData({ ...formData, marketHoursTag: h })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          )}

          {/* Setup Tags Card - DETAILED MODE ONLY */}
          {showDetailedMode && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Setup Tags</Text>
            <View style={styles.tagsWrap}>
              {Object.values(SetupTag).map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    { 
                      backgroundColor: formData.setupTags.includes(tag) ? colors.text : colors.surfaceElevated,
                      borderColor: formData.setupTags.includes(tag) ? colors.text : colors.border,
                    }
                  ]}
                  onPress={() => toggleSetupTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tagText,
                    { color: formData.setupTags.includes(tag) ? colors.background : colors.text }
                  ]}>
                    {tag.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          )}

          {/* Notes Card - DETAILED MODE ONLY */}
          {showDetailedMode && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={4}
              placeholder="Add notes about this trade..."
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
            />
          </View>
          )}

          {/* Save Buttons - Two Stage */}
          {!showDetailedMode ? (
            <View style={{ gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.text }]}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>Save Quick</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => {
                  lightHaptic();
                  setShowDetailedMode(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Add Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.text }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>Save Trade</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerButton: {
    padding: spacing.xs,
    minWidth: 60,
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: '600',
  },
  saveButton: {
    ...typography.bodyBold,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentText: {
    ...typography.bodyBold,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.h5,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.micro,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
  },
  inputLarge: {
    ...typography.h4,
    fontWeight: '600',
  },
  chipScroll: {
    marginHorizontal: -spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  textArea: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    minHeight: 100,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 52,
  },
  dateText: {
    ...typography.body,
    flex: 1,
  },
});
