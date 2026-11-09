'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { GridBackground } from './GridBackground';
import dynamic from 'next/dynamic';

const DitherCandlestick = dynamic(() => import('./DitherCandlestick'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050505]" />,
});

const ease = [0.25, 0.1, 0.25, 1.0];

export function LandingHero() {
  return (
    <section className="relative min-h-screen w-full overflow-clip bg-[#050505]">
      {/* Dither candlestick background */}
      <div className="absolute inset-0 z-0">
        <DitherCandlestick enableMouseInteraction />
      </div>

      {/* Soft overlay for text readability — fades from left */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(to right, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.6) 40%, rgba(5,5,5,0.2) 70%, transparent 100%)',
        }}
      />

      {/* Gold light leaks — ambient atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{ opacity: 0.6 }}
      >
        <div
          className="absolute"
          style={{
            top: '-10%',
            right: '-5%',
            width: '55%',
            height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(200,162,74,0.25) 0%, rgba(200,162,74,0.08) 40%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'leakDrift1 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-8%',
            left: '-8%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(200,162,74,0.2) 0%, rgba(200,162,74,0.06) 45%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'leakDrift2 15s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content — left/center-left safe zone; pass pointer events through to canvas */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-screen max-w-[1240px] items-center px-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-2xl pt-32 pb-24 lg:pt-[128px] lg:pb-32">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
            className="landing-motion text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[3.75rem]"
          >
            Precision Tools for{' '}
            <br className="hidden sm:block" />
            Serious Traders
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26, ease }}
            className="landing-motion mt-6 max-w-lg text-lg leading-relaxed text-white/60 sm:text-xl"
          >
            Analytics-first trading journal. Log trades, backtest strategies,
            and track performance — all in one place.
          </motion.p>

          {/* CTA group */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            className="landing-motion mt-12 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6"
          >
            {/* Primary CTA */}
            <Link
              href="/sign-up"
              className="pointer-events-auto group relative inline-flex h-[56px] items-center justify-center gap-2.5 overflow-hidden rounded-full px-10 text-[15px] font-medium tracking-wide text-white backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]/40 focus-visible:ring-offset-2"
              style={{
                background: 'linear-gradient(135deg, rgba(200,162,74,0.25), rgba(200,162,74,0.1), rgba(255,255,255,0.05))',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)',
                border: '1px solid rgba(200,162,74,0.3)',
                transition: 'all 500ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,162,74,0.35), inset 0 1.5px 0 rgba(255,255,255,0.15)';
                e.currentTarget.style.border = '1px solid rgba(200,162,74,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)';
                e.currentTarget.style.border = '1px solid rgba(200,162,74,0.3)';
              }}
            >
              <span>Find your Edge</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10m0 0L9 4m4 4L9 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="absolute inset-x-6 -bottom-px h-px bg-gradient-to-r from-transparent via-trde-gold/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden="true"
              />
            </Link>

            {/* Secondary — pill outline style */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('features');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="pointer-events-auto group inline-flex h-[56px] items-center justify-center gap-2 overflow-hidden rounded-full px-8 text-[15px] font-medium tracking-wide text-white/80 backdrop-blur-2xl transition-all duration-400 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trde-gold/40 focus-visible:ring-offset-2"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1.5px 0 rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all 400ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(200,162,74,0.2), inset 0 1.5px 0 rgba(255,255,255,0.1)';
                e.currentTarget.style.border = '1px solid rgba(200,162,74,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2), inset 0 1.5px 0 rgba(255,255,255,0.08)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
              }}
            >
              <span>Explore features</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform duration-300 ease-out group-hover:translate-y-0.5"
                aria-hidden="true"
              >
                <path
                  d="M8 3v10m0 0l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
