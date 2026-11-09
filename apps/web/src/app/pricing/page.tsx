'use client';

/**
 * Premium Pricing Page
 * 
 * Conversion-optimized pricing with luxury design
 */

import { Suspense, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckIcon, SparklesIcon, BoltIcon, RocketLaunchIcon, ArrowRightIcon, StarIcon } from '@heroicons/react/24/solid';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { PlanTier } from '@/lib/entitlements/types';
import { UserMenu } from '@/components/UserMenu';

interface PricingTier {
  name: string;
  tagline: string;
  plan: PlanTier;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  exclusive?: boolean;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  gradient: string;
}

const tiers: PricingTier[] = [
  {
    name: 'Basic',
    tagline: 'Essential Tools',
    plan: 'basic',
    price: '9',
    period: 'month',
    description: 'Perfect for getting started with professional trade analytics',
    features: [
      'Unlimited trade logging',
      'Real-time analytics dashboard',
      'Performance metrics & insights',
      'Risk management suite',
      'Strategy tracking & optimization',
      'Export & reporting tools',
    ],
    cta: 'Get Started',
    icon: SparklesIcon,
    accentColor: 'from-blue-500 to-cyan-500',
    gradient: 'from-white to-blue-50/30',
  },
  {
    name: 'Edge',
    tagline: 'Most Popular',
    plan: 'edge',
    price: '14',
    period: 'month',
    description: 'Unlock advanced backtesting & market simulation',
    features: [
      'Everything in Basic',
      'EDGE backtesting simulator',
      'Historical market replay',
      'Advanced scenario analysis',
      'Custom backtest periods',
      'Strategy comparison tools',
      'Priority email support',
    ],
    cta: 'Get Started',
    popular: true,
    badge: 'BEST VALUE',
    icon: BoltIcon,
    accentColor: 'from-amber-400 to-orange-500',
    gradient: 'from-amber-50 to-orange-50',
  },
  {
    name: 'Pro',
    tagline: 'Premium Experience',
    plan: 'pro',
    price: '19',
    period: 'month',
    description: 'Complete trading mastery with mobile access',
    features: [
      'Everything in Edge',
      'Native mobile app access',
      'Cross-device sync',
      'Priority 24/7 support',
      'Early feature access',
      'Advanced API integrations',
      'Custom branding options',
      'Dedicated account manager',
    ],
    cta: 'Get Started',
    exclusive: true,
    badge: 'PREMIUM',
    icon: RocketLaunchIcon,
    accentColor: 'from-purple-500 to-pink-500',
    gradient: 'from-purple-50 to-pink-50',
  },
];


function PricingPageContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredCard, setHoveredCard] = useState<PlanTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<PlanTier | null>(null);
  const locked = searchParams.get('locked') === 'true';
  const upgrade = searchParams.get('upgrade') as PlanTier | null;
  const checkoutCanceled = searchParams.get('checkout') === 'canceled';
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.9]);
  const headerBlur = useTransform(scrollY, [0, 100], [0, 10]);

  // Auto-redirect users with PAID entitlements (not demo)
  useEffect(() => {
    if (!isLoaded || !user) return;
    
    // Don't redirect if user explicitly came to upgrade or was locked out
    if (upgrade || locked) return;

    // Check access via unified API
    fetch('/api/auth/check-access?plan=basic', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        // Only redirect if user has PAID access (not demo)
        // Demo users should be able to view pricing to upgrade
        if (data.hasAccess && data.entitlement?.status !== 'demo') {
          router.push('/app');
        }
      })
      .catch((error) => {
        // Silently fail - user can stay on pricing page
        console.log('Pricing page: Access check failed (non-critical):', error.message);
      });
  }, [isLoaded, user, router, upgrade, locked]);

  const handleSelectPlan = async (plan: PlanTier) => {
    if (!user) {
      router.push(`/sign-in?redirect_url=/pricing`);
      return;
    }

    setIsProcessing(plan);
    
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.redirectToPortal && data.currentPlan) {
        setCheckoutError(`You already have an active ${data.currentPlan} subscription. Manage it in Settings.`);
        setTimeout(() => setCheckoutError(null), 5000);
        setIsProcessing(null);
      } else {
        const errorMessage = data.error || 'Failed to create checkout session. Please try again.';
        setCheckoutError(errorMessage);
        setTimeout(() => setCheckoutError(null), 5000);
        setIsProcessing(null);
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      setCheckoutError('Network error. Please check your connection.');
      setTimeout(() => setCheckoutError(null), 5000);
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 font-sans relative no-theme-overrides">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Floating header */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-lg shadow-black/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <Link href="/" className="flex items-center group">
            <Image 
              src="/logos/TRDE_black_transparent_1024x1024.png" 
              alt="TRDE" 
              width={120} 
              height={120}
              className="h-16 w-16 md:h-20 md:w-20 group-hover:scale-105 transition-transform duration-300"
              style={{ objectFit: 'contain' }}
            />
          </Link>
          <nav className="flex items-center space-x-6">
            <Link 
              href="/#features" 
              className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              Features
            </Link>
            <Link 
              href="/pricing" 
              className="text-gray-900 text-sm font-semibold"
            >
              Pricing
            </Link>
            <UserMenu />
          </nav>
        </div>
      </motion.header>

      <main className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-7xl font-black mb-6"
            >
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Invest in Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Trading Success
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
            >
              Professional trading analytics and backtesting tools to help you master your trading strategies
            </motion.p>
          </div>

          {/* Alert messages */}
          {(locked || upgrade || checkoutCanceled || checkoutError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-12"
            >
              {locked && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl shadow-lg shadow-red-100/50">
                  <p className="text-red-800 font-semibold text-center">
                    ⚡ Choose a plan to unlock full access
                  </p>
                </div>
              )}
              {upgrade && (
                <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl shadow-lg shadow-blue-100/50">
                  <p className="text-blue-900 font-semibold text-center">
                    Upgrade to unlock advanced features
                  </p>
                </div>
              )}
              {checkoutCanceled && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-lg shadow-amber-100/50">
                  <p className="text-amber-800 font-semibold text-center">
                    Ready when you are! Your checkout is waiting
                  </p>
                </div>
              )}
              {checkoutError && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl shadow-lg shadow-red-100/50">
                  <p className="text-red-800 font-semibold text-center">{checkoutError}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Pricing cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              const isHovered = hoveredCard === tier.plan;
              const isPopular = tier.popular;
              const isExclusive = tier.exclusive;

              return (
                <motion.div
                  key={tier.plan}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="relative"
                  onMouseEnter={() => setHoveredCard(tier.plan)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Card */}
                  <motion.div
                    animate={{
                      scale: isHovered ? 1.02 : 1,
                      y: isHovered ? -8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`
                      relative h-full rounded-3xl overflow-hidden
                      ${isPopular || isExclusive ? 'bg-gradient-to-br ' + tier.gradient : 'bg-white'}
                      ${isPopular ? 'ring-2 ring-amber-400 shadow-2xl shadow-amber-500/20' : ''}
                      ${isExclusive ? 'ring-2 ring-purple-400 shadow-2xl shadow-purple-500/20' : ''}
                      ${!isPopular && !isExclusive ? 'border border-gray-200 shadow-xl' : ''}
                    `}
                  >
                    {/* Badge */}
                    {tier.badge && (
                      <div className="absolute top-0 right-0 m-6">
                        <div className={`
                          px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                          ${isPopular ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : ''}
                          ${isExclusive ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}
                          shadow-lg
                        `}>
                          {tier.badge}
                        </div>
                      </div>
                    )}

                    <div className="p-8 lg:p-10">
                      {/* Icon */}
                      <div className={`
                        inline-flex p-4 rounded-2xl bg-gradient-to-br ${tier.accentColor}
                        shadow-lg mb-6
                      `}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Header */}
                      <div className="mb-6">
                        <h3 className="text-3xl font-bold text-gray-900 mb-1">
                          {tier.name}
                        </h3>
                        <p className={`
                          text-sm font-semibold uppercase tracking-wider
                          ${isPopular || isExclusive ? 'text-gray-700' : 'text-gray-500'}
                        `}>
                          {tier.tagline}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-gray-900">
                            ${tier.price}
                          </span>
                          <span className="text-gray-500 font-medium">
                            /{tier.period}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-3 leading-relaxed">
                          {tier.description}
                        </p>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => handleSelectPlan(tier.plan)}
                        disabled={isProcessing !== null}
                        className={`
                          w-full py-4 px-6 rounded-2xl font-bold text-base
                          transition-all duration-300 shadow-lg
                          flex items-center justify-center gap-2
                          ${isProcessing === tier.plan ? 'opacity-50 cursor-not-allowed' : ''}
                          ${isPopular || isExclusive 
                            ? `bg-gradient-to-r ${tier.accentColor} hover:shadow-2xl hover:scale-[1.02]`
                            : 'bg-gray-900 hover:bg-gray-800 hover:shadow-xl'
                          }
                        `}
                        style={{ color: '#ffffff' }}
                      >
                        {isProcessing === tier.plan ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {tier.cta}
                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      {/* Features */}
                      <ul className="mt-8 space-y-4">
                        {tier.features.map((feature, i) => (
                          <motion.li
                            key={feature}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * i }}
                            className="flex items-start gap-3 text-gray-700"
                          >
                            <CheckIcon className={`
                              w-6 h-6 flex-shrink-0 mt-0.5
                              ${isPopular || isExclusive ? 'text-gray-900' : 'text-blue-600'}
                            `} />
                            <span className="font-medium">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ teaser */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-24 text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Have questions?
            </h2>
            <p className="text-gray-600 mb-8">
              We&apos;re here to help. Contact our team anytime.
            </p>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 rounded-2xl font-semibold hover:bg-gray-800 transition-colors shadow-lg"
              style={{ color: '#ffffff' }}
            >
              Get Support
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Legal */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              By purchasing, you agree to our{' '}
              <Link href="/support?tab=terms" className="text-gray-700 hover:text-gray-900 underline font-medium">
                Terms & Conditions
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Loading…</div>}>
      <PricingPageContent />
    </Suspense>
  );
}
