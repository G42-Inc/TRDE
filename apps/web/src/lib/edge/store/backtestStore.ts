// Hypothetical trades store for manual backtesting

import type { HypotheticalTrade } from '../types';

const STORAGE_KEY = 'edge:hypotheticalTrades';

/**
 * Save hypothetical trades
 */
export function saveHypotheticalTrades(trades: HypotheticalTrade[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

/**
 * Get hypothetical trades
 */
export function getHypotheticalTrades(): HypotheticalTrade[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Add a hypothetical trade
 */
export function addHypotheticalTrade(trade: HypotheticalTrade): void {
  const trades = getHypotheticalTrades();
  trades.push(trade);
  saveHypotheticalTrades(trades);
}

/**
 * Remove a hypothetical trade
 */
export function removeHypotheticalTrade(tradeId: string): void {
  const trades = getHypotheticalTrades();
  const filtered = trades.filter((t) => t.id !== tradeId);
  saveHypotheticalTrades(filtered);
}

/**
 * Update a hypothetical trade
 */
export function updateHypotheticalTrade(tradeId: string, updates: Partial<HypotheticalTrade>): void {
  const trades = getHypotheticalTrades();
  const index = trades.findIndex((t) => t.id === tradeId);
  if (index >= 0) {
    trades[index] = { ...trades[index], ...updates };
    saveHypotheticalTrades(trades);
  }
}
