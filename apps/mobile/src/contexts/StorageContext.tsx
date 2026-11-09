import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
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
import * as cloudStorage from '../lib/storage.db';
import { setSessionTokenGetter, setCurrentUserId } from '../lib/storage.db';

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
  lastSync: 'trde_last_sync',
  migrationComplete: 'trde_migration_complete',
};

export type DashboardMetricId = cloudStorage.DashboardMetricId;

interface StorageContextType {
  // Data
  trades: Trade[];
  strategies: Strategy[];
  versions: StrategyVersion[];
  collections: Collection[];
  savedFilters: SavedFilter[];
  dailyBiases: DailyBias[];
  quickJournals: DailyQuickJournal[];
  riskRules: RiskRules | null;
  journals: TradeJournal[];
  weeklyReviews: WeeklyReview[];
  todos: Todo[];
  ruleViolations: RuleViolation[];
  dashboardMetrics: DashboardMetricId[];

  // Status
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  needsMigration: boolean;

  // Actions
  saveTrades: (trades: Trade[]) => Promise<void>;
  saveStrategies: (strategies: Strategy[]) => Promise<void>;
  saveVersions: (versions: StrategyVersion[]) => Promise<void>;
  saveCollections: (collections: Collection[]) => Promise<void>;
  saveSavedFilters: (filters: SavedFilter[]) => Promise<void>;
  saveDailyBiases: (biases: DailyBias[]) => Promise<void>;
  saveQuickJournals: (journals: DailyQuickJournal[]) => Promise<void>;
  saveRiskRules: (rules: RiskRules) => Promise<void>;
  saveJournals: (journals: TradeJournal[]) => Promise<void>;
  saveWeeklyReviews: (reviews: WeeklyReview[]) => Promise<void>;
  saveTodos: (todos: Todo[]) => Promise<void>;
  saveRuleViolations: (violations: RuleViolation[]) => Promise<void>;
  saveDashboardMetrics: (metrics: DashboardMetricId[]) => Promise<void>;
  
  // Sync
  syncFromCloud: () => Promise<void>;
  migrateLocalToCloud: () => Promise<void>;
  clearAllData: () => Promise<void>;
  
  // Refresh
  refresh: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

// Helper functions to read/write local storage
async function getLocal<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from AsyncStorage:`, error);
    return defaultValue;
  }
}

async function setLocal<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth();
  
  // State for all data
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [dailyBiases, setDailyBiases] = useState<DailyBias[]>([]);
  const [quickJournals, setQuickJournals] = useState<DailyQuickJournal[]>([]);
  const [riskRules, setRiskRules] = useState<RiskRules | null>(null);
  const [journals, setJournals] = useState<TradeJournal[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricId[]>(['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']);

  // Status state
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  
  // Refs for debouncing saves
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Set up auth token getter when user signs in
  useEffect(() => {
    if (isSignedIn && userId) {
      console.log('[StorageContext] Setting up auth for user:', userId);
      setCurrentUserId(userId);
      // Get token with default template (session token)
      setSessionTokenGetter(async () => {
        try {
          const token = await getToken();
          console.log('[StorageContext] Got token, length:', token?.length || 0);
          return token;
        } catch (error) {
          console.error('[StorageContext] Error getting token:', error);
          return null;
        }
      });
    } else {
      setCurrentUserId(null);
      setSessionTokenGetter(null);
    }
  }, [isSignedIn, userId, getToken]);

  // Load from local storage on mount
  useEffect(() => {
    const loadLocalData = async () => {
      const localTrades = await getLocal(STORAGE_KEYS.trades, []);
      console.log('[StorageContext] Loading local data on mount:', localTrades.length, 'trades');
      setTrades(localTrades);
      setStrategies(await getLocal(STORAGE_KEYS.strategies, []));
      setVersions(await getLocal(STORAGE_KEYS.versions, []));
      setCollections(await getLocal(STORAGE_KEYS.collections, []));
      setSavedFilters(await getLocal(STORAGE_KEYS.savedFilters, []));
      setDailyBiases(await getLocal(STORAGE_KEYS.dailyBiases, []));
      setQuickJournals(await getLocal(STORAGE_KEYS.quickJournals, []));
      setRiskRules(await getLocal(STORAGE_KEYS.riskRules, null));
      setJournals(await getLocal(STORAGE_KEYS.journals, []));
      setWeeklyReviews(await getLocal(STORAGE_KEYS.weeklyReviews, []));
      setTodos(await getLocal(STORAGE_KEYS.todos, []));
      setRuleViolations(await getLocal(STORAGE_KEYS.ruleViolations, []));
      setDashboardMetrics(await getLocal(STORAGE_KEYS.dashboardMetrics, ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']));
      setLastSyncTime(await getLocal(STORAGE_KEYS.lastSync, null));
      
      // Check if migration is needed
      const migrationComplete = await getLocal(STORAGE_KEYS.migrationComplete, false);
      setNeedsMigration(!migrationComplete && localTrades.length > 0);
      
      setIsLoading(false);
    };
    
    loadLocalData();
  }, []);

  // Sync from cloud when user is authenticated
  useEffect(() => {
    if (!isSignedIn || isLoading) return;
    
    // Auto-migrate local data to cloud if needed (only once)
    if (needsMigration) {
      console.log('[StorageContext] Auto-migrating local data to cloud...');
      migrateLocalToCloud();
      return;
    }
    
    // Auto-sync from cloud on initial load
    syncFromCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoading, needsMigration]);

  // Auto-sync when app comes to foreground
  useEffect(() => {
    if (!isSignedIn) return;
    
    const appStateRef = { current: AppState.currentState };
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App came to foreground from background/inactive
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        !isSyncing
      ) {
        console.log('[StorageContext] App came to foreground, syncing from cloud...');
        syncFromCloud();
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isSignedIn, isSyncing, syncFromCloud]);

  // Debounced cloud save helper
  const debouncedCloudSave = useCallback((key: string, saveFn: () => Promise<unknown>) => {
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }
    
    saveTimeoutRef.current[key] = setTimeout(async () => {
      try {
        await saveFn();
      } catch (error) {
        console.error(`Error saving ${key} to cloud:`, error);
        setSyncError(`Failed to sync ${key}`);
      }
    }, 500); // 500ms debounce
  }, []);

  // Sync from cloud
  const syncFromCloud = useCallback(async () => {
    if (!isSignedIn) {
      console.log('[StorageContext] syncFromCloud: Not signed in, skipping');
      throw new Error('Please sign in to sync');
    }
    
    console.log('[StorageContext] syncFromCloud: Starting sync for user:', userId);
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Fetch all data from cloud in parallel
      console.log('[StorageContext] Fetching data from cloud...');
      const [
        cloudTrades,
        cloudStrategies,
        cloudVersions,
        cloudCollections,
        cloudDailyBiases,
        cloudQuickJournals,
        cloudSavedFilters,
        cloudRiskRules,
        cloudJournals,
        cloudWeeklyReviews,
        cloudTodos,
        cloudRuleViolations,
        cloudDashboardMetrics,
      ] = await Promise.all([
        cloudStorage.getTrades(true), // Force refresh to bypass cache
        cloudStorage.getStrategies(true),
        cloudStorage.getVersions(true),
        cloudStorage.getCollections(true),
        cloudStorage.getDailyBiases(true),
        cloudStorage.getQuickJournals(true),
        cloudStorage.getSavedFilters(true),
        cloudStorage.getRiskRules(),
        cloudStorage.getJournals(true),
        cloudStorage.getWeeklyReviews(true),
        cloudStorage.getTodos(true),
        cloudStorage.getRuleViolations(true),
        cloudStorage.getDashboardMetrics(),
      ]);
      
      console.log('[StorageContext] Cloud data received:', {
        trades: cloudTrades.length,
        strategies: cloudStrategies.length,
        collections: cloudCollections.length,
        dailyBiases: cloudDailyBiases.length,
        quickJournals: cloudQuickJournals.length,
        journals: cloudJournals.length,
        weeklyReviews: cloudWeeklyReviews.length,
        todos: cloudTodos.length,
      });
      
      // Only update trades if cloud has data OR user explicitly has no trades
      // This prevents wiping local data when cloud fetch fails or returns empty
      if (cloudTrades.length > 0) {
        setTrades(cloudTrades);
        await setLocal(STORAGE_KEYS.trades, cloudTrades);
      } else {
        console.log('[StorageContext] Cloud returned 0 trades, keeping local data');
      }
      if (cloudStrategies.length > 0) {
        setStrategies(cloudStrategies);
        await setLocal(STORAGE_KEYS.strategies, cloudStrategies);
      }
      if (cloudVersions.length > 0) {
        setVersions(cloudVersions);
        await setLocal(STORAGE_KEYS.versions, cloudVersions);
      }
      if (cloudCollections.length > 0) {
        setCollections(cloudCollections);
        await setLocal(STORAGE_KEYS.collections, cloudCollections);
      }
      if (cloudDailyBiases.length > 0) {
        setDailyBiases(cloudDailyBiases);
        await setLocal(STORAGE_KEYS.dailyBiases, cloudDailyBiases);
      }
      if (cloudQuickJournals.length > 0) {
        setQuickJournals(cloudQuickJournals);
        await setLocal(STORAGE_KEYS.quickJournals, cloudQuickJournals);
      }
      if (cloudSavedFilters.length > 0) {
        setSavedFilters(cloudSavedFilters);
        await setLocal(STORAGE_KEYS.savedFilters, cloudSavedFilters);
      }
      if (cloudRiskRules) {
        setRiskRules(cloudRiskRules);
        await setLocal(STORAGE_KEYS.riskRules, cloudRiskRules);
      }
      if (cloudJournals.length > 0) {
        setJournals(cloudJournals);
        await setLocal(STORAGE_KEYS.journals, cloudJournals);
      }
      if (cloudWeeklyReviews.length > 0) {
        setWeeklyReviews(cloudWeeklyReviews);
        await setLocal(STORAGE_KEYS.weeklyReviews, cloudWeeklyReviews);
      }
      if (cloudTodos.length > 0) {
        setTodos(cloudTodos);
        await setLocal(STORAGE_KEYS.todos, cloudTodos);
      }
      if (cloudRuleViolations.length > 0) {
        setRuleViolations(cloudRuleViolations);
        await setLocal(STORAGE_KEYS.ruleViolations, cloudRuleViolations);
      }
      if (cloudDashboardMetrics.length > 0) {
        setDashboardMetrics(cloudDashboardMetrics);
        await setLocal(STORAGE_KEYS.dashboardMetrics, cloudDashboardMetrics);
      }
      
      const syncTime = Date.now();
      setLastSyncTime(syncTime);
      await setLocal(STORAGE_KEYS.lastSync, syncTime);
      
      // Mark migration as complete if we received cloud data
      if (cloudTrades.length > 0) {
        setNeedsMigration(false);
        await setLocal(STORAGE_KEYS.migrationComplete, true);
      }
    } catch (error: any) {
      console.error('Error syncing from cloud:', error);
      setSyncError(error.message || 'Failed to sync from cloud');
    } finally {
      setIsSyncing(false);
    }
  }, [isSignedIn]);

  // Migrate local data to cloud
  const migrateLocalToCloud = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Get ALL current local data including journals, biases, notes
      const localTrades = await getLocal<Trade[]>(STORAGE_KEYS.trades, []);
      const localStrategies = await getLocal<Strategy[]>(STORAGE_KEYS.strategies, []);
      const localVersions = await getLocal<StrategyVersion[]>(STORAGE_KEYS.versions, []);
      const localCollections = await getLocal<Collection[]>(STORAGE_KEYS.collections, []);
      const localDailyBiases = await getLocal<DailyBias[]>(STORAGE_KEYS.dailyBiases, []);
      const localQuickJournals = await getLocal<DailyQuickJournal[]>(STORAGE_KEYS.quickJournals, []);
      const localJournals = await getLocal<TradeJournal[]>(STORAGE_KEYS.journals, []);
      const localWeeklyReviews = await getLocal<WeeklyReview[]>(STORAGE_KEYS.weeklyReviews, []);
      const localTodos = await getLocal<Todo[]>(STORAGE_KEYS.todos, []);
      
      console.log('[Migration] Starting migration with:', {
        trades: localTrades.length,
        strategies: localStrategies.length,
        collections: localCollections.length,
        dailyBiases: localDailyBiases.length,
        quickJournals: localQuickJournals.length,
        journals: localJournals.length,
        weeklyReviews: localWeeklyReviews.length,
        todos: localTodos.length,
      });
      
      // Save all data to cloud
      await Promise.all([
        localTrades.length > 0 ? cloudStorage.saveTrades(localTrades) : Promise.resolve(),
        localStrategies.length > 0 ? cloudStorage.saveStrategies(localStrategies) : Promise.resolve(),
        localVersions.length > 0 ? cloudStorage.saveVersions(localVersions) : Promise.resolve(),
        localCollections.length > 0 ? cloudStorage.saveCollections(localCollections) : Promise.resolve(),
        localDailyBiases.length > 0 ? cloudStorage.saveDailyBiases(localDailyBiases) : Promise.resolve(),
        localQuickJournals.length > 0 ? cloudStorage.saveQuickJournals(localQuickJournals) : Promise.resolve(),
        localJournals.length > 0 ? cloudStorage.saveJournals(localJournals) : Promise.resolve(),
        localWeeklyReviews.length > 0 ? cloudStorage.saveWeeklyReviews(localWeeklyReviews) : Promise.resolve(),
        localTodos.length > 0 ? cloudStorage.saveTodos(localTodos) : Promise.resolve(),
      ]);
      
      console.log('[Migration] Migration complete');
      setNeedsMigration(false);
      await setLocal(STORAGE_KEYS.migrationComplete, true);
      
      // Refresh from cloud after migration
      await syncFromCloud();
    } catch (error: any) {
      console.error('Error migrating to cloud:', error);
      setSyncError(error.message || 'Failed to migrate data');
    } finally {
      setIsSyncing(false);
    }
  }, [isSignedIn, syncFromCloud]);

  // Save functions with local + cloud sync
  const handleSaveTrades = useCallback(async (newTrades: Trade[]) => {
    // Update local state and AsyncStorage immediately
    setTrades(newTrades);
    await setLocal(STORAGE_KEYS.trades, newTrades);
    
    // Sync to cloud immediately (not debounced) for trades
    if (isSignedIn) {
      try {
        await cloudStorage.saveTrades(newTrades);
        console.log('[StorageContext] Trades synced to cloud immediately');
      } catch (error) {
        console.error('[StorageContext] Error syncing trades to cloud:', error);
        setSyncError('Failed to sync trades to cloud');
      }
    }
  }, [isSignedIn]);

  const handleSaveStrategies = useCallback(async (newStrategies: Strategy[]) => {
    setStrategies(newStrategies);
    await setLocal(STORAGE_KEYS.strategies, newStrategies);
    
    if (isSignedIn) {
      debouncedCloudSave('strategies', () => cloudStorage.saveStrategies(newStrategies));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveVersions = useCallback(async (newVersions: StrategyVersion[]) => {
    setVersions(newVersions);
    await setLocal(STORAGE_KEYS.versions, newVersions);
    
    if (isSignedIn) {
      debouncedCloudSave('versions', () => cloudStorage.saveVersions(newVersions));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveCollections = useCallback(async (newCollections: Collection[]) => {
    setCollections(newCollections);
    await setLocal(STORAGE_KEYS.collections, newCollections);
    
    if (isSignedIn) {
      debouncedCloudSave('collections', () => cloudStorage.saveCollections(newCollections));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveSavedFilters = useCallback(async (newFilters: SavedFilter[]) => {
    setSavedFilters(newFilters);
    await setLocal(STORAGE_KEYS.savedFilters, newFilters);
    
    if (isSignedIn) {
      debouncedCloudSave('savedFilters', () => cloudStorage.saveSavedFilters(newFilters));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveDailyBiases = useCallback(async (newBiases: DailyBias[]) => {
    setDailyBiases(newBiases);
    await setLocal(STORAGE_KEYS.dailyBiases, newBiases);
    
    if (isSignedIn) {
      debouncedCloudSave('dailyBiases', () => cloudStorage.saveDailyBiases(newBiases));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveQuickJournals = useCallback(async (newJournals: DailyQuickJournal[]) => {
    setQuickJournals(newJournals);
    await setLocal(STORAGE_KEYS.quickJournals, newJournals);
    
    if (isSignedIn) {
      debouncedCloudSave('quickJournals', () => cloudStorage.saveQuickJournals(newJournals));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveRiskRules = useCallback(async (newRules: RiskRules) => {
    setRiskRules(newRules);
    await setLocal(STORAGE_KEYS.riskRules, newRules);
    
    if (isSignedIn) {
      debouncedCloudSave('riskRules', () => cloudStorage.saveRiskRules(newRules));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveJournals = useCallback(async (newJournals: TradeJournal[]) => {
    setJournals(newJournals);
    await setLocal(STORAGE_KEYS.journals, newJournals);
    
    if (isSignedIn) {
      debouncedCloudSave('journals', () => cloudStorage.saveJournals(newJournals));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveWeeklyReviews = useCallback(async (newReviews: WeeklyReview[]) => {
    setWeeklyReviews(newReviews);
    await setLocal(STORAGE_KEYS.weeklyReviews, newReviews);
    
    if (isSignedIn) {
      debouncedCloudSave('weeklyReviews', () => cloudStorage.saveWeeklyReviews(newReviews));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveTodos = useCallback(async (newTodos: Todo[]) => {
    setTodos(newTodos);
    await setLocal(STORAGE_KEYS.todos, newTodos);
    
    if (isSignedIn) {
      debouncedCloudSave('todos', () => cloudStorage.saveTodos(newTodos));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveRuleViolations = useCallback(async (newViolations: RuleViolation[]) => {
    setRuleViolations(newViolations);
    await setLocal(STORAGE_KEYS.ruleViolations, newViolations);
    
    if (isSignedIn) {
      debouncedCloudSave('ruleViolations', () => cloudStorage.saveRuleViolations(newViolations));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleSaveDashboardMetrics = useCallback(async (newMetrics: DashboardMetricId[]) => {
    setDashboardMetrics(newMetrics);
    await setLocal(STORAGE_KEYS.dashboardMetrics, newMetrics);
    
    if (isSignedIn) {
      debouncedCloudSave('dashboardMetrics', () => cloudStorage.saveDashboardMetrics(newMetrics));
    }
  }, [isSignedIn, debouncedCloudSave]);

  const handleClearAllData = useCallback(async () => {
    // Clear local state
    setTrades([]);
    setStrategies([]);
    setVersions([]);
    setCollections([]);
    setSavedFilters([]);
    setDailyBiases([]);
    setQuickJournals([]);
    setRiskRules(null);
    setJournals([]);
    setWeeklyReviews([]);
    setTodos([]);
    setRuleViolations([]);
    setDashboardMetrics(['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']);
    
    // Clear AsyncStorage
    await Promise.all(
      Object.values(STORAGE_KEYS).map(key => AsyncStorage.removeItem(key))
    );
    
    // Clear cloud (if authenticated)
    if (isSignedIn) {
      await cloudStorage.clearAllData();
    }
  }, [isSignedIn]);

  // Refresh from AsyncStorage
  const refresh = useCallback(async () => {
    setTrades(await getLocal(STORAGE_KEYS.trades, []));
    setStrategies(await getLocal(STORAGE_KEYS.strategies, []));
    setVersions(await getLocal(STORAGE_KEYS.versions, []));
    setCollections(await getLocal(STORAGE_KEYS.collections, []));
    setSavedFilters(await getLocal(STORAGE_KEYS.savedFilters, []));
    setDailyBiases(await getLocal(STORAGE_KEYS.dailyBiases, []));
    setQuickJournals(await getLocal(STORAGE_KEYS.quickJournals, []));
    setRiskRules(await getLocal(STORAGE_KEYS.riskRules, null));
    setJournals(await getLocal(STORAGE_KEYS.journals, []));
    setWeeklyReviews(await getLocal(STORAGE_KEYS.weeklyReviews, []));
    setTodos(await getLocal(STORAGE_KEYS.todos, []));
    setRuleViolations(await getLocal(STORAGE_KEYS.ruleViolations, []));
    setDashboardMetrics(await getLocal(STORAGE_KEYS.dashboardMetrics, ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']));
  }, []);

  const value: StorageContextType = {
    // Data
    trades,
    strategies,
    versions,
    collections,
    savedFilters,
    dailyBiases,
    quickJournals,
    riskRules,
    journals,
    weeklyReviews,
    todos,
    ruleViolations,
    dashboardMetrics,

    // Status
    isLoading,
    isSyncing,
    lastSyncTime,
    syncError,
    needsMigration,

    // Actions
    saveTrades: handleSaveTrades,
    saveStrategies: handleSaveStrategies,
    saveVersions: handleSaveVersions,
    saveCollections: handleSaveCollections,
    saveSavedFilters: handleSaveSavedFilters,
    saveDailyBiases: handleSaveDailyBiases,
    saveQuickJournals: handleSaveQuickJournals,
    saveRiskRules: handleSaveRiskRules,
    saveJournals: handleSaveJournals,
    saveWeeklyReviews: handleSaveWeeklyReviews,
    saveTodos: handleSaveTodos,
    saveRuleViolations: handleSaveRuleViolations,
    saveDashboardMetrics: handleSaveDashboardMetrics,

    // Sync
    syncFromCloud,
    migrateLocalToCloud,
    clearAllData: handleClearAllData,
    
    // Refresh
    refresh,
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

// Convenience hooks for specific data
export function useTrades() {
  const { trades, saveTrades, isLoading } = useStorage();
  return { trades, saveTrades, isLoading };
}

export function useStrategies() {
  const { strategies, saveStrategies, versions, saveVersions, isLoading } = useStorage();
  return { strategies, saveStrategies, versions, saveVersions, isLoading };
}

export function useCollections() {
  const { collections, saveCollections, isLoading } = useStorage();
  return { collections, saveCollections, isLoading };
}

export function useDailyBiases() {
  const { dailyBiases, saveDailyBiases, isLoading } = useStorage();
  return { dailyBiases, saveDailyBiases, isLoading };
}

export function useQuickJournals() {
  const { quickJournals, saveQuickJournals, isLoading } = useStorage();
  return { quickJournals, saveQuickJournals, isLoading };
}

export function useRiskRules() {
  const { riskRules, saveRiskRules, isLoading } = useStorage();
  return { riskRules, saveRiskRules, isLoading };
}

export function useTodos() {
  const { todos, saveTodos, isLoading } = useStorage();
  return { todos, saveTodos, isLoading };
}

export function useRuleViolations() {
  const { ruleViolations, saveRuleViolations, isLoading } = useStorage();
  return { ruleViolations, saveRuleViolations, isLoading };
}

export function useSyncStatus() {
  const { isSyncing, lastSyncTime, syncError, needsMigration, syncFromCloud, migrateLocalToCloud } = useStorage();
  return { isSyncing, lastSyncTime, syncError, needsMigration, syncFromCloud, migrateLocalToCloud };
}
