import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStorage } from '../contexts/StorageContext';
import { AssetClass, Direction, Grade, Outcome, Session, MarketRegime, MarketHoursTag, SetupTag, FuturesInstrument, OptionsUnderlying, OptionType } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { colors as designColors, typography, spacing, shadows, borderRadius } from '../design/theme';
import Svg, { Path } from 'react-native-svg';
import { lightHaptic, successHaptic } from '../lib/haptics';

export function EditTradeScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? designColors.dark : designColors.light;
  const { id } = route.params;
  const { trades, strategies, versions, saveTrades } = useStorage();
  const trade = useMemo(() => trades.find((t) => t.id === id) || null, [trades, id]);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.FUTURES);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEntryTimePicker, setShowEntryTimePicker] = useState(false);
  const [showExitTimePicker, setShowExitTimePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    tradeDate: '',
    entryTime: '',
    exitTime: '',
    direction: Direction.LONG,
    quantity: 1,
    plannedRiskUsd: 100,
    grade: Grade.B,
    strategyId: '',
    session: Session.NEW_YORK,
    marketRegime: MarketRegime.RANGE,
    marketHoursTag: MarketHoursTag.MIDDAY,
    setupTags: [] as SetupTag[],
    notes: '',
    // Futures
    instrumentRoot: FuturesInstrument.ES,
    entryPrice: 0,
    exitPrice: 0,
    // Options
    underlying: OptionsUnderlying.SPY,
    strike: 0,
    optionType: OptionType.CALL,
    expiration: '',
    entryPremium: 0,
    exitPremium: 0,
  });

  useEffect(() => {
    if (trade) {
      setAssetClass(trade.assetClass);
      
      const entryDate = new Date(trade.entryTime);
      const exitDate = new Date(trade.exitTime);
      
      setFormData({
        tradeDate: trade.tradeDate,
        entryTime: format(entryDate, 'HH:mm'),
        exitTime: format(exitDate, 'HH:mm'),
        direction: trade.direction,
        quantity: trade.quantity,
        plannedRiskUsd: trade.plannedRiskUsd,
        grade: trade.grade,
        strategyId: trade.strategyId || '',
        session: trade.session,
        marketRegime: trade.marketRegime,
        marketHoursTag: trade.marketHoursTag,
        setupTags: trade.setupTags,
        notes: trade.notes || '',
        instrumentRoot: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).instrumentRoot : FuturesInstrument.ES,
        entryPrice: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).entryPrice : 0,
        exitPrice: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).exitPrice : 0,
        underlying: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).underlying : OptionsUnderlying.SPY,
        strike: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).strike : 0,
        optionType: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).optionType : OptionType.CALL,
        expiration: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).expiration : '',
        entryPremium: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).entryPremium : 0,
        exitPremium: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).exitPremium : 0,
      });
    }
  }, [trade]);

  const handleSave = async () => {
    if (!trade) return;
    
    const now = Date.now();
    const entryTime = new Date(`${formData.tradeDate}T${formData.entryTime}:00`).getTime();
    const exitTime = new Date(`${formData.tradeDate}T${formData.exitTime}:00`).getTime();

    let updatedTrade: Trade;

    if (assetClass === AssetClass.FUTURES) {
      const futuresTrade = trade as FuturesTrade;
      const pointsPnL = formData.direction === Direction.LONG
        ? (formData.exitPrice - formData.entryPrice) * formData.quantity
        : (formData.entryPrice - formData.exitPrice) * formData.quantity;
      const resultUsd = pointsPnL * (futuresTrade.tickValueUsd || 12.5) - (futuresTrade.feesUsd || 10);
      const resultR = resultUsd / formData.plannedRiskUsd;
      const outcome = resultR > 0.1 ? Outcome.WIN : resultR < -0.1 ? Outcome.LOSS : Outcome.BREAKEVEN;

      updatedTrade = {
        ...trade,
        updatedAt: now,
        tradeDate: formData.tradeDate,
        entryTime,
        exitTime,
        direction: formData.direction,
        quantity: formData.quantity,
        plannedRiskUsd: formData.plannedRiskUsd,
        resultUsd,
        resultR,
        outcome,
        grade: formData.grade,
        strategyId: formData.strategyId,
        session: formData.session,
        marketRegime: formData.marketRegime,
        marketHoursTag: formData.marketHoursTag,
        setupTags: formData.setupTags,
        notes: formData.notes,
        instrumentRoot: formData.instrumentRoot,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        pointsPnL,
        ticksPnL: pointsPnL / (futuresTrade.tickSize || 0.25),
      } as FuturesTrade;
    } else {
      const optionsTrade = trade as OptionsTrade;
      const contractMultiplier = optionsTrade.contractMultiplier || 100;
      const netPremiumPnLUsd = (formData.exitPremium - formData.entryPremium) * formData.quantity * contractMultiplier - (optionsTrade.feesUsd || 10);
      const resultUsd = netPremiumPnLUsd;
      const resultR = resultUsd / (formData.entryPremium * formData.quantity * contractMultiplier);
      const outcome = resultR > 0.1 ? Outcome.WIN : resultR < -0.1 ? Outcome.LOSS : Outcome.BREAKEVEN;

      updatedTrade = {
        ...trade,
        updatedAt: now,
        tradeDate: formData.tradeDate,
        entryTime,
        exitTime,
        direction: formData.direction,
        quantity: formData.quantity,
        plannedRiskUsd: formData.plannedRiskUsd,
        resultUsd,
        resultR,
        outcome,
        grade: formData.grade,
        strategyId: formData.strategyId,
        session: formData.session,
        marketRegime: formData.marketRegime,
        marketHoursTag: formData.marketHoursTag,
        setupTags: formData.setupTags,
        notes: formData.notes,
        underlying: formData.underlying,
        expiration: formData.expiration,
        dte: Math.ceil((new Date(formData.expiration).getTime() - new Date(formData.tradeDate).getTime()) / (1000 * 60 * 60 * 24)),
        strike: formData.strike,
        optionType: formData.optionType,
        entryPremium: formData.entryPremium,
        exitPremium: formData.exitPremium,
        netPremiumPnLUsd,
      } as OptionsTrade;
    }

    const updatedTrades = trades.map((t) => (t.id === trade.id ? updatedTrade : t));
    await saveTrades(updatedTrades);
    successHaptic();
    Alert.alert('Success', 'Trade updated successfully', [
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

  if (!trade) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
              <Path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Trade</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Trade not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
            <Path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Trade</Text>
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
          {/* Trade Details Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Trade Details</Text>
            
            {/* Instrument Display */}
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
            <View style={styles.fieldGroup}>
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

          {/* Strategy & Grade Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Strategy & Grade</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>STRATEGY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  <SelectChip 
                    label="None" 
                    selected={!formData.strategyId}
                    onPress={() => setFormData({ ...formData, strategyId: '' })}
                  />
                  {strategies.map((s) => (
                    <SelectChip 
                      key={s.id}
                      label={s.name} 
                      selected={formData.strategyId === s.id}
                      onPress={() => setFormData({ ...formData, strategyId: s.id })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

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

          {/* Market Context Card */}
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

          {/* Setup Tags Card */}
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

          {/* Notes Card */}
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

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.text }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>

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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
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
    marginTop: spacing.sm,
    borderWidth: 1,
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
