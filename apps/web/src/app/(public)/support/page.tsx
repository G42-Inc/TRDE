'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { 
  EnvelopeIcon, 
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

function SupportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('support');

  useEffect(() => {
    const tab = searchParams.get('tab') || 'support';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/support?tab=${tab}`, { scroll: false });
  };

  const tabs = [
    { id: 'support', label: 'Support', icon: EnvelopeIcon },
    { id: 'faq', label: 'FAQ', icon: QuestionMarkCircleIcon },
    { id: 'guide', label: 'User Guide', icon: DocumentTextIcon },
    { id: 'terms', label: 'Terms', icon: DocumentTextIcon },
    { id: 'privacy', label: 'Privacy', icon: DocumentTextIcon },
  ];

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click the "Sign Up" button in the navigation bar. You can create an account using your email address. After signing up, you\'ll be able to access the platform and start logging your trades.',
        },
        {
          q: 'Do I need to provide payment information to sign up?',
          a: 'No, you can create a free account to explore the platform. Payment information is only required when you choose to subscribe to a paid plan (Basic, EDGE, or Pro).',
        },
        {
          q: 'How do I log my first trade?',
          a: 'Navigate to the "Trades" section from the main menu, then click "New Trade". Fill in the trade details including entry/exit prices, instrument, direction (long/short), and other relevant information. Click "Save" to add the trade to your journal.',
        },
        {
          q: 'What data do I need to enter for each trade?',
          a: 'At minimum, you should enter the trade date, instrument, direction, entry price, exit price, quantity, and result. Additional optional fields include setup notes, mistakes, emotional state, and other metadata that can help with analysis.',
        },
      ],
    },
    {
      category: 'Subscription & Billing',
      questions: [
        {
          q: 'What are the different subscription plans?',
          a: 'TRDE offers three subscription tiers: Basic (essential trading journal features), EDGE (includes backtesting simulator), and Pro (all features including advanced analytics). Each plan is available on a monthly or annual billing cycle.',
        },
        {
          q: 'How do I upgrade or downgrade my plan?',
          a: 'Go to your account Settings page, then navigate to the Subscription section. From there, you can view available plans and change your subscription. Changes take effect at the start of your next billing cycle.',
        },
        {
          q: 'Can I cancel my subscription?',
          a: 'Yes, you can cancel your subscription at any time from your account Settings. Your subscription will remain active until the end of your current billing period, after which you\'ll lose access to paid features.',
        },
        {
          q: 'Do you offer refunds?',
          a: 'Subscription fees are non-refundable, but you can cancel at any time to prevent future charges. Refunds may be available in exceptional circumstances - please contact support to discuss.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit and debit cards through Stripe. Payment processing is secure and PCI-DSS compliant.',
        },
        {
          q: 'Will I lose my data if I cancel my subscription?',
          a: 'Your data will be retained for a period after cancellation. You can export your data before canceling. Contact support if you need assistance with data export.',
        },
      ],
    },
    {
      category: 'Features & Usage',
      questions: [
        {
          q: 'What is TRDE EDGE?',
          a: 'TRDE EDGE is a backtesting simulator that allows you to replay historical market data and test trading strategies. It\'s available to EDGE and Pro plan subscribers. You can analyze strategy performance across different market conditions before risking real capital.',
        },
        {
          q: 'How do I use the Analytics dashboard?',
          a: 'Navigate to the Analytics section from the main menu. The dashboard displays comprehensive performance metrics including win rate, profit factor, expectancy, Sharpe ratio, and more. Each metric includes explanations to help you understand your results.',
        },
        {
          q: 'Can I organize my trades into collections?',
          a: 'Yes! You can create collections to group related trades (e.g., by strategy, instrument, or time period). Go to the Collections section to create and manage collections, then assign trades to them.',
        },
        {
          q: 'How do I create and manage trading strategies?',
          a: 'Navigate to the Strategies section to create new strategies. You can define strategy rules, track performance metrics, and assign trades to strategies. This helps you analyze which strategies are most effective.',
        },
        {
          q: 'Can I export my trade data?',
          a: 'Yes, you can export your trades, strategies, and analytics data. Export options are available in the respective sections of the platform. Data is exported in CSV format for compatibility with spreadsheet applications.',
        },
        {
          q: 'What is the Journal feature?',
          a: 'The Journal allows you to add detailed notes, reflections, and insights to your trades. You can record emotional state, mistakes made, lessons learned, and other qualitative information that complements your quantitative trade data.',
        },
        {
          q: 'How do I set up risk management rules?',
          a: 'Go to the Risk Management section to configure rules such as daily loss limits, maximum trades per day, and position sizing rules. The platform will automatically flag trades that violate these rules.',
        },
      ],
    },
    {
      category: 'Technical',
      questions: [
        {
          q: 'Is my data secure?',
          a: 'Yes, we use industry-standard encryption and security measures. Your data is stored securely in our database with enterprise-grade security. We do not share your trading data with third parties.',
        },
        {
          q: 'Can I access TRDE on mobile?',
          a: 'TRDE is optimized for web browsers on desktop and mobile devices. You can access the platform from any device with a modern web browser.',
        },
        {
          q: 'What browsers are supported?',
          a: 'TRDE works best with modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version of your preferred browser for the best experience.',
        },
        {
          q: 'Do you have an API?',
          a: 'API access is not currently available, but we\'re considering it for future releases. Contact support if you have specific API requirements.',
        },
      ],
    },
  ];

  return (
    <>
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-600 hover:text-black transition-colors duration-200 mb-8"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Back to Homepage
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-4">Support</h1>
        <p className="text-lg text-gray-600">
          Find answers to your questions and get help with TRDE
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'support' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
            <QuestionMarkCircleIcon className="h-12 w-12 text-black mb-4" />
            <h2 className="text-2xl font-semibold text-black mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 mb-6">
              Find answers to common questions about using TRDE, subscriptions, features, and more.
            </p>
                <button
                  onClick={() => handleTabChange('faq')}
                  className="text-black font-medium hover:underline"
                >
                  View FAQ →
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
                <DocumentTextIcon className="h-12 w-12 text-black mb-4" />
                <h2 className="text-2xl font-semibold text-black mb-4">User Guide</h2>
                <p className="text-gray-600 mb-6">
                  Comprehensive guide to getting started with TRDE and mastering all features.
                </p>
                <button
                  onClick={() => handleTabChange('guide')}
                  className="text-black font-medium hover:underline"
                >
                  Read User Guide →
                </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <EnvelopeIcon className="h-12 w-12 text-black mb-4" />
          <h2 className="text-2xl font-semibold text-black mb-4">Contact Support</h2>
          <p className="text-gray-600 mb-6">
                Need help? Our support team is here to assist you.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <EnvelopeIcon className="h-6 w-6 text-black mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-black mb-1">Email Support</h3>
                    <p className="text-gray-600 text-sm mb-2">
                  Send us an email and we&apos;ll get back to you as soon as possible.
                </p>
                    <p className="text-black font-medium">support@trde.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent-bg rounded-lg p-8 border border-accent-light">
          <h2 className="text-2xl font-semibold text-black mb-4">Account & Billing Issues</h2>
          <p className="text-gray-600 mb-4">
            For account-related questions, subscription issues, or billing inquiries, please contact our support team. 
            We typically respond within 24-48 hours.
          </p>
          <p className="text-sm text-gray-600">
            If you need to update your subscription, manage payment methods, or cancel your account, you can do so 
            through your account settings page.
          </p>
        </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-12">
            {faqs.map((category, categoryIndex) => (
              <section key={categoryIndex}>
                <h2 className="text-2xl font-semibold text-black mb-6">{category.category}</h2>
                <div className="space-y-6">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <h3 className="text-lg font-semibold text-black mb-2">{faq.q}</h3>
                      <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="prose prose-lg max-w-none text-gray-700 space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Getting Started</h2>
              <h3 className="text-xl font-semibold text-black mb-3">Creating Your Account</h3>
              <p>
                To get started with TRDE, create an account by clicking the &quot;Sign Up&quot; button. You&apos;ll need 
                to provide your email address and create a password. Once your account is created, you can immediately 
                start logging trades.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">Navigating the Platform</h3>
              <p>
                The main navigation menu provides access to all features:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Dashboard</strong> - Overview of your trading performance with key metrics</li>
                <li><strong>Trades</strong> - Log, view, and manage your trading history</li>
                <li><strong>Analytics</strong> - Comprehensive performance analysis and charts</li>
                <li><strong>Strategies</strong> - Create and track trading strategies</li>
                <li><strong>Journal</strong> - Add detailed notes and reflections</li>
                <li><strong>Risk Management</strong> - Configure and monitor risk rules</li>
                <li><strong>EDGE</strong> - Backtesting simulator (EDGE/Pro plans)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Logging Trades</h2>
              <h3 className="text-xl font-semibold text-black mb-3">Adding a New Trade</h3>
              <p>
                To log a new trade, navigate to the Trades section and click &quot;New Trade&quot;. The trade form includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Basic Information</strong> - Date, instrument, direction (long/short), quantity</li>
                <li><strong>Prices</strong> - Entry price, exit price, and result calculation</li>
                <li><strong>Risk Metrics</strong> - Planned risk, actual risk, R-multiple</li>
                <li><strong>Strategy</strong> - Assign the trade to a strategy</li>
                <li><strong>Notes</strong> - Setup, execution notes, mistakes, and lessons learned</li>
              </ul>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">Editing and Managing Trades</h3>
              <p>
                You can edit any trade by clicking on it from the trades list. Trades can be filtered, sorted, and organized 
                into collections for better organization. Use the search and filter options to quickly find specific trades.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Analytics Dashboard</h2>
              <p>
                The Analytics section provides comprehensive performance analysis with over 15 key metrics:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Win Rate</strong> - Percentage of profitable trades</li>
                <li><strong>Profit Factor</strong> - Ratio of gross profit to gross loss</li>
                <li><strong>Expectancy (Avg R)</strong> - Average R-multiple per trade</li>
                <li><strong>Sharpe Ratio</strong> - Risk-adjusted return measure</li>
                <li><strong>Maximum Drawdown</strong> - Largest peak-to-trough decline</li>
                <li><strong>Consistency Score</strong> - Measure of trading consistency</li>
              </ul>

              <p className="mt-4">
                Charts and visualizations help you identify patterns in your trading performance, including equity curves, 
                R-distribution, day-of-week analysis, and strategy comparisons.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Strategies</h2>
              <p>
                Create and manage trading strategies to track performance by strategy type. Each strategy can have:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Name and description</li>
                <li>Rules and parameters</li>
                <li>Performance metrics specific to that strategy</li>
                <li>Associated trades</li>
              </ul>
              <p className="mt-4">
                Assign trades to strategies to analyze which approaches work best for your trading style.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Collections</h2>
              <p>
                Collections allow you to group trades by any criteria (e.g., &quot;January Trades&quot;, &quot;ES Futures&quot;, 
                &quot;Winning Streak&quot;). Create collections to organize your trading history and analyze specific subsets 
                of your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Journal & Notes</h2>
              <p>
                The Journal feature lets you add detailed qualitative information to your trades:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Setup description and market conditions</li>
                <li>Emotional state and psychological notes</li>
                <li>Mistakes made and lessons learned</li>
                <li>What went well and what could be improved</li>
              </ul>
              <p className="mt-4">
                Regular journaling helps identify patterns in both your trading decisions and emotional responses, leading 
                to improved discipline and performance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Risk Management</h2>
              <p>
                Configure risk management rules to enforce discipline:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Daily Loss Limit</strong> - Maximum loss allowed per day</li>
                <li><strong>Maximum Trades</strong> - Limit on number of trades per day</li>
                <li><strong>Position Sizing</strong> - Rules for position sizing</li>
                <li><strong>Stop Loss Requirements</strong> - Require stop loss definition</li>
              </ul>
              <p className="mt-4">
                The platform automatically flags trades that violate your risk rules, helping you maintain discipline 
                and stick to your trading plan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">TRDE EDGE (Backtesting)</h2>
              <p>
                Available for EDGE and Pro plan subscribers, TRDE EDGE is a backtesting simulator that allows you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Replay historical market data with precision</li>
                <li>Test trading strategies against real market conditions</li>
                <li>Analyze strategy performance across different market regimes</li>
                <li>Refine your edge before risking real capital</li>
              </ul>
              <p className="mt-4">
                Access EDGE from the main navigation to start backtesting your strategies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">Tips for Success</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Log trades consistently</strong> - Enter trades as soon as possible after execution for accuracy</li>
                <li><strong>Review regularly</strong> - Weekly reviews help identify patterns and areas for improvement</li>
                <li><strong>Use collections</strong> - Organize trades to analyze specific strategies, instruments, or time periods</li>
                <li><strong>Journal thoroughly</strong> - Detailed notes provide insights that numbers alone cannot</li>
                <li><strong>Monitor analytics</strong> - Track key metrics over time to measure improvement</li>
                <li><strong>Set risk rules</strong> - Use risk management features to enforce discipline</li>
              </ul>
            </section>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using TRDE (&quot;the Service&quot;), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to these Terms of Service, you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">2. Description of Service</h2>
              <p>
                TRDE is a trading journal platform that allows users to record, track, and analyze trading activities. 
                The Service includes features such as trade logging, strategy management, analytics, and reporting tools.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-black mb-3">3.1 Account Creation</h3>
              <p>
                You must create an account to use the Service. You are responsible for maintaining the confidentiality 
                of your account credentials and for all activities that occur under your account.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">3.2 Account Security</h3>
              <p>
                You agree to notify us immediately of any unauthorized use of your account or any other breach of security. 
                We are not liable for any loss or damage arising from your failure to protect your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">4. Subscription and Payment</h2>
              <h3 className="text-xl font-semibold text-black mb-3">4.1 Subscription Plans</h3>
              <p>
                The Service offers subscription plans with varying features and pricing. Subscription fees are billed 
                in advance on a recurring basis (monthly or annually, as selected).
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.2 Payment Processing</h3>
              <p>
                Payments are processed through Stripe. By subscribing, you agree to Stripe&apos;s terms of service and 
                privacy policy. All fees are non-refundable except as required by law or as explicitly stated.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.3 Cancellation</h3>
              <p>
                You may cancel your subscription at any time through your account settings. Cancellation will take effect 
                at the end of your current billing period. You will continue to have access to paid features until the 
                end of the billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">5. User Content and Data</h2>
              <h3 className="text-xl font-semibold text-black mb-3">5.1 Ownership</h3>
              <p>
                You retain ownership of all data and content you upload or create through the Service. By using the Service, 
                you grant us a limited license to store, process, and display your content as necessary to provide the Service.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.2 Data Accuracy</h3>
              <p>
                You are solely responsible for the accuracy and completeness of the data you enter into the Service. 
                We are not responsible for any errors, omissions, or inaccuracies in your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">6. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws or regulations in your jurisdiction</li>
                <li>Infringe upon the rights of others</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">7. Intellectual Property</h2>
              <p>
                The Service, including its design, features, functionality, and content (except user content), is owned by 
                TRDE and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, 
                or create derivative works of the Service without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">8. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES of MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="mt-4">
                We do not guarantee that the Service will be uninterrupted, secure, or error-free. The Service may 
                experience downtime for maintenance or due to unforeseen circumstances.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">9. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRDE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR 
                INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              <p className="mt-4">
                Our total liability for any claims arising from or related to the Service shall not exceed the amount 
                you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">10. Trading Disclaimer</h2>
              <p>
                TRDE is a trading journal tool and does not provide trading advice, investment recommendations, or 
                financial services. All trading decisions are your own responsibility. Past performance does not guarantee 
                future results. Trading involves substantial risk of loss.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">11. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice, 
                for any breach of these Terms of Service. Upon termination, your right to use the Service will cease 
                immediately, though you may export your data before termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">12. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. We will notify users of material 
                changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date. 
                Your continued use of the Service after changes become effective constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">13. Governing Law</h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with applicable laws, without 
                regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">14. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us through our{' '}
                <button onClick={() => handleTabChange('support')} className="text-black underline">support channels</button>.
              </p>
            </section>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">1. Introduction</h2>
              <p>
                TRDE (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
                our trading journal platform and related services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-black mb-3">2.1 Account Information</h3>
              <p>
                When you create an account, we collect information such as your name, email address, and authentication 
                credentials through our authentication provider (Clerk).
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.2 Trading Data</h3>
              <p>
                We store your trading data including trades, strategies, analytics, journals, and other information you 
                voluntarily provide through the platform. This data is stored securely in our database.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.3 Payment Information</h3>
              <p>
                Payment processing is handled by Stripe. We do not store your credit card information. Stripe handles 
                all payment data according to their privacy policy and PCI-DSS compliance standards.
              </p>

              <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.4 Usage Data</h3>
              <p>
                We may collect information about how you interact with our platform, including features used, pages visited, 
                and time spent on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send you service-related communications</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Detect, prevent, and address technical issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">4. Data Storage and Security</h2>
              <p>
                Your data is stored securely using industry-standard encryption and security measures. We use Supabase 
                for data storage, which provides enterprise-grade security and compliance standards.
              </p>
              <p className="mt-4">
                While we implement appropriate security measures, no method of transmission over the Internet or electronic 
                storage is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">5. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With service providers who assist us in operating our platform (e.g., Stripe for payments, Clerk for authentication)</li>
                <li>When required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer or merger (with notice to users)</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">6. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and review your personal data</li>
                <li>Update or correct your information through your account settings</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications (you can unsubscribe from marketing emails)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to maintain your session, remember your preferences, 
                and analyze usage patterns. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">8. Children&apos;s Privacy</h2>
              <p>
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal 
                information from children. If you believe we have collected information from a child, please contact us 
                immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by 
                posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">10. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please contact us through our{' '}
                <button onClick={() => handleTabChange('support')} className="text-black underline">support channels</button>.
              </p>
            </section>
          </div>
        )}
        </div>
    </>
  );
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          <SupportContent />
        </Suspense>
      </div>
    </div>
  );
}
