import { z } from 'zod';

export const UserPreferencesSchema = z.object({
  tradingExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  assetClasses: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  primaryGoals: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  timezone: z.string().min(1).max(100).refine((timezone) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); return true; }
    catch { return false; }
  }, 'Invalid timezone').optional(),
  soundEnabled: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const NotificationPreferencesSchema = z.object({
  dailyDigest: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  achievementNotifications: z.boolean().optional(),
  streakReminders: z.boolean().optional(),
  insightAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});
