import {
  generateStrategies,
  generateTrades,
  generateCollections,
  generateDailyBiases,
  generateRiskRules,
  generateJournals,
  buildSavedFilters,
} from '@trde/mock-db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTrades,
  saveTrades,
  getStrategies,
  saveStrategies,
  getVersions,
  saveVersions,
  getCollections,
  saveCollections,
  getDailyBiases,
  saveDailyBiases,
  getRiskRules,
  saveRiskRules,
  getJournals,
  saveJournals,
  getSavedFilters,
  saveSavedFilters,
} from './storage';

// __DEV__ is a React Native/Expo global that is true in development mode
declare const __DEV__: boolean;

export async function initializeData() {
  // CRITICAL: Only seed data in development mode
  // In production, users should start with empty data
  if (!__DEV__) {
    return;
  }

  // Check if data already exists
  const existingTrades = await getTrades();
  if (existingTrades.length > 0) {
    return; // Data already initialized
  }

  // Generate seed data
  const { strategies, versions } = generateStrategies();
  const trades = generateTrades(strategies, versions, 300);
  const collections = generateCollections(trades);
  const biases = generateDailyBiases(trades);
  const rules = generateRiskRules();
  const journals = generateJournals(trades);
  const savedFilters = buildSavedFilters();

  // Save to AsyncStorage
  await saveStrategies(strategies);
  await saveVersions(versions);
  await saveTrades(trades);
  await saveCollections(collections);
  await saveDailyBiases(biases);
  await saveRiskRules(rules);
  await saveJournals(journals);
  await saveSavedFilters(savedFilters);
}

export async function resetData() {
  const keys = [
    'trde_trades',
    'trde_strategies',
    'trde_versions',
    'trde_collections',
    'trde_saved_filters',
    'trde_daily_biases',
    'trde_quick_journals',
    'trde_risk_rules',
    'trde_journals',
    'trde_weekly_reviews',
  ];
  
  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));

  // Reinitialize
  await initializeData();
}
