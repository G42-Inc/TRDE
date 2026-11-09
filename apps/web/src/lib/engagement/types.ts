/**
 * Engagement System Types
 * 
 * Types for achievements, insights, streaks, preferences,
 * and gamification features.
 */

// ============================================
// ACHIEVEMENT TYPES
// ============================================

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'milestone' | 'streak' | 'skill' | 'special';

export interface AchievementCriteria {
  type: string;
  threshold?: number;
  condition?: string;
  grade?: string;
  ratio?: number;
  losses_before?: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  criteria: AchievementCriteria;
  sortOrder: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  notified: boolean;
  // Joined from achievement_definitions
  achievement?: AchievementDefinition;
}

export interface AchievementWithStatus extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    threshold: number;
    percentage: number;
  };
}

// ============================================
// INSIGHT TYPES
// ============================================

export type InsightType = 'pattern' | 'improvement' | 'warning' | 'tip' | 'celebration';

export interface Insight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  description: string;
  relevance: number; // 0-100
  actionUrl?: string;
  data?: Record<string, unknown>;
  dismissed: boolean;
  generatedAt: string;
  expiresAt?: string;
}

export interface InsightWithMeta extends Insight {
  isNew?: boolean;
  isExpiringSoon?: boolean;
}

// ============================================
// USER ENGAGEMENT STATS
// ============================================

export interface UserEngagementStats {
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalTradesLogged: number;
  totalJournalsWritten: number;
  totalReviewsCompleted: number;
  analyticsViews: number;
  updatedAt: string;
}

export interface StreakUpdateResult {
  newStreak: number;
  streakBroken: boolean;
  isNewRecord: boolean;
}

export interface XpUpdateResult {
  newTotalXp: number;
  newLevel: number;
  levelChanged: boolean;
}

// ============================================
// USER PREFERENCES
// ============================================

export type TradingExperience = 'beginner' | 'intermediate' | 'advanced';

export type PrimaryGoal = 
  | 'track_performance'
  | 'improve_discipline'
  | 'analyze_patterns'
  | 'build_strategies'
  | 'manage_risk';

export interface UserPreferences {
  userId: string;
  tradingExperience: TradingExperience | null;
  assetClasses: string[];
  primaryGoals: string[];
  timezone: string;
  soundEnabled: boolean;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferencesInput {
  tradingExperience?: TradingExperience;
  assetClasses?: string[];
  primaryGoals?: string[];
  timezone?: string;
  soundEnabled?: boolean;
  onboardingCompleted?: boolean;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  userId: string;
  dailyDigest: boolean;
  weeklySummary: boolean;
  achievementNotifications: boolean;
  streakReminders: boolean;
  insightAlerts: boolean;
  marketingEmails: boolean;
  pushEnabled: boolean;
  updatedAt: string;
}

export interface NotificationPreferencesInput {
  dailyDigest?: boolean;
  weeklySummary?: boolean;
  achievementNotifications?: boolean;
  streakReminders?: boolean;
  insightAlerts?: boolean;
  marketingEmails?: boolean;
  pushEnabled?: boolean;
}

// ============================================
// FEEDBACK
// ============================================

export type FeedbackType = 'bug' | 'feature' | 'general' | 'nps';

export interface FeedbackSubmission {
  id: string;
  userId: string | null;
  feedbackType: FeedbackType;
  content: string;
  rating: number | null; // 1-10 for NPS
  context: Record<string, unknown> | null;
  responded: boolean;
  createdAt: string;
}

export interface FeedbackInput {
  feedbackType: FeedbackType;
  content: string;
  rating?: number;
  context?: Record<string, unknown>;
}

// ============================================
// UI CONSTANTS
// ============================================

/**
 * Rarity styling for achievements
 */
export const RARITY_STYLES: Record<AchievementRarity, {
  bg: string;
  bgHover: string;
  border: string;
  text: string;
  glow: string;
  gradient: string;
}> = {
  common: {
    bg: 'bg-zinc-500/10',
    bgHover: 'hover:bg-zinc-500/20',
    border: 'border-zinc-500/30',
    text: 'text-zinc-400',
    glow: '',
    gradient: 'from-zinc-500/20 to-zinc-600/20',
  },
  rare: {
    bg: 'bg-blue-500/10',
    bgHover: 'hover:bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-lg shadow-blue-500/20',
    gradient: 'from-blue-500/20 to-blue-600/20',
  },
  epic: {
    bg: 'bg-purple-500/10',
    bgHover: 'hover:bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-lg shadow-purple-500/30',
    gradient: 'from-purple-500/20 to-purple-600/20',
  },
  legendary: {
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-xl shadow-amber-500/40',
    gradient: 'from-amber-500/20 to-amber-600/20',
  },
};

/**
 * Insight type styling
 */
export const INSIGHT_STYLES: Record<InsightType, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  gradient: string;
}> = {
  pattern: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    gradient: 'from-blue-500/10 to-blue-600/5',
  },
  improvement: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    iconBg: 'bg-green-500/20',
    gradient: 'from-green-500/10 to-green-600/5',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    gradient: 'from-amber-500/10 to-amber-600/5',
  },
  tip: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
    gradient: 'from-purple-500/10 to-purple-600/5',
  },
  celebration: {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    text: 'text-accent',
    iconBg: 'bg-accent/20',
    gradient: 'from-accent/10 to-amber-600/5',
  },
};

/**
 * XP required for each level
 * Level N requires (N-1) * 100 XP
 */
export function getXpForLevel(level: number): number {
  return (level - 1) * 100;
}

/**
 * Calculate level from XP
 */
export function getLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

/**
 * Get XP progress within current level
 */
export function getLevelProgress(xp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
} {
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  
  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp,
    progressPercentage: Math.min(100, (xpInLevel / xpNeeded) * 100),
  };
}
