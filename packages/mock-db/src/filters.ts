import type { Trade, TradeFilters, SavedFilter } from '@trde/core';
import { AssetClass, Outcome, Grade, Session, MarketRegime } from '@trde/core';

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((trade) => {
    if (filters.assetClass && filters.assetClass.length > 0) {
      if (!filters.assetClass.includes(trade.assetClass)) return false;
    }

    if (filters.dateRange) {
      if (trade.tradeDate < filters.dateRange.start || trade.tradeDate > filters.dateRange.end) {
        return false;
      }
    }

    if (filters.outcome && filters.outcome.length > 0) {
      if (!filters.outcome.includes(trade.outcome)) return false;
    }

    if (filters.grade && filters.grade.length > 0) {
      if (!filters.grade.includes(trade.grade)) return false;
    }

    if (filters.strategyId && filters.strategyId.length > 0) {
      if (!filters.strategyId.includes(trade.strategyId)) return false;
    }

    if (filters.setupTags && filters.setupTags.length > 0) {
      const hasAnySetup = trade.setupTags.some((tag) => filters.setupTags!.includes(tag));
      if (!hasAnySetup) return false;
    }

    if (filters.mistakes && filters.mistakes.length > 0) {
      const hasAnyMistake = trade.mistakes.some((tag) => filters.mistakes!.includes(tag));
      if (!hasAnyMistake) return false;
    }

    if (filters.session && filters.session.length > 0) {
      if (!filters.session.includes(trade.session)) return false;
    }

    if (filters.marketRegime && filters.marketRegime.length > 0) {
      if (!filters.marketRegime.includes(trade.marketRegime)) return false;
    }

    if (filters.newsTags && filters.newsTags.length > 0) {
      const hasAnyNews = trade.newsTags.some((tag) => filters.newsTags!.includes(tag));
      if (!hasAnyNews) return false;
    }

    if (filters.reviewFlag !== undefined) {
      if (trade.reviewFlag !== filters.reviewFlag) return false;
    }

    if (filters.collections && filters.collections.length > 0) {
      const hasAnyCollection = filters.collections.some((colId) => trade.collections.includes(colId));
      if (!hasAnyCollection) return false;
    }

    if (trade.assetClass === AssetClass.FUTURES && filters.instrumentRoot && filters.instrumentRoot.length > 0) {
      if (!filters.instrumentRoot.includes(trade.instrumentRoot)) return false;
    }

    if (trade.assetClass === AssetClass.OPTIONS && filters.underlying && filters.underlying.length > 0) {
      if (!filters.underlying.includes(trade.underlying)) return false;
    }

    return true;
  });
}

export function buildSavedFilters(): SavedFilter[] {
  return [
    {
      id: 'filter-1',
      name: 'Winning Trades',
      filters: {
        outcome: [Outcome.WIN],
      },
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'filter-2',
      name: 'A Grade Trades',
      filters: {
        grade: [Grade.A],
      },
      createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'filter-3',
      name: 'Trades with Mistakes',
      filters: {
        mistakes: [], // Will be populated with any mistake tag
      },
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'filter-4',
      name: 'NY Session Only',
      filters: {
        session: [Session.NEW_YORK],
      },
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'filter-5',
      name: 'Trending Markets',
      filters: {
        marketRegime: [MarketRegime.TREND_UP, MarketRegime.TREND_DOWN],
      },
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    },
  ];
}
