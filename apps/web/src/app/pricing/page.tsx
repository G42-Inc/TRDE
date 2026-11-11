import type { ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckIcon, SparklesIcon, BoltIcon, RocketLaunchIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import type { PlanTier } from '@/lib/entitlements/types';
import { UserMenu } from '@/components/UserMenu';
import { PricingCheckout, PricingPlanButton } from './pricing-checkout';

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
  icon: ComponentType<{ className?: string }>;
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
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 font-sans relative no-theme-overrides">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Floating header */}
      <header
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
      </header>

      <main className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-black mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Invest in Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Trading Success
              </span>
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Professional trading analytics and backtesting tools to help you master your trading strategies
            </p>
          </div>

          <PricingCheckout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {tiers.map((tier) => <PricingCard key={tier.plan} tier={tier} />)}
            </div>
          </PricingCheckout>

          {/* FAQ teaser */}
          <div className="mt-24 text-center">
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
          </div>

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

function PricingCard({ tier }: { tier: PricingTier }) {
  const { icon: Icon, popular, exclusive } = tier;
  const highlighted = popular || exclusive;

  return (
    <article className={`
      relative h-full overflow-hidden rounded-3xl p-8 lg:p-10
      motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-2 motion-safe:hover:scale-[1.02]
      ${highlighted ? `bg-gradient-to-br ${tier.gradient}` : 'border border-gray-200 bg-white shadow-xl'}
      ${popular ? 'ring-2 ring-amber-400 shadow-2xl shadow-amber-500/20' : ''}
      ${exclusive ? 'ring-2 ring-purple-400 shadow-2xl shadow-purple-500/20' : ''}
    `}>
      {tier.badge && (
        <span className={`
          absolute right-0 top-0 m-6 rounded-full bg-gradient-to-r px-4 py-1.5
          text-xs font-bold uppercase tracking-wider text-white shadow-lg ${tier.accentColor}
        `}>
          {tier.badge}
        </span>
      )}

      <div className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br p-4 shadow-lg ${tier.accentColor}`}>
        <Icon className="h-8 w-8 text-white" />
      </div>

      <div className="mb-6">
        <h2 className="mb-1 text-3xl font-bold text-gray-900">{tier.name}</h2>
        <p className={`text-sm font-semibold uppercase tracking-wider ${highlighted ? 'text-gray-700' : 'text-gray-500'}`}>
          {tier.tagline}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-gray-900">${tier.price}</span>
          <span className="font-medium text-gray-500">/{tier.period}</span>
        </div>
        <p className="mt-3 leading-relaxed text-gray-600">{tier.description}</p>
      </div>

      <PricingPlanButton
        plan={tier.plan}
        className={highlighted
          ? `bg-gradient-to-r ${tier.accentColor} hover:shadow-2xl motion-safe:hover:scale-[1.02]`
          : 'bg-gray-900 hover:bg-gray-800 hover:shadow-xl'}
      >
        {tier.cta}
      </PricingPlanButton>

      <ul className="mt-8 space-y-4">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-gray-700">
            <CheckIcon aria-hidden="true" className={`mt-0.5 h-6 w-6 shrink-0 ${highlighted ? 'text-gray-900' : 'text-blue-600'}`} />
            <span className="font-medium">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
