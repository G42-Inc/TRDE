'use client';

import { useEffect, useRef } from 'react';

/**
 * Welcome/Onboarding Layout
 * 
 * Full-screen luxury onboarding with a looping video background,
 * white overlay "breath" at loop point,
 * and gold light leaks for atmospheric depth.
 * 
 * NOTE: No StorageProvider here - onboarding doesn't need user data.
 */

/* ── Existing optimized background media ─────────────────────── */
const VIDEO_MP4 = '/video/trde-hero.mp4';
const VIDEO_POSTER = '/video/trde-hero-poster.jpg';

/* ── Breath loop constants ────────────────────────────────────── */
const BREATH_START = 0.7;
const BREATH_HOLD = 550;
const BREATH_FADE = 600;
const OVERLAY_REST = 0.65;
const OVERLAY_PEAK = 0.96;

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const leaksRef = useRef<HTMLDivElement>(null);
  const breathingRef = useRef(false);
  const breathTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  // Native time updates are sufficient for the loop transition; avoid a
  // continuous animation-frame poll while this decorative video is playing.
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const leaks = leaksRef.current;
    if (!video || !overlay) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resetBreath = () => {
      if (breathTimeoutRef.current) clearTimeout(breathTimeoutRef.current);
      breathTimeoutRef.current = null;
      breathingRef.current = false;
      overlay.style.opacity = String(OVERLAY_REST);
      if (leaks) leaks.style.opacity = '0.8';
    };
    const syncPlayback = () => {
      if (mq.matches || document.hidden) {
        video.pause();
        resetBreath();
      } else {
        video.play().catch(() => {});
      }
    };
    const handleTimeUpdate = () => {
      if (video.paused || !Number.isFinite(video.duration)) return;
      const remaining = video.duration - video.currentTime;
      if (!breathingRef.current && remaining <= BREATH_START) {
        overlay.style.transition = `opacity ${BREATH_START * 1000}ms ease-in`;
        overlay.style.opacity = String(OVERLAY_PEAK);
        if (leaks) {
          leaks.style.transition = `opacity ${BREATH_START * 1000}ms ease-in`;
          leaks.style.opacity = '1';
        }
        breathingRef.current = true;
      }
      if (breathingRef.current && video.currentTime < 1 && video.currentTime > 0.05) {
        breathingRef.current = false;
        breathTimeoutRef.current = setTimeout(() => {
          overlay.style.transition = `opacity ${BREATH_FADE}ms ease-out`;
          overlay.style.opacity = String(OVERLAY_REST);
          if (leaks) {
            leaks.style.transition = `opacity ${BREATH_FADE}ms ease-out`;
            leaks.style.opacity = '0.8';
          }
          breathTimeoutRef.current = null;
        }, BREATH_HOLD);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    document.addEventListener('visibilitychange', syncPlayback);
    mq.addEventListener('change', syncPlayback);
    syncPlayback();
    return () => {
      video.pause();
      resetBreath();
      video.removeEventListener('timeupdate', handleTimeUpdate);
      document.removeEventListener('visibilitychange', syncPlayback);
      mq.removeEventListener('change', syncPlayback);
    };
  }, []);

  return (
    <div 
      className="min-h-screen overflow-hidden"
      style={{ 
        fontFamily: "'Inter', sans-serif",
        overscrollBehavior: 'none',
        background: '#fafaf8',
      }}
    >
      {/* ── Video background ──────────────────────────────────── */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          src={VIDEO_MP4}
          poster={VIDEO_POSTER}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* White overlay — pulses at loop point to mask stutter */}
        <div
          ref={overlayRef}
          className="absolute inset-0"
          style={{
            backgroundColor: 'white',
            opacity: OVERLAY_REST,
          }}
        />
      </div>

      {/* ── Gold light leaks — intensify during breath ────────── */}
      <div
        ref={leaksRef}
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{ opacity: 0.8 }}
      >
        {/* Top-right warm leak */}
        <div
          className="absolute"
          style={{
            top: '-10%',
            right: '-5%',
            width: '55%',
            height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(200,162,74,0.4) 0%, rgba(200,162,74,0.15) 40%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'leakDrift1 12s ease-in-out infinite',
          }}
        />
        {/* Bottom-left subtle leak */}
        <div
          className="absolute"
          style={{
            bottom: '-8%',
            left: '-8%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(200,162,74,0.3) 0%, rgba(200,162,74,0.1) 45%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'leakDrift2 15s ease-in-out infinite',
          }}
        />
        {/* Center-right accent */}
        <div
          className="absolute"
          style={{
            top: '30%',
            right: '10%',
            width: '30%',
            height: '35%',
            background: 'radial-gradient(ellipse at center, rgba(200,162,74,0.25) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'leakDrift3 18s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
