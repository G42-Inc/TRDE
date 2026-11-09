/**
 * Database Storage Layer for Mobile
 * 
 * This module provides the same interface as storage.ts but uses Supabase
 * via API routes instead of AsyncStorage. All functions are async and make
 * API calls to the web app backend.
 * 
 * Features:
 * - Offline caching with AsyncStorage
 * - Automatic sync when online
 * - Same interface as storage.ts for easy migration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Trade,
  Strategy,
  StrategyVersion,
  Collection,
  SavedFilter,
  DailyBias,
  DailyQuickJournal,
  RiskRules,
  TradeJournal,
  WeeklyReview,
  Todo,
  RuleViolation,
} from '@trde/core';
import { detectViolationsFromTrade } from './violations';
import { API_BASE_URL } from './config';

// Session token getter - will be set by StorageContext when user is authenticated
let sessionTokenGetter: (() => Promise<string | null>) | null = null;
let currentUserId: string | null = null;

export function setSessionTokenGetter(getter: () => Promise<string | null>) {
  sessionTokenGetter = getter;
}

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
}

// Cache keys for offline support
const CACHE_KEYS = {
  trades: 'trde_cache_trades',
  strategies: 'trde_cache_strategies',
  versions: 'trde_cache_versions',
  collections: 'trde_cache_collections',
  dailyBiases: 'trde_cache_daily_biases',
  quickJournals: 'trde_cache_quick_journals',
  lastSync: 'trde_last_sync',
};

// Sync queue for offline writes
const SYNC_QUEUE_KEY = 'trde_sync_queue';

/**
 * Check if device is online
 */
async function isOnline(): Promise<boolean> {
  // Simple check - try to fetch a small resource
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/data', '')}/favicon.ico`, {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get auth headers for API requests
 * Gets Clerk session token and user ID for authentication
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  try {
    // Get session token from Clerk
    if (sessionTokenGetter) {
      const token = await sessionTokenGetter();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[Storage] Got session token, length:', token.length);
      } else {
        console.log('[Storage] No session token available');
      }
    }
    
    // Also send user ID in header (for API routes that check this)
    if (currentUserId) {
      headers['x-clerk-user-id'] = currentUserId;
      console.log('[Storage] Using user ID:', currentUserId);
    }
  } catch (error) {
    console.error('[Storage] Error getting auth token:', error);
  }
  
  return headers;
}

/**
 * Debug function to test API connection
 */
export async function debugApiConnection(): Promise<{
  apiUrl: string;
  online: boolean;
  hasToken: boolean;
  hasUserId: boolean;
  userId: string | null;
  response: any;
  error?: string;
}> {
  const debug: any = {
    apiUrl: API_BASE_URL,
    online: await isOnline(),
    hasToken: !!sessionTokenGetter,
    hasUserId: !!currentUserId,
    userId: currentUserId, // Show the actual user ID being used
  };
  
  try {
    const headers = await getAuthHeaders();
    debug.headers = {
      hasAuth: !!headers['Authorization'],
      hasUserId: !!headers['x-clerk-user-id'],
      userId: headers['x-clerk-user-id'], // Show the user ID in headers
    };
    
    const url = `${API_BASE_URL}/trades`;
    console.log('[Debug] Fetching:', url);
    
    const response = await fetch(url, { headers });
    debug.status = response.status;
    debug.statusText = response.statusText;
    
    const text = await response.text();
    debug.responseLength = text.length;
    
    try {
      const json = JSON.parse(text);
      debug.response = {
        keys: Object.keys(json),
        tradesCount: json.trades?.length ?? 'N/A',
        serverUserId: json._debug?.userId ?? 'N/A', // User ID the server resolved
        userIdMatches: json._debug?.userIdMatches ?? 'N/A',
        uniqueUserIdsInDb: json._debug?.uniqueUserIdsInDb ?? [],
        userTradeCounts: json._debug?.userTradeCounts ?? [],
        totalTradesInDb: json._debug?.totalTradesInDb ?? 'N/A',
        error: json.error,
      };
    } catch {
      debug.responseText = text.substring(0, 200);
    }
  } catch (error: any) {
    debug.error = error.message;
  }
  
  return debug;
}

/**
 * Fetch data from API endpoint with offline caching
 */
async function fetchData<T>(endpoint: string, cacheKey: string, forceRefresh: boolean = false): Promise<T[]> {
  const online = await isOnline();
  
  if (!online && !forceRefresh) {
    // Return cached data if offline (unless forcing refresh)
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log(`[Storage] Using cached data for ${cacheKey} (offline)`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error(`[Storage] Error reading cache for ${cacheKey}:`, error);
    }
    return [];
  }

  // If forcing refresh, clear the cache first
  if (forceRefresh) {
    try {
      await AsyncStorage.removeItem(cacheKey);
      console.log(`[Storage] Cleared cache for ${cacheKey} (force refresh)`);
    } catch (error) {
      console.error(`[Storage] Error clearing cache:`, error);
    }
  }

  try {
    const headers = await getAuthHeaders();
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[Storage] Fetching ${url}${forceRefresh ? ' (force refresh)' : ''}`);
    
    const response = await fetch(url, { 
      headers,
      cache: forceRefresh ? 'no-cache' : 'default',
    });
    console.log(`[Storage] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please sign in');
      }
      const errorText = await response.text();
      console.log(`[Storage] Error response: ${errorText}`);
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Storage] Response keys:`, Object.keys(data));
    console.log(`[Storage] Full response structure:`, JSON.stringify(data).substring(0, 500));
    
    // Extract the data array from the response
    // API returns { trades: [...], _debug: {...} } or { strategies: [...], ... }
    // Use the endpoint name to determine which key to use
    const endpointKey = endpoint.split('/').pop() || 'trades'; // e.g., '/trades' -> 'trades'
    console.log(`[Storage] Looking for key: "${endpointKey}" in response`);
    
    // Try multiple ways to extract the array
    let items: T[] = [];
    if (data[endpointKey] && Array.isArray(data[endpointKey])) {
      items = data[endpointKey] as T[];
      console.log(`[Storage] Found array at data["${endpointKey}"] with ${items.length} items`);
    } else if (data[endpointKey.slice(0, -1)] && Array.isArray(data[endpointKey.slice(0, -1)])) {
      // Try without the 's' (e.g., 'trade' instead of 'trades')
      items = data[endpointKey.slice(0, -1)] as T[];
      console.log(`[Storage] Found array at data["${endpointKey.slice(0, -1)}"] with ${items.length} items`);
    } else {
      // Fallback: find first array value
      const arrayValue = Object.values(data).find(v => Array.isArray(v));
      if (arrayValue) {
        items = arrayValue as T[];
        console.log(`[Storage] Found array using fallback with ${items.length} items`);
      } else {
        console.error(`[Storage] No array found in response. Available keys:`, Object.keys(data));
        console.error(`[Storage] Response data:`, data);
        return [];
      }
    }
    
    if (!Array.isArray(items)) {
      console.error(`[Storage] Expected array but got:`, typeof items, items);
      return [];
    }
    
    console.log(`[Storage] Successfully extracted ${items.length} items from ${endpoint}`);

    // Cache the data (always cache, even on force refresh, so we have it for offline)
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(items));
      await AsyncStorage.setItem(CACHE_KEYS.lastSync, Date.now().toString());
      console.log(`[Storage] Cached ${items.length} items to ${cacheKey}`);
    } catch (error) {
      console.error(`[Storage] Error caching data for ${cacheKey}:`, error);
    }

    return items;
  } catch (error: any) {
    console.error(`[Storage] Error fetching ${endpoint}:`, error);
    
    // Try to return cached data on error
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log(`[Storage] Using cached data for ${cacheKey} (error fallback)`);
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error(`[Storage] Error reading cache:`, cacheError);
    }
    
    return [];
  }
}

/**
 * Save data to API endpoint with offline queue support
 */
async function saveData<T>(endpoint: string, items: T[], cacheKey: string): Promise<void> {
  // Update cache immediately for offline support
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(items));
  } catch (error) {
    console.error(`[Storage] Error updating cache for ${cacheKey}:`, error);
  }

  const online = await isOnline();
  
  if (!online) {
    // Queue for sync when online
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const syncQueue = queue ? JSON.parse(queue) : [];
      syncQueue.push({
        endpoint,
        data: items,
        cacheKey,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
      console.log(`[Storage] Queued ${endpoint} for sync (offline)`);
    } catch (error) {
      console.error('[Storage] Error queuing sync:', error);
    }
    return;
  }

  try {
    const key = endpoint.split('/').pop() || 'items';
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ [key]: items }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please sign in');
      }
      throw new Error(`Failed to save: ${response.statusText}`);
    }

    // Update last sync time
    await AsyncStorage.setItem(CACHE_KEYS.lastSync, Date.now().toString());
  } catch (error: any) {
    console.error(`[Storage] Error saving to ${endpoint}:`, error);
    
    // Queue for retry
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const syncQueue = queue ? JSON.parse(queue) : [];
      syncQueue.push({
        endpoint,
        data: items,
        cacheKey,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (queueError) {
      console.error('[Storage] Error queuing retry:', queueError);
    }
    
    throw error;
  }
}

/**
 * Sync queued items when coming back online
 */
export async function syncQueue(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  try {
    const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queue) return;

    const syncQueue = JSON.parse(queue);
    if (syncQueue.length === 0) return;

    console.log(`[Storage] Syncing ${syncQueue.length} queued items...`);

    const headers = await getAuthHeaders();
    const successful: number[] = [];

    for (let i = 0; i < syncQueue.length; i++) {
      const item = syncQueue[i];
      try {
        const key = item.endpoint.split('/').pop() || 'items';
        const response = await fetch(`${API_BASE_URL}${item.endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ [key]: item.data }),
        });

        if (response.ok) {
          successful.push(i);
          // Update cache
          await AsyncStorage.setItem(item.cacheKey, JSON.stringify(item.data));
        }
      } catch (error) {
        console.error(`[Storage] Error syncing queued item ${i}:`, error);
      }
    }

    // Remove successful items from queue
    if (successful.length > 0) {
      const remaining = syncQueue.filter((_: any, i: number) => !successful.includes(i));
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
      console.log(`[Storage] Synced ${successful.length} items, ${remaining.length} remaining`);
    }
  } catch (error) {
    console.error('[Storage] Error syncing queue:', error);
  }
}

// ============================================
// TRADES
// ============================================

export async function getTrades(forceRefresh: boolean = false): Promise<Trade[]> {
  return fetchData<Trade>('/trades', CACHE_KEYS.trades, forceRefresh);
}

export async function saveTrades(trades: Trade[]): Promise<{ newViolations: RuleViolation[]; updatedViolations: RuleViolation[] }> {
  // Automatically detect and create/update violations for trades with broken rules
  const existingViolations = await getRuleViolations();
  const violationsByTradeId = new Map(existingViolations.map(v => [v.tradeId, v]));
  
  const updatedViolations: RuleViolation[] = [];
  const newViolations: RuleViolation[] = [];
  
  for (const trade of trades) {
    const violatedRules = detectViolationsFromTrade(trade);
    const existingViolation = violationsByTradeId.get(trade.id);
    
    if (violatedRules.length > 0) {
      if (existingViolation) {
        const rulesChanged = JSON.stringify(existingViolation.violatedRules.sort()) !== JSON.stringify(violatedRules.sort());
        
        if (rulesChanged) {
          updatedViolations.push({
            ...existingViolation,
            violatedRules,
            reviewed: existingViolation.reviewed && violatedRules.every(r => existingViolation.violatedRules.includes(r)),
            reviewedAt: existingViolation.reviewed ? existingViolation.reviewedAt : undefined,
            reviewNotes: existingViolation.reviewed ? existingViolation.reviewNotes : undefined,
          });
        } else {
          updatedViolations.push(existingViolation);
        }
      } else {
        newViolations.push({
          id: `violation-${trade.id}-${Date.now()}`,
          tradeId: trade.id,
          violatedRules,
          createdAt: trade.updatedAt || trade.createdAt,
          reviewed: false,
        });
      }
    } else {
      if (existingViolation && existingViolation.reviewed) {
        updatedViolations.push(existingViolation);
      }
    }
  }
  
  // Keep reviewed violations for trades that no longer exist
  const tradeIds = new Set(trades.map(t => t.id));
  for (const violation of existingViolations) {
    if (violation.reviewed && !tradeIds.has(violation.tradeId)) {
      updatedViolations.push(violation);
    }
  }
  
  // Save violations
  if (newViolations.length > 0 || updatedViolations.length > 0) {
    await saveRuleViolations([...newViolations, ...updatedViolations]);
  }
  
  // Save trades
  await saveData<Trade>('/trades', trades, CACHE_KEYS.trades);
  
  return { newViolations, updatedViolations };
}

// ============================================
// STRATEGIES
// ============================================

export async function getStrategies(forceRefresh: boolean = false): Promise<Strategy[]> {
  return fetchData<Strategy>('/strategies', CACHE_KEYS.strategies, forceRefresh);
}

export async function saveStrategies(strategies: Strategy[]): Promise<void> {
  await saveData<Strategy>('/strategies', strategies, CACHE_KEYS.strategies);
}

// ============================================
// STRATEGY VERSIONS
// ============================================

export async function getVersions(forceRefresh: boolean = false): Promise<StrategyVersion[]> {
  return fetchData<StrategyVersion>('/strategy-versions', CACHE_KEYS.versions, forceRefresh);
}

export async function saveVersions(versions: StrategyVersion[]): Promise<void> {
  await saveData<StrategyVersion>('/strategy-versions', versions, CACHE_KEYS.versions);
}

// ============================================
// COLLECTIONS
// ============================================

export async function getCollections(forceRefresh: boolean = false): Promise<Collection[]> {
  return fetchData<Collection>('/collections', CACHE_KEYS.collections, forceRefresh);
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await saveData<Collection>('/collections', collections, CACHE_KEYS.collections);
}

// ============================================
// DAILY BIASES
// ============================================

export async function getDailyBiases(forceRefresh: boolean = false): Promise<DailyBias[]> {
  return fetchData<DailyBias>('/daily-biases', CACHE_KEYS.dailyBiases, forceRefresh);
}

export async function saveDailyBiases(biases: DailyBias[]): Promise<void> {
  await saveData<DailyBias>('/daily-biases', biases, CACHE_KEYS.dailyBiases);
}

// ============================================
// QUICK JOURNALS
// ============================================

export async function getQuickJournals(forceRefresh: boolean = false): Promise<DailyQuickJournal[]> {
  return fetchData<DailyQuickJournal>('/quick-journals', CACHE_KEYS.quickJournals, forceRefresh);
}

export async function saveQuickJournals(journals: DailyQuickJournal[]): Promise<void> {
  await saveData<DailyQuickJournal>('/quick-journals', journals, CACHE_KEYS.quickJournals);
}

// ============================================
// SAVED FILTERS
// ============================================

export async function getSavedFilters(forceRefresh: boolean = false): Promise<SavedFilter[]> {
  return fetchData<SavedFilter>('/saved-filters', 'trde_cache_saved_filters', forceRefresh);
}

export async function saveSavedFilters(filters: SavedFilter[]): Promise<void> {
  await saveData<SavedFilter>('/saved-filters', filters, 'trde_cache_saved_filters');
}

// ============================================
// RISK RULES
// ============================================

export async function getRiskRules(): Promise<RiskRules | null> {
  const cacheKey = 'trde_cache_risk_rules';
  const online = await isOnline();
  
  if (!online) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Storage] Error reading risk rules cache:', error);
    }
    return null;
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/risk-rules`, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please sign in');
      }
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    const riskRules = data.riskRules || null;

    if (riskRules) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(riskRules));
    }

    return riskRules;
  } catch (error) {
    console.error('[Storage] Error fetching risk rules:', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('[Storage] Error reading cache:', cacheError);
    }
    return null;
  }
}

export async function saveRiskRules(rules: RiskRules): Promise<void> {
  const cacheKey = 'trde_cache_risk_rules';
  
  // Update cache
  await AsyncStorage.setItem(cacheKey, JSON.stringify(rules));

  const online = await isOnline();
  if (!online) {
    // Queue for sync
    const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const syncQueue = queue ? JSON.parse(queue) : [];
    syncQueue.push({
      endpoint: '/risk-rules',
      data: rules,
      cacheKey,
      timestamp: Date.now(),
      isSingle: true,
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    return;
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/risk-rules`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ riskRules: rules }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save: ${response.statusText}`);
  }
}

// ============================================
// TRADE JOURNALS
// ============================================

export async function getJournals(forceRefresh: boolean = false): Promise<TradeJournal[]> {
  return fetchData<TradeJournal>('/journals', 'trde_cache_journals', forceRefresh);
}

export async function saveJournals(journals: TradeJournal[]): Promise<void> {
  await saveData<TradeJournal>('/journals', journals, 'trde_cache_journals');
}

// ============================================
// WEEKLY REVIEWS
// ============================================

export async function getWeeklyReviews(forceRefresh: boolean = false): Promise<WeeklyReview[]> {
  return fetchData<WeeklyReview>('/weekly-reviews', 'trde_cache_weekly_reviews', forceRefresh);
}

export async function saveWeeklyReviews(reviews: WeeklyReview[]): Promise<void> {
  await saveData<WeeklyReview>('/weekly-reviews', reviews, 'trde_cache_weekly_reviews');
}

// ============================================
// TODOS
// ============================================

export async function getTodos(forceRefresh: boolean = false): Promise<Todo[]> {
  return fetchData<Todo>('/todos', 'trde_cache_todos', forceRefresh);
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await saveData<Todo>('/todos', todos, 'trde_cache_todos');
}

// ============================================
// RULE VIOLATIONS
// ============================================

export async function getRuleViolations(forceRefresh: boolean = false): Promise<RuleViolation[]> {
  return fetchData<RuleViolation>('/rule-violations', 'trde_cache_rule_violations', forceRefresh);
}

export async function saveRuleViolations(violations: RuleViolation[]): Promise<void> {
  await saveData<RuleViolation>('/rule-violations', violations, 'trde_cache_rule_violations');
}

// ============================================
// DASHBOARD METRICS
// ============================================

export type DashboardMetricId = 
  | 'totalPnLUsd' 
  | 'totalPnLR' 
  | 'winRate' 
  | 'profitFactor' 
  | 'expectancy' 
  | 'avgWinR' 
  | 'avgLossR' 
  | 'maxDrawdownUsd' 
  | 'maxDrawdownR'
  | 'consistencyScore' 
  | 'feeDrag' 
  | 'mistakeTaxUsd';

const DEFAULT_METRICS: DashboardMetricId[] = ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];

export async function getDashboardMetrics(): Promise<DashboardMetricId[]> {
  const cacheKey = 'trde_cache_dashboard_metrics';
  const online = await isOnline();
  
  if (!online) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Storage] Error reading dashboard metrics cache:', error);
    }
    return DEFAULT_METRICS;
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard-metrics`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    const metrics = data.dashboardMetrics || DEFAULT_METRICS;

    await AsyncStorage.setItem(cacheKey, JSON.stringify(metrics));
    return metrics;
  } catch (error) {
    console.error('[Storage] Error fetching dashboard metrics:', error);
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('[Storage] Error reading cache:', cacheError);
    }
    return DEFAULT_METRICS;
  }
}

export async function saveDashboardMetrics(metrics: DashboardMetricId[]): Promise<void> {
  if (metrics.length !== 4) {
    console.error('[Storage] Dashboard metrics must be exactly 4');
    return;
  }

  const cacheKey = 'trde_cache_dashboard_metrics';
  await AsyncStorage.setItem(cacheKey, JSON.stringify(metrics));

  const online = await isOnline();
  if (!online) {
    const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const syncQueue = queue ? JSON.parse(queue) : [];
    syncQueue.push({
      endpoint: '/dashboard-metrics',
      data: metrics,
      cacheKey,
      timestamp: Date.now(),
      isSingle: true,
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    return;
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/dashboard-metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ dashboardMetrics: metrics }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save: ${response.statusText}`);
  }
}

// ============================================
// CLEAR ALL DATA
// ============================================

export async function clearAllData(): Promise<void> {
  // Clear local cache
  const cacheKeys = [
    CACHE_KEYS.trades,
    CACHE_KEYS.strategies,
    CACHE_KEYS.versions,
    CACHE_KEYS.collections,
    CACHE_KEYS.dailyBiases,
    CACHE_KEYS.quickJournals,
    'trde_cache_saved_filters',
    'trde_cache_risk_rules',
    'trde_cache_journals',
    'trde_cache_weekly_reviews',
    'trde_cache_todos',
    'trde_cache_rule_violations',
    'trde_cache_dashboard_metrics',
  ];
  
  await Promise.all(cacheKeys.map(key => AsyncStorage.removeItem(key)));
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
