'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { filterTrades } from '@trde/mock-db';
import type { Trade, TradeFilters, Collection } from '@trde/core';
import { AssetClass, Outcome } from '@trde/core';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { TradeFiltersPanel } from '@/components/TradeFiltersPanel';
import { formatSetupTag } from '@/lib/utils/formatEnum';
import Link from 'next/link';
import { TableCellsIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function TradesPage() {
  const { trades: allTrades, strategies, collections, isLoading } = useAppData();
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<TradeFilters>({});
  const assetFilter = filters.edgeOnly ? 'edge' : filters.assetClass?.[0] || 'all';
  const outcomeFilter = filters.outcome?.[0] || 'all';
  const collectionFilter = filters.collections?.[0] || 'all';
  const [viewedEdgeTrades, setViewedEdgeTrades] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Get viewed EDGE trade IDs from localStorage
  const getViewedEdgeTrades = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const data = localStorage.getItem('trde:viewedEdgeTrades');
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  };

  // Mark an EDGE trade as viewed
  const markEdgeTradeAsViewed = (tradeId: string) => {
    if (typeof window === 'undefined') return;
    const viewed = new Set(viewedEdgeTrades);
    viewed.add(tradeId);
    localStorage.setItem('trde:viewedEdgeTrades', JSON.stringify(Array.from(viewed)));
    setViewedEdgeTrades(viewed); // Update state to trigger re-render
  };

  useEffect(() => {
    setMounted(true);
    setViewedEdgeTrades(getViewedEdgeTrades());
  }, []);

  const trades = useMemo(() => {
    if (!mounted) return [];
    
    let filtered = filterTrades(allTrades, filters, collections.find(c => c.name === 'EDGE')?.id);
    // Sort by entry time descending (most recent first)
    // For EDGE trades, sort by createdAt (journal submission time) instead of entryTime
    // This allows EDGE trades to appear chronologically by when they were saved to journal
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    filtered = filtered.sort((a, b) => {
      const aIsEdge = (edgeCollection && a.collections.includes(edgeCollection.id)) || a.notes?.startsWith('[EDGE');
      const bIsEdge = (edgeCollection && b.collections.includes(edgeCollection.id)) || b.notes?.startsWith('[EDGE');
      
      // Get the sort time for each trade
      // EDGE trades use createdAt (journal submission time), regular trades use entryTime
      const aSortTime = aIsEdge ? a.createdAt : a.entryTime;
      const bSortTime = bIsEdge ? b.createdAt : b.entryTime;
      
      // Sort descending (most recent first)
      return bSortTime - aSortTime;
    });
    return filtered;
  }, [allTrades, filters, collections, mounted]);

  const formatTradeDate = (trade: Trade) => {
    // For EDGE trades, use createdAt (journal submission time) for display
    // For regular trades, use entryTime
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    const isEdgeTrade = (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
      trade.notes?.startsWith('[EDGE');
    
    const displayTime = isEdgeTrade ? trade.createdAt : trade.entryTime;
    const date = new Date(displayTime);
    return format(date, 'MM/dd HH:mm');
  };

  const getStrategyName = (strategyId: string) => {
    const strategy = strategies.find((s) => s.id === strategyId);
    return strategy?.name || strategyId;
  };

  if (!mounted || isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <SkeletonLoader width="200px" height="2.5rem" />
          <div className="flex items-center gap-4">
            <SkeletonLoader width="140px" height="3rem" />
            <SkeletonLoader width="140px" height="3rem" />
            <SkeletonLoader width="160px" height="3rem" />
          </div>
        </div>
        <div className="theme-bg-secondary rounded-2xl border theme-border overflow-hidden shadow-md">
          <div className="p-6 border-b-2 theme-border theme-bg-tertiary">
            <SkeletonLoader width="100%" height="1.5rem" />
          </div>
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonLoader width="12%" height="1.2rem" />
                <SkeletonLoader width="14%" height="1.2rem" />
                <SkeletonLoader width="8%" height="1.2rem" />
                <SkeletonLoader width="15%" height="1.2rem" />
                <SkeletonLoader width="18%" height="1.2rem" />
                <SkeletonLoader width="12%" height="1.2rem" />
                <SkeletonLoader width="10%" height="1.2rem" />
                <SkeletonLoader width="11%" height="1.2rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderTradeRow = (trade: Trade) => {
    const symbol = trade.assetClass === AssetClass.FUTURES
      ? trade.instrumentRoot
      : trade.underlying;
    const isLong = trade.direction === 'LONG';
    
    // Check if this is an unviewed EDGE trade
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    const isEdgeTrade = (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
      trade.notes?.startsWith('[EDGE');
    const isUnviewedEdgeTrade = isEdgeTrade && !viewedEdgeTrades.has(trade.id);
    
    return (
      <tr
        key={trade.id}
        className={`table-row-premium border-b ${
          isUnviewedEdgeTrade
            ? 'border-l-4'
            : ''
        }`}
        style={{ 
          borderColor: 'var(--theme-border)',
          ...(isUnviewedEdgeTrade && {
            background: 'rgba(0, 102, 255, 0.08)',
            borderLeftColor: 'var(--theme-primary)',
            borderLeftWidth: '4px'
          })
        }}
        onClick={() => {
          if (isUnviewedEdgeTrade) {
            markEdgeTradeAsViewed(trade.id);
          }
          router.push(`/trades/${trade.id}`);
        }}
      >
        <td className="theme-text text-body-sm font-semibold whitespace-nowrap">
          {formatTradeDate(trade)}
        </td>
        <td className="whitespace-nowrap">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/trades/${trade.id}`} className="theme-text font-bold text-body-lg underline-offset-4 hover:underline" onClick={(event) => { event.stopPropagation(); if (isUnviewedEdgeTrade) markEdgeTradeAsViewed(trade.id); }}>{symbol}</Link>
            <span
              className="font-bold"
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-caption)',
                background: isLong ? 'rgba(0, 102, 255, 0.12)' : 'rgba(255, 153, 0, 0.12)',
                color: isLong ? 'var(--theme-primary)' : 'var(--theme-warning)',
                border: '2px solid',
                borderColor: isLong ? 'rgba(0, 102, 255, 0.3)' : 'rgba(255, 153, 0, 0.3)'
              }}
            >
              {isLong ? 'L' : 'S'}
            </span>
          </div>
        </td>
        <td className="theme-text text-body-sm font-semibold whitespace-nowrap">
          {(() => {
            // Check if this is an EDGE trade (in EDGE collection or notes start with [EDGE])
            const edgeCollection = collections.find((c) => c.name === 'EDGE');
            const isEdgeTrade = (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
              trade.notes?.startsWith('[EDGE');
            
            if (isEdgeTrade) return 'EDGE';
            return trade.assetClass === AssetClass.FUTURES ? 'Fut' : 'Opt';
          })()}
        </td>
        <td className="theme-text text-body-sm font-semibold whitespace-nowrap">
          {getStrategyName(trade.strategyId)}
        </td>
        <td>
          {trade.setupTags.length > 0 ? (
            <div className="flex flex-wrap" style={{ gap: 'var(--space-xs)' }}>
              {trade.setupTags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="theme-bg-tertiary theme-text border"
                  style={{ 
                    padding: 'var(--space-xs) var(--space-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    fontSize: 'var(--font-size-caption)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    borderColor: 'var(--theme-border)'
                  }}
                >
                  {formatSetupTag(tag)}
                  {trade.setupTags.length > 1 && idx === 0 && ` +${trade.setupTags.length - 1}`}
                </span>
              ))}
            </div>
          ) : (
            <span className="theme-text-tertiary font-medium">—</span>
          )}
        </td>
        <td className="whitespace-nowrap">
          <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
            <span className={`status-dot ${trade.outcome === Outcome.WIN ? 'success' : trade.outcome === Outcome.LOSS ? 'error' : 'info'}`} />
            <span
              className="font-bold text-caption"
              style={{
                color: trade.outcome === Outcome.WIN ? 'var(--theme-success)' : trade.outcome === Outcome.LOSS ? 'var(--theme-error)' : 'var(--theme-text-secondary)'
              }}
            >
              {trade.outcome}
            </span>
          </div>
        </td>
        <td className="text-body-sm font-bold whitespace-nowrap text-right">
          <span
            style={{
              color: trade.resultR > 0 ? 'var(--theme-success)' : trade.resultR < 0 ? 'var(--theme-error)' : 'var(--theme-text)'
            }}
          >
            {trade.resultR > 0 ? '+' : ''}
            {trade.resultR.toFixed(2)}R
          </span>
        </td>
        <td className="text-body-sm font-bold whitespace-nowrap text-right">
          <span
            style={{
              color: trade.resultUsd > 0 ? 'var(--theme-success)' : trade.resultUsd < 0 ? 'var(--theme-error)' : 'var(--theme-text)'
            }}
          >
            {trade.resultUsd > 0 ? '+' : trade.resultUsd < 0 ? '-' : ''}${Math.abs(trade.resultUsd).toFixed(2)}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="container-premium">
      {/* Premium Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-slide-in-down" style={{ marginBottom: 'var(--space-3xl)' }}>
        <div>
          <h1 className="theme-text text-h1">Trade Hub</h1>
          <p className="theme-text-secondary text-body" style={{ marginTop: 'var(--space-sm)' }}>
            Your complete trading history - {trades.length} {trades.length === 1 ? 'trade' : 'trades'} logged
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 theme-bg-secondary rounded-xl border theme-border">
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold theme-button text-white shadow-md"
            >
              <TableCellsIcon className="h-4 w-4" />
              Table
            </span>
            <Link
              href="/trades/timeline"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold theme-text hover:theme-bg-tertiary transition-all"
            >
              <CalendarDaysIcon className="h-4 w-4" />
              Timeline
            </Link>
          </div>
          <select
            aria-label="Trade type" value={assetFilter}
            onChange={(e) => setFilters(previous => ({ ...previous, edgeOnly: e.target.value === 'edge', assetClass: ['all', 'edge'].includes(e.target.value) ? undefined : [e.target.value as AssetClass] }))}
            className="theme-bg-secondary border theme-border theme-text focus:ring-2 focus:border-transparent transition-all hover:opacity-90 cursor-pointer"
            style={{ padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-body-sm)', fontWeight: 'var(--font-weight-semibold)', transitionDuration: 'var(--transition-base)' }}
          >
            <option value="all">All Types</option>
            <option value={AssetClass.FUTURES}>Futures</option>
            <option value={AssetClass.OPTIONS}>Options</option>
            <option value="edge">EDGE</option>
          </select>
          <select
            aria-label="Trade outcome" value={outcomeFilter}
            onChange={(e) => setFilters(previous => ({ ...previous, outcome: e.target.value === 'all' ? undefined : [e.target.value as Outcome] }))}
            className="theme-bg-secondary border theme-border theme-text focus:ring-2 focus:border-transparent transition-all hover:opacity-90 cursor-pointer"
            style={{ padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-body-sm)', fontWeight: 'var(--font-weight-semibold)', transitionDuration: 'var(--transition-base)' }}
          >
            <option value="all">All Outcomes</option>
            <option value={Outcome.WIN}>Wins</option>
            <option value={Outcome.LOSS}>Losses</option>
            <option value={Outcome.BREAKEVEN}>Breakeven</option>
          </select>
          <select
            aria-label="Trade collection" value={collectionFilter}
            onChange={(e) => setFilters(previous => ({ ...previous, collections: e.target.value === 'all' ? undefined : [e.target.value] }))}
            className="theme-bg-secondary border theme-border theme-text focus:ring-2 focus:border-transparent transition-all hover:opacity-90 cursor-pointer"
            style={{ padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-body-sm)', fontWeight: 'var(--font-weight-semibold)', transitionDuration: 'var(--transition-base)' }}
          >
            <option value="all">All Collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="mb-6 theme-text">
        <summary className="cursor-pointer py-3 font-semibold">More filters</summary>
        <TradeFiltersPanel filters={filters} onFiltersChange={setFilters} />
      </details>
      {/* Premium Table Container */}
      <div className="card-premium hover-lift" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full">
            <thead className="theme-bg-tertiary border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <tr>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  DATE
                </th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  SYMBOL
                </th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  TYPE
                </th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  STRATEGY
                </th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  SETUP
                </th>
                <th className="text-left theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  OUTCOME
                </th>
                <th className="text-right theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  R
                </th>
                <th className="text-right theme-text-secondary text-caption" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
                  PNL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center theme-text-secondary text-lg">
                    No trades found
                  </td>
                </tr>
              ) : (
                trades.map(renderTradeRow)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
