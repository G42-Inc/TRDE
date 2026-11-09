/**
 * Hooks Index
 * 
 * Centralized exports for all custom hooks
 */

// Authentication & Demo
export { useDemoStatus } from './useDemoStatus';

// Engagement & Gamification
export { useAchievements } from './useAchievements';
export { useInsights } from './useInsights';

// User Preferences
export { useUserPreferences, getPersonalizedContent } from './useUserPreferences';

// Payment & Checkout
export { useCheckout } from './useCheckout';
export { useEntitlementPolling } from './useEntitlementPolling';

// UI & UX
export { useOnboardingFlow } from './useOnboardingFlow';
export { useKeyboardShortcuts, ALL_SHORTCUTS } from './useKeyboardShortcuts';
export { useOfflineStatus } from './useOfflineStatus';
export { useIntersectionObserver, useInfiniteScroll } from './useIntersectionObserver';

// Feedback & Notifications
export { useFeedback } from './useFeedback';
export { usePushNotifications, showLocalNotification } from './usePushNotifications';
