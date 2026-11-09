import { readEdgeJson, readEdgeStorage, writeEdgeStorage, removeEdgeStorage, clearEdgeStoragePrefix, getEdgeAccountScope, type EdgeAccountScope } from '../../store/accountScope';
// Simulation State Persistence

import type { SimSessionState } from './types';

const STORAGE_PREFIX = 'edge:sim:session:';

/**
 * Save simulation session to localStorage
 */
export function saveSimSession(session: SimSessionState, scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${session.sessionId}`;
  writeEdgeStorage(key, JSON.stringify(session), scope);
  
  // Also save a mapping of contractId -> sessionId for quick lookup
  const contractKey = `${STORAGE_PREFIX}contract:${session.contractId}`;
  writeEdgeStorage(contractKey, session.sessionId, scope);
}

/**
 * Load simulation session by session ID
 */
export function loadSimSession(sessionId: string, scope: EdgeAccountScope | null = getEdgeAccountScope()): SimSessionState | null {
  if (typeof window === 'undefined') return null;
  const key = `${STORAGE_PREFIX}${sessionId}`;
  return readEdgeJson<SimSessionState | null>(key, null, scope);
}

/**
 * Load simulation session by contract ID
 */
export function loadSimSessionByContract(contractId: string, scope: EdgeAccountScope | null = getEdgeAccountScope()): SimSessionState | null {
  if (typeof window === 'undefined') return null;
  const contractKey = `${STORAGE_PREFIX}contract:${contractId}`;
  const sessionId = readEdgeStorage(contractKey, scope);
  if (!sessionId) return null;
  return loadSimSession(sessionId, scope);
}

/**
 * Delete simulation session
 */
export function deleteSimSession(sessionId: string, scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${sessionId}`;
  const session = loadSimSession(sessionId, scope);
  if (session) {
    const contractKey = `${STORAGE_PREFIX}contract:${session.contractId}`;
    removeEdgeStorage(contractKey, scope);
  }
  removeEdgeStorage(key, scope);
}

/**
 * Clear all simulation sessions
 */
export function clearAllSimSessions(scope: EdgeAccountScope | null = getEdgeAccountScope()): void {
  if (typeof window === 'undefined') return;
  clearEdgeStoragePrefix(STORAGE_PREFIX, scope);
}
