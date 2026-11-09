'use client';

/** Round to 4 decimal places — prevents server/client hydration mismatch from
 *  floating-point differences between Node.js and browser engines. */
const r = (n: number) => Math.round(n * 10000) / 10000;

type DotIconVariant = 'radar' | 'radial' | 'lattice';

interface DotIconProps {
  variant: DotIconVariant;
  className?: string;
  size?: number;
}

/**
 * DotIcon — animated abstract dot icons with per-dot animations.
 *
 * - radar  → burst outward from center (analytics)
 * - radial → floating particle drift like Apple Watch (EDGE)
 * - lattice → diagonal dot flow top-left → bottom-right (risk)
 *
 * Each individual dot is animated independently.
 * Disabled under prefers-reduced-motion via globals.css.
 */
export function DotIcon({ variant, className = '', size = 64 }: DotIconProps) {
  return (
    <div className={`dot-icon-animated ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        {variant === 'radar' && <BurstDots />}
        {variant === 'radial' && <FloatingDots />}
        {variant === 'lattice' && <FlowDots />}
      </svg>
    </div>
  );
}

/* ─── Analytics: Burst outward from center ──────────────────────── */

function BurstDots() {
  const cx = 32;
  const cy = 32;
  const rings = [
    { radius: 0, count: 1, dotR: 2.4 },
    { radius: 12, count: 8, dotR: 1.8 },
    { radius: 21, count: 12, dotR: 1.4 },
    { radius: 29, count: 16, dotR: 1.0 },
  ];

  return (
    <g fill="currentColor">
      {/* Center dot — gentle pulse only */}
      <circle cx={cx} cy={cy} r={2.4} opacity={0.95}>
        <animate
          attributeName="r"
          values="2.4;2.8;2.4"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.95;1;0.95"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Outer rings — burst outward then return */}
      {rings.slice(1).map((ring, ri) =>
        Array.from({ length: ring.count }).map((_, i) => {
          const angle = (2 * Math.PI * i) / ring.count;
          const finalX = r(cx + ring.radius * Math.cos(angle));
          const finalY = r(cy + ring.radius * Math.sin(angle));
          // Dots burst from ~40% of their final distance to full, then back
          const startX = r(cx + ring.radius * 0.4 * Math.cos(angle));
          const startY = r(cy + ring.radius * 0.4 * Math.sin(angle));
          const overshootX = r(cx + ring.radius * 1.06 * Math.cos(angle));
          const overshootY = r(cy + ring.radius * 1.06 * Math.sin(angle));
          // Stagger: outer rings are slower and delayed
          const dur = 3.5 + ri * 0.8;
          const delay = ri * 0.4 + (i / ring.count) * 0.3;
          const opacity = 0.9 - ri * 0.15;

          return (
            <circle
              key={`${ri}-${i}`}
              cx={finalX}
              cy={finalY}
              r={ring.dotR}
              opacity={opacity}
            >
              <animate
                attributeName="cx"
                values={`${startX};${overshootX};${finalX};${startX}`}
                dur={`${dur}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.33 0 0.67 1;0.33 0 0.67 1;0.33 0 0.67 1"
              />
              <animate
                attributeName="cy"
                values={`${startY};${overshootY};${finalY};${startY}`}
                dur={`${dur}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.33 0 0.67 1;0.33 0 0.67 1;0.33 0 0.67 1"
              />
              <animate
                attributeName="opacity"
                values={`0.15;${r(opacity)};${r(opacity * 0.8)};0.15`}
                dur={`${dur}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })
      )}
    </g>
  );
}

/* ─── EDGE: Floating particle drift (Apple Watch style) ─────────── */

function FloatingDots() {
  // Deterministic "random" positions and drift parameters
  const particles: {
    x: number; y: number; r: number;
    driftX: number; driftY: number; dur: number; delay: number;
  }[] = [];

  // Seed values for deterministic layout
  const seed = [
    0.15, 0.82, 0.37, 0.59, 0.73, 0.21, 0.94, 0.48, 0.62, 0.06,
    0.41, 0.68, 0.12, 0.86, 0.55, 0.33, 0.79, 0.44, 0.91, 0.24,
    0.57, 0.88, 0.35, 0.64, 0.76, 0.11, 0.97, 0.42, 0.18, 0.69,
  ];

  for (let i = 0; i < 30; i++) {
    const s1 = seed[i];
    const s2 = seed[(i + 3) % 30];
    const s3 = seed[(i + 7) % 30];
    const s4 = seed[(i + 11) % 30];
    const s5 = seed[(i + 17) % 30];

    // Position within a roughly circular field
    const angle = s1 * 2 * Math.PI;
    const dist = r(Math.sqrt(s2) * 26);
    const x = r(32 + dist * Math.cos(angle));
    const y = r(32 + dist * Math.sin(angle));

    if (x < 3 || x > 61 || y < 3 || y > 61) continue;

    // Closer to center = larger dots
    const normalizedDist = dist / 26;
    const dotR = r(2.0 - normalizedDist * 1.2);

    // Each dot drifts in a unique elliptical path
    const driftX = r((s3 - 0.5) * 6);  // -3 to +3 px drift
    const driftY = r((s4 - 0.5) * 6);
    const dur = r(1.0 + s5 * 1.2);     // 1.0-2.2s per cycle (snappy)
    const delay = r(s1 * 0.8);         // tight stagger

    particles.push({ x, y, r: Math.max(dotR, 0.5), driftX, driftY, dur, delay });
  }

  return (
    <g fill="currentColor">
      {particles.map((p, i) => {
        const x1 = p.x;
        const y1 = p.y;
        const x2 = r(p.x + p.driftX);
        const y2 = r(p.y + p.driftY);
        const x3 = r(p.x - p.driftX * 0.5);
        const y3 = r(p.y - p.driftY * 0.5);

        return (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={0.7}>
            <animate
              attributeName="cx"
              values={`${x1};${x2};${x3};${x1}`}
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"
            />
            <animate
              attributeName="cy"
              values={`${y1};${y2};${y3};${y1}`}
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"
            />
            <animate
              attributeName="opacity"
              values="0.5;0.85;0.6;0.5"
              dur={`${r(p.dur * 0.7)}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}

/* ─── Risk: Diagonal dot flow (top-left → bottom-right) ────────── */

function FlowDots() {
  // 4 diagonal streams, each with dots flowing from top-left to bottom-right
  const streams = [
    { startX: -4, startY: -4, endX: 68, endY: 68, count: 8, dotR: 1.5, opacity: 0.85 },  // main
    { startX: 8, startY: -8, endX: 72, endY: 56, count: 7, dotR: 1.2, opacity: 0.6 },    // right of main
    { startX: -8, startY: 8, endX: 56, endY: 72, count: 7, dotR: 1.2, opacity: 0.6 },    // left of main
    { startX: 16, startY: -12, endX: 76, endY: 48, count: 5, dotR: 0.9, opacity: 0.4 },  // far right
    { startX: -12, startY: 16, endX: 48, endY: 76, count: 5, dotR: 0.9, opacity: 0.4 },  // far left
  ];

  const dur = 4; // seconds for full traversal

  return (
    <g fill="currentColor">
      <clipPath id="flow-clip">
        <rect x="0" y="0" width="64" height="64" rx="4" />
      </clipPath>
      <g clipPath="url(#flow-clip)">
        {streams.map((stream, si) =>
          Array.from({ length: stream.count }).map((_, i) => {
            const delay = (i / stream.count) * dur + si * 0.3;
            const streamDur = dur + si * 0.4;

            return (
              <circle
                key={`${si}-${i}`}
                cx={stream.startX}
                cy={stream.startY}
                r={stream.dotR}
                opacity={0}
              >
                <animate
                  attributeName="cx"
                  values={`${stream.startX};${stream.endX}`}
                  dur={`${streamDur}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${stream.startY};${stream.endY}`}
                  dur={`${streamDur}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
                {/* Fade in at start, visible in middle, fade out at end */}
                <animate
                  attributeName="opacity"
                  values={`0;${stream.opacity};${stream.opacity};0`}
                  keyTimes="0;0.15;0.85;1"
                  dur={`${streamDur}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })
        )}
      </g>
    </g>
  );
}
