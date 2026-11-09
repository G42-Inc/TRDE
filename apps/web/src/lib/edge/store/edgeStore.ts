// Local persistence for EDGE synced data

import type { RoundTripTrade, NormalizedExecution, ProjectXContract } from '../types';

const STORAGE_KEYS = {
  TRADES: 'edge:trades',
  EXECUTIONS: 'edge:executions',
  CONTRACTS: 'edge:contracts',
  SYNC_STATE: 'edge:syncState',
} as const;

/**
 * Save round-trip trades to localStorage
 */
export function saveTrades(trades: RoundTripTrade[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
}

/**
 * Get round-trip trades from localStorage
 */
export function getTrades(): RoundTripTrade[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.TRADES);
  return data ? JSON.parse(data) : [];
}

/**
 * Save executions to localStorage
 */
export function saveExecutions(executions: NormalizedExecution[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions));
}

/**
 * Get executions from localStorage
 */
export function getExecutions(): NormalizedExecution[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save contracts to localStorage
 */
export function saveContracts(contracts: ProjectXContract[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
}

/**
 * Get contracts from localStorage
 */
export function getContracts(): ProjectXContract[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save sync state
 */
export function saveSyncState(state: {
  lastSyncTime?: string;
  totalExecutions: number;
  totalTrades: number;
  dateRange?: { start: string; end: string };
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(state));
}

/**
 * Get sync state
 */
export function getSyncState(): {
  lastSyncTime?: string;
  totalExecutions: number;
  totalTrades: number;
  dateRange?: { start: string; end: string };
} | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.SYNC_STATE);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear all EDGE data
 */
export function clearEdgeData(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
