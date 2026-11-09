'use client';

import { useState } from 'react';
import { INDICATORS, INDICATOR_CATEGORIES, getIndicatorsByCategory } from '@/lib/edge/chart/indicators';
import type { IndicatorConfig } from '@/lib/edge/chart/indicators';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface IndicatorSelectorProps {
  selectedIndicators: string[];
  onToggle: (indicatorId: string) => void;
  onClose: () => void;
}

export function IndicatorSelector({ selectedIndicators, onToggle, onClose }: IndicatorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredIndicators = INDICATORS.filter((ind) => {
    const matchesSearch = ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || ind.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = INDICATOR_CATEGORIES.map((category) => ({
    category,
    indicators: getIndicatorsByCategory(category),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-surface-strong rounded-lg shadow-xl w-[600px] h-[600px] max-h-[90vh] max-w-[90vw] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold">Select Indicators ({selectedIndicators.length} selected)</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex-shrink-0 p-4 border-b border-black/10 dark:border-white/10 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search indicators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedCategory === null
                  ? 'bg-accent text-white'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {INDICATOR_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-accent text-white'
                    : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator List */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery || selectedCategory ? (
            // Filtered view
            <div className="space-y-2">
              {filteredIndicators.length === 0 ? (
                <div className="text-center py-8 text-black/60 dark:text-white/60">
                  No indicators found
                </div>
              ) : (
                filteredIndicators.map((indicator) => (
                  <IndicatorItem
                    key={indicator.id}
                    indicator={indicator}
                    isSelected={selectedIndicators.includes(indicator.id)}
                    onToggle={() => onToggle(indicator.id)}
                  />
                ))
              )}
            </div>
          ) : (
            // Grouped by category
            <div className="space-y-6">
              {groupedByCategory.map(({ category, indicators }) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-black/60 dark:text-white/60 mb-2 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {indicators.map((indicator) => (
                      <IndicatorItem
                        key={indicator.id}
                        indicator={indicator}
                        isSelected={selectedIndicators.includes(indicator.id)}
                        onToggle={() => onToggle(indicator.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="text-sm text-black/60 dark:text-white/60">
            {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function IndicatorItem({
  indicator,
  isSelected,
  onToggle,
}: {
  indicator: IndicatorConfig;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-accent-bg dark:bg-accent/20 border-2 border-accent'
          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-2 border-transparent'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="rounded"
          />
          <span className="font-medium">{indicator.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              indicator.overlay
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
            }`}
          >
            {indicator.overlay ? 'Overlay' : 'Oscillator'}
          </span>
        </div>
        <div className="text-xs text-black/60 dark:text-white/60 mt-1 ml-6">
          {indicator.plots} plot{indicator.plots !== 1 ? 's' : ''} • {indicator.category}
        </div>
      </div>
    </div>
  );
}
