'use client';

import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { readEdgeStorage, removeEdgeStorage } from '@/lib/edge/store/accountScope';
import { useAppData } from '@/hooks/useAppData';
import { AssetClass, Direction, Grade, Session, MarketRegime, MarketHoursTag, SetupTag, NewsTag, RthEth, FuturesInstrument, OptionsUnderlying, OptionType, FUTURES_GROUPS } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { ImageUpload, type ImageAttachment } from '@/components/ImageUpload';
import { useToast } from '@/contexts/ToastContext';
import { getViolationRuleName } from '@/lib/violations';
import { calculateDisciplineFlags } from '@/lib/discipline-flags';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { FuturesTickFields } from '@/components/FuturesTickFields';
import { calculateFuturesResults, calculateOptionsResults, type FuturesCalculationReference } from '@/lib/trades/calculations';

export default function NewTradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { trades, strategies, versions, riskRules, saveTrades, isLoading } = useAppData();
  const [mounted, setMounted] = useState(false);
  const [importedFutures, setImportedFutures] = useState<FuturesCalculationReference>();
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.FUTURES);
  const [formData, setFormData] = useState({
    tradeDate: format(new Date(), 'yyyy-MM-dd'),
    entryTime: '09:30',
    exitTime: '10:30',
    direction: Direction.LONG,
    quantity: 1,
    plannedRiskUsd: 100,
    feesUsd: 10,
    tickSize: undefined as number | undefined,
    tickValueUsd: undefined as number | undefined,
    contractMultiplier: 100,
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
    expiration: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    entryPremium: 5,
    exitPremium: 6,
  });

  const [saving, setSaving] = useState(false);
  const [readingImages, setReadingImages] = useState(false);

  const updateFormData = (changes: Partial<typeof formData>) => {
    setFormData((previous) => ({ ...previous, ...changes }));
  };

  useEffect(() => {
    setMounted(true);
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
      const importedData = readEdgeStorage('edge:importTrade');
      if (importedData) {
        try {
          const data = JSON.parse(importedData);
          setFormData((prev) => ({
            ...prev,
            tradeDate: data.tradeDate || prev.tradeDate,
            entryTime: data.entryTime || prev.entryTime,
            exitTime: data.exitTime || prev.exitTime,
            direction: data.direction || prev.direction,
            quantity: data.quantity ?? prev.quantity,
            entryPrice: data.entryPrice ?? prev.entryPrice,
            exitPrice: data.exitPrice ?? prev.exitPrice,
            notes: data.notes || prev.notes,
            instrumentRoot: data.instrumentRoot || prev.instrumentRoot,
            feesUsd: data.feesUsd ?? prev.feesUsd,
            tickSize: data.tickSize,
            tickValueUsd: data.tickValueUsd,
          }));
          if (Number.isFinite(data.resultUsd)) {
            setImportedFutures({
              instrumentRoot: data.instrumentRoot, direction: data.direction, quantity: data.quantity,
              entryPrice: data.entryPrice, exitPrice: data.exitPrice, feesUsd: data.feesUsd ?? 10,
              plannedRiskUsd: 100, resultUsd: data.resultUsd, outcome: data.outcome,
              tickSize: data.tickSize, tickValueUsd: data.tickValueUsd,
              pointsPnL: data.pointsPnL, ticksPnL: data.ticksPnL,
            });
          }
          // Clear the imported data after using it
          removeEdgeStorage('edge:importTrade');
          showToast('Trade data imported from EDGE. Please review and complete the form.', 'info');
        } catch (error) {
          removeEdgeStorage('edge:importTrade');
          showToast('The staged EDGE trade could not be loaded. Import it again.', 'error');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    if (saving || readingImages) return;
    const now = Date.now();
    const entryTime = new Date(`${formData.tradeDate}T${formData.entryTime}:00`).getTime();
    const exitTime = new Date(`${formData.tradeDate}T${formData.exitTime}:00`).getTime();

    setSaving(true);
    try {
      let newTrade: Trade;

      if (assetClass === AssetClass.FUTURES) {
        const financials = calculateFuturesResults(formData, importedFutures);

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
          feesUsd: formData.feesUsd,
          plannedRiskUsd: formData.plannedRiskUsd,
          ...financials,
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
        const financials = calculateOptionsResults(formData);

        // Calculate discipline flags first
        const tempTrade = {
          id: `trade-${now}`,
          assetClass: AssetClass.OPTIONS,
          createdAt: now,
          updatedAt: now,
          tradeDate: formData.tradeDate,
          entryTime,
          exitTime,
          direction: formData.direction,
          quantity: formData.quantity,
          feesUsd: formData.feesUsd,
          plannedRiskUsd: formData.plannedRiskUsd,
          ...financials,
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
          contractMultiplier: formData.contractMultiplier,
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
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save trade. Please try again.', 'error');
    } finally { setSaving(false); }
  };

  const toggleSetupTag = (tag: SetupTag) => {
    setFormData((previous) => ({
      ...previous,
      setupTags: previous.setupTags.includes(tag)
        ? previous.setupTags.filter((t) => t !== tag)
        : [...previous.setupTags, tag],
    }));
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
      
      <form onSubmit={handleSubmit} className="p-4 sm:p-8 rounded-2xl space-y-8" style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* Asset Class Selection - Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <input aria-label="Trade Date"
                type="date"
                value={formData.tradeDate}
                onChange={(e) => updateFormData({ tradeDate: e.target.value })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Time</label>
                <input aria-label="Entry Time"
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => updateFormData({ entryTime: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Time</label>
                <input aria-label="Exit Time"
                  type="time"
                  value={formData.exitTime}
                  onChange={(e) => updateFormData({ exitTime: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-3 uppercase tracking-wide">Direction</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateFormData({ direction: Direction.LONG })}
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
                  onClick={() => updateFormData({ direction: Direction.SHORT })}
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
              <input aria-label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => updateFormData({ quantity: parseInt(e.target.value) || 1 })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Planned Risk (USD)</label>
              <input aria-label="Planned Risk (USD)"
                type="number"
                value={formData.plannedRiskUsd}
                onChange={(e) => updateFormData({ plannedRiskUsd: parseFloat(e.target.value) || 0 })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                required
                min="0"
                step="0.01"
              />
            </div>
            <label className="block text-sm theme-text-secondary">
              Total fees (USD)
              <input aria-label="Total fees (USD)" type="number" min="0" step="0.01" required
                value={formData.feesUsd}
                onChange={(e) => updateFormData({ feesUsd: Number(e.target.value) })}
                className="mt-2 w-full theme-bg-secondary border theme-border theme-text rounded-md px-3 py-2" />
            </label>
            {assetClass === AssetClass.OPTIONS && (
              <label className="block text-sm theme-text-secondary">
                Contract multiplier
                <input aria-label="Contract multiplier" type="number" min="1" step="1" required
                  value={formData.contractMultiplier}
                  onChange={(e) => updateFormData({ contractMultiplier: Number(e.target.value) })}
                  className="mt-2 w-full theme-bg-secondary border theme-border theme-text rounded-md px-3 py-2" />
              </label>
            )}
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
                  <select aria-label="Instrument"
                    value={formData.instrumentRoot}
                    onChange={(e) => updateFormData({ instrumentRoot: e.target.value as FuturesInstrument, tickSize: undefined, tickValueUsd: undefined })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    required
                  >
                    {!Object.values(FuturesInstrument).includes(formData.instrumentRoot) && (
                      <option value={formData.instrumentRoot}>{formData.instrumentRoot}</option>
                    )}
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
                <FuturesTickFields instrumentRoot={formData.instrumentRoot} tickSize={formData.tickSize}
                  tickValueUsd={formData.tickValueUsd} onChange={updateFormData} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Price</label>
                    <input aria-label="Entry Price"
                      type="number"
                      value={formData.entryPrice}
                      onChange={(e) => updateFormData({ entryPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Price</label>
                    <input aria-label="Exit Price"
                      type="number"
                      value={formData.exitPrice}
                      onChange={(e) => updateFormData({ exitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="any"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Underlying</label>
                  <select aria-label="Underlying"
                    value={formData.underlying}
                    onChange={(e) => updateFormData({ underlying: e.target.value as OptionsUnderlying })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    required
                  >
                    {Object.values(OptionsUnderlying).map((underlying) => (
                      <option key={underlying} value={underlying}>{underlying}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strike</label>
                    <input aria-label="Strike"
                      type="number"
                      value={formData.strike}
                      onChange={(e) => updateFormData({ strike: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Type</label>
                    <select aria-label="Type"
                      value={formData.optionType}
                      onChange={(e) => updateFormData({ optionType: e.target.value as OptionType })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    >
                      <option value={OptionType.CALL}>Call</option>
                      <option value={OptionType.PUT}>Put</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Expiration</label>
                    <input aria-label="Expiration"
                      type="date"
                      value={formData.expiration}
                      onChange={(e) => updateFormData({ expiration: e.target.value })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Entry Premium</label>
                    <input aria-label="Entry Premium"
                      type="number"
                      value={formData.entryPremium}
                      onChange={(e) => updateFormData({ entryPremium: parseFloat(e.target.value) || 0 })}
                      className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Exit Premium</label>
                  <input aria-label="Exit Premium"
                    type="number"
                    value={formData.exitPremium}
                    onChange={(e) => updateFormData({ exitPremium: parseFloat(e.target.value) || 0 })}
                    className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                    step="0.01"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strategy (optional)</label>
              <select aria-label="Strategy (optional)"
                value={formData.strategyId}
                onChange={(e) => updateFormData({ strategyId: e.target.value, strategyVersionId: '' })}
                className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
              >
                <option value="">No strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {strategyVersions.length > 0 && (
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Strategy Version (optional)</label>
                <select aria-label="Strategy Version (optional)"
                  value={formData.strategyVersionId}
                  onChange={(e) => updateFormData({ strategyVersionId: e.target.value })}
                  className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                >
                  <option value="">No version</option>
                  {strategyVersions.map((v) => (
                    <option key={v.id} value={v.id}>{v.version}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Grade</label>
              <select aria-label="Grade"
                value={formData.grade}
                onChange={(e) => updateFormData({ grade: e.target.value as Grade })}
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
            <select aria-label="Session"
              value={formData.session}
              onChange={(e) => updateFormData({ session: e.target.value as Session })}
              className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
            >
              {Object.values(Session).map((session) => (
                <option key={session} value={session}>{session.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Market Regime</label>
            <select aria-label="Market Regime"
              value={formData.marketRegime}
              onChange={(e) => updateFormData({ marketRegime: e.target.value as MarketRegime })}
              className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
            >
              {Object.values(MarketRegime).map((regime) => (
                <option key={regime} value={regime}>{regime.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Market Hours</label>
            <select aria-label="Market Hours"
              value={formData.marketHoursTag}
              onChange={(e) => updateFormData({ marketHoursTag: e.target.value as MarketHoursTag })}
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
          <textarea aria-label="Notes"
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            className="w-full theme-bg-secondary border theme-border theme-text rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium resize-none"
            rows={5}
            placeholder="Add any additional notes about this trade..."
          />
        </div>

        {/* Screenshots */}
        <ImageUpload
          disabled={saving}
          onBusyChange={setReadingImages}
          attachments={formData.attachments}
          onAttachmentsChange={(attachments) => updateFormData({ attachments })}
          maxImages={10}
        />

        {/* Actions - Enhanced */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2 theme-border">
          <button
            type="submit"
            disabled={saving || readingImages}
            className="flex-1 px-8 py-4 rounded-xl font-bold text-lg theme-text transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {saving ? 'Saving…' : readingImages ? 'Loading screenshots…' : 'Create Trade'}
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
