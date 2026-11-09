export interface EdgeAccountScope {
  readonly userId: string;
  readonly generation: number;
}

// Per-tab identity supplied by AppShell from Clerk. Never infer ownership from a
// shared localStorage flag or claim unscoped legacy data for the next account.
let activeScope: EdgeAccountScope | null = null;
let generation = 0;

export function setEdgeAccount(userId: string | null): void {
  if (activeScope?.userId === userId) return;
  activeScope = userId ? Object.freeze({ userId, generation: ++generation }) : null;
}

export function getEdgeAccountScope(): EdgeAccountScope | null { return activeScope; }

export function isCurrentEdgeAccount(scope: EdgeAccountScope | null): boolean {
  return scope !== null && scope === activeScope;
}

function scopedKey(key: string, scope: EdgeAccountScope | null): string | null {
  if (typeof window === 'undefined' || !isCurrentEdgeAccount(scope)) return null;
  return `trde:${encodeURIComponent(scope!.userId)}:${key}`;
}

export function readEdgeStorage(key: string, scope = getEdgeAccountScope()): string | null {
  const ownedKey = scopedKey(key, scope);
  if (!ownedKey) return null;
  try { return localStorage.getItem(ownedKey); } catch { return null; }
}

export function readEdgeJson<T>(key: string, fallback: T, scope = getEdgeAccountScope()): T {
  const raw = readEdgeStorage(key, scope);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
    if (!Array.isArray(fallback) && (value === null || typeof value !== 'object' || Array.isArray(value))) return fallback;
    return value as T;
  } catch { return fallback; }
}

export function writeEdgeStorage(key: string, value: string, scope = getEdgeAccountScope()): boolean {
  const ownedKey = scopedKey(key, scope);
  if (!ownedKey) return false;
  try { localStorage.setItem(ownedKey, value); return true; } catch { return false; }
}

export function removeEdgeStorage(key: string, scope = getEdgeAccountScope()): void {
  const ownedKey = scopedKey(key, scope);
  if (!ownedKey) return;
  try { localStorage.removeItem(ownedKey); } catch { /* Storage may be disabled. */ }
}

export function clearEdgeStoragePrefix(prefix: string, scope = getEdgeAccountScope()): void {
  const ownedPrefix = scopedKey(prefix, scope);
  if (!ownedPrefix) return;
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(ownedPrefix)).forEach((key) => localStorage.removeItem(key));
  } catch { /* Storage may be disabled. */ }
}
