'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { DotIcon } from './DotIcon';

/* ── Tilt spring config ────────────────────────────────────── */
const springConfig = { damping: 30, stiffness: 100, mass: 2 };
const ROTATE_AMPLITUDE = 12;
const SCALE_ON_HOVER = 1.04;

/* ── Feature data ──────────────────────────────────────────── */
interface Feature {
  title: string;
  description: string;
  iconVariant: 'radar' | 'radial' | 'lattice';
  href: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Advanced Analytics',
    description:
      'Deep performance metrics — win rate, expectancy, Sharpe — with interactive charts that reveal what drives your results.',
    iconVariant: 'radar',
    href: '/sign-up',
  },
  {
    title: 'EDGE Backtesting',
    description:
      'Replay historical markets and test strategies against real data before risking capital.',
    iconVariant: 'radial',
    href: '/sign-up',
  },
  {
    title: 'Risk Management',
    description:
      'Automated position tracking, rule enforcement, and discipline scoring to keep your trading consistent.',
    iconVariant: 'lattice',
    href: '/sign-up',
  },
];

const ease = [0.25, 0.1, 0.25, 1.0];

/* ── TiltFeatureCard ───────────────────────────────────────── */
function TiltFeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const rotateX = useSpring(useMotionValue(0), springConfig);
  const rotateY = useSpring(useMotionValue(0), springConfig);
  const scale = useSpring(1, springConfig);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;
      rotateX.set((offsetY / (rect.height / 2)) * -ROTATE_AMPLITUDE);
      rotateY.set((offsetX / (rect.width / 2)) * ROTATE_AMPLITUDE);
    },
    [rotateX, rotateY],
  );

  const handleMouseEnter = useCallback(() => {
    scale.set(SCALE_ON_HOVER);
    if (innerRef.current) {
      innerRef.current.style.boxShadow =
        '0 8px 32px rgba(200,162,74,0.15), inset 0 1.5px 0 rgba(255,255,255,0.65)';
      innerRef.current.style.border = '1px solid rgba(200,162,74,0.25)';
    }
  }, [scale]);

  const handleMouseLeave = useCallback(() => {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    if (innerRef.current) {
      innerRef.current.style.boxShadow =
        '0 4px 24px rgba(0,0,0,0.04), inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.02)';
      innerRef.current.style.border = '1px solid rgba(255,255,255,0.45)';
    }
  }, [scale, rotateX, rotateY]);

  return (
    <motion.div
      key={feature.title}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.12, ease }}
      className="landing-motion group"
      style={{ perspective: 800 }}
    >
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, scale, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={innerRef}
          className="flex h-full flex-col overflow-hidden rounded-[20px] p-8 backdrop-blur-2xl"
          style={{
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
            boxShadow:
              '0 4px 24px rgba(0,0,0,0.04), inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.02)',
            border: '1px solid rgba(255,255,255,0.45)',
            transition: 'box-shadow 300ms ease-out, border 300ms ease-out',
          }}
        >
          {/* Dot icon — centered */}
          <div className="mb-8 flex justify-center text-trde-black">
            <DotIcon variant={feature.iconVariant} size={96} />
          </div>

          {/* Title — left aligned */}
          <h3 className="mb-3 text-xl font-bold tracking-tight text-trde-black text-left">
            {feature.title}
          </h3>

          {/* Description — left aligned */}
          <p className="mb-8 flex-grow text-[15px] leading-relaxed text-trde-muted text-left">
            {feature.description}
          </p>

          {/* Learn more link — left aligned */}
          <Link
            href={feature.href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-trde-black transition-colors duration-200 hover:text-trde-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trde-gold/40 focus-visible:ring-offset-2"
          >
            Learn more
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── FeatureCards section ───────────────────────────────────── */
export function FeatureCards() {
  return (
    <section
      id="features"
      className="relative w-full bg-trde-white pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24 scroll-mt-0"
    >
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
        {/* Section heading — left-aligned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
          className="mb-12 max-w-xl lg:mb-16"
        >
          <h2 className="text-3xl font-medium tracking-tight text-trde-black sm:text-4xl lg:text-[2.75rem]">
            Built for the Disciplined Trader
          </h2>
          <p className="mt-4 text-base leading-relaxed text-trde-muted sm:text-lg">
            Log every trade, analyze what works, and sharpen your edge.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <TiltFeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="mt-12 flex items-center justify-center gap-5 sm:mt-14"
        >
          <span
            className="text-2xl font-medium tracking-tight text-trde-black sm:text-3xl"
            style={{ textShadow: '0 0 20px rgba(200,162,74,0.25)' }}
          >
            Find your Edge
          </span>
          <Link
            href="/sign-up"
            className="group relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]/40 focus-visible:ring-offset-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.1))',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.03)',
              border: '1px solid rgba(255,255,255,0.45)',
              transition: 'all 300ms ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,162,74,0.22), inset 0 1.5px 0 rgba(255,255,255,0.65)';
              e.currentTarget.style.border = '1px solid rgba(200,162,74,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.03)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.45)';
            }}
            aria-label="Get started"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              className="text-trde-black transition-transform duration-300 ease-out group-hover:translate-x-0.5"
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
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
