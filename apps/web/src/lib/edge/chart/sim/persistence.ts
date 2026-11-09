// Simulation State Persistence

import type { SimSessionState } from './types';

const STORAGE_PREFIX = 'edge:sim:session:';

/**
 * Save simulation session to localStorage
 */
export function saveSimSession(session: SimSessionState): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${session.sessionId}`;
  localStorage.setItem(key, JSON.stringify(session));
  
  // Also save a mapping of contractId -> sessionId for quick lookup
  const contractKey = `${STORAGE_PREFIX}contract:${session.contractId}`;
  localStorage.setItem(contractKey, session.sessionId);
}

/**
 * Load simulation session by session ID
 */
export function loadSimSession(sessionId: string): SimSessionState | null {
  if (typeof window === 'undefined') return null;
  const key = `${STORAGE_PREFIX}${sessionId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Load simulation session by contract ID
 */
export function loadSimSessionByContract(contractId: string): SimSessionState | null {
  if (typeof window === 'undefined') return null;
  const contractKey = `${STORAGE_PREFIX}contract:${contractId}`;
  const sessionId = localStorage.getItem(contractKey);
  if (!sessionId) return null;
  return loadSimSession(sessionId);
}

/**
 * Delete simulation session
 */
export function deleteSimSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${sessionId}`;
  const session = loadSimSession(sessionId);
  if (session) {
    const contractKey = `${STORAGE_PREFIX}contract:${session.contractId}`;
    localStorage.removeItem(contractKey);
  }
  localStorage.removeItem(key);
}

/**
 * Clear all simulation sessions
 */
export function clearAllSimSessions(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}
