'use client';

import { useState } from 'react';
import type { TradeFilters, SavedFilter } from '@trde/core';
import { AssetClass, Outcome, Grade, Session, MarketRegime } from '@trde/core';
import { useStorage } from '@/contexts/StorageContext';

interface TradeFiltersPanelProps {
  filters: TradeFilters;
  onFiltersChange: (filters: TradeFilters) => void;
}

export function TradeFiltersPanel({ filters, onFiltersChange }: TradeFiltersPanelProps) {
  const { savedFilters, saveSavedFilters } = useStorage();
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
    if (!saveName.trim()) return;
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: saveName,
      filters: { ...filters },
      createdAt: Date.now(),
    };
    const updated = [...savedFilters, newFilter];
    await saveSavedFilters(updated);
    setSaveName('');
    setShowSaveDialog(false);
  };

  return (
    <div className="glass-surface p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Class
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Outcome
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Flag
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
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
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            + Save
          </button>
        </div>
        <div className="space-y-1">
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              onClick={() => loadSavedFilter(sf)}
              className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              {sf.name}
            </button>
          ))}
        </div>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-surface-strong p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Save Filter</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Filter name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
            />
            <div className="flex space-x-2">
              <button
                onClick={saveCurrentFilter}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
