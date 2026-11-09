/**
 * Database Storage Layer
 * 
 * This module provides the same interface as storage.ts but uses Supabase
 * instead of localStorage. All functions are async and make API calls.
 * 
 * To switch from localStorage to database:
 * 1. Replace imports: `from '@/lib/storage'` → `from '@/lib/storage.db'`
 * 2. Update function calls to use await
 * 3. Update components to handle async operations
 */

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

const API_BASE = '/api/data';

const PAYLOAD_KEYS: Record<string, string> = {
  'daily-biases': 'biases',
  'quick-journals': 'journals',
  'strategy-versions': 'versions',
  'saved-filters': 'savedFilters',
  'rule-violations': 'ruleViolations',
  'weekly-reviews': 'weeklyReviews',
  'dashboard-metrics': 'dashboardMetrics',
};

function payloadKey(endpoint: string): string {
  const resource = endpoint.split('/').pop() || 'items';
  return PAYLOAD_KEYS[resource] ?? resource;
}

async function responseError(response: Response): Promise<Error> {
  if (response.status === 401) return new Error('Please sign in again to save your data.');
  const body = await response.json().catch(() => null);
  return new Error(typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`);
}

/**
 * Fetch data from API endpoint
 */
async function fetchData<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(endpoint, {
    credentials: 'include', // Include cookies for authentication
  });
  if (!response.ok) {
    throw await responseError(response);
  }
  const data = await response.json();
  const items = data[payloadKey(endpoint)];
  if (!Array.isArray(items)) throw new Error('Invalid data response');
  return items as T[];
}

/**
 * Save data to API endpoint
 */
async function saveData<T>(endpoint: string, items: T[], extra: Record<string, unknown> = {}): Promise<void> {
  const key = payloadKey(endpoint);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: items, ...extra }),
    credentials: 'include', // Include cookies for authentication
  });
  
  if (!response.ok) {
    throw await responseError(response);
  }
}

// ============================================
// TRADES
// ============================================

export async function getTrades(): Promise<Trade[]> {
  return await fetchData<Trade>(`${API_BASE}/trades`);
}

export async function saveTrades(trades: Trade[], deletedIds: string[] = []): Promise<{ newViolations: RuleViolation[]; updatedViolations: RuleViolation[] }> {
  await saveData<Trade>(`${API_BASE}/trades`, trades, { deletedIds });
  const updatedViolations: RuleViolation[] = [];
  const newViolations: RuleViolation[] = [];
  try {
    // Automatically detect and create/update violations for trades with broken rules
    const existingViolations = await getRuleViolations();
    const violationsByTradeId = new Map(existingViolations.map(v => [v.tradeId, v]));
  

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
  

  } catch {
    // The primary trade save succeeded. Risk summaries can be retried independently.
    console.warn('Trades saved, but risk summaries could not be synchronized.');
  }

  return { newViolations, updatedViolations };
}

// ============================================
// STRATEGIES
// ============================================

export async function getStrategies(): Promise<Strategy[]> {
  return await fetchData<Strategy>(`${API_BASE}/strategies`);
}

export async function saveStrategies(strategies: Strategy[]): Promise<void> {
  await saveData<Strategy>(`${API_BASE}/strategies`, strategies);
}

// ============================================
// STRATEGY VERSIONS
// ============================================

export async function getVersions(): Promise<StrategyVersion[]> {
  return await fetchData<StrategyVersion>(`${API_BASE}/strategy-versions`);
}

export async function saveVersions(versions: StrategyVersion[]): Promise<void> {
  await saveData<StrategyVersion>(`${API_BASE}/strategy-versions`, versions);
}

// ============================================
// COLLECTIONS
// ============================================

export async function getCollections(): Promise<Collection[]> {
  return await fetchData<Collection>(`${API_BASE}/collections`);
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await saveData<Collection>(`${API_BASE}/collections`, collections);
}

// ============================================
// DAILY BIASES
// ============================================

export async function getDailyBiases(): Promise<DailyBias[]> {
  return await fetchData<DailyBias>(`${API_BASE}/daily-biases`);
}

export async function saveDailyBiases(biases: DailyBias[]): Promise<void> {
  await saveData<DailyBias>(`${API_BASE}/daily-biases`, biases);
}

// ============================================
// QUICK JOURNALS
// ============================================

export async function getQuickJournals(): Promise<DailyQuickJournal[]> {
  return await fetchData<DailyQuickJournal>(`${API_BASE}/quick-journals`);
}

export async function saveQuickJournals(journals: DailyQuickJournal[]): Promise<void> {
  await saveData<DailyQuickJournal>(`${API_BASE}/quick-journals`, journals);
}

// ============================================
// SAVED FILTERS
// ============================================

export async function getSavedFilters(): Promise<SavedFilter[]> {
  return await fetchData<SavedFilter>(`${API_BASE}/saved-filters`);
}

export async function saveSavedFilters(filters: SavedFilter[]): Promise<void> {
  await saveData<SavedFilter>(`${API_BASE}/saved-filters`, filters);
}

// ============================================
// RISK RULES
// ============================================

export async function getRiskRules(): Promise<RiskRules | null> {
  try {
    const response = await fetch(`${API_BASE}/risk-rules`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please sign in');
      }
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = await response.json();
    return data.riskRules || null;
  } catch (error) {
    console.error('Error fetching risk rules:', error);
    return null;
  }
}

export async function saveRiskRules(rules: RiskRules): Promise<void> {
  const response = await fetch(`${API_BASE}/risk-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ riskRules: rules }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw await responseError(response);
  }
}

// ============================================
// TRADE JOURNALS
// ============================================

export async function getJournals(): Promise<TradeJournal[]> {
  return await fetchData<TradeJournal>(`${API_BASE}/journals`);
}

export async function saveJournals(journals: TradeJournal[]): Promise<void> {
  await saveData<TradeJournal>(`${API_BASE}/journals`, journals);
}

// ============================================
// WEEKLY REVIEWS
// ============================================

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  return await fetchData<WeeklyReview>(`${API_BASE}/weekly-reviews`);
}

export async function saveWeeklyReviews(reviews: WeeklyReview[]): Promise<void> {
  await saveData<WeeklyReview>(`${API_BASE}/weekly-reviews`, reviews);
}

// ============================================
// TODOS
// ============================================

export async function getTodos(): Promise<Todo[]> {
  return await fetchData<Todo>(`${API_BASE}/todos`);
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await saveData<Todo>(`${API_BASE}/todos`, todos);
}

// ============================================
// RULE VIOLATIONS
// ============================================

export async function getRuleViolations(): Promise<RuleViolation[]> {
  return await fetchData<RuleViolation>(`${API_BASE}/rule-violations`);
}

export async function saveRuleViolations(violations: RuleViolation[]): Promise<void> {
  await saveData<RuleViolation>(`${API_BASE}/rule-violations`, violations);
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

export async function getDashboardMetrics(): Promise<DashboardMetricId[]> {
  try {
    const response = await fetch(`${API_BASE}/dashboard-metrics`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please sign in');
      }
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = await response.json();
    return data.dashboardMetrics || ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];
  }
}

export async function saveDashboardMetrics(metrics: DashboardMetricId[]): Promise<void> {
  if (metrics.length !== 4) {
    console.error('Dashboard metrics must be exactly 4');
    return;
  }
  
  const response = await fetch(`${API_BASE}/dashboard-metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboardMetrics: metrics }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw await responseError(response);
  }
}

// ============================================
// CLEAR ALL DATA
// ============================================

export async function clearAllData(): Promise<void> {
  // Clear all user data by calling each endpoint with empty arrays
  // This is a destructive operation - we continue even if individual calls fail
  const clearOperations = [
    { name: 'trades', fn: () => saveData<Trade>(`${API_BASE}/trades`, [], { clearAll: true }) },
    { name: 'strategies', fn: () => saveData<Strategy>(`${API_BASE}/strategies`, []) },
    { name: 'strategy-versions', fn: () => saveData<StrategyVersion>(`${API_BASE}/strategy-versions`, []) },
    { name: 'collections', fn: () => saveData<Collection>(`${API_BASE}/collections`, []) },
    { name: 'daily-biases', fn: () => saveData<DailyBias>(`${API_BASE}/daily-biases`, []) },
    { name: 'quick-journals', fn: () => saveData<DailyQuickJournal>(`${API_BASE}/quick-journals`, []) },
    { name: 'saved-filters', fn: () => saveData<SavedFilter>(`${API_BASE}/saved-filters`, []) },
    { name: 'journals', fn: () => saveData<TradeJournal>(`${API_BASE}/journals`, []) },
    { name: 'weekly-reviews', fn: () => saveData<WeeklyReview>(`${API_BASE}/weekly-reviews`, []) },
    { name: 'todos', fn: () => saveData<Todo>(`${API_BASE}/todos`, []) },
    { name: 'rule-violations', fn: () => saveData<RuleViolation>(`${API_BASE}/rule-violations`, []) },
  ];

  const errors: string[] = [];
  
  // Run all operations and collect errors
  await Promise.all(
    clearOperations.map(async (op) => {
      try {
        await op.fn();
        console.log(`[clearAllData] Cleared ${op.name}`);
      } catch (error) {
        console.error(`[clearAllData] Failed to clear ${op.name}:`, error);
        errors.push(op.name);
      }
    })
  );

  // If there were errors, throw with details but data is still cleared locally
  if (errors.length > 0) {
    console.warn(`[clearAllData] Some cloud data may not have been cleared: ${errors.join(', ')}`);
    // Don't throw - local data is cleared, cloud can be re-synced
  }
}
