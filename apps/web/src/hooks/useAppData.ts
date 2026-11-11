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
import { useCallback } from 'react';
import type { Trade, Strategy } from '@trde/core';

interface UseAppDataResult {
  versions: ReturnType<typeof useStorage>['versions'];
  saveVersions: ReturnType<typeof useStorage>['saveVersions'];
  collections: ReturnType<typeof useStorage>['collections'];
  saveCollections: ReturnType<typeof useStorage>['saveCollections'];
  savedFilters: ReturnType<typeof useStorage>['savedFilters'];
  saveSavedFilters: ReturnType<typeof useStorage>['saveSavedFilters'];
  clearAllData: ReturnType<typeof useStorage>['clearAllData'];
  migrateLocalToCloud: ReturnType<typeof useStorage>['migrateLocalToCloud'];
  syncError: ReturnType<typeof useStorage>['syncError'];
  lastSyncTime: ReturnType<typeof useStorage>['lastSyncTime'];
  needsMigration: ReturnType<typeof useStorage>['needsMigration'];

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
  const rejectDemoWrite = useCallback(async (): Promise<never> => {
    const message = 'Demo mode is read-only. Upgrade to save your own journal data.';
    demo.showUpgradePrompt('create_journal', message);
    throw new Error(message);
  }, [demo.showUpgradePrompt]);
  
  // In demo mode, return sample data for trades and strategies
  // For other data types, demo users see empty (they haven't created any)
  const trades = demo.isDemo ? demo.sampleTrades : storage.trades;
  const strategies = demo.isDemo ? demo.sampleStrategies : storage.strategies;
  
  // For journals in demo mode, we could map sampleJournals to TradeJournal format
  // For now, demo users see empty journals (they can view but not create)
  const journals = demo.isDemo ? [] : storage.journals;
  
  return {
    versions: demo.isDemo ? [] : storage.versions,
    saveVersions: demo.isDemo ? rejectDemoWrite : storage.saveVersions,
    collections: demo.isDemo ? [] : storage.collections,
    saveCollections: demo.isDemo ? rejectDemoWrite : storage.saveCollections,
    savedFilters: demo.isDemo ? [] : storage.savedFilters,
    saveSavedFilters: demo.isDemo ? rejectDemoWrite : storage.saveSavedFilters,
    clearAllData: demo.isDemo ? rejectDemoWrite : storage.clearAllData,
    migrateLocalToCloud: demo.isDemo ? rejectDemoWrite : storage.migrateLocalToCloud,
    syncError: storage.syncError,
    lastSyncTime: storage.lastSyncTime,
    needsMigration: storage.needsMigration,
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
    saveTrades: demo.isDemo ? rejectDemoWrite : storage.saveTrades,
    saveStrategies: demo.isDemo ? rejectDemoWrite : storage.saveStrategies,
    
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
    saveJournals: demo.isDemo ? rejectDemoWrite : storage.saveJournals,
    saveWeeklyReviews: demo.isDemo ? rejectDemoWrite : storage.saveWeeklyReviews,
    saveRiskRules: demo.isDemo ? rejectDemoWrite : storage.saveRiskRules,
    saveDailyBiases: demo.isDemo ? rejectDemoWrite : storage.saveDailyBiases,
    saveQuickJournals: demo.isDemo ? rejectDemoWrite : storage.saveQuickJournals,
    saveTodos: demo.isDemo ? rejectDemoWrite : storage.saveTodos,
    saveRuleViolations: demo.isDemo ? rejectDemoWrite : storage.saveRuleViolations,
    saveDashboardMetrics: storage.saveDashboardMetrics,
    
    // Sync functions
    syncFromCloud: storage.syncFromCloud,
    refresh: storage.refresh,
  };
}
