'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
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
import * as cloudStorage from '@/lib/storage.db';
import { detectViolationsFromTrade } from '@/lib/violations';

// User-scoped storage key generator
// SECURITY: All user data keys MUST include the userId to prevent data leakage between accounts
const getStorageKey = (userId: string, key: string) => `trde_${userId}_${key}`;

// Legacy keys (non-user-scoped) - only for migration detection
const LEGACY_STORAGE_KEYS = {
  trades: 'trde_trades',
  migrationComplete: 'trde_migration_complete',
};

// Current user ID stored to detect user changes
const CURRENT_USER_KEY = 'trde_current_user';

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
  saveTrades: (trades: Trade[]) => Promise<{ newViolations: RuleViolation[]; updatedViolations: RuleViolation[] }>;
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
  refresh: () => void;
}

// Export context for components that need to check if provider exists
export const StorageContext = createContext<StorageContextType | null>(null);

// Helper functions to read/write local storage (user-scoped)
function getLocal<T>(userId: string | null, key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !userId) return defaultValue;
  try {
    const scopedKey = getStorageKey(userId, key);
    const data = localStorage.getItem(scopedKey);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setLocal<T>(userId: string | null, key: string, value: T): void {
  if (typeof window === 'undefined' || !userId) return;
  const scopedKey = getStorageKey(userId, key);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(value));
  } catch {
    // Browser cache quota (especially image attachments) must not turn a
    // successful cloud write into a reported failure.
    console.warn(`Unable to cache ${key} on this device.`);
  }
}

// Clear all user data from localStorage
function clearUserLocalStorage(userId: string): void {
  if (typeof window === 'undefined') return;
  const keysToRemove = [
    'trades', 'strategies', 'versions', 'collections', 'savedFilters',
    'dailyBiases', 'quickJournals', 'riskRules', 'journals', 'weeklyReviews',
    'todos', 'ruleViolations', 'dashboardMetrics', 'lastSync'
  ];
  keysToRemove.forEach(key => {
    localStorage.removeItem(getStorageKey(userId, key));
  });
}

// Check and handle user change
function handleUserChange(newUserId: string): boolean {
  if (typeof window === 'undefined') return false;
  const previousUserId = localStorage.getItem(CURRENT_USER_KEY);
  
  if (previousUserId && previousUserId !== newUserId) {
    // User has changed - clear previous user's cached data for security
    console.log('[StorageContext] User changed, clearing previous user cache');
    clearUserLocalStorage(previousUserId);
  }
  
  localStorage.setItem(CURRENT_USER_KEY, newUserId);
  return previousUserId !== newUserId;
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  
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
  
  // Ignore responses belonging to a previous account, or reads started before a trade save.
  const activeUserRef = useRef(user?.id);
  activeUserRef.current = user?.id;
  const tradeRevisionRef = useRef(0);
  const tradeSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Refs for debouncing saves
  const dataWriteQueues = useRef<Record<string, Promise<void>>>({});
  const dataRevisions = useRef<Record<string, number>>({});
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Load from local storage ONLY after we know the user
  // SECURITY: Never load localStorage before user is known to prevent data leakage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoaded) return; // Wait for Clerk to load
    
    const userId = user?.id;
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    setSyncError(null);

    if (!userId) {
      // No user logged in - clear all state and show empty
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
      setLastSyncTime(null);
      setNeedsMigration(false);
      setIsLoading(false);
      return;
    }
    
    // Handle user change (clears previous user's data if different)
    handleUserChange(userId);
    
    // Load user-scoped data from localStorage
    setTrades(getLocal(userId, 'trades', []));
    setStrategies(getLocal(userId, 'strategies', []));
    setVersions(getLocal(userId, 'versions', []));
    setCollections(getLocal(userId, 'collections', []));
    setSavedFilters(getLocal(userId, 'savedFilters', []));
    setDailyBiases(getLocal(userId, 'dailyBiases', []));
    setQuickJournals(getLocal(userId, 'quickJournals', []));
    setRiskRules(getLocal(userId, 'riskRules', null));
    setJournals(getLocal(userId, 'journals', []));
    setWeeklyReviews(getLocal(userId, 'weeklyReviews', []));
    setTodos(getLocal(userId, 'todos', []));
    setRuleViolations(getLocal(userId, 'ruleViolations', []));
    setDashboardMetrics(getLocal(userId, 'dashboardMetrics', ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']));
    setLastSyncTime(getLocal(userId, 'lastSync', null));
    
    // Check if legacy migration is needed (old non-user-scoped data exists)
    const legacyMigrationComplete = localStorage.getItem(LEGACY_STORAGE_KEYS.migrationComplete);
    const hasLegacyData = localStorage.getItem(LEGACY_STORAGE_KEYS.trades);
    setNeedsMigration(!legacyMigrationComplete && !!hasLegacyData);
    
    setIsLoading(false);
  }, [isLoaded, user?.id]);

  // Sync from cloud when user is authenticated
  useEffect(() => {
    if (!isLoaded || !user || isLoading) return;
    
    // Auto-migrate localStorage data to cloud if needed (only once)
    if (needsMigration) {
      console.log('[StorageContext] Auto-migrating localStorage data to cloud...');
      migrateLocalToCloud();
      return;
    }
    
    // Auto-sync from cloud on initial load
    syncFromCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, isLoading, needsMigration]);

  // Debounced cloud save helper
  const debouncedCloudSave = useCallback((key: string, saveFn: () => Promise<void>) => {
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
    if (!user) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const userId = user.id;
      const tradeRevision = tradeRevisionRef.current;
      const readRevisions = { ...dataRevisions.current };
      const syncItem = async <T,>(key: string, load: () => Promise<T>, apply: (value: T) => void) => {
        const value = await load();
        if (activeUserRef.current !== userId) return;
        if (key === 'trades' && tradeRevisionRef.current !== tradeRevision) return;
        if ((dataRevisions.current[key] ?? 0) !== (readRevisions[key] ?? 0)) return;
        apply(value);
        setLocal(userId, key, value);
      };
      // A missing optional table must not hide a successful trade read. A failed
      // read preserves its cache; a successful empty read clears that cache.
      const jobs = [
        ['trades', () => syncItem('trades', cloudStorage.getTrades, setTrades)],
        ['strategies', () => syncItem('strategies', cloudStorage.getStrategies, setStrategies)],
        ['versions', () => syncItem('versions', cloudStorage.getVersions, setVersions)],
        ['collections', () => syncItem('collections', cloudStorage.getCollections, setCollections)],
        ['dailyBiases', () => syncItem('dailyBiases', cloudStorage.getDailyBiases, setDailyBiases)],
        ['quickJournals', () => syncItem('quickJournals', cloudStorage.getQuickJournals, setQuickJournals)],
        ['savedFilters', () => syncItem('savedFilters', cloudStorage.getSavedFilters, setSavedFilters)],
        ['riskRules', () => syncItem('riskRules', cloudStorage.getRiskRules, setRiskRules)],
        ['journals', () => syncItem('journals', cloudStorage.getJournals, setJournals)],
        ['weeklyReviews', () => syncItem('weeklyReviews', cloudStorage.getWeeklyReviews, setWeeklyReviews)],
        ['todos', () => syncItem('todos', cloudStorage.getTodos, setTodos)],
        ['ruleViolations', () => syncItem('ruleViolations', cloudStorage.getRuleViolations, setRuleViolations)],
        ['dashboardMetrics', () => syncItem('dashboardMetrics', cloudStorage.getDashboardMetrics, setDashboardMetrics)],
      ] as const;
      const results = await Promise.allSettled(jobs.map(([, run]) => run()));
      if (activeUserRef.current !== userId) return;
      const failures = results.flatMap((result, index) => result.status === 'rejected' ? [jobs[index][0]] : []);
      if (failures.length) {
        setSyncError(`Unable to load ${failures.join(', ')}. Your cached data has been preserved.`);
      } else {
        const syncTime = Date.now();
        setLastSyncTime(syncTime);
        setLocal(userId, 'lastSync', syncTime);
      }

    } catch (error: any) {
      console.error('Error syncing from cloud:', error);
      setSyncError(error.message || 'Failed to sync from cloud');
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Auto-sync when window gains focus (tab becomes visible)
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        console.log('[StorageContext] Tab visible, syncing from cloud...');
        syncFromCloud();
      }
    };
    
    const handleWindowFocus = () => {
      if (!isSyncing) {
        console.log('[StorageContext] Window focused, syncing from cloud...');
        syncFromCloud();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isLoaded, user, isSyncing, syncFromCloud]);

  // Migrate local data to cloud
  const migrateLocalToCloud = useCallback(async () => {
    if (!user) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Get ALL legacy (non-user-scoped) local data for migration
      const getLegacy = <T,>(key: string, defaultValue: T): T => {
        try {
          const data = localStorage.getItem(`trde_${key}`);
          return data ? JSON.parse(data) : defaultValue;
        } catch {
          return defaultValue;
        }
      };
      
      const localTrades = getLegacy<Trade[]>('trades', []);
      const localStrategies = getLegacy<Strategy[]>('strategies', []);
      const localVersions = getLegacy<StrategyVersion[]>('versions', []);
      const localCollections = getLegacy<Collection[]>('collections', []);
      const localDailyBiases = getLegacy<DailyBias[]>('daily_biases', []);
      const localQuickJournals = getLegacy<DailyQuickJournal[]>('quick_journals', []);
      const localJournals = getLegacy<TradeJournal[]>('journals', []);
      const localWeeklyReviews = getLegacy<WeeklyReview[]>('weekly_reviews', []);
      const localTodos = getLegacy<Todo[]>('todos', []);
      
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
      
      // Call migration API with ALL data types
      const response = await fetch('/api/data/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: {
            trades: localTrades,
            strategies: localStrategies,
            versions: localVersions,
            collections: localCollections,
            dailyBiases: localDailyBiases,
            quickJournals: localQuickJournals,
            journals: localJournals,
            weeklyReviews: localWeeklyReviews,
            todos: localTodos,
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Migration failed: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[Migration] Result:', result);
      
      if (result.success) {
        setNeedsMigration(false);
        localStorage.setItem(LEGACY_STORAGE_KEYS.migrationComplete, 'true');
        
        // Refresh from cloud after migration
        await syncFromCloud();
      } else {
        throw new Error('Migration returned unsuccessful');
      }
    } catch (error: any) {
      console.error('Error migrating to cloud:', error);
      setSyncError(error.message || 'Failed to migrate data');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [user, syncFromCloud]);

  // Save functions with local + cloud sync
  const handleSaveTrades = useCallback(async (newTrades: Trade[]) => {
    const userId = user?.id;
    if (!userId) throw new Error('Please sign in to save your trade.');
    const deletedIds = trades.filter(trade => !newTrades.some(next => next.id === trade.id)).map(trade => trade.id);
    tradeRevisionRef.current += 1;
    const pendingSave = tradeSaveQueueRef.current.catch(() => undefined).then(() => {
      if (activeUserRef.current !== userId) throw new Error('Your account changed. Please try again.');
      return cloudStorage.saveTrades(newTrades, deletedIds);
    });
    tradeSaveQueueRef.current = pendingSave;
    try {
      await pendingSave;
    } catch (error) {
      setSyncError('Trade was not saved to the cloud. Please try again.');
      throw error;
    } finally {
      tradeRevisionRef.current += 1;
    }
    if (activeUserRef.current !== userId) throw new Error('Your account changed. Please refresh.');
    setSyncError(null);
    setTrades(newTrades);
    setLocal(userId, 'trades', newTrades);

    // Handle violations
    const existingViolations = ruleViolations;
    const violationsByTradeId = new Map(existingViolations.map(v => [v.tradeId, v]));
    
    const updatedViolations: RuleViolation[] = [];
    const newViolations: RuleViolation[] = [];
    
    for (const trade of newTrades) {
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
      } else if (existingViolation && existingViolation.reviewed) {
        updatedViolations.push(existingViolation);
      }
    }
    
    const allTradeIds = new Set(newTrades.map(t => t.id));
    const reviewedViolationsForRemovedTrades = existingViolations.filter(
      v => !allTradeIds.has(v.tradeId) && v.reviewed
    );
    
    const finalViolations = [
      ...updatedViolations,
      ...newViolations,
      ...reviewedViolationsForRemovedTrades,
    ];
    
    setRuleViolations(finalViolations);
    setLocal(userId, 'ruleViolations', finalViolations);
    
    return { newViolations, updatedViolations };
  }, [user, ruleViolations, trades]);

  // A successful Save means the owned cloud write completed, not just a queued timer.
  const persistUserData = useCallback(async <T,>(key: string, value: T, write: (value: T) => Promise<void>, apply: (value: T) => void) => {
    const userId = user?.id;
    if (!userId) throw new Error('Please sign in to save your data.');
    const revision = (dataRevisions.current[key] ?? 0) + 1;
    dataRevisions.current[key] = revision;
    const pending = (dataWriteQueues.current[key] ?? Promise.resolve()).catch(() => {}).then(() => {
      if (activeUserRef.current !== userId) throw new Error('Account changed before saving. Please retry.');
      return write(value);
    });
    dataWriteQueues.current[key] = pending;
    try { await pending; } catch (error) {
      if (activeUserRef.current === userId) setSyncError('Changes were not saved. Please try again.');
      throw error;
    }
    if (activeUserRef.current !== userId || dataRevisions.current[key] !== revision) return;
    dataRevisions.current[key] += 1;
    setSyncError(null);
    apply(value);
    setLocal(userId, key, value);
  }, [user]);

  const handleSaveStrategies = useCallback(async (value: Strategy[]) => {
    await persistUserData('strategies', value, cloudStorage.saveStrategies, setStrategies);
  }, [persistUserData]);

  const handleSaveVersions = useCallback(async (value: StrategyVersion[]) => {
    await persistUserData('versions', value, cloudStorage.saveVersions, setVersions);
  }, [persistUserData]);

  const handleSaveCollections = useCallback(async (value: Collection[]) => {
    await persistUserData('collections', value, cloudStorage.saveCollections, setCollections);
  }, [persistUserData]);

  const handleSaveSavedFilters = useCallback(async (value: SavedFilter[]) => {
    await persistUserData('savedFilters', value, cloudStorage.saveSavedFilters, setSavedFilters);
  }, [persistUserData]);

  const handleSaveDailyBiases = useCallback(async (value: DailyBias[]) => {
    await persistUserData('dailyBiases', value, cloudStorage.saveDailyBiases, setDailyBiases);
  }, [persistUserData]);

  const handleSaveQuickJournals = useCallback(async (value: DailyQuickJournal[]) => {
    await persistUserData('quickJournals', value, cloudStorage.saveQuickJournals, setQuickJournals);
  }, [persistUserData]);

  const handleSaveRiskRules = useCallback(async (value: RiskRules) => {
    await persistUserData('riskRules', value, cloudStorage.saveRiskRules, setRiskRules);
  }, [persistUserData]);

  const handleSaveJournals = useCallback(async (value: TradeJournal[]) => {
    await persistUserData('journals', value, cloudStorage.saveJournals, setJournals);
  }, [persistUserData]);

  const handleSaveWeeklyReviews = useCallback(async (value: WeeklyReview[]) => {
    await persistUserData('weeklyReviews', value, cloudStorage.saveWeeklyReviews, setWeeklyReviews);
  }, [persistUserData]);

  const handleSaveTodos = useCallback(async (value: Todo[]) => {
    const deletedIds = todos.filter((todo) => !value.some((next) => next.id === todo.id)).map((todo) => todo.id);
    await persistUserData('todos', value, (next) => cloudStorage.saveTodos(next, deletedIds), setTodos);
  }, [persistUserData, todos]);

  const handleSaveRuleViolations = useCallback(async (value: RuleViolation[]) => {
    await persistUserData('ruleViolations', value, cloudStorage.saveRuleViolations, setRuleViolations);
  }, [persistUserData]);

  const handleSaveDashboardMetrics = useCallback(async (value: DashboardMetricId[]) => {
    await persistUserData('dashboardMetrics', value, cloudStorage.saveDashboardMetrics, setDashboardMetrics);
  }, [persistUserData]);

  const handleClearAllData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) throw new Error('Please sign in to delete journal data.');
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    await Promise.allSettled([tradeSaveQueueRef.current, ...Object.values(dataWriteQueues.current)]);
    if (activeUserRef.current !== userId) throw new Error('Account changed. Please retry.');
    try { await cloudStorage.clearAllData(); } catch (error) {
      setSyncError('Deletion did not complete. Refresh to check your data before retrying.');
      throw error;
    }
    if (activeUserRef.current !== userId) return;
    tradeRevisionRef.current += 1;
    for (const key of ['strategies', 'versions', 'collections', 'savedFilters', 'dailyBiases', 'quickJournals', 'riskRules', 'journals', 'weeklyReviews', 'todos', 'ruleViolations', 'dashboardMetrics']) {
      dataRevisions.current[key] = (dataRevisions.current[key] ?? 0) + 1;
    }
    clearUserLocalStorage(userId);
    setTrades([]); setStrategies([]); setVersions([]); setCollections([]); setSavedFilters([]);
    setDailyBiases([]); setQuickJournals([]); setRiskRules(null); setJournals([]);
    setWeeklyReviews([]); setTodos([]); setRuleViolations([]);
    setDashboardMetrics(['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']);
    setSyncError(null);
  }, [user]);

  // Refresh from localStorage (for when other tabs update)
  const refresh = useCallback(() => {
    const userId = user?.id || null;
    if (!userId) return;
    
    setTrades(getLocal(userId, 'trades', []));
    setStrategies(getLocal(userId, 'strategies', []));
    setVersions(getLocal(userId, 'versions', []));
    setCollections(getLocal(userId, 'collections', []));
    setSavedFilters(getLocal(userId, 'savedFilters', []));
    setDailyBiases(getLocal(userId, 'dailyBiases', []));
    setQuickJournals(getLocal(userId, 'quickJournals', []));
    setRiskRules(getLocal(userId, 'riskRules', null));
    setJournals(getLocal(userId, 'journals', []));
    setWeeklyReviews(getLocal(userId, 'weeklyReviews', []));
    setTodos(getLocal(userId, 'todos', []));
    setRuleViolations(getLocal(userId, 'ruleViolations', []));
    setDashboardMetrics(getLocal(userId, 'dashboardMetrics', ['totalPnLUsd', 'winRate', 'profitFactor', 'mistakeTaxUsd']));
  }, [user?.id]);

  const value: StorageContextType = useMemo(() => ({
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
  }), [
    // Data
    trades, strategies, versions, collections, savedFilters, dailyBiases,
    quickJournals, riskRules, journals, weeklyReviews, todos, ruleViolations, dashboardMetrics,
    // Status
    isLoading, isSyncing, lastSyncTime, syncError, needsMigration,
    // Actions (all useCallback-wrapped, stable references)
    handleSaveTrades, handleSaveStrategies, handleSaveVersions, handleSaveCollections,
    handleSaveSavedFilters, handleSaveDailyBiases, handleSaveQuickJournals, handleSaveRiskRules,
    handleSaveJournals, handleSaveWeeklyReviews, handleSaveTodos, handleSaveRuleViolations,
    handleSaveDashboardMetrics, syncFromCloud, migrateLocalToCloud, handleClearAllData, refresh,
  ]);

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
