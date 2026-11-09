export const metadata = {
  title: 'Frequently Asked Questions - TRDE',
  description: 'FAQ for TRDE trading journal',
};

export default function FAQPage() {
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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-gray-600 mb-12">
          Find answers to common questions about TRDE. Can&apos;t find what you&apos;re looking for? 
          <a href="/support" className="text-black underline ml-1">Contact our support team</a>.
        </p>

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

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">
            Still have questions? We&apos;re here to help.
          </p>
          <a href="/support" className="text-black underline font-medium">
            Contact Support →
          </a>
        </div>
      </div>
    </div>
  );
}
