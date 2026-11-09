/**
 * Library Index
 * 
 * Centralized exports for utility libraries
 */

// Performance Utilities
export {
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
  chunkArray,
  processBatch,
  memoize,
  hashObject,
  shallowEqual,
  formatBytes,
  perf,
} from './performance';

// Sound System
export { soundManager, playSound, setSoundEnabled, setSoundVolume } from './sounds';

// Demo Mode
export {
  generateSampleTrades,
  generateSampleStrategies,
  generateSampleJournals,
  calculateSampleStats,
  checkDemoStatus,
  createDemoBlockedResponse,
  DEMO_RESTRICTIONS,
} from './demo';

// Engagement Types & Utilities
export {
  RARITY_STYLES,
  INSIGHT_STYLES,
  getXpForLevel,
  getLevelFromXp,
  getLevelProgress,
} from './engagement';

export type {
  AchievementRarity,
  AchievementCategory,
  InsightType,
  AchievementDefinition,
  UserAchievement,
  UserEngagementStats,
  Insight,
  UserPreferences,
  NotificationPreferences,
  FeedbackSubmission,
} from './engagement';
