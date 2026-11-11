import type { SupabaseClient } from '@supabase/supabase-js';
import type { Trade } from '@trde/core';
import type { ValidatedTrade } from '../validation/schemas';

// SQL decimal/bigint values can be returned as numbers or strings.
const number = (value: unknown, fallback = 0): number => value == null ? fallback : Number(value);
const optionalNumber = (value: unknown): number | undefined => value == null ? undefined : Number(value);

export function tradeFromRow(row: Record<string, any>): Trade {
  const common = {
    id: row.id,
    assetClass: row.asset_class,
    createdAt: number(row.created_at),
    updatedAt: number(row.updated_at),
    tradeDate: row.trade_date,
    entryTime: number(row.entry_time),
    exitTime: number(row.exit_time),
    direction: row.direction,
    quantity: number(row.quantity),
    feesUsd: number(row.fees_usd),
    plannedRiskUsd: number(row.planned_risk_usd),
    resultUsd: number(row.result_usd),
    resultR: number(row.result_r),
    outcome: row.outcome,
    grade: row.grade,
    strategyId: row.strategy_id ?? '',
    strategyVersionId: row.strategy_version_id ?? '',
    session: row.session,
    marketRegime: row.market_regime,
    marketHoursTag: row.market_hours_tag,
    setupTags: row.setup_tags ?? [],
    newsTags: row.news_tags ?? [],
    mistakes: row.mistakes ?? [],
    ...(row.management_style ? { managementStyle: row.management_style } : {}),
    notes: row.notes ?? '',
    attachments: row.attachments ?? [],
    reviewFlag: row.review_flag ?? false,
    collections: row.collections ?? [],
    disciplineFlags: row.discipline_flags ?? {},
  };
  if (row.asset_class === 'FUTURES') {
    return {
      ...common,
      instrumentRoot: row.instrument_root,
      ...(row.metadata?.contractSymbol ? { contractSymbol: row.metadata.contractSymbol } : {}),
      entryPrice: number(row.entry_price),
      exitPrice: number(row.exit_price),
      ...(row.tick_size == null ? {} : { tickSize: optionalNumber(row.tick_size) }),
      ...(row.tick_value_usd == null ? {} : { tickValueUsd: optionalNumber(row.tick_value_usd) }),
      pointsPnL: number(row.points_pnl),
      ticksPnL: number(row.ticks_pnl),
      rthEth: row.rth_eth,
    } as Trade;
  }
  return {
    ...common,
    underlying: row.underlying,
    expiration: row.expiration,
    dte: number(row.dte),
    strike: number(row.strike),
    optionType: row.option_type,
    entryPremium: number(row.entry_premium),
    exitPremium: number(row.exit_premium),
    netPremiumPnLUsd: number(row.net_premium_pnl_usd),
    contractMultiplier: number(row.contract_multiplier, 100),
  } as Trade;
}

export function tradeToRow(trade: ValidatedTrade, userId: string) {
  return {
    id: trade.id,
    user_id: userId,
    asset_class: trade.assetClass,
    created_at: trade.createdAt,
    updated_at: trade.updatedAt,
    trade_date: trade.tradeDate,
    entry_time: trade.entryTime,
    exit_time: trade.exitTime,
    direction: trade.direction,
    quantity: trade.quantity,
    fees_usd: trade.feesUsd,
    planned_risk_usd: trade.plannedRiskUsd,
    result_usd: trade.resultUsd,
    result_r: trade.resultR,
    outcome: trade.outcome,
    grade: trade.grade,
    strategy_id: trade.strategyId || null,
    strategy_version_id: trade.strategyVersionId || null,
    session: trade.session,
    market_regime: trade.marketRegime,
    market_hours_tag: trade.marketHoursTag,
    setup_tags: trade.setupTags,
    news_tags: trade.newsTags,
    mistakes: trade.mistakes,
    management_style: trade.managementStyle ?? null,
    notes: trade.notes,
    attachments: trade.attachments,
    review_flag: trade.reviewFlag,
    collections: trade.collections,
    discipline_flags: trade.disciplineFlags,
    instrument_root: trade.assetClass === 'FUTURES' ? trade.instrumentRoot : null,
    entry_price: trade.assetClass === 'FUTURES' ? trade.entryPrice : null,
    exit_price: trade.assetClass === 'FUTURES' ? trade.exitPrice : null,
    tick_size: trade.assetClass === 'FUTURES' ? trade.tickSize ?? null : null,
    tick_value_usd: trade.assetClass === 'FUTURES' ? trade.tickValueUsd ?? null : null,
    points_pnl: trade.assetClass === 'FUTURES' ? trade.pointsPnL : null,
    ticks_pnl: trade.assetClass === 'FUTURES' ? trade.ticksPnL : null,
    rth_eth: trade.assetClass === 'FUTURES' ? trade.rthEth : null,
    underlying: trade.assetClass === 'OPTIONS' ? trade.underlying : null,
    expiration: trade.assetClass === 'OPTIONS' ? trade.expiration : null,
    dte: trade.assetClass === 'OPTIONS' ? trade.dte : null,
    strike: trade.assetClass === 'OPTIONS' ? trade.strike : null,
    option_type: trade.assetClass === 'OPTIONS' ? trade.optionType : null,
    entry_premium: trade.assetClass === 'OPTIONS' ? trade.entryPremium : null,
    exit_premium: trade.assetClass === 'OPTIONS' ? trade.exitPremium : null,
    net_premium_pnl_usd: trade.assetClass === 'OPTIONS' ? trade.netPremiumPnLUsd : null,
    contract_multiplier: trade.assetClass === 'OPTIONS' ? trade.contractMultiplier : null,
    metadata: trade.assetClass === 'FUTURES' && trade.contractSymbol ? { contractSymbol: trade.contractSymbol } : {},
  };
}

export class TradeConflictError extends Error {
  constructor() { super('A trade identifier conflicts with an existing record. Refresh and retry.'); }
}

/**
 * Use inserts for new IDs and owner-filtered updates for existing records.
 * An id-only service-role upsert can change another user's user_id, even if a
 * preliminary ownership check passed. Never use that operation here.
 */
export async function saveUserTrades(client: SupabaseClient, userId: string, trades: ValidatedTrade[]) {
  if (!trades.length) return;
  const { data: existing, error: readError } = await client.from('trades')
    .select('*').eq('user_id', userId).in('id', trades.map(trade => trade.id));
  if (readError) throw readError;
  const owned = new Map((existing ?? []).map(row => [row.id, row]));
  const newRows = trades.filter(trade => !owned.has(trade.id)).map(trade => tradeToRow(trade, userId));
  if (newRows.length) {
    // INSERT is atomic for this group: a collision cannot overwrite or reassign a row.
    const { error } = await client.from('trades').insert(newRows);
    if (error?.code === '23505') throw new TradeConflictError();
    if (error) throw error;
  }
  const edits = trades.filter(trade => owned.has(trade.id));
  // Limit concurrent database requests. Unchanged records need no write.
  for (let offset = 0; offset < edits.length; offset += 10) {
    await Promise.all(edits.slice(offset, offset + 10).map(async trade => {
      const current = owned.get(trade.id)!;
      const row = tradeToRow(trade, userId);
      const previous = tradeToRow(tradeFromRow(current) as unknown as ValidatedTrade, userId);
      if (JSON.stringify(row) === JSON.stringify(previous)) return;
      // Preserve opaque legacy metadata; it is never taken from the request body.
      row.metadata = { ...current.metadata, ...row.metadata };
      const { data, error } = await client.from('trades').update(row)
        .eq('id', trade.id).eq('user_id', userId).select('id');
      if (error) throw error;
      if (data?.length !== 1) throw new TradeConflictError();
    }));
  }
}
