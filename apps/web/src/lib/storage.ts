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

const STORAGE_KEYS = {
  trades: 'trde_trades',
  strategies: 'trde_strategies',
  versions: 'trde_versions',
  collections: 'trde_collections',
  savedFilters: 'trde_saved_filters',
  dailyBiases: 'trde_daily_biases',
  quickJournals: 'trde_quick_journals',
  riskRules: 'trde_risk_rules',
  journals: 'trde_journals',
  weeklyReviews: 'trde_weekly_reviews',
  todos: 'trde_todos',
  ruleViolations: 'trde_rule_violations',
  dashboardMetrics: 'trde_dashboard_metrics',
};

export function getTrades(): Trade[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.trades);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing trades from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.trades);
    return [];
  }
}

export function saveTrades(trades: Trade[]): { newViolations: RuleViolation[]; updatedViolations: RuleViolation[] } {
  if (typeof window === 'undefined') return { newViolations: [], updatedViolations: [] };
  localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(trades));
  
  // Automatically detect and create/update violations for trades with broken rules
  const existingViolations = getRuleViolations();
  const violationsByTradeId = new Map(existingViolations.map(v => [v.tradeId, v]));
  
  const updatedViolations: RuleViolation[] = [];
  const newViolations: RuleViolation[] = [];
  
  for (const trade of trades) {
    const violatedRules = detectViolationsFromTrade(trade);
    const existingViolation = violationsByTradeId.get(trade.id);
    
    if (violatedRules.length > 0) {
      if (existingViolation) {
        // Check if rules changed
        const rulesChanged = JSON.stringify(existingViolation.violatedRules.sort()) !== JSON.stringify(violatedRules.sort());
        
        if (rulesChanged) {
          // Update existing violation if rules changed
          updatedViolations.push({
            ...existingViolation,
            violatedRules,
            // If it was reviewed, keep it reviewed unless new violations were added
            reviewed: existingViolation.reviewed && violatedRules.every(r => existingViolation.violatedRules.includes(r)),
            reviewedAt: existingViolation.reviewed ? existingViolation.reviewedAt : undefined,
            reviewNotes: existingViolation.reviewed ? existingViolation.reviewNotes : undefined,
          });
        } else {
          // No change, but still include it in updatedViolations to preserve it
          updatedViolations.push(existingViolation);
        }
      } else {
        // Create new violation
        newViolations.push({
          id: `violation-${trade.id}-${Date.now()}`,
          tradeId: trade.id,
          violatedRules,
          createdAt: trade.updatedAt || trade.createdAt,
          reviewed: false,
        });
      }
    } else {
      // Trade no longer has violations - remove the violation unless it was reviewed
      // (we keep reviewed violations for historical purposes)
      if (existingViolation && existingViolation.reviewed) {
        // Keep reviewed violations even if trade no longer has violations
        updatedViolations.push(existingViolation);
      }
      // If unreviewed and trade has no violations, don't include it (it will be removed)
    }
  }
  
  // Keep reviewed violations for trades that no longer exist
  const allTradeIds = new Set(trades.map(t => t.id));
  const reviewedViolationsForRemovedTrades = existingViolations.filter(
    v => !allTradeIds.has(v.tradeId) && v.reviewed
  );
  
  // Build the final violations list:
  // 1. All updated violations (includes unchanged ones that we want to keep)
  // 2. All new violations  
  // 3. Reviewed violations for removed trades
  // 4. Any existing violations for trades that still exist but weren't processed
  //    (this shouldn't happen if we process all trades, but it's a safety check)
  const processedTradeIds = new Set([
    ...updatedViolations.map(v => v.tradeId),
    ...newViolations.map(v => v.tradeId),
  ]);
  
  // Find any existing violations that weren't processed (shouldn't happen, but safety check)
  const unprocessedViolations = existingViolations.filter(
    v => allTradeIds.has(v.tradeId) && !processedTradeIds.has(v.tradeId)
  );
  
  const finalViolations = [
    ...updatedViolations,
    ...newViolations,
    ...reviewedViolationsForRemovedTrades,
    ...unprocessedViolations,
  ];
  
  // Always save violations to ensure the list is up to date
  saveRuleViolations(finalViolations);
  
  return { newViolations, updatedViolations };
}

export function getStrategies(): Strategy[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.strategies);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing strategies from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.strategies);
    return [];
  }
}

export function saveStrategies(strategies: Strategy[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.strategies, JSON.stringify(strategies));
}

export function getVersions(): StrategyVersion[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.versions);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing versions from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.versions);
    return [];
  }
}

export function saveVersions(versions: StrategyVersion[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(versions));
}

export function getCollections(): Collection[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.collections);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing collections from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.collections);
    return [];
  }
}

export function saveCollections(collections: Collection[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.collections, JSON.stringify(collections));
}

export function getSavedFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.savedFilters);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing savedFilters from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.savedFilters);
    return [];
  }
}

export function saveSavedFilters(filters: SavedFilter[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(filters));
}

export function getDailyBiases(): DailyBias[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.dailyBiases);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing dailyBiases from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.dailyBiases);
    return [];
  }
}

export function saveDailyBiases(biases: DailyBias[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.dailyBiases, JSON.stringify(biases));
}

export function getQuickJournals(): DailyQuickJournal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.quickJournals);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing quickJournals from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.quickJournals);
    return [];
  }
}

export function saveQuickJournals(journals: DailyQuickJournal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.quickJournals, JSON.stringify(journals));
}

export function getRiskRules(): RiskRules | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.riskRules);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error parsing riskRules from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.riskRules);
    return null;
  }
}

export function saveRiskRules(rules: RiskRules): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.riskRules, JSON.stringify(rules));
}

export function getJournals(): TradeJournal[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.journals);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing journals from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.journals);
    return [];
  }
}

export function saveJournals(journals: TradeJournal[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.journals, JSON.stringify(journals));
}

export function getWeeklyReviews(): WeeklyReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.weeklyReviews);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing weeklyReviews from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.weeklyReviews);
    return [];
  }
}

export function saveWeeklyReviews(reviews: WeeklyReview[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.weeklyReviews, JSON.stringify(reviews));
}

export function getTodos(): Todo[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.todos);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing todos from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.todos);
    return [];
  }
}

export function saveTodos(todos: Todo[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
}

export function getRuleViolations(): RuleViolation[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ruleViolations);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error parsing ruleViolations from localStorage:', error);
    localStorage.removeItem(STORAGE_KEYS.ruleViolations);
    return [];
  }
}

export function saveRuleViolations(violations: RuleViolation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ruleViolations, JSON.stringify(violations));
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

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

export function getDashboardMetrics(): DashboardMetricId[] {
  if (typeof window === 'undefined') return ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.dashboardMetrics);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure we have exactly 4 metrics
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error parsing dashboardMetrics from localStorage:', error);
  }
  // Default metrics
  return ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd'];
}

export function saveDashboardMetrics(metrics: DashboardMetricId[]): void {
  if (typeof window === 'undefined') return;
  if (metrics.length !== 4) {
    console.error('Dashboard metrics must be exactly 4');
    return;
  }
  localStorage.setItem(STORAGE_KEYS.dashboardMetrics, JSON.stringify(metrics));
}
