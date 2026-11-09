/**
 * Dashboard Theme Configuration — Single tuning panel for schedule + crossfade
 *
 * Edit this file to change:
 * - Day/Night time slot boundaries (local time)
 * - Crossfade duration and easing
 * - Evaluation cadence
 */

// ---------------------------------------------------------------------------
// Day/Night schedule (local 24-hour time)
// ---------------------------------------------------------------------------

export type TimeSlot = 'sunrise' | 'daytime' | 'sunset' | 'night';

/**
 * Each entry: [startHour, endHour) — endHour exclusive.
 * `night` wraps midnight: 21:00 → 04:00.
 */
export const DAY_NIGHT_SCHEDULE: Record<TimeSlot, [number, number]> = {
  sunrise: [4, 10],
  daytime: [10, 15],
  sunset: [15, 21],
  night: [21, 4], // wraps midnight
};

/**
 * Return the active time slot for a given Date (uses local hours).
 */
export function getActiveTimeSlot(date: Date = new Date()): TimeSlot {
  const hour = date.getHours();

  // Night wraps midnight: 21–04 means hour >= 21 OR hour < 4
  if (hour >= 21 || hour < 4) return 'night';
  if (hour >= 4 && hour < 10) return 'sunrise';
  if (hour >= 10 && hour < 15) return 'daytime';
  // 15–21
  return 'sunset';
}

// ---------------------------------------------------------------------------
// Crossfade
// ---------------------------------------------------------------------------

/** Duration of the background scene crossfade in milliseconds. */
export const CROSSFADE_DURATION_MS = 1400;

/** CSS easing curve for the crossfade transition. */
export const CROSSFADE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ---------------------------------------------------------------------------
// Update cadence
// ---------------------------------------------------------------------------

/** How often (ms) to re-evaluate the current time slot. */
export const UPDATE_CADENCE_MS = 60_000;

// ---------------------------------------------------------------------------
// Theme mode types
// ---------------------------------------------------------------------------

export type DashboardThemeMode = 'default' | 'daynight';

/** localStorage key for the selected dashboard theme mode. */
export const THEME_MODE_STORAGE_KEY = 'trde:dashboard-theme-mode';

/** localStorage key for the selected scene (when mode is 'default'). */
export const SCENE_STORAGE_KEY = 'trde:dashboard-scene';
