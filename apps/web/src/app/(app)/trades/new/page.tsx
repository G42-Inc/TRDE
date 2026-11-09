'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppData } from '@/hooks/useAppData';
import { AssetClass, Direction, Grade, Outcome, Session, MarketRegime, MarketHoursTag, SetupTag, NewsTag, RthEth, FuturesInstrument, OptionsUnderlying, OptionType, FUTURES_GROUPS } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { ImageUpload, type ImageAttachment } from '@/components/ImageUpload';
import { useToast } from '@/contexts/ToastContext';
import { getViolationRuleName } from '@/lib/violations';
import { calculateDisciplineFlags } from '@/lib/discipline-flags';
import { SkeletonLoader } from '@/components/SkeletonLoader';

export default function NewTradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { trades, strategies, riskRules, saveTrades, isLoading } = useAppData();
  const versions: any[] = []; // Versions not yet supported in demo
  const [mounted, setMounted] = useState(false);
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.FUTURES);
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
    attachments: [] as ImageAttachment[],
    // Futures specific
    instrumentRoot: FuturesInstrument.ES,
    entryPrice: 4000,
    exitPrice: 4010,
    // Options specific
    underlying: OptionsUnderlying.SPY,
    strike: 400,
    optionType: OptionType.CALL,
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryPremium: 5,
    exitPremium: 6,
    // Imported data (optional)
    importedResultUsd: undefined as number | undefined,
    importedFeesUsd: undefined as number | undefined,
    importedOutcome: undefined as Outcome | undefined,
  });

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Check for imported trade data from EDGE or date from calendar
  useEffect(() => {
    // Check for date parameter from calendar
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setFormData((prev) => ({
        ...prev,
        tradeDate: dateParam,
      }));
    }
    
    // Check for imported trade data from EDGE
    const importParam = searchParams.get('import');
    if (importParam === 'edge') {
      const importedData = localStorage.getItem('trde:importTrade');
      if (importedData) {
        try {
          const data = JSON.parse(importedData);
          setFormData((prev) => ({
            ...prev,
            tradeDate: data.tradeDate || prev.tradeDate,
            entryTime: data.entryTime || prev.entryTime,
            exitTime: data.exitTime || prev.exitTime,
            direction: data.direction || prev.direction,
            quantity: data.quantity || prev.quantity,
            entryPrice: data.entryPrice || prev.entryPrice,
            exitPrice: data.exitPrice || prev.exitPrice,
            notes: data.notes || prev.notes,
            instrumentRoot: data.instrumentRoot || prev.instrumentRoot,
            importedResultUsd: data.resultUsd,
            importedFeesUsd: data.feesUsd,
            importedOutcome: data.outcome,
          }));
          // Clear the imported data after using it
          localStorage.removeItem('trde:importTrade');
          showToast('Trade data imported from EDGE. Please review and complete the form.', 'info');
        } catch (error) {
          console.error('Failed to parse imported trade data:', error);
        }
      }
    }
  }, [searchParams, showToast]);

  const strategyVersions = formData.strategyId
    ? versions.filter((v) => v.strategyId === formData.strategyId)
    : [];

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="200px" height="2rem" />
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border space-y-6">
          <SkeletonLoader width="150px" height="1.5rem" />
          <SkeletonLoader width="100%" height="1rem" lines={12} />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonLoader width="100%" height="3rem" />
            <SkeletonLoader width="100%" height="3rem" />
          </div>
          <SkeletonLoader width="200px" height="3rem" />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const entryTime = new Date(`${formData.tradeDate}T${formData.entryTime}:00`).getTime();
    const exitTime = new Date(`${formData.tradeDate}T${formData.exitTime}:00`).getTime();

    let newTrade: Trade;

    if (assetClass === AssetClass.FUTURES) {
      // Calculate pointsPnL from prices
      const pointsPnL = formData.direction === Direction.LONG
        ? (formData.exitPrice - formData.entryPrice) * formData.quantity
        : (formData.entryPrice - formData.exitPrice) * formData.quantity;
      
      // Use imported result if available (from EDGE), otherwise calculate
      let resultUsd: number;
      let outcome: Outcome;
      
      if (formData.importedResultUsd !== undefined) {
        // Use imported result from EDGE
        resultUsd = formData.importedResultUsd;
        outcome = formData.importedOutcome || (resultUsd > 0.01 ? Outcome.WIN : resultUsd < -0.01 ? Outcome.LOSS : Outcome.BREAKEVEN);
      } else {
        // Calculate from prices (default behavior)
        resultUsd = pointsPnL * 12.5 - (formData.importedFeesUsd || 10);
        outcome = resultUsd > 0.01 ? Outcome.WIN : resultUsd < -0.01 ? Outcome.LOSS : Outcome.BREAKEVEN;
      }
      
      const resultR = resultUsd / formData.plannedRiskUsd;

      // Calculate discipline flags first
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
        feesUsd: formData.importedFeesUsd || 10,
        plannedRiskUsd: formData.plannedRiskUsd,
        resultUsd,
        resultR,
        outcome,
        grade: formData.grade,
        strategyId: formData.strategyId,
        strategyVersionId: formData.strategyVersionId,
        setupTags: formData.setupTags,
        session: formData.session,
        marketHoursTag: formData.marketHoursTag,
        marketRegime: formData.marketRegime,
        newsTags: [NewsTag.NONE],
        mistakes: [],
        notes: formData.notes,
        attachments: formData.attachments,
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

      // Calculate discipline flags first
      const tempTrade = {
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
        strategyId: formData.strategyId,
        strategyVersionId: formData.strategyVersionId,
        setupTags: formData.setupTags,
        session: formData.session,
        marketHoursTag: formData.marketHoursTag,
        marketRegime: formData.marketRegime,
        newsTags: [NewsTag.NONE],
        mistakes: [],
        notes: formData.notes,
        attachments: formData.attachments,
        reviewFlag: false,
        collections: [],
        underlying: formData.underlying,
        expiration: formData.expiration,
        dte: Math.ceil((new Date(formData.expiration).getTime() - new Date(formData.tradeDate).getTime()) / (1000 * 60 * 60 * 24)),
        strike: formData.strike,
        optionType: formData.optionType,
        entryPremium: formData.entryPremium,
        exitPremium: formData.exitPremium,
        contractMultiplier,
        netPremiumPnLUsd,
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
      
      const disciplineFlags = calculateDisciplineFlags(tempTrade, trades, riskRules, false);
      newTrade = { ...tempTrade, disciplineFlags };
    }

    const result = await saveTrades([...trades, newTrade]);
    
    // Show notification if violations were detected
    if (result.newViolations.length > 0) {
      const violationCount = result.newViolations.length;
      const violationNames = result.newViolations[0].violatedRules
        .map(getViolationRuleName)
        .join(', ');
      showToast(
        `Risk rule violation detected! ${violationCount} rule${violationCount > 1 ? 's' : ''} broken: ${violationNames}. Review in Risk tab.`,
        'warning',
        8000
      );
    }
    
    router.push(`/trades/${newTrade.id}`);
  };

  const toggleSetupTag = (tag: SetupTag) => {
    setFormData({
      ...formData,
      setupTags: formData.setupTags.includes(tag)
        ? formData.setupTags.filter((t) => t !== tag)
        : [...formData.setupTags, tag],
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="flex items-center gap-4">
        <div
          className="p-3 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <svg className="h-7 w-7 theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold theme-text tracking-tight">New Trade</h1>
          <p className="text-sm theme-text-secondary mt-1">Record a new trade in your journal</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 rounded-2xl space-y-8" style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* Asset Class Selection - Enhanced */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAssetClass(AssetClass.FUTURES)}
            className={`px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 theme-text ${
              assetClass === AssetClass.FUTURES
                ? 'shadow-lg scale-[1.02]'
                : 'hover:scale-[1.01] hover:shadow-md'
            }`}
            style={assetClass === AssetClass.FUTURES ? {
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Futures
          </button>
          <button
            type="button"
            onClick={() => setAssetClass(AssetClass.OPTIONS)}
            className={`px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 theme-text ${
              assetClass === AssetClass.OPTIONS
                ? 'shadow-lg scale-[1.02]'
                : 'hover:scale-[1.01] hover:shadow-md'
            }`}
            style={assetClass === AssetClass.OPTIONS ? {
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Options
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Info */}
          <div className="space-y-5">
            <h2 className="text-xl font-bold theme-text border-b-2 theme-border pb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h2>
            
            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Trade Date</label>
              <input
                type="date"
                value={formData.tradeDate}
                onChange={(e) => setFormData({ ...formData, tradeDate: e.target.value })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Time</label>
                <input
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Time</label>
                <input
                  type="time"
                  value={formData.exitTime}
                  onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-3 uppercase tracking-wide">Direction</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: Direction.LONG })}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    formData.direction === Direction.LONG
                      ? 'theme-text shadow-lg scale-[1.02]'
                      : 'theme-text hover:scale-[1.01] hover:shadow-md'
                  }`}
                  style={formData.direction === Direction.LONG ? {
                    background: 'rgba(34,197,94,0.15)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
                    color: 'var(--theme-success)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: Direction.SHORT })}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    formData.direction === Direction.SHORT
                      ? 'theme-text shadow-lg scale-[1.02]'
                      : 'theme-text hover:scale-[1.01] hover:shadow-md'
                  }`}
                  style={formData.direction === Direction.SHORT ? {
                    background: 'rgba(239,68,68,0.15)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    boxShadow: '0 4px 16px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
                    color: 'var(--theme-error)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Short
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Planned Risk (USD)</label>
              <input
                type="number"
                value={formData.plannedRiskUsd}
                onChange={(e) => setFormData({ ...formData, plannedRiskUsd: parseFloat(e.target.value) || 0 })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Instrument & Strategy */}
          <div className="space-y-5">
            <h2 className="text-xl font-bold theme-text border-b-2 theme-border pb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {assetClass === AssetClass.FUTURES ? 'Instrument' : 'Underlying'}
            </h2>

            {assetClass === AssetClass.FUTURES ? (
              <>
                <div>
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Instrument</label>
                  <select
                    value={formData.instrumentRoot}
                    onChange={(e) => setFormData({ ...formData, instrumentRoot: e.target.value as FuturesInstrument })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    required
                  >
                    <optgroup label="Equity Index">
                      {FUTURES_GROUPS.EQUITY_INDEX.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Metals">
                      {FUTURES_GROUPS.METALS.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Energy">
                      {FUTURES_GROUPS.ENERGY.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Agriculture">
                      {FUTURES_GROUPS.AGRICULTURE.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Rates">
                      {FUTURES_GROUPS.RATES.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="FX">
                      {FUTURES_GROUPS.FX.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Crypto">
                      {FUTURES_GROUPS.CRYPTO.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Price</label>
                    <input
                      type="number"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Price</label>
                    <input
                      type="number"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({ ...formData, exitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Underlying</label>
                  <select
                    value={formData.underlying}
                    onChange={(e) => setFormData({ ...formData, underlying: e.target.value as OptionsUnderlying })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    required
                  >
                    {Object.values(OptionsUnderlying).map((underlying) => (
                      <option key={underlying} value={underlying}>{underlying}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strike</label>
                    <input
                      type="number"
                      value={formData.strike}
                      onChange={(e) => setFormData({ ...formData, strike: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Type</label>
                    <select
                      value={formData.optionType}
                      onChange={(e) => setFormData({ ...formData, optionType: e.target.value as OptionType })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    >
                      <option value={OptionType.CALL}>Call</option>
                      <option value={OptionType.PUT}>Put</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Expiration</label>
                    <input
                      type="date"
                      value={formData.expiration}
                      onChange={(e) => setFormData({ ...formData, expiration: e.target.value })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Premium</label>
                    <input
                      type="number"
                      value={formData.entryPremium}
                      onChange={(e) => setFormData({ ...formData, entryPremium: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Premium</label>
                  <input
                    type="number"
                    value={formData.exitPremium}
                    onChange={(e) => setFormData({ ...formData, exitPremium: parseFloat(e.target.value) || 0 })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    step="0.01"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strategy</label>
              <select
                value={formData.strategyId}
                onChange={(e) => setFormData({ ...formData, strategyId: e.target.value, strategyVersionId: '' })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
              >
                <option value="">Select Strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {strategyVersions.length > 0 && (
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strategy Version</label>
                <select
                  value={formData.strategyVersionId}
                  onChange={(e) => setFormData({ ...formData, strategyVersionId: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  required
                >
                  <option value="">Select Version</option>
                  {strategyVersions.map((v) => (
                    <option key={v.id} value={v.id}>{v.version}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Grade</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value as Grade })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
              >
                <option value={Grade.A_PLUS}>A+</option>
                <option value={Grade.A}>A</option>
                <option value={Grade.A_MINUS}>A-</option>
                <option value={Grade.B_PLUS}>B+</option>
                <option value={Grade.B}>B</option>
                <option value={Grade.B_MINUS}>B-</option>
                <option value={Grade.C_PLUS}>C+</option>
                <option value={Grade.C}>C</option>
                <option value={Grade.C_MINUS}>C-</option>
                <option value={Grade.F}>F</option>
              </select>
            </div>
          </div>
        </div>

        {/* Setup Tags - Enhanced */}
        <div>
          <h2 className="text-xl font-bold theme-text border-b-2 theme-border pb-3 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Setup Tags
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.values(SetupTag).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSetupTag(tag)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 theme-text ${
                  formData.setupTags.includes(tag)
                    ? 'shadow-lg scale-[1.02]'
                    : 'hover:scale-[1.01] hover:shadow-md'
                }`}
                style={formData.setupTags.includes(tag) ? {
                  background: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {tag.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Session</label>
            <select
              value={formData.session}
              onChange={(e) => setFormData({ ...formData, session: e.target.value as Session })}
              className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
            >
              {Object.values(Session).map((session) => (
                <option key={session} value={session}>{session.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Market Regime</label>
            <select
              value={formData.marketRegime}
              onChange={(e) => setFormData({ ...formData, marketRegime: e.target.value as MarketRegime })}
              className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
            >
              {Object.values(MarketRegime).map((regime) => (
                <option key={regime} value={regime}>{regime.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Market Hours</label>
            <select
              value={formData.marketHoursTag}
              onChange={(e) => setFormData({ ...formData, marketHoursTag: e.target.value as MarketHoursTag })}
              className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
            >
              {Object.values(MarketHoursTag).map((hours) => (
                <option key={hours} value={hours}>{hours.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium resize-none"
            rows={5}
            placeholder="Add any additional notes about this trade..."
          />
        </div>

        {/* Screenshots */}
        <ImageUpload
          attachments={formData.attachments}
          onAttachmentsChange={(attachments) => setFormData({ ...formData, attachments })}
          maxImages={10}
        />

        {/* Actions - Enhanced */}
        <div className="flex space-x-4 pt-6 border-t-2 theme-border">
          <button
            type="submit"
            className="flex-1 px-8 py-4 rounded-xl font-bold text-lg theme-text transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            Create Trade
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-8 py-4 theme-bg-secondary theme-text rounded-xl hover:opacity-80 font-bold text-lg border theme-border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
