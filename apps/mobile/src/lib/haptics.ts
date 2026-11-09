import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utilities for the app
 * Provides consistent haptic feedback across the application
 */

// Check if we're on a platform that supports haptics
const supportsHaptics = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for selections, tab changes, toggles
 */
export const lightHaptic = () => {
  if (supportsHaptics) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Medium haptic feedback - for successful actions (save, confirm)
 */
export const mediumHaptic = () => {
  if (supportsHaptics) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Heavy haptic feedback - for important/warning actions
 */
export const heavyHaptic = () => {
  if (supportsHaptics) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Success notification haptic - for task completion
 */
export const successHaptic = () => {
  if (supportsHaptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Warning notification haptic - for alerts, caution
 */
export const warningHaptic = () => {
  if (supportsHaptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Error notification haptic - for failures, destructive actions
 */
export const errorHaptic = () => {
  if (supportsHaptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Selection haptic - subtle feedback for list item selection
 */
export const selectionHaptic = () => {
  if (supportsHaptics) {
    Haptics.selectionAsync();
  }
};

// Export all as an object for convenience
export const haptics = {
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,
  success: successHaptic,
  warning: warningHaptic,
  error: errorHaptic,
  selection: selectionHaptic,
};

export default haptics;
