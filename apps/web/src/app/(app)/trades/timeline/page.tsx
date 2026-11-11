'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { format, parseISO } from 'date-fns';
import { AssetClass, Outcome } from '@trde/core';
import type { Trade } from '@trde/core';
import {
  ChartBarIcon,
  CalendarIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TimelineItem {
  id: string;
  type: 'trade';
  timestamp: number;
  date: string;
  data: Trade;
}

export default function TradeHubTimeline() {
  const { trades, isLoading } = useAppData();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Build timeline from trades
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add trades
    trades.forEach((trade) => {
      items.push({
        id: `trade-${trade.id}`,
        type: 'trade',
        timestamp: trade.entryTime,
        date: trade.tradeDate,
        data: trade,
      });
    });

    // Sort by timestamp
    return items.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });
  }, [trades, sortOrder]);

  // Group timeline items by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};

    timelineItems.forEach((item) => {
      const dateKey = item.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  }, [timelineItems]);

  const sortedDates = useMemo(() => {
    const dates = Object.keys(groupedItems);
    return dates.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.localeCompare(a);
      }
      return a.localeCompare(b);
    });
  }, [groupedItems, sortOrder]);

  const renderTradeItem = (trade: Trade) => {
    const symbol = trade.assetClass === AssetClass.FUTURES
      ? trade.instrumentRoot
      : trade.underlying;
    const isLong = trade.direction === 'LONG';
    const isWin = trade.outcome === Outcome.WIN;

    return (
      <Link
        key={`trade-${trade.id}`}
        href={`/trades/${trade.id}`}
        className="block card-premium hover-lift cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ padding: 'var(--space-lg)' }}
      >
        <div className="flex items-start" style={{ gap: 'var(--space-lg)' }}>
          {/* Icon */}
          <div className="rounded-xl" style={{ padding: 'var(--space-md)', background: isWin ? 'rgba(13, 148, 136, 0.1)' : 'rgba(229, 115, 115, 0.1)' }}>
            <ChartBarIcon className="h-6 w-6" style={{ color: isWin ? '#0D9488' : '#E57373' }} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3" style={{ marginBottom: 'var(--space-sm)' }}>
              <div>
                <div className="flex items-center" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
                  <h3 className="theme-text text-h3">{symbol}</h3>
                  <span
                    className="font-bold"
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-caption)',
                      background: isLong ? 'rgba(0, 102, 255, 0.12)' : 'rgba(255, 153, 0, 0.12)',
                      color: isLong ? 'var(--theme-primary)' : 'var(--theme-warning)',
                    }}
                  >
                    {isLong ? 'LONG' : 'SHORT'}
                  </span>
                  <span className={`status-dot ${isWin ? 'success' : 'error'}`} />
                </div>
                <p className="theme-text-secondary text-body-sm">
                  {trade.assetClass === AssetClass.FUTURES ? 'Futures' : 'Options'} • {format(new Date(trade.entryTime), 'h:mm a')}
                </p>
              </div>

              <div className="text-right">
                <div className="text-h3" style={{ color: trade.resultR >= 0 ? '#0D9488' : '#E57373' }}>
                  {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
                </div>
                <div className="theme-text-secondary text-body-sm">
                  {trade.resultUsd >= 0 ? '+' : '-'}${Math.abs(trade.resultUsd).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Trade notes preview */}
            {trade.notes && (
              <p className="theme-text-tertiary text-body-sm line-clamp-2" style={{ marginTop: 'var(--space-md)' }}>
                {trade.notes}
              </p>
            )}

            {/* Setup tags */}
            {trade.setupTags.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-md)' }}>
                {trade.setupTags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="theme-bg-tertiary theme-text border"
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-caption)',
                      fontWeight: 'var(--font-weight-semibold)',
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {trade.setupTags.length > 3 && (
                  <span className="theme-text-tertiary text-caption">+{trade.setupTags.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="container-premium">
      {/* Premium Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-slide-in-down" style={{ marginBottom: 'var(--space-3xl)' }}>
        <div>
          <h1 className="theme-text text-h1">Timeline</h1>
          <p className="theme-text-secondary text-body" style={{ marginTop: 'var(--space-sm)' }}>
            Chronological view of your trading activity
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 theme-bg-secondary rounded-xl border theme-border">
            <Link
              href="/trades"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold theme-text hover:theme-bg-tertiary transition-all"
            >
              <TableCellsIcon className="h-4 w-4" />
              Table
            </Link>
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold theme-button text-white shadow-md"
            >
              <CalendarDaysIcon className="h-4 w-4" />
              Timeline
            </span>
          </div>

          {/* Sort order */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center theme-bg-secondary hover:opacity-80 transition-all font-semibold"
            style={{ padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-lg)', gap: 'var(--space-sm)', fontSize: 'var(--font-size-body-sm)', border: '1px solid var(--theme-border)', transitionDuration: 'var(--transition-base)' }}
          >
            {sortOrder === 'desc' ? <ArrowTrendingDownIcon className="h-5 w-5" /> : <ArrowTrendingUpIcon className="h-5 w-5" />}
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (<p role="status" className="theme-text-secondary py-12">Loading trades…</p>) : timelineItems.length === 0 ? (
        <div className="card-premium text-center" style={{ padding: 'var(--space-4xl)' }}>
          <CalendarIcon className="h-16 w-16 theme-text-tertiary mx-auto" style={{ marginBottom: 'var(--space-lg)' }} />
          <h3 className="theme-text text-h3" style={{ marginBottom: 'var(--space-sm)' }}>No Trades Yet</h3>
          <p className="theme-text-secondary text-body">
            Your trades will appear here once you add them
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 flex items-center" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)', background: 'var(--theme-bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--theme-border)', backdropFilter: 'blur(20px)' }}>
                <CalendarIcon className="h-5 w-5 theme-text-secondary" style={{ marginRight: 'var(--space-md)' }} />
                <span className="theme-text font-bold text-body-lg">
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </span>
                <span className="theme-text-tertiary text-caption" style={{ marginLeft: 'var(--space-md)' }}>
                  {groupedItems[dateKey].length} {groupedItems[dateKey].length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items for this date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingLeft: 'var(--space-xl)' }}>
                {groupedItems[dateKey].map((item) => renderTradeItem(item.data))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
