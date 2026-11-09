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

export async function getTrades(): Promise<Trade[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.trades);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing trades from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.trades);
    return [];
  }
}

export async function saveTrades(trades: Trade[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(trades));
  
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
        // Update existing violation if rules changed (but keep review status if already reviewed)
        if (JSON.stringify(existingViolation.violatedRules.sort()) !== JSON.stringify(violatedRules.sort())) {
          updatedViolations.push({
            ...existingViolation,
            violatedRules,
            // If it was reviewed, keep it reviewed unless new violations were added
            reviewed: existingViolation.reviewed && violatedRules.every(r => existingViolation.violatedRules.includes(r)),
            reviewedAt: existingViolation.reviewed ? existingViolation.reviewedAt : undefined,
            reviewNotes: existingViolation.reviewed ? existingViolation.reviewNotes : undefined,
          });
        } else {
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
  
  // Keep reviewed violations for trades that no longer exist or no longer have violations
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
  await saveRuleViolations(finalViolations);
}

export async function getStrategies(): Promise<Strategy[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.strategies);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing strategies from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.strategies);
    return [];
  }
}

export async function saveStrategies(strategies: Strategy[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.strategies, JSON.stringify(strategies));
}

export async function getVersions(): Promise<StrategyVersion[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.versions);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing versions from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.versions);
    return [];
  }
}

export async function saveVersions(versions: StrategyVersion[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(versions));
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.collections);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing collections from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.collections);
    return [];
  }
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.collections, JSON.stringify(collections));
}

export async function getSavedFilters(): Promise<SavedFilter[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.savedFilters);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing savedFilters from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.savedFilters);
    return [];
  }
}

export async function saveSavedFilters(filters: SavedFilter[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(filters));
}

export async function getDailyBiases(): Promise<DailyBias[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.dailyBiases);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing dailyBiases from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.dailyBiases);
    return [];
  }
}

export async function saveDailyBiases(biases: DailyBias[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.dailyBiases, JSON.stringify(biases));
}

export async function getQuickJournals(): Promise<DailyQuickJournal[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.quickJournals);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing quickJournals from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.quickJournals);
    return [];
  }
}

export async function saveQuickJournals(journals: DailyQuickJournal[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.quickJournals, JSON.stringify(journals));
}

export async function getRiskRules(): Promise<RiskRules | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.riskRules);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Error parsing riskRules from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.riskRules);
    return null;
  }
}

export async function saveRiskRules(rules: RiskRules): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.riskRules, JSON.stringify(rules));
}

export async function getJournals(): Promise<TradeJournal[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.journals);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing journals from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.journals);
    return [];
  }
}

export async function saveJournals(journals: TradeJournal[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.journals, JSON.stringify(journals));
}

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.weeklyReviews);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing weeklyReviews from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.weeklyReviews);
    return [];
  }
}

export async function saveWeeklyReviews(reviews: WeeklyReview[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.weeklyReviews, JSON.stringify(reviews));
}

export async function getTodos(): Promise<Todo[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.todos);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing todos from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.todos);
    return [];
  }
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
}

export async function getRuleViolations(): Promise<RuleViolation[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ruleViolations);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Error parsing ruleViolations from AsyncStorage:', error);
    await AsyncStorage.removeItem(STORAGE_KEYS.ruleViolations);
    return [];
  }
}

export async function saveRuleViolations(violations: RuleViolation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ruleViolations, JSON.stringify(violations));
}

export async function getDashboardMetrics(): Promise<DashboardMetricId[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.dashboardMetrics);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure we have exactly 4 metrics
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error parsing dashboardMetrics from AsyncStorage:', error);
  }
  // Default metrics
  return ['totalPnLUsd', 'winRate', 'expectancy', 'consistencyScore'];
}

export async function saveDashboardMetrics(metrics: DashboardMetricId[]): Promise<void> {
  if (metrics.length !== 4) {
    console.error('Dashboard metrics must be exactly 4');
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.dashboardMetrics, JSON.stringify(metrics));
}

export async function clearAllData(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => AsyncStorage.removeItem(key)));
}
