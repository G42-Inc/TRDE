'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { NavDropdown } from '@/components/NavDropdown';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeatureCards } from '@/components/landing/FeatureCards';
import dynamic from 'next/dynamic';

const CardSwap = dynamic(() => import('@/components/landing/CardSwap'), { ssr: false });
const SwapCard = dynamic(
  () => import('@/components/landing/CardSwap').then((mod) => ({ default: mod.SwapCard })),
  { ssr: false },
);
const InfiniteMenu = dynamic(() => import('@/components/landing/InfiniteMenu'), { ssr: false });

const GLOBE_ITEMS = [
  { image: 'https://picsum.photos/300/300?grayscale', link: '', title: 'Analytics', description: 'Track your performance' },
  { image: 'https://picsum.photos/400/400?grayscale', link: '', title: 'EDGE', description: 'Backtest strategies' },
  { image: 'https://picsum.photos/500/500?grayscale', link: '', title: 'Journal', description: 'Log every trade' },
  { image: 'https://picsum.photos/600/600?grayscale', link: '', title: 'Risk', description: 'Manage your exposure' },
];

function InfiniteMenuSection() {
  const [loaded, setLoaded] = useState(false);

  return (
    <section className="relative w-full bg-black">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="mb-10 max-w-xl lg:mb-14"
        >
          <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Explore the Platform
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/50 sm:text-lg">
            Drag to navigate. Click to dive in.
          </p>
        </motion.div>
      </div>

      <div style={{ height: 600, position: 'relative' }}>
        {loaded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <InfiniteMenu items={GLOBE_ITEMS} scale={1} />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            {/* Placeholder graphic — rotating ring hint */}
            <div
              className="h-32 w-32 rounded-full border border-white/10"
              style={{
                background: 'radial-gradient(circle, rgba(200,162,74,0.08) 0%, transparent 70%)',
              }}
            />
            <button
              onClick={() => setLoaded(true)}
              className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-medium text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]/40"
              style={{
                background: 'linear-gradient(135deg, rgba(200,162,74,0.2), rgba(200,162,74,0.08))',
                border: '1px solid rgba(200,162,74,0.25)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'all 300ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,162,74,0.25)';
                e.currentTarget.style.border = '1px solid rgba(200,162,74,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                e.currentTarget.style.border = '1px solid rgba(200,162,74,0.25)';
              }}
            >
              Launch Explorer
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
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
            </button>
            <p className="text-xs text-white/30">Interactive 3D experience</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
        className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      >
        <div className="mx-auto max-w-[1240px] px-4 py-1.5 sm:px-6 lg:px-8 lg:py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logos/TRDE_black_transparent_1024x1024.png"
                alt="TRDE Logo"
                width={120}
                height={120}
                className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 transition-transform duration-300"
                priority
                style={{ objectFit: 'contain' }}
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-6">
              <NavDropdown
                label="Product"
                items={[
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Features', href: '#features' },
                  { label: 'EDGE', href: '#features' },
                ]}
              />
              <NavDropdown
                label="Support"
                items={[
                  { label: 'Support', href: '/support?tab=support' },
                  { label: 'FAQ', href: '/support?tab=faq' },
                  { label: 'User Guide', href: '/support?tab=guide' },
                  { label: 'Terms of Service', href: '/support?tab=terms' },
                  { label: 'Privacy Policy', href: '/support?tab=privacy' },
                ]}
              />
              <Link
                href="/sign-in"
                className="relative px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-black group"
              >
                Sign In
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-black transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link
                href="/sign-up"
                className="relative overflow-hidden rounded-xl px-6 py-2.5 text-sm font-semibold text-trde-black backdrop-blur-2xl transition-all duration-300 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]/40 focus-visible:ring-offset-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.03)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  transition: 'all 300ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(200,162,74,0.2), inset 0 1px 0 rgba(255,255,255,0.6)';
                  e.currentTarget.style.border = '1px solid rgba(200,162,74,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.03)';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.4)';
                }}
              >
                Get Started
              </Link>
            </div>

            {/* Mobile nav */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href="/sign-in"
                className="px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:text-black sm:text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="relative overflow-hidden rounded-lg px-3 py-1.5 text-xs font-semibold text-trde-black backdrop-blur-2xl transition-all hover:-translate-y-px sm:text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.4)',
                }}
              >
                Start
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <LandingHero />

      {/* ─── Feature Cards ──────────────────────────────────────── */}
      <FeatureCards />

      {/* ─── Card Swap Showcase ───────────────────────────────── */}
      <section className="relative w-full bg-trde-white py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Left — text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="max-w-md shrink-0 lg:max-w-lg"
            >
              <h2 className="text-3xl font-medium tracking-tight text-trde-black sm:text-4xl lg:text-[2.75rem]">
                See It in Action
              </h2>
              <p className="mt-4 text-base leading-relaxed text-trde-muted sm:text-lg">
                A closer look at the tools that sharpen your edge.
              </p>
              <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-trde-muted">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-trde-gold" />
                  <span>Visualise your performance with real-time analytics across every strategy and instrument.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-trde-gold" />
                  <span>Backtest ideas against historical data with EDGE before risking capital.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-trde-gold" />
                  <span>Log every trade in seconds and let the journal surface patterns you&apos;d otherwise miss.</span>
                </li>
              </ul>
            </motion.div>

            {/* Right — cards */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="relative w-full flex-1"
              style={{ height: 500 }}
            >
              <CardSwap
                cardDistance={60}
                verticalDistance={70}
                delay={2800}
                pauseOnHover
              >
                <SwapCard>
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <h3 className="text-xl font-semibold text-trde-black/80">Analytics Dashboard</h3>
                  </div>
                </SwapCard>
                <SwapCard>
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <h3 className="text-xl font-semibold text-trde-black/80">EDGE Backtester</h3>
                  </div>
                </SwapCard>
                <SwapCard>
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <h3 className="text-xl font-semibold text-trde-black/80">Trade Journal</h3>
                  </div>
                </SwapCard>
              </CardSwap>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Infinite Menu Globe ──────────────────────────────── */}
      <InfiniteMenuSection />

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-[1240px] px-6 py-12 sm:px-8 lg:px-12">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="mb-4 inline-block">
                <Image
                  src="/logos/TRDE_black_transparent_1024x1024.png"
                  alt="TRDE Logo"
                  width={120}
                  height={120}
                  className="h-20 w-20"
                  style={{ objectFit: 'contain' }}
                />
              </Link>
              <p className="text-sm leading-relaxed text-gray-600">
                Professional trading journal for serious traders.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/pricing" className="transition-colors duration-200 hover:text-black">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="transition-colors duration-200 hover:text-black">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="transition-colors duration-200 hover:text-black">
                    EDGE
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">
                Support
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/support" className="transition-colors duration-200 hover:text-black">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support?tab=faq"
                    className="transition-colors duration-200 hover:text-black"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support?tab=guide"
                    className="transition-colors duration-200 hover:text-black"
                  >
                    User Guide
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    href="/support?tab=terms"
                    className="transition-colors duration-200 hover:text-black"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support?tab=privacy"
                    className="transition-colors duration-200 hover:text-black"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-2">
            <p className="text-center text-xs leading-relaxed text-gray-400">
              TRDE is an educational tool. Past performance does not guarantee
              future results. Trading involves risk of loss.
            </p>
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} TRDE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
