import { readEdgeJson, writeEdgeStorage, removeEdgeStorage, getEdgeAccountScope, type EdgeAccountScope } from './accountScope';
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
export function saveTrades(trades: RoundTripTrade[], scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage(STORAGE_KEYS.TRADES, JSON.stringify(trades), scope);
}

/**
 * Get round-trip trades from localStorage
 */
export function getTrades(scope: EdgeAccountScope | null = getEdgeAccountScope()): RoundTripTrade[] {
  if (typeof window === 'undefined') return [];
  return readEdgeJson(STORAGE_KEYS.TRADES, [], scope);
}

/**
 * Save executions to localStorage
 */
export function saveExecutions(executions: NormalizedExecution[], scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions), scope);
}

/**
 * Get executions from localStorage
 */
export function getExecutions(scope: EdgeAccountScope | null = getEdgeAccountScope()): NormalizedExecution[] {
  if (typeof window === 'undefined') return [];
  return readEdgeJson(STORAGE_KEYS.EXECUTIONS, [], scope);
}

/**
 * Save contracts to localStorage
 */
export function saveContracts(contracts: ProjectXContract[], scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts), scope);
}

/**
 * Get contracts from localStorage
 */
export function getContracts(scope: EdgeAccountScope | null = getEdgeAccountScope()): ProjectXContract[] {
  if (typeof window === 'undefined') return [];
  return readEdgeJson(STORAGE_KEYS.CONTRACTS, [], scope);
}

/**
 * Save sync state
 */
export function saveSyncState(state: {
  lastSyncTime?: string;
  totalExecutions: number;
  totalTrades: number;
  dateRange?: { start: string; end: string };
}, scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage(STORAGE_KEYS.SYNC_STATE, JSON.stringify(state), scope);
}

/**
 * Get sync state
 */
export function getSyncState(scope: EdgeAccountScope | null = getEdgeAccountScope()): {
  lastSyncTime?: string;
  totalExecutions: number;
  totalTrades: number;
  dateRange?: { start: string; end: string };
} | null {
  if (typeof window === 'undefined') return null;
  return readEdgeJson(STORAGE_KEYS.SYNC_STATE, null, scope);
}

/**
 * Clear all EDGE data
 */
export function clearEdgeData(scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeEdgeStorage(key, scope);
  });
}
