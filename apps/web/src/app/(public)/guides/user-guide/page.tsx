export const metadata = {
  title: 'User Guide - TRDE',
  description: 'Complete user guide for TRDE trading journal',
};

export default function UserGuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-4">User Guide</h1>
        <p className="text-lg text-gray-600 mb-12">
          A comprehensive guide to getting started with TRDE and making the most of all features.
        </p>

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

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">Getting Help</h2>
            <p>
              If you need assistance or have questions:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Check the <a href="/faq" className="text-black underline">FAQ section</a> for common questions</li>
              <li>Review the <a href="/support" className="text-black underline">Support page</a> for contact information</li>
              <li>Explore the Analytics Glossary for detailed metric explanations</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
