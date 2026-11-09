'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTrades } from '@/lib/edge/store/edgeStore';
import type { RoundTripTrade, TradeOutcome } from '@/lib/edge/types';
import { format } from 'date-fns';
import { formatDuration } from '@/lib/edge/utils/time';
import { edgeTradeToTrdeFormData, storeTradeForImport } from '@/lib/edge/utils/tradeMapping';
import { ArrowRightIcon, ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline';

export default function EdgeTradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<RoundTripTrade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<RoundTripTrade[]>([]);
  const [filters, setFilters] = useState({
    outcome: 'ALL' as TradeOutcome,
    contract: '',
    search: '',
  });
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<RoundTripTrade | null>(null);

  useEffect(() => {
    const allTrades = getTrades();
    setTrades(allTrades);
    setFilteredTrades(allTrades);
  }, []);

  useEffect(() => {
    let filtered = [...trades];

    if (filters.outcome !== 'ALL') {
      filtered = filtered.filter((t) => t.outcome === filters.outcome);
    }

    if (filters.contract) {
      filtered = filtered.filter(
        (t) =>
          t.contractId.toLowerCase().includes(filters.contract.toLowerCase()) ||
          (t.contractName && t.contractName.toLowerCase().includes(filters.contract.toLowerCase()))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.contractId.toLowerCase().includes(searchLower) ||
          (t.contractName && t.contractName.toLowerCase().includes(searchLower)) ||
          t.tradeId.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTrades(filtered);
  }, [trades, filters]);

  const handleViewOnChart = (trade: RoundTripTrade) => {
    // Navigate to chart with trade highlighted
    window.location.href = `/edge/chart?highlightTrade=${trade.tradeId}`;
  };

  const handleTrackInJournal = (trade: RoundTripTrade) => {
    // Convert EDGE trade to TRDE form data
    const formData = edgeTradeToTrdeFormData(trade);
    // Store in localStorage for the new trade page to pick up
    storeTradeForImport(formData);
    // Navigate to new trade page
    router.push('/trades/new?import=edge');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => router.push('/edge')}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-black dark:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-black dark:text-white">EDGE Trades</h1>
          </div>
          <p className="text-black/60 dark:text-white/60 ml-12">Broker-synced round-trip trades</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-premium hover-lift">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => setFilters({ ...filters, outcome: e.target.value as TradeOutcome })}
              className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
            >
              <option value="ALL">All</option>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="BREAKEVEN">Breakeven</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Contract</label>
            <input
              type="text"
              value={filters.contract}
              onChange={(e) => setFilters({ ...filters, contract: e.target.value })}
              className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
              placeholder="Filter by contract"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
              placeholder="Search trades"
            />
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="card-premium hover-lift">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Date</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Contract</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Direction</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Qty</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Entry</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Exit</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Duration</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Fees</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>P&L</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Outcome</th>
                <th className="text-left theme-text-secondary text-caption font-semibold uppercase tracking-wide" style={{ padding: 'var(--space-lg) var(--space-md)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="theme-text-secondary text-center" style={{ padding: 'var(--space-2xl)' }}>
                    No trades found
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <>
                    <tr
                      key={trade.tradeId}
                      className="table-row-premium cursor-pointer border-b"
                      style={{ borderColor: 'var(--theme-border)' }}
                      onClick={() => setExpandedTrade(expandedTrade === trade.tradeId ? null : trade.tradeId)}
                    >
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                        {format(new Date(trade.entryTime), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="theme-text text-body font-semibold" style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                        {trade.contractName || trade.contractId}
                      </td>
                      <td style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.direction === 'LONG'
                              ? 'bg-success/20 text-green-700 dark:text-green-400 border border-positive/30'
                              : 'bg-danger/20 text-red-700 dark:text-red-400 border border-negative/30'
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>{trade.qty}</td>
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>{trade.avgEntryPrice.toFixed(2)}</td>
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>{trade.avgExitPrice.toFixed(2)}</td>
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>{formatDuration(trade.durationMs)}</td>
                      <td className="theme-text text-body-sm" style={{ padding: 'var(--space-lg) var(--space-md)' }}>${trade.feesTotal.toFixed(2)}</td>
                      <td
                        className={`text-body-sm font-semibold ${
                          trade.pnlNet >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                        style={{ padding: 'var(--space-lg) var(--space-md)' }}
                      >
                        ${trade.pnlNet.toFixed(2)}
                      </td>
                      <td style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${
                            trade.outcome === 'WIN' ? 'success' : trade.outcome === 'LOSS' ? 'error' : 'warning'
                          }`} />
                          <span
                            className={`text-body-sm font-semibold ${
                              trade.outcome === 'WIN'
                                ? 'text-green-700 dark:text-green-400'
                                : trade.outcome === 'LOSS'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {trade.outcome}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOnChart(trade);
                            }}
                            className="text-accent dark:text-accent-light hover:underline flex items-center space-x-1"
                          >
                            <span>View</span>
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrackInJournal(trade);
                            }}
                            className="text-green-600 dark:text-green-400 hover:underline flex items-center space-x-1"
                          >
                            <BookOpenIcon className="h-3 w-3" />
                            <span>Track</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTrade === trade.tradeId && (
                      <tr>
                        <td colSpan={11} className="px-4 py-4 bg-black/5 dark:bg-white/5">
                          <div className="space-y-2">
                            <div className="font-medium text-sm mb-2">Executions ({trade.executions.length})</div>
                            <div className="space-y-1">
                              {trade.executions.map((exec, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-black/60 dark:text-white/60 flex items-center justify-between"
                                >
                                  <span>
                                    {format(new Date(exec.timestampUtc), 'HH:mm:ss')} - {exec.side} {exec.size} @
                                    ${exec.price.toFixed(2)}
                                  </span>
                                  <span>
                                    Fees: ${exec.fees.toFixed(2)}
                                    {exec.profitAndLoss !== undefined && (
                                      <span className="ml-2">P&L: ${exec.profitAndLoss.toFixed(2)}</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
