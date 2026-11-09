'use client';

/**
 * GridBackground — subtle low-contrast grid overlay.
 * Pure CSS, no JS animation. Sits behind hero/feature content.
 */
export function GridBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
  );
}
