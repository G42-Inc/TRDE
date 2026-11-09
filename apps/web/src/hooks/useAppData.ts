'use client';

/**
 * useAppData Hook
 * 
 * Returns the appropriate data based on demo status.
 * - In demo mode: returns generated sample data
 * - In paid mode: returns real user data from database
 * 
 * This hook should be used by all pages instead of useStorage directly.
 */

import { useStorage } from '@/contexts/StorageContext';
import { useDemo } from '@/contexts/DemoContext';
import type { Trade, Strategy } from '@trde/core';

interface UseAppDataResult {
  // Core data
  trades: Trade[];
  strategies: Strategy[];
  
  // Demo status
  isDemo: boolean;
  isDemoLoading: boolean;
  
  // Loading states
  isLoading: boolean;
  
  // For non-demo users, expose save functions
  // Demo users cannot save (API blocks it anyway)
  saveTrades: ReturnType<typeof useStorage>['saveTrades'];
  saveStrategies: ReturnType<typeof useStorage>['saveStrategies'];
  
  // Other storage data (always from real storage, demo users see empty)
  journals: ReturnType<typeof useStorage>['journals'];
  weeklyReviews: ReturnType<typeof useStorage>['weeklyReviews'];
  riskRules: ReturnType<typeof useStorage>['riskRules'];
  dailyBiases: ReturnType<typeof useStorage>['dailyBiases'];
  quickJournals: ReturnType<typeof useStorage>['quickJournals'];
  todos: ReturnType<typeof useStorage>['todos'];
  ruleViolations: ReturnType<typeof useStorage>['ruleViolations'];
  dashboardMetrics: ReturnType<typeof useStorage>['dashboardMetrics'];
  
  // Save functions for other data
  saveJournals: ReturnType<typeof useStorage>['saveJournals'];
  saveWeeklyReviews: ReturnType<typeof useStorage>['saveWeeklyReviews'];
  saveRiskRules: ReturnType<typeof useStorage>['saveRiskRules'];
  saveDailyBiases: ReturnType<typeof useStorage>['saveDailyBiases'];
  saveQuickJournals: ReturnType<typeof useStorage>['saveQuickJournals'];
  saveTodos: ReturnType<typeof useStorage>['saveTodos'];
  saveRuleViolations: ReturnType<typeof useStorage>['saveRuleViolations'];
  saveDashboardMetrics: ReturnType<typeof useStorage>['saveDashboardMetrics'];
  
  // Sync functions
  syncFromCloud: ReturnType<typeof useStorage>['syncFromCloud'];
  refresh: ReturnType<typeof useStorage>['refresh'];
  
  // Sync status
  isSyncing: boolean;
}

export function useAppData(): UseAppDataResult {
  const storage = useStorage();
  const demo = useDemo();
  
  // In demo mode, return sample data for trades and strategies
  // For other data types, demo users see empty (they haven't created any)
  const trades = demo.isDemo ? demo.sampleTrades : storage.trades;
  const strategies = demo.isDemo ? demo.sampleStrategies : storage.strategies;
  
  // For journals in demo mode, we could map sampleJournals to TradeJournal format
  // For now, demo users see empty journals (they can view but not create)
  const journals = demo.isDemo ? [] : storage.journals;
  
  return {
    // Core data - uses demo data when in demo mode
    trades,
    strategies,
    
    // Demo status
    isDemo: demo.isDemo,
    isDemoLoading: demo.isDemoLoading,
    
    // Loading states
    isLoading: storage.isLoading || demo.isDemoLoading,
    isSyncing: storage.isSyncing,
    
    // Save functions (will be blocked by API for demo users anyway)
    saveTrades: storage.saveTrades,
    saveStrategies: storage.saveStrategies,
    
    // Other data (empty for demo users)
    journals,
    weeklyReviews: demo.isDemo ? [] : storage.weeklyReviews,
    riskRules: demo.isDemo ? null : storage.riskRules,
    dailyBiases: demo.isDemo ? [] : storage.dailyBiases,
    quickJournals: demo.isDemo ? [] : storage.quickJournals,
    todos: demo.isDemo ? [] : storage.todos,
    ruleViolations: demo.isDemo ? [] : storage.ruleViolations,
    dashboardMetrics: storage.dashboardMetrics,
    
    // Save functions
    saveJournals: storage.saveJournals,
    saveWeeklyReviews: storage.saveWeeklyReviews,
    saveRiskRules: storage.saveRiskRules,
    saveDailyBiases: storage.saveDailyBiases,
    saveQuickJournals: storage.saveQuickJournals,
    saveTodos: storage.saveTodos,
    saveRuleViolations: storage.saveRuleViolations,
    saveDashboardMetrics: storage.saveDashboardMetrics,
    
    // Sync functions
    syncFromCloud: storage.syncFromCloud,
    refresh: storage.refresh,
  };
}
