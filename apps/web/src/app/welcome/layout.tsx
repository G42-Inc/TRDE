'use client';

import { useEffect, useRef } from 'react';

/**
 * Welcome/Onboarding Layout
 * 
 * Full-screen luxury onboarding with the same looping video background
 * as the landing hero, white overlay "breath" at loop point,
 * and gold light leaks for atmospheric depth.
 * 
 * NOTE: No StorageProvider here - onboarding doesn't need user data.
 */

/* ── Video paths (same as LandingHero) ────────────────────────── */
const VIDEO_WEBM = '/video/trde-hero.webm';
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
  const rafRef = useRef<number>(0);

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  // Video loop breath effect — identical to LandingHero
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const leaks = leaksRef.current;
    if (!video || !overlay) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const startLoop = () => {
      if (mq.matches) {
        video.pause();
        return;
      }

      video.play().catch(() => {});

      const poll = () => {
        if (!video.duration || video.paused) {
          rafRef.current = requestAnimationFrame(poll);
          return;
        }

        const remaining = video.duration - video.currentTime;

        // Ramp overlay up near loop point + intensify light leaks
        if (!breathingRef.current && remaining <= BREATH_START) {
          overlay.style.transition = `opacity ${BREATH_START * 1000}ms ease-in`;
          overlay.style.opacity = String(OVERLAY_PEAK);
          if (leaks) {
            leaks.style.transition = `opacity ${BREATH_START * 1000}ms ease-in`;
            leaks.style.opacity = '1';
          }
          breathingRef.current = true;
        }

        // After loop resets, hold briefly then fade back
        if (breathingRef.current && video.currentTime < 1.0 && video.currentTime > 0.05) {
          setTimeout(() => {
            overlay.style.transition = `opacity ${BREATH_FADE}ms ease-out`;
            overlay.style.opacity = String(OVERLAY_REST);
            if (leaks) {
              leaks.style.transition = `opacity ${BREATH_FADE}ms ease-out`;
              leaks.style.opacity = '0.8';
            }
            breathingRef.current = false;
          }, BREATH_HOLD);
        }

        rafRef.current = requestAnimationFrame(poll);
      };

      rafRef.current = requestAnimationFrame(poll);
    };

    const handleMotionChange = () => {
      cancelAnimationFrame(rafRef.current);
      if (mq.matches) {
        video.pause();
      } else {
        startLoop();
      }
    };

    startLoop();
    mq.addEventListener('change', handleMotionChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      mq.removeEventListener('change', handleMotionChange);
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
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={VIDEO_POSTER}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={VIDEO_WEBM} type="video/webm" />
          <source src={VIDEO_MP4} type="video/mp4" />
        </video>

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

      {/* ── Poster fallback for reduced-motion ────────────────── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${VIDEO_POSTER})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0,
        }}
        aria-hidden="true"
      />
      
      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
