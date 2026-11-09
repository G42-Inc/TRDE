'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TradeFilters, SavedFilter } from '@trde/core';
import { AssetClass, Outcome, Grade, Session, MarketRegime } from '@trde/core';
import { useAppData } from '@/hooks/useAppData';
import { useToast } from '@/contexts/ToastContext';
import { ModalDialog } from '@/components/ModalDialog';

interface TradeFiltersPanelProps {
  filters: TradeFilters;
  onFiltersChange: (filters: TradeFilters) => void;
}

export function TradeFiltersPanel({ filters, onFiltersChange }: TradeFiltersPanelProps) {
  const { savedFilters, saveSavedFilters, isDemo } = useAppData();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  const updateFilter = <K extends keyof TradeFilters>(
    key: K,
    value: TradeFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
  };

  const saveCurrentFilter = async () => {
    if (saving || !saveName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
    const newFilter: SavedFilter = {
      id: `filter-${crypto.randomUUID()}`,
      name: saveName.trim(),
      filters: { ...filters },
      createdAt: Date.now(),
    };
    const updated = [...savedFilters, newFilter];
    await saveSavedFilters(updated);
    setSaveName('');
    setShowSaveDialog(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save filter.';
      setSaveError(message);
      showToast(message, 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="glass-surface p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-accent hover:underline"
        >
          Clear
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="filter-asset" className="block text-sm font-medium theme-text-secondary mb-1">
            Asset Class
          </label>
          <select id="filter-asset"
            className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2"
            value={filters.assetClass?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('assetClass', value ? [value as AssetClass] : undefined);
            }}
          >
            <option value="">All</option>
            <option value={AssetClass.FUTURES}>Futures</option>
            <option value={AssetClass.OPTIONS}>Options</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-outcome" className="block text-sm font-medium theme-text-secondary mb-1">
            Outcome
          </label>
          <select id="filter-outcome"
            className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2"
            value={filters.outcome?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('outcome', value ? [value as Outcome] : undefined);
            }}
          >
            <option value="">All</option>
            <option value={Outcome.WIN}>Win</option>
            <option value={Outcome.LOSS}>Loss</option>
            <option value={Outcome.BREAKEVEN}>Breakeven</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-grade" className="block text-sm font-medium theme-text-secondary mb-1">
            Grade
          </label>
          <select id="filter-grade"
            className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2"
            value={filters.grade?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('grade', value ? [value as Grade] : undefined);
            }}
          >
            <option value="">All</option>
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

        <div>
          <label htmlFor="filter-session" className="block text-sm font-medium theme-text-secondary mb-1">
            Session
          </label>
          <select id="filter-session"
            className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2"
            value={filters.session?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('session', value ? [value as Session] : undefined);
            }}
          >
            <option value="">All</option>
            <option value={Session.NEW_YORK}>New York</option>
            <option value={Session.LONDON}>London</option>
            <option value={Session.ASIA}>Asia</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-review" className="block text-sm font-medium theme-text-secondary mb-1">
            Review Flag
          </label>
          <select id="filter-review"
            className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2"
            value={filters.reviewFlag === undefined ? '' : filters.reviewFlag.toString()}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('reviewFlag', value === '' ? undefined : value === 'true');
            }}
          >
            <option value="">All</option>
            <option value="true">Flagged</option>
            <option value="false">Not Flagged</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Saved Filters</h3>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="text-xs text-accent hover:underline"
          >
            + Save
          </button>
        </div>
        <div className="space-y-1">
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              onClick={() => loadSavedFilter(sf)}
              className="w-full text-left px-2 py-1 text-sm theme-text-secondary hover:bg-gray-100 rounded"
            >
              {sf.name}
            </button>
          ))}
        </div>
      </div>

      {showSaveDialog && (
        <ModalDialog isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} labelledBy="save-filter-title" className="items-center justify-center">
          <div className="glass-surface-strong p-4 rounded-lg">
            <h3 id="save-filter-title" className="font-semibold mb-2">Save Filter</h3>
            {isDemo && <p className="mb-3 text-sm theme-text">Demo filters are read-only. <Link href="/pricing" className="text-accent underline">Upgrade to save filters</Link>.</p>}
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Filter name"
              aria-label="Filter name"
              className="w-full theme-bg-secondary theme-text border theme-border rounded-md px-3 py-2 mb-2"
            />
            {saveError && <p role="alert" className="mb-3 text-sm text-negative">{saveError}</p>}
            <div className="flex space-x-2">
              <button
                onClick={saveCurrentFilter}
                disabled={isDemo || saving || !saveName.trim()}
                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-4 py-2 bg-gray-200 theme-text-secondary rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
