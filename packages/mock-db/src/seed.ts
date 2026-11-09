import type {
  Trade,
  FuturesTrade,
  OptionsTrade,
  Strategy,
  StrategyVersion,
  Collection,
  DailyBias,
  DailyQuickJournal,
  RiskRules,
  TradeJournal,
  PreTradeJournal,
  PostTradeJournal,
} from '@trde/core';
import {
  AssetClass,
  FuturesInstrument,
  OptionsUnderlying,
  Session,
  MarketHoursTag,
  RthEth,
  MarketRegime,
  SetupTag,
  MistakeTag,
  Grade,
  EmotionLabel,
  NewsTag,
  ManagementStyle,
  Direction,
  Outcome,
  OptionType,
  FUTURES_GROUPS,
} from '@trde/core';

// Deterministic seed for reproducible data
let seed = 12345;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const STRATEGY_NAMES = [
  'ORB',
  'Pullback Continuation',
  'Mean Reversion Fade',
  'Breakout Retest',
  'Liquidity Sweep Reversal',
];

export function generateStrategies(): { strategies: Strategy[]; versions: StrategyVersion[] } {
  const strategies: Strategy[] = [];
  const versions: StrategyVersion[] = [];
  let strategyIdCounter = 1;
  let versionIdCounter = 1;
  const now = Date.now();

  for (const name of STRATEGY_NAMES) {
    const strategyId = `strategy-${strategyIdCounter++}`;
    strategies.push({
      id: strategyId,
      name,
      description: `Strategy: ${name}`,
      createdAt: now - randomInt(30, 90) * 24 * 60 * 60 * 1000,
    });

    // Create 1-2 versions per strategy
    const versionCount = randomInt(1, 2);
    for (let v = 1; v <= versionCount; v++) {
      versions.push({
        id: `version-${versionIdCounter++}`,
        strategyId,
        version: `v${v}`,
        description: `${name} version ${v}`,
        createdAt: now - randomInt(20, 60) * 24 * 60 * 60 * 1000,
      });
    }
  }

  return { strategies, versions };
}

export function generateTrades(
  strategies: Strategy[],
  versions: StrategyVersion[],
  count: number = 300
): Trade[] {
  const trades: Trade[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const endDate = new Date();

  const futuresInstruments = Object.values(FuturesInstrument);
  const optionsUnderlyings = Object.values(OptionsUnderlying);
  const sessions = Object.values(Session);
  const marketHours = Object.values(MarketHoursTag);
  const regimes = Object.values(MarketRegime);
  const setupTags = Object.values(SetupTag);
  const mistakeTags = Object.values(MistakeTag);
  const grades = Object.values(Grade);
  const emotions = Object.values(EmotionLabel);
  const newsTags = Object.values(NewsTag);
  const managementStyles = Object.values(ManagementStyle);

  // 70% futures, 30% options
  const futuresCount = Math.floor(count * 0.7);
  const optionsCount = count - futuresCount;

  // Futures distribution: 55% index, 30% commodities, 10% rates, 5% FX/Crypto
  const indexFutures = FUTURES_GROUPS.EQUITY_INDEX;
  const commodityFutures = [...FUTURES_GROUPS.METALS, ...FUTURES_GROUPS.ENERGY, ...FUTURES_GROUPS.AGRICULTURE];
  const rateFutures = FUTURES_GROUPS.RATES;
  const fxCryptoFutures = [...FUTURES_GROUPS.FX, ...FUTURES_GROUPS.CRYPTO];

  for (let i = 0; i < futuresCount; i++) {
    let instrument: FuturesInstrument;
    const r = random();
    if (r < 0.55) {
      instrument = randomChoice(indexFutures);
    } else if (r < 0.85) {
      instrument = randomChoice(commodityFutures);
    } else if (r < 0.95) {
      instrument = randomChoice(rateFutures);
    } else {
      instrument = randomChoice(fxCryptoFutures);
    }

    const tradeDate = randomDate(startDate, endDate);
    const entryHour = randomInt(6, 20);
    const entryMinute = randomInt(0, 59);
    const entryTime = new Date(tradeDate);
    entryTime.setHours(entryHour, entryMinute, 0, 0);
    const exitTime = new Date(entryTime.getTime() + randomInt(5, 240) * 60 * 1000);

    const session = randomChoice([Session.NEW_YORK, Session.NEW_YORK, Session.NEW_YORK, Session.LONDON, Session.ASIA]);
    const marketHoursTag = randomChoice([
      MarketHoursTag.RTH_OPEN,
      MarketHoursTag.RTH_OPEN,
      MarketHoursTag.MIDDAY,
      MarketHoursTag.MIDDAY,
      MarketHoursTag.POWER_HOUR,
      MarketHoursTag.POWER_HOUR,
      MarketHoursTag.PREMARKET,
      MarketHoursTag.ETH,
    ]);

    const regime = randomChoice([
      MarketRegime.RANGE,
      MarketRegime.RANGE,
      MarketRegime.RANGE,
      MarketRegime.TREND_UP,
      MarketRegime.TREND_UP,
      MarketRegime.TREND_DOWN,
      MarketRegime.TREND_DOWN,
      MarketRegime.HIGH_VOLATILITY,
      MarketRegime.LOW_VOLATILITY,
    ]);

    const strategy = randomChoice(strategies);
    const strategyVersions = versions.filter((v) => v.strategyId === strategy.id);
    const strategyVersion = randomChoice(strategyVersions);

    const setupCount = randomInt(1, 3);
    const setups = randomChoices(setupTags, setupCount);

    const hasMistakes = random() < 0.35;
    const mistakes = hasMistakes ? randomChoices(mistakeTags, randomInt(1, 3)) : [];

    const grade = randomChoice([
      Grade.A,
      Grade.A,
      Grade.B,
      Grade.B,
      Grade.B,
      Grade.C,
      Grade.C,
      Grade.F,
    ]);

    const direction = randomChoice([Direction.LONG, Direction.SHORT]);
    const quantity = randomInt(1, 10);
    const plannedRiskUsd = randomInt(50, 500);

    // Simulate entry/exit prices
    const basePrice = randomInt(3000, 5000);
    const entryPrice = basePrice + randomInt(-10, 10);
    let exitPrice: number;
    let outcome: Outcome;

    // Determine outcome based on grade and mistakes
    if (grade === Grade.F || mistakes.length > 2) {
      outcome = Outcome.LOSS;
      exitPrice = direction === Direction.LONG
        ? entryPrice - randomInt(20, 100)
        : entryPrice + randomInt(20, 100);
    } else if (grade === Grade.A && mistakes.length === 0) {
      outcome = randomChoice([Outcome.WIN, Outcome.WIN, Outcome.WIN, Outcome.BREAKEVEN]);
      if (outcome === Outcome.WIN) {
        exitPrice = direction === Direction.LONG
          ? entryPrice + randomInt(30, 150)
          : entryPrice - randomInt(30, 150);
      } else {
        exitPrice = entryPrice + randomInt(-5, 5);
      }
    } else {
      outcome = randomChoice([Outcome.WIN, Outcome.LOSS, Outcome.BREAKEVEN]);
      if (outcome === Outcome.WIN) {
        exitPrice = direction === Direction.LONG
          ? entryPrice + randomInt(15, 80)
          : entryPrice - randomInt(15, 80);
      } else if (outcome === Outcome.LOSS) {
        exitPrice = direction === Direction.LONG
          ? entryPrice - randomInt(15, 80)
          : entryPrice + randomInt(15, 80);
      } else {
        exitPrice = entryPrice + randomInt(-5, 5);
      }
    }

    const pointsPnL = direction === Direction.LONG
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;

    // Assume tick size 0.25 and tick value $12.50 for ES-like contracts
    const tickSize = 0.25;
    const tickValueUsd = 12.5;
    const ticksPnL = pointsPnL / tickSize;
    const resultUsd = pointsPnL * tickValueUsd - randomInt(5, 20); // fees
    const resultR = resultUsd / plannedRiskUsd;

    const newsTags = random() < 0.2 ? randomChoices([NewsTag.CPI, NewsTag.FOMC, NewsTag.NFP, NewsTag.EARNINGS], 1) : [NewsTag.NONE];

    const trade: FuturesTrade = {
      id: `trade-${i + 1}`,
      assetClass: AssetClass.FUTURES,
      createdAt: entryTime.getTime(),
      updatedAt: exitTime.getTime(),
      tradeDate: formatDate(tradeDate),
      entryTime: entryTime.getTime(),
      exitTime: exitTime.getTime(),
      direction,
      quantity,
      feesUsd: randomInt(5, 20),
      plannedRiskUsd,
      resultUsd,
      resultR,
      outcome,
      grade,
      strategyId: strategy.id,
      strategyVersionId: strategyVersion.id,
      setupTags: setups,
      session,
      marketHoursTag,
      marketRegime: regime,
      newsTags,
      mistakes,
      managementStyle: randomChoice(managementStyles),
      notes: `Trade on ${formatDate(tradeDate)}`,
      attachments: random() < 0.2 ? [{ id: `att-${i}`, type: 'image', uri: 'placeholder.jpg', caption: 'Chart' }] : [],
      reviewFlag: random() < 0.15,
      collections: [],
      disciplineFlags: {
        respectedDailyLossLimit: mistakes.includes(MistakeTag.DID_NOT_RESPECT_DAILY_LIMIT) ? false : true,
        respectedMaxTrades: mistakes.includes(MistakeTag.DID_NOT_RESPECT_MAX_TRADES) ? false : true,
        respectedMaxContracts: mistakes.includes(MistakeTag.OVERSIZED_POSITION) ? false : true,
        hadStopDefined: !mistakes.includes(MistakeTag.NO_STOP_DEFINED) && !mistakes.includes(MistakeTag.REMOVED_STOP),
        followedEntryRules: !mistakes.includes(MistakeTag.IGNORED_SETUP_RULES) && !mistakes.includes(MistakeTag.TRADED_OUTSIDE_PLAN),
        followedExitRules: !mistakes.includes(MistakeTag.TOOK_PROFIT_TOO_EARLY) && !mistakes.includes(MistakeTag.HELD_LOSER_TOO_LONG),
        journalCompleted: random() < 0.6,
      },
      instrumentRoot: instrument,
      contractSymbol: `${instrument}Z24`,
      entryPrice,
      exitPrice,
      tickSize,
      tickValueUsd,
      pointsPnL,
      ticksPnL,
      rthEth: marketHoursTag === MarketHoursTag.ETH ? RthEth.ETH : RthEth.RTH,
    };

    trades.push(trade);
  }

  // Generate options trades
  for (let i = 0; i < optionsCount; i++) {
    const underlying = randomChoice(optionsUnderlyings);
    const tradeDate = randomDate(startDate, endDate);
    const expiration = new Date(tradeDate);
    expiration.setDate(expiration.getDate() + randomInt(1, 45));
    const dte = Math.ceil((expiration.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));

    const entryHour = randomInt(9, 16);
    const entryMinute = randomInt(0, 59);
    const entryTime = new Date(tradeDate);
    entryTime.setHours(entryHour, entryMinute, 0, 0);
    const exitTime = new Date(entryTime.getTime() + randomInt(30, 300) * 60 * 1000);

    const session = Session.NEW_YORK;
    const marketHoursTag = randomChoice([
      MarketHoursTag.RTH_OPEN,
      MarketHoursTag.MIDDAY,
      MarketHoursTag.POWER_HOUR,
      MarketHoursTag.PREMARKET,
    ]);

    const regime = randomChoice(regimes);
    const strategy = randomChoice(strategies);
    const strategyVersions = versions.filter((v) => v.strategyId === strategy.id);
    const strategyVersion = randomChoice(strategyVersions);

    const setups = randomChoices(setupTags, randomInt(1, 2));
    const hasMistakes = random() < 0.35;
    const mistakes = hasMistakes ? randomChoices(mistakeTags, randomInt(1, 2)) : [];

    const grade = randomChoice([Grade.A, Grade.A, Grade.B, Grade.B, Grade.B, Grade.C, Grade.C, Grade.F]);
    const optionType = randomChoice([OptionType.CALL, OptionType.PUT]);
    const strike = randomInt(100, 500);
    const quantity = randomInt(1, 20);

    const entryPremium = randomInt(1, 10);
    let exitPremium: number;
    let outcome: Outcome;

    if (grade === Grade.F || mistakes.length > 1) {
      outcome = Outcome.LOSS;
      exitPremium = entryPremium * randomInt(20, 80) / 100;
    } else if (grade === Grade.A) {
      outcome = randomChoice([Outcome.WIN, Outcome.WIN, Outcome.BREAKEVEN]);
      exitPremium = outcome === Outcome.WIN ? entryPremium * randomInt(150, 400) / 100 : entryPremium;
    } else {
      outcome = randomChoice([Outcome.WIN, Outcome.LOSS, Outcome.BREAKEVEN]);
      exitPremium = outcome === Outcome.WIN
        ? entryPremium * randomInt(120, 250) / 100
        : entryPremium * randomInt(50, 90) / 100;
    }

    const contractMultiplier = 100;
    const netPremiumPnLUsd = (exitPremium - entryPremium) * quantity * contractMultiplier - randomInt(5, 15);
    const plannedRiskUsd = entryPremium * quantity * contractMultiplier;
    const resultUsd = netPremiumPnLUsd;
    const resultR = resultUsd / plannedRiskUsd;

    const newsTags = random() < 0.15 ? [NewsTag.EARNINGS] : [NewsTag.NONE];

    const trade: OptionsTrade = {
      id: `trade-${futuresCount + i + 1}`,
      assetClass: AssetClass.OPTIONS,
      createdAt: entryTime.getTime(),
      updatedAt: exitTime.getTime(),
      tradeDate: formatDate(tradeDate),
      entryTime: entryTime.getTime(),
      exitTime: exitTime.getTime(),
      direction: Direction.LONG, // Options are typically long
      quantity,
      feesUsd: randomInt(5, 15),
      plannedRiskUsd,
      resultUsd,
      resultR,
      outcome,
      grade,
      strategyId: strategy.id,
      strategyVersionId: strategyVersion.id,
      setupTags: setups,
      session,
      marketHoursTag,
      marketRegime: regime,
      newsTags,
      mistakes,
      managementStyle: randomChoice(managementStyles),
      notes: `Options trade on ${underlying}`,
      attachments: random() < 0.15 ? [{ id: `att-opt-${i}`, type: 'image', uri: 'placeholder.jpg' }] : [],
      reviewFlag: random() < 0.1,
      collections: [],
      disciplineFlags: {
        respectedDailyLossLimit: !mistakes.includes(MistakeTag.DID_NOT_RESPECT_DAILY_LIMIT),
        respectedMaxTrades: !mistakes.includes(MistakeTag.DID_NOT_RESPECT_MAX_TRADES),
        respectedMaxContracts: !mistakes.includes(MistakeTag.OVERSIZED_POSITION),
        hadStopDefined: !mistakes.includes(MistakeTag.NO_STOP_DEFINED),
        followedEntryRules: !mistakes.includes(MistakeTag.IGNORED_SETUP_RULES),
        followedExitRules: !mistakes.includes(MistakeTag.TOOK_PROFIT_TOO_EARLY),
        journalCompleted: random() < 0.55,
      },
      underlying,
      expiration: formatDate(expiration),
      dte,
      strike,
      optionType,
      entryPremium,
      exitPremium,
      contractMultiplier,
      netPremiumPnLUsd,
    };

    trades.push(trade);
  }

  // Sort by trade date
  return trades.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
}

export function generateCollections(trades: Trade[]): Collection[] {
  const aPlusSetups = trades.filter((t) => t.grade === Grade.A && t.setupTags.length > 0).slice(0, 20);
  const toStudy = trades.filter((t) => t.reviewFlag || t.mistakes.length > 0).slice(0, 15);
  const badHabits = trades.filter((t) => t.mistakes.length >= 2).slice(0, 10);
  const newsDayTrades = trades.filter((t) => t.newsTags.some((n) => n !== NewsTag.NONE)).slice(0, 12);

  return [
    {
      id: 'collection-1',
      name: 'A+ Setups',
      description: 'High-grade trades with strong setups',
      tradeIds: aPlusSetups.map((t) => t.id),
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'collection-2',
      name: 'Trades to Study',
      description: 'Trades flagged for review or with mistakes',
      tradeIds: toStudy.map((t) => t.id),
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'collection-3',
      name: 'Bad Habits',
      description: 'Trades with multiple mistakes',
      tradeIds: badHabits.map((t) => t.id),
      createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'collection-4',
      name: 'News Day Trades',
      description: 'Trades taken during high-impact news',
      tradeIds: newsDayTrades.map((t) => t.id),
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    },
  ];
}

export function generateDailyBiases(trades: Trade[]): DailyBias[] {
  const dates = [...new Set(trades.map((t) => t.tradeDate))].sort();
  const biases: DailyBias[] = [];

  for (const date of dates) {
    if (Math.random() < 0.5) {
      const dayTrades = trades.filter((t) => t.tradeDate === date);
      const netPnL = dayTrades.reduce((sum, t) => sum + t.resultUsd, 0);
      const bias = netPnL > 100 ? 'bullish' : netPnL < -100 ? 'bearish' : 'neutral';
      biases.push({
        date,
        bias,
        reason: `Based on ${dayTrades.length} trades`,
        confidence: randomInt(50, 90),
      });
    }
  }

  return biases;
}

export function generateRiskRules(): RiskRules {
  return {
    dailyLossLimitUsd: 1000,
    maxTradesPerDay: 10,
    maxContractsPerTrade: 10,
    stopAfterConsecutiveLosses: 3,
    stopAfterDownR: 5,
    requirePlannedRisk: true,
    requireStopDefined: true,
  };
}

export function generateJournals(trades: Trade[]): TradeJournal[] {
  const journals: TradeJournal[] = [];

  for (const trade of trades) {
    if (Math.random() < 0.6) {
      const preTrade: PreTradeJournal = {
        thesis: `Expected ${trade.direction === Direction.LONG ? 'upward' : 'downward'} move based on ${trade.setupTags[0] || 'setup'}`,
        invalidation: 'Break below/above key level',
        confidence: randomInt(60, 90),
        moodLabel: randomChoice(Object.values(EmotionLabel)),
        moodIntensity: randomInt(1, 5),
        checklist: {
          stopPlanned: trade.disciplineFlags.hadStopDefined,
          sizeWithinRules: trade.disciplineFlags.respectedMaxContracts,
          entryMatchesStrategy: trade.disciplineFlags.followedEntryRules,
          newsChecked: !trade.newsTags.includes(NewsTag.OTHER_HIGH_IMPACT),
          notRevenge: !trade.mistakes.includes(MistakeTag.REVENGE_TRADE),
        },
      };

      const postTrade: PostTradeJournal = {
        whatWentWell: trade.outcome === Outcome.WIN ? 'Good entry timing' : 'Managed risk well',
        whatToImprove: trade.mistakes.length > 0 ? 'Avoid mistakes' : 'Better exit timing',
        executionNotes: `Executed ${trade.grade} grade trade`,
        emotionAfterLabel: trade.outcome === Outcome.WIN ? EmotionLabel.CONFIDENT : EmotionLabel.FRUSTRATED,
        emotionAfterIntensity: randomInt(1, 5),
        ruleBreakExplanation: trade.mistakes.length > 0 ? 'Made some mistakes' : undefined,
      };

      journals.push({
        tradeId: trade.id,
        preTrade,
        postTrade,
      });
    }
  }

  return journals;
}
