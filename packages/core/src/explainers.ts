import { SetupTag, MistakeTag, Session, MarketRegime } from './types';

export interface MetricExplainer {
  title: string;
  definition: string;
  why: string;
  calculation: string;
  interpretation: string;
  examples?: string;
}

export const METRIC_EXPLAINERS: Record<string, MetricExplainer> = {
  winRate: {
    title: 'Win Rate',
    definition: 'The percentage of trades that result in a profit.',
    why: 'Win rate shows how often you win, but it\'s only meaningful when combined with risk-reward. A 40% win rate can be profitable with a 2:1 reward-to-risk ratio.',
    calculation: 'Wins / Total Trades × 100',
    interpretation: 'Higher is generally better, but focus on expectancy (avg R) for true profitability. A 50%+ win rate is good, but not required if your winners are much larger than losers.',
    examples: '50% win rate with 2R avg win and 1R avg loss = profitable. 70% win rate with 0.5R avg win and 1R avg loss = unprofitable.',
  },
  expectancy: {
    title: 'Expectancy (Avg R)',
    definition: 'The average R-multiple per trade, where R is your risk per trade.',
    why: 'This is the most important metric. Positive expectancy means you\'re profitable over time. Expectancy × number of trades = total R.',
    calculation: 'Sum of all R-multiples / Number of trades',
    interpretation: '>0 = profitable, <0 = losing. 0.5R+ is excellent. 0.2R+ is good. Negative means you need to improve your edge or risk management.',
    examples: '0.5R expectancy × 100 trades = 50R profit. -0.1R expectancy × 100 trades = -10R loss.',
  },
  profitFactor: {
    title: 'Profit Factor',
    definition: 'The ratio of gross profit to gross loss.',
    why: 'Shows the relationship between your winning and losing trades. A PF > 1 means you\'re profitable.',
    calculation: 'Total Gross Profit / Total Gross Loss',
    interpretation: '>1.5 = excellent, 1.2-1.5 = good, 1.0-1.2 = marginal, <1.0 = losing. Higher is better, but don\'t sacrifice consistency for extreme PF.',
    examples: '$10,000 gross profit / $5,000 gross loss = 2.0 PF. $6,000 gross profit / $5,000 gross loss = 1.2 PF.',
  },
  totalPnLUsd: {
    title: 'Total P&L (USD)',
    definition: 'The sum of all trade results in US dollars.',
    why: 'Shows your absolute dollar performance. Useful for tracking progress toward financial goals.',
    calculation: 'Sum of all trade results (wins - losses - fees)',
    interpretation: 'Positive = profitable, negative = losing. Track this over time to see if you\'re improving.',
    examples: '$5,000 total P&L means you\'ve made $5,000 after all costs.',
  },
  totalPnLR: {
    title: 'Total P&L (R)',
    definition: 'The sum of all R-multiples across all trades.',
    why: 'R-multiples normalize performance regardless of position size. 50R means you\'ve made 50 times your risk unit.',
    calculation: 'Sum of all R-multiples',
    interpretation: 'Higher is better. 50R+ is strong. Track this to see if your edge is compounding.',
    examples: '50R total means if you risk $100 per trade, you\'ve made $5,000. If you risk $500 per trade, you\'ve made $25,000.',
  },
  avgWinR: {
    title: 'Average Win (R)',
    definition: 'The average R-multiple of your winning trades.',
    why: 'Shows the size of your winners. Combined with avg loss, this determines your risk-reward ratio.',
    calculation: 'Sum of R-multiples from wins / Number of wins',
    interpretation: 'Higher is better. 2R+ is excellent. 1.5R+ is good. If this is <1R, you\'re cutting winners too early.',
    examples: '2.5R avg win means on average, your winners are 2.5× your risk. If you risk $100, avg winner = $250.',
  },
  avgLossR: {
    title: 'Average Loss (R)',
    definition: 'The average R-multiple of your losing trades.',
    why: 'Shows the size of your losers. Should be close to -1R if you\'re managing stops properly.',
    calculation: 'Sum of R-multiples from losses / Number of losses',
    interpretation: 'Should be around -1R. If worse than -1R, you\'re letting losses run or moving stops wider. If better than -1R, you might be cutting losses too early.',
    examples: '-1.2R avg loss means on average, your losers are 20% larger than your risk. This suggests stop management issues.',
  },
  maxDrawdownUsd: {
    title: 'Max Drawdown (USD)',
    definition: 'The largest peak-to-trough decline in your equity curve, measured in dollars.',
    why: 'Shows your worst losing streak in dollar terms. Critical for risk management and position sizing.',
    calculation: 'Maximum decline from any equity peak',
    interpretation: 'Lower is better. Should be <20% of your account for day trading. If too high, reduce position size or improve win rate/risk-reward.',
    examples: 'If you started at $10,000, peaked at $12,000, then dropped to $8,000, max drawdown = $4,000 (40%).',
  },
  maxDrawdownR: {
    title: 'Max Drawdown (R)',
    definition: 'The largest peak-to-trough decline in your equity curve, measured in R-multiples.',
    why: 'Normalizes drawdown regardless of position size. Shows how many R you lost in your worst streak.',
    calculation: 'Maximum decline from any equity peak (in R)',
    interpretation: 'Lower is better. <10R is good for day trading. >20R suggests you need to improve consistency or reduce risk.',
    examples: 'A 15R drawdown means you lost 15× your risk unit. If you risk $100/trade, that\'s $1,500.',
  },
  consistencyScore: {
    title: 'Consistency Score',
    definition: 'A 0-100 score measuring how consistent your R-multiples are (lower variance = higher score).',
    why: 'Shows whether your performance is steady or erratic. High consistency = more predictable results.',
    calculation: 'Based on standard deviation of R-multiples. Lower std dev = higher score.',
    interpretation: '80-100 = very consistent, 60-80 = good, 40-60 = moderate, <40 = erratic. Higher is better for confidence and planning.',
    examples: 'A score of 85 means your results are very predictable. A score of 30 means you have high variance (big wins and big losses).',
  },
  feeDrag: {
    title: 'Fee Drag',
    definition: 'The percentage of your gross P&L that goes to fees and commissions.',
    why: 'High fee drag can kill profitability. Shows the cost of trading frequency and broker costs.',
    calculation: 'Total Fees / Gross P&L × 100',
    interpretation: '<5% = excellent, 5-10% = acceptable, 10-20% = high, >20% = problematic. Consider reducing trade frequency or finding lower-cost brokers.',
    examples: 'If you made $10,000 gross but paid $1,000 in fees, fee drag = 10%.',
  },
  mistakeTax: {
    title: 'Mistake Tax',
    definition: 'The total dollar loss from trades where you made mistakes.',
    why: 'Quantifies the cost of discipline errors. Shows how much money mistakes are costing you.',
    calculation: 'Sum of losses from trades with mistake tags',
    interpretation: 'Lower is better. Track this over time to see if you\'re improving discipline. Should trend toward zero.',
    examples: '$2,000 mistake tax means you lost $2,000 due to mistakes (chasing, no stop, revenge trading, etc.).',
  },
  rollingExpectancy: {
    title: 'Rolling Expectancy',
    definition: 'Your expectancy calculated over a rolling window (e.g., last 20 trades).',
    why: 'Shows if your edge is improving or degrading over time. Helps identify when you\'re in a slump or hot streak.',
    calculation: 'Expectancy of last N trades, recalculated after each trade',
    interpretation: 'Trending up = improving. Trending down = need to review. Should stay positive for profitability.',
    examples: 'If rolling expectancy goes from 0.5R to -0.2R, your recent trades are underperforming. Review what changed.',
  },
  rDistribution: {
    title: 'R Distribution',
    definition: 'A histogram showing how your trades are distributed across R-multiple buckets.',
    why: 'Reveals patterns in your trade outcomes. Are you cutting winners? Letting losers run?',
    calculation: 'Count of trades in each R bucket (e.g., -2R to -1R, 0R to 1R, etc.)',
    interpretation: 'Should see most losses around -1R and winners spread across positive buckets. If losses are worse than -1R, fix stop management.',
    examples: 'If 60% of losses are <-2R, you\'re letting losers run. If 80% of wins are <1R, you\'re cutting winners too early.',
  },
  dayOfWeekPerformance: {
    title: 'Day of Week Performance',
    definition: 'Your P&L and trade count broken down by day of the week.',
    why: 'Reveals if certain days are more profitable. You might want to trade less on weak days.',
    calculation: 'Sum of P&L and count of trades for each day',
    interpretation: 'Look for patterns. If Monday is consistently negative, consider avoiding it. If Friday is strong, focus there.',
    examples: 'Monday: -$500 (5 trades), Friday: +$1,200 (8 trades). Consider reducing Monday activity.',
  },
  timeOfDayHeatmap: {
    title: 'Time of Day Heatmap',
    definition: 'A heatmap showing your performance by hour and session (Asia, London, New York).',
    why: 'Shows when you perform best. You might be better at certain times or sessions.',
    calculation: 'P&L and trade count for each hour × session combination',
    interpretation: 'Look for hot spots (green) and cold spots (red). Focus on your best times, avoid your worst.',
    examples: 'NY session 9-10am: +$800 (12 trades), London 2-3pm: -$300 (8 trades). Trade more NY morning, less London afternoon.',
  },
  strategyLeaderboard: {
    title: 'Strategy Leaderboard',
    definition: 'Performance comparison across all your strategies, ranked by total R.',
    why: 'Shows which strategies are working and which need improvement or retirement.',
    calculation: 'Total R, win rate, and trade count for each strategy',
    interpretation: 'Focus on strategies with positive R and good win rates. Consider retiring or improving negative-R strategies.',
    examples: 'ORB v2: +25R (60% win rate, 50 trades). Mean Reversion v1: -5R (35% win rate, 20 trades). Focus on ORB, fix or retire Mean Reversion.',
  },
  disciplineScore: {
    title: 'Discipline Score',
    definition: 'A 0-100 score measuring how often you follow your trading rules and risk management.',
    why: 'Shows your adherence to your plan. Low discipline = more mistakes = lower profitability.',
    calculation: 'Percentage of discipline flags that are true across all trades',
    interpretation: '90-100 = excellent, 80-90 = good, 70-80 = needs improvement, <70 = serious discipline issues.',
    examples: 'A score of 75 means you followed your rules 75% of the time. 25% of trades had rule violations.',
  },
  riskCreep: {
    title: 'Risk Creep',
    definition: 'The trend of your average planned risk over time (rolling window).',
    why: 'Shows if you\'re gradually increasing position size, which can lead to overtrading or emotional decisions.',
    calculation: 'Average planned risk (USD) over a rolling 7-day window',
    interpretation: 'Should be stable. If trending up, you might be getting overconfident or chasing losses. If trending down, you might be getting more conservative.',
    examples: 'Week 1: $100 avg risk, Week 4: $200 avg risk. This is risk creep - you\'re doubling your size, which increases drawdown risk.',
  },
};

export interface TagExplainer {
  title: string;
  definition: string;
  whenToUse: string;
}

export const SETUP_TAG_EXPLAINERS: Record<SetupTag, TagExplainer> = {
  [SetupTag.ORB]: {
    title: 'Opening Range Breakout',
    definition: 'A trade taken on a breakout of the first 15-30 minutes of the trading session.',
    whenToUse: 'When price breaks above/below the opening range with volume confirmation.',
  },
  [SetupTag.PULLBACK]: {
    title: 'Pullback',
    definition: 'Entering a trade after a pullback in a trending market.',
    whenToUse: 'In a strong trend, wait for a pullback to support/resistance, then enter in trend direction.',
  },
  [SetupTag.BREAKOUT]: {
    title: 'Breakout',
    definition: 'Entering when price breaks above a resistance level.',
    whenToUse: 'When price breaks above a key resistance with volume and holds the breakout.',
  },
  [SetupTag.BREAKDOWN]: {
    title: 'Breakdown',
    definition: 'Entering when price breaks below a support level.',
    whenToUse: 'When price breaks below a key support with volume and fails to reclaim it.',
  },
  [SetupTag.MEAN_REVERSION]: {
    title: 'Mean Reversion',
    definition: 'Trading against the trend, expecting price to return to the mean.',
    whenToUse: 'In ranging markets or when price is extremely extended from moving averages.',
  },
  [SetupTag.TREND_CONTINUATION]: {
    title: 'Trend Continuation',
    definition: 'Entering in the direction of the established trend.',
    whenToUse: 'When the trend is clear and you\'re entering on a pullback or continuation pattern.',
  },
  [SetupTag.REVERSAL]: {
    title: 'Reversal',
    definition: 'Entering against the current trend, expecting a reversal.',
    whenToUse: 'At key support/resistance levels with reversal signals (divergence, exhaustion patterns).',
  },
  [SetupTag.LIQUIDITY_SWEEP]: {
    title: 'Liquidity Sweep',
    definition: 'Price sweeps stops above/below a level, then reverses.',
    whenToUse: 'When price sweeps a high/low, takes out stops, then reverses back into the range.',
  },
  [SetupTag.VWAP_RECLAIM]: {
    title: 'VWAP Reclaim',
    definition: 'Price reclaims VWAP after being below/above it.',
    whenToUse: 'When price bounces off VWAP and reclaims it with momentum.',
  },
  [SetupTag.VWAP_REJECT]: {
    title: 'VWAP Reject',
    definition: 'Price is rejected at VWAP and reverses.',
    whenToUse: 'When price approaches VWAP but fails to break through, then reverses.',
  },
  [SetupTag.SUPPORT_BOUNCE]: {
    title: 'Support Bounce',
    definition: 'Entering long when price bounces off a support level.',
    whenToUse: 'At key support levels with bullish reversal signals.',
  },
  [SetupTag.RESISTANCE_REJECT]: {
    title: 'Resistance Reject',
    definition: 'Entering short when price is rejected at a resistance level.',
    whenToUse: 'At key resistance levels with bearish reversal signals.',
  },
  [SetupTag.MA_CROSS]: {
    title: 'Moving Average Cross',
    definition: 'Entering on a crossover of two moving averages.',
    whenToUse: 'When a faster MA crosses above/below a slower MA with confirmation.',
  },
  [SetupTag.FAIR_VALUE_GAP]: {
    title: 'Fair Value Gap',
    definition: 'A gap in price action that price tends to fill.',
    whenToUse: 'When price gaps and you expect it to fill the gap.',
  },
  [SetupTag.INVERSE_FVG]: {
    title: 'Inverse Fair Value Gap',
    definition: 'Trading against a fair value gap, expecting it not to fill immediately.',
    whenToUse: 'When a FVG is created but price continues in the gap direction.',
  },
  [SetupTag.DOUBLE_TOP]: {
    title: 'Double Top',
    definition: 'A bearish reversal pattern with two similar highs.',
    whenToUse: 'When price forms two similar highs and breaks below the neckline.',
  },
  [SetupTag.DOUBLE_BOTTOM]: {
    title: 'Double Bottom',
    definition: 'A bullish reversal pattern with two similar lows.',
    whenToUse: 'When price forms two similar lows and breaks above the neckline.',
  },
};

export const MISTAKE_TAG_EXPLAINERS: Record<MistakeTag, TagExplainer> = {
  [MistakeTag.CHASED_ENTRY]: {
    title: 'Chased Entry',
    definition: 'Entered a trade after the optimal entry point had passed.',
    whenToUse: 'When you entered too late, after price had already moved significantly.',
  },
  [MistakeTag.ENTERED_TOO_EARLY]: {
    title: 'Entered Too Early',
    definition: 'Entered before the setup was fully formed or confirmed.',
    whenToUse: 'When you jumped in before all your entry criteria were met.',
  },
  [MistakeTag.ENTERED_TOO_LATE]: {
    title: 'Entered Too Late',
    definition: 'Entered after the move had already started, missing the best entry.',
    whenToUse: 'When you hesitated and entered after the optimal entry window.',
  },
  [MistakeTag.MOVED_STOP_WIDER]: {
    title: 'Moved Stop Wider',
    definition: 'Widened your stop loss, increasing risk beyond your plan.',
    whenToUse: 'When you adjusted your stop to give the trade more room, violating your risk rules.',
  },
  [MistakeTag.REMOVED_STOP]: {
    title: 'Removed Stop',
    definition: 'Removed your stop loss entirely, taking unlimited risk.',
    whenToUse: 'When you deleted your stop order, exposing yourself to unlimited loss.',
  },
  [MistakeTag.NO_STOP_DEFINED]: {
    title: 'No Stop Defined',
    definition: 'Entered a trade without defining where your stop loss would be.',
    whenToUse: 'When you entered without knowing your exit point if wrong.',
  },
  [MistakeTag.OVERSIZED_POSITION]: {
    title: 'Oversized Position',
    definition: 'Took a position larger than your risk rules allow.',
    whenToUse: 'When you risked more than your max position size or daily limit.',
  },
  [MistakeTag.REVENGE_TRADE]: {
    title: 'Revenge Trade',
    definition: 'Took a trade immediately after a loss, driven by emotion.',
    whenToUse: 'When you traded again right after a loss to "get back" your money.',
  },
  [MistakeTag.OVERTRADING]: {
    title: 'Overtrading',
    definition: 'Took too many trades, exceeding your daily limit or trading plan.',
    whenToUse: 'When you exceeded your max trades per day or traded without a clear setup.',
  },
  [MistakeTag.TOOK_PROFIT_TOO_EARLY]: {
    title: 'Took Profit Too Early',
    definition: 'Exited a winning trade before it reached your profit target.',
    whenToUse: 'When you closed a winner prematurely, leaving money on the table.',
  },
  [MistakeTag.HELD_LOSER_TOO_LONG]: {
    title: 'Held Loser Too Long',
    definition: 'Kept a losing trade open past your stop, hoping it would recover.',
    whenToUse: 'When you didn\'t exit at your stop and let the loss grow.',
  },
  [MistakeTag.IGNORED_SETUP_RULES]: {
    title: 'Ignored Setup Rules',
    definition: 'Took a trade that didn\'t meet your strategy\'s entry criteria.',
    whenToUse: 'When you entered despite missing required setup conditions.',
  },
  [MistakeTag.TRADED_OUTSIDE_PLAN]: {
    title: 'Traded Outside Plan',
    definition: 'Took a trade that wasn\'t part of your trading plan or strategy.',
    whenToUse: 'When you deviated from your planned strategies or instruments.',
  },
  [MistakeTag.TRADED_DURING_NEWS_WITHOUT_PLAN]: {
    title: 'Traded During News Without Plan',
    definition: 'Traded during high-impact news without a specific news trading plan.',
    whenToUse: 'When you traded around major news events (CPI, FOMC) without a defined strategy.',
  },
  [MistakeTag.MISSED_ENTRY_FOMO]: {
    title: 'Missed Entry FOMO',
    definition: 'Entered a trade out of fear of missing out, not based on your setup.',
    whenToUse: 'When you jumped in because you saw price moving, not because your setup was there.',
  },
  [MistakeTag.DID_NOT_RESPECT_DAILY_LIMIT]: {
    title: 'Did Not Respect Daily Limit',
    definition: 'Exceeded your daily loss limit and continued trading.',
    whenToUse: 'When you kept trading after hitting your daily loss limit.',
  },
  [MistakeTag.DID_NOT_RESPECT_MAX_TRADES]: {
    title: 'Did Not Respect Max Trades',
    definition: 'Exceeded your maximum trades per day limit.',
    whenToUse: 'When you took more trades than your daily limit allows.',
  },
  [MistakeTag.SLIPPAGE_IGNORED]: {
    title: 'Slippage Ignored',
    definition: 'Didn\'t account for slippage in your entry/exit prices.',
    whenToUse: 'When your actual fill was worse than expected due to slippage, and you didn\'t factor it in.',
  },
  [MistakeTag.PLATFORM_ERROR]: {
    title: 'Platform Error',
    definition: 'A technical error with your trading platform affected the trade.',
    whenToUse: 'When a platform glitch, lag, or error impacted your trade execution.',
  },
};

export const SESSION_EXPLAINERS: Record<Session, TagExplainer> = {
  [Session.ASIA]: {
    title: 'Asia Session',
    definition: 'Trading during the Asian market hours (Tokyo, Hong Kong, etc.).',
    whenToUse: 'When the trade occurred during Asian market hours.',
  },
  [Session.LONDON]: {
    title: 'London Session',
    definition: 'Trading during the London market hours (European open).',
    whenToUse: 'When the trade occurred during London/European market hours.',
  },
  [Session.NEW_YORK]: {
    title: 'New York Session',
    definition: 'Trading during the New York market hours (US open).',
    whenToUse: 'When the trade occurred during New York/US market hours.',
  },
};

export const REGIME_EXPLAINERS: Record<MarketRegime, TagExplainer> = {
  [MarketRegime.TREND_UP]: {
    title: 'Trend Up',
    definition: 'Market is in a clear uptrend with higher highs and higher lows.',
    whenToUse: 'When the market is trending upward.',
  },
  [MarketRegime.TREND_DOWN]: {
    title: 'Trend Down',
    definition: 'Market is in a clear downtrend with lower highs and lower lows.',
    whenToUse: 'When the market is trending downward.',
  },
  [MarketRegime.RANGE]: {
    title: 'Range',
    definition: 'Market is moving sideways between support and resistance.',
    whenToUse: 'When the market is consolidating in a range.',
  },
  [MarketRegime.HIGH_VOLATILITY]: {
    title: 'High Volatility',
    definition: 'Market is experiencing elevated volatility and large price swings.',
    whenToUse: 'When volatility is significantly above average.',
  },
  [MarketRegime.LOW_VOLATILITY]: {
    title: 'Low Volatility',
    definition: 'Market is experiencing low volatility with small price movements.',
    whenToUse: 'When volatility is significantly below average.',
  },
};

export const MICROCOPY = {
  emptyStates: {
    noTrades: 'No trades yet. Add your first trade to get started.',
    noFilteredTrades: 'No trades match your current filters. Try adjusting your filters.',
    noCollections: 'No collections yet. Create collections to organize your trades.',
    noSavedFilters: 'No saved filters yet. Save your current filters for quick access.',
    noReviews: 'No weekly reviews yet. Complete your first review to track progress.',
    noStrategies: 'No strategies yet. Create a strategy to start tracking performance.',
  },
  validation: {
    required: 'This field is required',
    invalidDate: 'Invalid date format',
    invalidTime: 'Invalid time format',
    invalidNumber: 'Invalid number',
    riskTooHigh: 'Risk exceeds your daily limit',
    maxTradesExceeded: 'Maximum trades per day exceeded',
    maxContractsExceeded: 'Maximum contracts per trade exceeded',
  },
  tooltips: {
    plannedRisk: 'The dollar amount you plan to risk on this trade (your stop loss distance × position size).',
    resultR: 'The R-multiple for this trade. Positive = profit, negative = loss. 1R = your planned risk.',
    reviewFlag: 'Flag this trade for review in your weekly review process.',
    collections: 'Add this trade to collections for easy organization and analysis.',
  },
  info: {
    localOnly: 'This is a local-only prototype. All data is stored on your device. Backend sync coming later.',
    mockExport: 'This is a mock export preview. In production, this would generate a full PDF report.',
    resetData: 'This will reset all your data and reload the demo dataset. This action cannot be undone.',
  },
};
