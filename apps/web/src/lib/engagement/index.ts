/**
 * Engagement System
 * 
 * Exports all types and utilities for the gamification,
 * achievements, insights, and engagement tracking system.
 */

// Types
export * from './types';

// Re-export commonly used types for convenience
export type {
  AchievementDefinition,
  AchievementWithStatus,
  AchievementRarity,
  AchievementCategory,
  AchievementCriteria,
  UserAchievement,
  Insight,
  InsightType,
  InsightWithMeta,
  UserEngagementStats,
  StreakUpdateResult,
  XpUpdateResult,
  UserPreferences,
  UserPreferencesInput,
  TradingExperience,
  PrimaryGoal,
  NotificationPreferences,
  NotificationPreferencesInput,
  FeedbackSubmission,
  FeedbackInput,
  FeedbackType,
} from './types';

// UI utilities
export {
  RARITY_STYLES,
  INSIGHT_STYLES,
  getXpForLevel,
  getLevelFromXp,
  getLevelProgress,
} from './types';
