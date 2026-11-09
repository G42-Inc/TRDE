'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useAppData } from '@/hooks/useAppData';
import { getTrades } from '@/lib/storage.db';
import { loadTradeDraft } from '@/lib/trades/draft-loader';
import { AssetClass, Direction, Grade, Session, MarketRegime, MarketHoursTag, SetupTag, NewsTag, RthEth, FuturesInstrument, OptionsUnderlying, OptionType, FUTURES_GROUPS } from '@trde/core';
import type { Trade, FuturesTrade, OptionsTrade } from '@trde/core';
import { ImageUpload, type ImageAttachment } from '@/components/ImageUpload';
import { useToast } from '@/contexts/ToastContext';
import { getViolationRuleName } from '@/lib/violations';
import { calculateDisciplineFlags } from '@/lib/discipline-flags';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { FuturesTickFields } from '@/components/FuturesTickFields';
import { calculateFuturesResults, calculateOptionsResults, editedTradeTimestamp } from '@/lib/trades/calculations';

export default function EditTradePage() {
  const params = useParams();
  const { user, isLoaded } = useUser();
  const tradeId = typeof params.id === 'string' ? params.id : '';
  if (!isLoaded || !user || !tradeId) return <SkeletonLoader width="100%" height="12rem" />;
  // A key change unmounts the complete draft, including in-flight reads and errors.
  return <TradeEditor key={JSON.stringify([user.id, tradeId])} accountId={user.id} tradeId={tradeId} />;
}

function TradeEditor({ accountId, tradeId }: { accountId: string; tradeId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { trades, strategies, versions, riskRules, journals, saveTrades, isDemo, isDemoLoading } = useAppData();
  const draftKey = JSON.stringify([accountId, tradeId]);
  const [loadedDraft, setLoadedDraft] = useState<{ key: string; trade: Trade } | null>(null);
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  // Hide the old snapshot immediately on an account/route change, before effects.
  const trade = loadedDraft?.key === draftKey ? loadedDraft.trade : null;
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.FUTURES);
  const [formData, setFormData] = useState({
    tradeDate: '',
    entryTime: '',
    exitTime: '',
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
    entryPrice: 0,
    exitPrice: 0,
    // Options specific
    underlying: OptionsUnderlying.SPY,
    strike: 0,
    optionType: OptionType.CALL,
    expiration: '',
    entryPremium: 0,
    exitPremium: 0,
  });

  const [saving, setSaving] = useState(false);
  const [readingImages, setReadingImages] = useState(false);

  const updateFormData = (changes: Partial<typeof formData>) => {
    setFormData((previous) => ({ ...previous, ...changes }));
  };

  // Use one authenticated snapshot for this account and route. Context refreshes
  // must not replace a user's draft or its original calculation/time baseline.
  useEffect(() => {
    if (isDemoLoading || isDemo || loadedDraft) return;
    setLoadError(null);
    return loadTradeDraft(getTrades, tradeId, (trade) => {
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
        feesUsd: trade.feesUsd ?? 0,
        tickSize: trade.assetClass === AssetClass.FUTURES ? trade.tickSize : undefined,
        tickValueUsd: trade.assetClass === AssetClass.FUTURES ? trade.tickValueUsd : undefined,
        contractMultiplier: trade.assetClass === AssetClass.OPTIONS ? trade.contractMultiplier : 100,
        grade: trade.grade,
        strategyId: trade.strategyId,
        strategyVersionId: trade.strategyVersionId || '',
        session: trade.session,
        marketRegime: trade.marketRegime,
        marketHoursTag: trade.marketHoursTag,
        setupTags: trade.setupTags,
        notes: trade.notes || '',
        attachments: trade.attachments || [],
        // Futures specific
        instrumentRoot: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).instrumentRoot : FuturesInstrument.ES,
        entryPrice: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).entryPrice : 0,
        exitPrice: trade.assetClass === AssetClass.FUTURES ? (trade as FuturesTrade).exitPrice : 0,
        // Options specific
        underlying: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).underlying : OptionsUnderlying.SPY,
        strike: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).strike : 0,
        optionType: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).optionType : OptionType.CALL,
        expiration: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).expiration : '',
        entryPremium: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).entryPremium : 0,
        exitPremium: trade.assetClass === AssetClass.OPTIONS ? (trade as OptionsTrade).exitPremium : 0,
      });
      // Inputs become visible only after both the snapshot and form are ready.
      setLoadedDraft({ key: draftKey, trade });
    }, (message) => setLoadError({ key: draftKey, message }));
  }, [draftKey, tradeId, isDemo, isDemoLoading, reloadAttempt, loadedDraft]);

  if (!isDemoLoading && isDemo) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="theme-text-secondary">Demo trades cannot be edited. Add your own trades with an active plan.</p>
        <Link href="/trades" className="text-accent">Back to Trades</Link>
      </div>
    );
  }

  if (loadError?.key === draftKey) {
    return (
      <div className="text-center py-12 space-y-4">
        <p role="alert" className="theme-text-secondary">{loadError.message}</p>
        <button type="button" onClick={() => setReloadAttempt((attempt) => attempt + 1)} className="rounded-md bg-accent px-4 py-2 text-white">Retry</button>
        <Link href="/trades" className="block text-accent">Back to Trades</Link>
      </div>
    );
  }

  if (isDemoLoading || !trade) {
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

  const strategyVersions = formData.strategyId
    ? versions.filter((v) => v.strategyId === formData.strategyId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || readingImages) return;
    if (!trade) return;
    
    const hasJournal = journals.some(j => j.tradeId === trade.id);
    const now = Date.now();
    const entryTime = editedTradeTimestamp(trade.entryTime, trade.tradeDate, formData.tradeDate, formData.entryTime);
    const exitTime = editedTradeTimestamp(trade.exitTime, trade.tradeDate, formData.tradeDate, formData.exitTime);

    setSaving(true);
    try {
      let updatedTrade: Trade;

      if (assetClass === AssetClass.FUTURES) {
        const futuresTrade = trade.assetClass === AssetClass.FUTURES ? trade : undefined;
        const financials = calculateFuturesResults(formData, futuresTrade);
        updatedTrade = {
          ...trade,
          assetClass: AssetClass.FUTURES,
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
          notes: formData.notes,
          attachments: formData.attachments,
          instrumentRoot: formData.instrumentRoot,
          entryPrice: formData.entryPrice,
          exitPrice: formData.exitPrice,
          rthEth: futuresTrade?.rthEth ?? RthEth.RTH,
        } as FuturesTrade;
      } else {
        const financials = calculateOptionsResults(formData, trade.assetClass === AssetClass.OPTIONS ? trade : undefined);

        updatedTrade = {
          ...trade,
          assetClass: AssetClass.OPTIONS,
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
          notes: formData.notes,
          attachments: formData.attachments,
          underlying: formData.underlying,
          expiration: formData.expiration,
          dte: Math.ceil((new Date(formData.expiration).getTime() - new Date(formData.tradeDate).getTime()) / (1000 * 60 * 60 * 24)),
          strike: formData.strike,
          optionType: formData.optionType,
          entryPremium: formData.entryPremium,
          exitPremium: formData.exitPremium,
          contractMultiplier: formData.contractMultiplier,
        } as OptionsTrade;
      }

      // Automatically recalculate discipline flags based on updated trade data
      const disciplineFlags = calculateDisciplineFlags(updatedTrade, trades.filter(t => t.id !== trade.id), riskRules, hasJournal);
      updatedTrade = { ...updatedTrade, disciplineFlags };

      const updatedTrades = [...trades.filter((t) => t.id !== trade.id), updatedTrade];
      const result = await saveTrades(updatedTrades);
    
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
    
      router.push(`/trades/${trade.id}`);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={`/trades/${trade.id}`} className="text-accent hover:text-accent dark:hover:text-accent-light mb-2 inline-flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Trade
        </Link>
        <h1 className="text-3xl font-bold text-black dark:text-white">Edit Trade</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="glass-surface p-4 sm:p-6 rounded-lg space-y-6">
        {/* Asset Class Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAssetClass(AssetClass.FUTURES)}
            className={`px-4 py-3 rounded-lg border-2 transition-colors ${
              assetClass === AssetClass.FUTURES
                ? 'bg-accent border-accent text-white'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            Futures
          </button>
          <button
            type="button"
            onClick={() => setAssetClass(AssetClass.OPTIONS)}
            className={`px-4 py-3 rounded-lg border-2 transition-colors ${
              assetClass === AssetClass.OPTIONS
                ? 'bg-accent border-accent text-white'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            Options
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Trade Date</label>
              <input aria-label="Trade Date"
                type="date"
                value={formData.tradeDate}
                onChange={(e) => updateFormData({ tradeDate: e.target.value })}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Entry Time</label>
                <input aria-label="Entry Time"
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => updateFormData({ entryTime: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Exit Time</label>
                <input aria-label="Exit Time"
                  type="time"
                  value={formData.exitTime}
                  onChange={(e) => updateFormData({ exitTime: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Direction</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateFormData({ direction: Direction.LONG })}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.direction === Direction.LONG
                      ? 'bg-accent border-accent text-white'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ direction: Direction.SHORT })}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.direction === Direction.SHORT
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  Short
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Quantity</label>
              <input aria-label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => updateFormData({ quantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Planned Risk (USD)</label>
              <input aria-label="Planned Risk (USD)"
                type="number"
                value={formData.plannedRiskUsd}
                onChange={(e) => updateFormData({ plannedRiskUsd: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
              {assetClass === AssetClass.FUTURES ? 'Instrument' : 'Underlying'}
            </h2>

            {assetClass === AssetClass.FUTURES ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Instrument</label>
                  <select aria-label="Instrument"
                    value={formData.instrumentRoot}
                    onChange={(e) => updateFormData({ instrumentRoot: e.target.value as FuturesInstrument, tickSize: undefined, tickValueUsd: undefined })}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Entry Price</label>
                    <input aria-label="Entry Price"
                      type="number"
                      value={formData.entryPrice}
                      onChange={(e) => updateFormData({ entryPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Exit Price</label>
                    <input aria-label="Exit Price"
                      type="number"
                      value={formData.exitPrice}
                      onChange={(e) => updateFormData({ exitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      step="any"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Underlying</label>
                  <select aria-label="Underlying"
                    value={formData.underlying}
                    onChange={(e) => updateFormData({ underlying: e.target.value as OptionsUnderlying })}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    required
                  >
                    {Object.values(OptionsUnderlying).map((underlying) => (
                      <option key={underlying} value={underlying}>{underlying}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Strike</label>
                    <input aria-label="Strike"
                      type="number"
                      value={formData.strike}
                      onChange={(e) => updateFormData({ strike: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Type</label>
                    <select aria-label="Type"
                      value={formData.optionType}
                      onChange={(e) => updateFormData({ optionType: e.target.value as OptionType })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value={OptionType.CALL}>Call</option>
                      <option value={OptionType.PUT}>Put</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Expiration</label>
                    <input aria-label="Expiration"
                      type="date"
                      value={formData.expiration}
                      onChange={(e) => updateFormData({ expiration: e.target.value })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Entry Premium</label>
                    <input aria-label="Entry Premium"
                      type="number"
                      value={formData.entryPremium}
                      onChange={(e) => updateFormData({ entryPremium: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Exit Premium</label>
                  <input aria-label="Exit Premium"
                    type="number"
                    value={formData.exitPremium}
                    onChange={(e) => updateFormData({ exitPremium: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    step="0.01"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Strategy (optional)</label>
              <select aria-label="Strategy (optional)"
                value={formData.strategyId}
                onChange={(e) => updateFormData({ strategyId: e.target.value, strategyVersionId: '' })}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">No strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {strategyVersions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Strategy Version (optional)</label>
                <select aria-label="Strategy Version (optional)"
                  value={formData.strategyVersionId}
                  onChange={(e) => updateFormData({ strategyVersionId: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">No version</option>
                  {strategyVersions.map((v) => (
                    <option key={v.id} value={v.id}>{v.version}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Grade</label>
              <select aria-label="Grade"
                value={formData.grade}
                onChange={(e) => updateFormData({ grade: e.target.value as Grade })}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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

        {/* Setup Tags */}
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2 mb-4">Setup Tags</h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(SetupTag).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSetupTag(tag)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  formData.setupTags.includes(tag)
                    ? 'bg-accent text-white'
                    : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10'
                }`}
              >
                {tag.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Session</label>
            <select aria-label="Session"
              value={formData.session}
              onChange={(e) => updateFormData({ session: e.target.value as Session })}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {Object.values(Session).map((session) => (
                <option key={session} value={session}>{session.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Market Regime</label>
            <select aria-label="Market Regime"
              value={formData.marketRegime}
              onChange={(e) => updateFormData({ marketRegime: e.target.value as MarketRegime })}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {Object.values(MarketRegime).map((regime) => (
                <option key={regime} value={regime}>{regime.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Market Hours</label>
            <select aria-label="Market Hours"
              value={formData.marketHoursTag}
              onChange={(e) => updateFormData({ marketHoursTag: e.target.value as MarketHoursTag })}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {Object.values(MarketHoursTag).map((hours) => (
                <option key={hours} value={hours}>{hours.replace(/_/g, ' ').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-2">Notes</label>
          <textarea aria-label="Notes"
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            rows={4}
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            type="submit"
            disabled={saving || readingImages}
            className="flex-1 px-6 py-3 bg-accent text-white rounded-md hover:bg-accent-dark font-medium transition-colors"
          >
            {saving ? 'Saving…' : readingImages ? 'Loading screenshots…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/trades/${trade.id}`)}
            className="flex-1 px-6 py-3 bg-black/10 dark:bg-white/10 text-black dark:text-white rounded-md hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
