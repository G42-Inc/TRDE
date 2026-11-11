'use client';

/**
 * DashboardSceneProvider
 *
 * Manages the dashboard background scene system:
 * - Two absolutely positioned background layers for crossfade
 * - Day/Night auto-switching based on local time
 * - CSS variable injection for glass tokens and accent colors
 * - Respects prefers-reduced-motion
 *
 * Does NOT change layout or DOM flow. Only adds:
 * - An absolutely positioned background container (z-0)
 * - data-dashboard-scene attribute on the wrapper
 * - CSS custom properties on the wrapper
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getActiveTimeSlot,
  CROSSFADE_DURATION_MS,
  CROSSFADE_EASING,
  UPDATE_CADENCE_MS,
  THEME_MODE_STORAGE_KEY,
  SCENE_STORAGE_KEY,
  type DashboardThemeMode,
  type TimeSlot,
} from '@/lib/dashboard/dashboardThemeConfig';
import {
  getScene,
  deriveAccents,
  isSceneDark,
  type SceneDefinition,
} from '@/lib/dashboard/dashboardScenes';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DashboardSceneContextValue {
  /** Current active scene. */
  scene: SceneDefinition;
  /** Whether the current scene is dark. */
  isDark: boolean;
  /** Current theme mode ('default' | 'daynight'). */
  mode: DashboardThemeMode;
  /** Change the theme mode. */
  setMode: (mode: DashboardThemeMode) => void;
  /** Set a specific scene (only used in 'default' mode). */
  setSceneId: (id: string) => void;
}

const DashboardSceneContext = createContext<DashboardSceneContextValue | null>(null);

export function useDashboardScene() {
  const ctx = useContext(DashboardSceneContext);
  if (!ctx) {
    throw new Error('useDashboardScene must be used within DashboardSceneProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredMode(): DashboardThemeMode {
  if (typeof window === 'undefined') return 'daynight';
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'default' || stored === 'daynight') return stored;
  } catch { /* ignore */ }
  return 'daynight';
}

function getStoredSceneId(): string {
  if (typeof window === 'undefined') return 'default-light';
  try {
    return localStorage.getItem(SCENE_STORAGE_KEY) || 'default-light';
  } catch { /* ignore */ }
  return 'default-light';
}

function getSceneForSlot(slot: TimeSlot): string {
  return slot; // Scene IDs match time slot names
}

function resolveSceneId(mode: DashboardThemeMode): string {
  if (mode === 'daynight') {
    const slot = getActiveTimeSlot();
    return getSceneForSlot(slot);
  }
  // Default mode: use the stored scene directly
  return getStoredSceneId();
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  children: React.ReactNode;
}

export function DashboardSceneProvider({ children }: Props) {
  const { setTheme } = useTheme();
  const [mode, setModeState] = useState<DashboardThemeMode>(() => getStoredMode());
  const [currentSceneId, setCurrentSceneId] = useState<string>(() => resolveSceneId(getStoredMode()));
  const [prevSceneId, setPrevSceneId] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

  const prefersReducedMotion = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Scene transition logic
  const transitionToScene = useCallback((newSceneId: string) => {
    if (newSceneId === currentSceneId) return;

    if (prefersReducedMotion.current) {
      // Instant swap
      setCurrentSceneId(newSceneId);
      setPrevSceneId(null);
      setIsFading(false);
    } else {
      // Crossfade
      setPrevSceneId(currentSceneId);
      setCurrentSceneId(newSceneId);
      setIsFading(true);
      setTimeout(() => {
        setPrevSceneId(null);
        setIsFading(false);
      }, CROSSFADE_DURATION_MS + 50);
    }
  }, [currentSceneId]);

  // Set mode handler
  const setMode = useCallback((newMode: DashboardThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
    } catch { /* ignore */ }
    const newSceneId = resolveSceneId(newMode);
    transitionToScene(newSceneId);
  }, [transitionToScene]);

  // Set specific scene (for 'default' mode)
  const setSceneId = useCallback((id: string) => {
    try {
      localStorage.setItem(SCENE_STORAGE_KEY, id);
    } catch { /* ignore */ }
    transitionToScene(id);
  }, [transitionToScene]);

  // Periodic evaluation (every 60s) + visibility/focus
  useEffect(() => {
    const evaluate = () => {
      const newSceneId = resolveSceneId(mode);
      transitionToScene(newSceneId);
    };

    // Evaluate immediately on mount
    evaluate();

    // Set up interval
    const intervalId = setInterval(evaluate, UPDATE_CADENCE_MS);

    // Visibility change
    const onVisibility = () => {
      if (document.visibilityState === 'visible') evaluate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Focus
    const onFocus = () => evaluate();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [mode, transitionToScene]);

  // Inject CSS variables when scene changes + sync dark/light to <html>
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const scene = getScene(currentSceneId);
    const accents = scene.stops ? deriveAccents(scene.stops) : deriveAccents([]);
    const dark = isSceneDark(scene);

    // Set scene attribute for CSS scoping
    wrapper.setAttribute('data-dashboard-scene', dark ? 'dark' : 'light');

    // Sync dark/light class on <html> so Tailwind dark: variants stay consistent
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(dark ? 'dark' : 'light');
    try {
      localStorage.setItem('trde-theme', dark ? 'dark' : 'light');
    } catch { /* ignore */ }

    // Keep ThemeContext in sync (replaces the old MutationObserver approach)
    setTheme(dark ? 'dark' : 'light');

    // Override the FOUC-script's inline --theme-text* on <html> to match scene
    const root = document.documentElement;
    if (dark) {
      root.style.setProperty('--theme-text', '#f8fafc');
      root.style.setProperty('--theme-text-secondary', '#cbd5e1');
      root.style.setProperty('--theme-text-tertiary', '#94a3b8');
      root.style.setProperty('--theme-success', '#22c55e');
      root.style.setProperty('--theme-warning', '#f97316');
      root.style.setProperty('--theme-error', '#ef4444');
    } else {
      root.style.setProperty('--theme-text', '#0f172a');
      root.style.setProperty('--theme-text-secondary', '#475569');
      root.style.setProperty('--theme-text-tertiary', '#94a3b8');
      root.style.setProperty('--theme-success', '#16a34a');
      root.style.setProperty('--theme-warning', '#ea580c');
      root.style.setProperty('--theme-error', '#dc2626');
    }

    // Inject accent CSS variables
    wrapper.style.setProperty('--dash-accent-primary', accents.accentPrimary);
    wrapper.style.setProperty('--dash-accent-secondary', accents.accentSecondary);
    wrapper.style.setProperty('--dash-focus-ring', accents.focusRing);
    wrapper.style.setProperty('--dash-glass-tint', accents.glassTint);
  }, [currentSceneId, setTheme]);

  const currentScene = getScene(currentSceneId);
  const prevScene = prevSceneId ? getScene(prevSceneId) : null;
  const dark = isSceneDark(currentScene);

  const contextValue = useMemo<DashboardSceneContextValue>(() => ({
    scene: currentScene,
    isDark: dark,
    mode,
    setMode,
    setSceneId,
  }), [currentScene, dark, mode, setMode, setSceneId]);

  return (
    <DashboardSceneContext.Provider value={contextValue}>
      <div
        ref={wrapperRef}
        data-dashboard-scene={dark ? 'dark' : 'light'}
        className="contents"
      >
        {/* Background scene layers — fixed position, z-0 */}
        <div
          aria-hidden="true"
          className="pointer-events-none"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          {/* Previous scene (fading out during crossfade) */}
          {prevScene && isFading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: prevScene.image
                  ? `url(${prevScene.image}) center/cover no-repeat, ${prevScene.gradient}`
                  : prevScene.gradient,
                backgroundSize: 'cover',
                opacity: 0,
                transition: prefersReducedMotion.current
                  ? 'none'
                  : `opacity ${CROSSFADE_DURATION_MS}ms ${CROSSFADE_EASING}`,
              }}
            />
          )}

          {/* Current scene — image with gradient fallback */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: currentScene.image
                ? `url(${currentScene.image}) center/cover no-repeat, ${currentScene.gradient}`
                : currentScene.gradient,
              backgroundSize: 'cover',
              opacity: 1,
              transition: prefersReducedMotion.current
                ? 'none'
                : `opacity ${CROSSFADE_DURATION_MS}ms ${CROSSFADE_EASING}`,
            }}
          />

          {/* Readability overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: dark
                ? `rgba(7, 12, 22, ${Math.max(currentScene.overlayOpacity, 0.64)})`
                : `rgba(255, 255, 255, ${Math.max(currentScene.overlayOpacity, 0.60)})`,
            }}
          />
        </div>

        {children}
      </div>
    </DashboardSceneContext.Provider>
  );
}
