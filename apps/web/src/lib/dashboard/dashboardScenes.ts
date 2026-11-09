/**
 * Dashboard Scene Definitions — Single tuning panel for scene visuals
 *
 * Edit this file to change:
 * - Gradient stops and CSS gradient strings
 * - Glass intensity per scene
 * - Overlay opacity per scene
 * - Accent derivation logic
 *
 * Asset Ingestion Contract
 * ========================
 * When providing custom assets, place them in:
 *   apps/web/public/scenes/
 *
 * Supported formats (in order of preference):
 * 1. JSON gradient definition:
 *    {
 *      "id": "sunrise",
 *      "gradient": "linear-gradient(135deg, #fde68a 0%, #f97316 50%, #0ea5e9 100%)",
 *      "stops": ["#fde68a", "#f97316", "#0ea5e9"],
 *      "glassIntensity": 0.85,
 *      "overlayOpacity": 0.1
 *    }
 *
 * 2. CSS gradient string (inline in this file)
 *
 * 3. PNG/JPG background image fallback:
 *    apps/web/public/scenes/sunrise.png
 *    Referenced as: image: '/scenes/sunrise.png'
 *
 * Expected folder structure:
 *   apps/web/public/scenes/
 *     sunrise.json   (or .png)
 *     daytime.json
 *     sunset.json
 *     night.json
 *     light.json
 *     dark.json
 */

// ---------------------------------------------------------------------------
// Scene type
// ---------------------------------------------------------------------------

export interface SceneDefinition {
  id: string;
  name: string;
  /** CSS gradient string for the background. */
  gradient: string;
  /** Hex color stops extracted from the gradient (for accent derivation). */
  stops?: string[];
  /** Optional background image path (relative to /public). */
  image?: string;
  /** How intense the glass blur/saturation should be (0–1). Default 0.85. */
  glassIntensity: number;
  /** Overlay opacity added on top of the scene for readability (0–1). Default 0.05. */
  overlayOpacity: number;
}

// ---------------------------------------------------------------------------
// Scene definitions — backed by actual image assets in /public/scenes/
//
// Each scene has:
// - gradient: CSS gradient fallback (shown while image loads or if image fails)
// - image: path to the background image in /public/scenes/
// - stops: dominant hex colors sampled from the image (for accent derivation)
// - glassIntensity / overlayOpacity: tuning knobs for readability
// ---------------------------------------------------------------------------

export const scenes: Record<string, SceneDefinition> = {
  // ── Default scenes ──────────────────────────────────────────────────────

  'default-light': {
    id: 'default-light',
    name: 'Default Light',
    gradient: 'linear-gradient(145deg, #d8d8d8 0%, #e8e8e8 40%, #f0f0f0 100%)',
    image: '/scenes/default-light.jpg',
    stops: ['#d8d8d8', '#e8e8e8', '#f0f0f0'],
    glassIntensity: 0.82,
    overlayOpacity: 0.02,
  },
  'default-dark': {
    id: 'default-dark',
    name: 'Default Dark',
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 40%, #2a2a2a 100%)',
    image: '/scenes/default-dark.jpg',
    stops: ['#0a0a0a', '#1a1a1a', '#3a3a3a'],
    glassIntensity: 0.78,
    overlayOpacity: 0.03,
  },

  // ── Day/Night pack (auto-switches on schedule) ──────────────────────────

  sunrise: {
    id: 'sunrise',
    name: 'Sunrise',
    gradient: 'linear-gradient(135deg, #7dd3d4 0%, #f0f4ef 35%, #e8c55a 70%, #c9a03e 100%)',
    image: '/scenes/sunrise.jpg',
    stops: ['#7dd3d4', '#f0f4ef', '#e8c55a', '#c9a03e'],
    glassIntensity: 0.85,
    overlayOpacity: 0.04,
  },
  daytime: {
    id: 'daytime',
    name: 'Daytime',
    gradient: 'linear-gradient(160deg, #6bb8e8 0%, #4fa3d8 30%, #3d8ec8 60%, #89c9f0 100%)',
    image: '/scenes/daytime.jpg',
    stops: ['#6bb8e8', '#4fa3d8', '#3d8ec8', '#89c9f0'],
    glassIntensity: 0.85,
    overlayOpacity: 0.04,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    gradient: 'linear-gradient(135deg, #e85020 0%, #d44020 25%, #c83898 50%, #7838b8 75%, #281858 100%)',
    image: '/scenes/sunset.jpg',
    stops: ['#e85020', '#d44020', '#c83898', '#7838b8', '#281858'],
    glassIntensity: 0.88,
    overlayOpacity: 0.06,
  },
  night: {
    id: 'night',
    name: 'Night',
    gradient: 'linear-gradient(160deg, #020810 0%, #0a1a3a 30%, #1848a0 60%, #051020 100%)',
    image: '/scenes/night.jpg',
    stops: ['#020810', '#0a1a3a', '#1848a0', '#5088cc'],
    glassIntensity: 0.75,
    overlayOpacity: 0.04,
  },

  // ── Additional theme scenes (user-selectable) ───────────────────────────

  blue: {
    id: 'blue',
    name: 'Blue',
    gradient: 'linear-gradient(135deg, #1a3a78 0%, #2858b0 30%, #4080d8 60%, #6aa8f0 100%)',
    image: '/scenes/blue.jpg',
    stops: ['#1a3a78', '#2858b0', '#4080d8', '#6aa8f0'],
    glassIntensity: 0.85,
    overlayOpacity: 0.05,
  },
  'light-blue': {
    id: 'light-blue',
    name: 'Light Blue',
    gradient: 'linear-gradient(180deg, #88ccf8 0%, #68b8f0 40%, #a0d8ff 80%, #e8f4ff 100%)',
    image: '/scenes/light-blue.jpg',
    stops: ['#88ccf8', '#68b8f0', '#a0d8ff', '#e8f4ff'],
    glassIntensity: 0.82,
    overlayOpacity: 0.03,
  },
  green: {
    id: 'green',
    name: 'Green',
    gradient: 'linear-gradient(135deg, #1a4828 0%, #286838 30%, #389850 60%, #60c870 100%)',
    image: '/scenes/green.jpg',
    stops: ['#1a4828', '#286838', '#389850', '#60c870'],
    glassIntensity: 0.85,
    overlayOpacity: 0.05,
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    gradient: 'linear-gradient(135deg, #2a1058 0%, #481888 30%, #6828b8 60%, #9848e0 100%)',
    image: '/scenes/purple.jpg',
    stops: ['#2a1058', '#481888', '#6828b8', '#9848e0'],
    glassIntensity: 0.85,
    overlayOpacity: 0.05,
  },
  peach: {
    id: 'peach',
    name: 'Peach',
    gradient: 'linear-gradient(135deg, #e8a888 0%, #f0c0a0 30%, #f8d8c0 60%, #f0e0d8 100%)',
    image: '/scenes/peach.jpg',
    stops: ['#e8a888', '#f0c0a0', '#f8d8c0', '#f0e0d8'],
    glassIntensity: 0.82,
    overlayOpacity: 0.03,
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    gradient: 'linear-gradient(90deg, #d88020 0%, #c87018 30%, #483810 60%, #282008 100%)',
    image: '/scenes/yellow.jpg',
    stops: ['#d88020', '#c87018', '#a86018', '#483810'],
    glassIntensity: 0.80,
    overlayOpacity: 0.06,
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow',
    gradient: 'linear-gradient(135deg, #f0e8e0 0%, #e87080 25%, #88b0d0 50%, #c8d8e8 100%)',
    image: '/scenes/rainbow.jpg',
    stops: ['#f0e8e0', '#e87080', '#d06848', '#88b0d0'],
    glassIntensity: 0.82,
    overlayOpacity: 0.04,
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy',
    gradient: 'linear-gradient(160deg, #080818 0%, #102048 30%, #283880 60%, #102040 100%)',
    image: '/scenes/galaxy.jpg',
    stops: ['#080818', '#102048', '#283880', '#4060a0'],
    glassIntensity: 0.78,
    overlayOpacity: 0.05,
  },
};

// ---------------------------------------------------------------------------
// Accent derivation from gradient stops
// ---------------------------------------------------------------------------

/**
 * Parse a hex color to RGB.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Convert RGB to HSL.
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s, l };
}

/**
 * Convert HSL to hex.
 */
function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Check if a color is near-gray (low saturation).
 */
function isNearGray(s: number): boolean {
  return s < 0.12;
}

/**
 * Clamp luminance for usability. Light-mode text needs darker accents.
 */
function clampLuminance(h: number, s: number, l: number, min: number, max: number): string {
  const clamped = Math.max(min, Math.min(max, l));
  return hslToHex(h, s, clamped);
}

export interface DerivedAccents {
  accentPrimary: string;
  accentSecondary: string;
  focusRing: string;
  glassTint: string;
}

/**
 * Derive accent colors from gradient stops.
 * Picks the most and second-most saturated stops (excluding near-grays),
 * then clamps luminance for readability.
 */
export function deriveAccents(stops: string[]): DerivedAccents {
  // Neutral fallback
  const neutral: DerivedAccents = {
    accentPrimary: '#C9A962',
    accentSecondary: '#A68B4B',
    focusRing: 'rgba(201, 169, 98, 0.4)',
    glassTint: 'rgba(201, 169, 98, 0.08)',
  };

  if (!stops || stops.length === 0) return neutral;

  // Score each stop by saturation
  const scored = stops.map((hex) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hex, ...hsl };
  });

  // Filter out near-grays
  const chromatic = scored.filter((c) => !isNearGray(c.s));
  if (chromatic.length === 0) return neutral;

  // Sort by saturation descending
  chromatic.sort((a, b) => b.s - a.s);

  const primary = chromatic[0];
  const secondary = chromatic.length > 1 ? chromatic[1] : primary;

  const accentPrimary = clampLuminance(primary.h, primary.s, primary.l, 0.3, 0.6);
  const accentSecondary = clampLuminance(secondary.h, secondary.s, secondary.l, 0.35, 0.65);

  const pRgb = hexToRgb(accentPrimary);

  return {
    accentPrimary,
    accentSecondary,
    focusRing: `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.4)`,
    glassTint: `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.08)`,
  };
}

/**
 * Get the scene for a given scene ID.
 * Falls back to default-light if not found.
 */
export function getScene(id: string): SceneDefinition {
  return scenes[id] || scenes['default-light'];
}

/**
 * Determine if a scene is "dark".
 * Always returns true — the dashboard uses dark-tinted glass cards,
 * so white text is needed regardless of the scene's gradient brightness.
 */
export function isSceneDark(_scene: SceneDefinition): boolean {
  return true;
}
