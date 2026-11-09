import type { DailyBias, RiskRules, StrategyVersion } from '@trde/core';

/** One daily bias per local calendar date; editing a day replaces its entry. */
export function mergeDailyBias(biases: DailyBias[], bias: DailyBias): DailyBias[] {
  return [...biases.filter((entry) => entry.date !== bias.date), bias];
}

export function dailyBiasFromRow(row: Record<string, any>): DailyBias {
  return {
    date: row.date, bias: row.bias, reason: row.reason ?? '', confidence: row.confidence ?? 50,
    confirmed: row.confirmed ?? undefined, confirmationNotes: row.confirmation_notes ?? undefined,
    confirmedAt: row.confirmed_at == null ? undefined : Number(row.confirmed_at),
  };
}

export function strategyVersionFromRow(row: Record<string, any>): StrategyVersion {
  return {
    id: row.id, strategyId: row.strategy_id, version: row.version ?? '',
    description: row.description ?? undefined,
    definition: row.metadata?.definition ?? undefined,
    triggers: row.metadata?.triggers ?? undefined,
    createdAt: Number(row.created_at),
  };
}

export function strategyVersionToRow(version: StrategyVersion, userId: string) {
  return {
    id: version.id, strategy_id: version.strategyId, user_id: userId,
    version: version.version ?? '', description: version.description ?? null,
    created_at: version.createdAt, updated_at: version.createdAt,
    metadata: { definition: version.definition ?? null, triggers: version.triggers ?? null },
  };
}

export function riskRulesToRow(rules: RiskRules, userId: string, timestamp: number) {
  return {
    user_id: userId,
    daily_loss_limit_usd: rules.dailyLossLimitUsd, max_trades_per_day: rules.maxTradesPerDay,
    max_contracts_per_trade: rules.maxContractsPerTrade,
    stop_after_consecutive_losses: rules.stopAfterConsecutiveLosses ?? null,
    stop_after_down_r: rules.stopAfterDownR ?? null,
    require_planned_risk: rules.requirePlannedRisk ?? false, require_stop_defined: rules.requireStopDefined ?? false,
    created_at: timestamp, updated_at: timestamp, metadata: {},
  };
}
