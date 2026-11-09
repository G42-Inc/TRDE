import type { Trade, RiskRules } from '@trde/core';

/**
 * Automatically calculates discipline flags for a trade based on:
 * - Risk rules configuration
 * - Other trades from the same day
 * - Trade data itself
 */
export function calculateDisciplineFlags(
  trade: Trade,
  allTrades: Trade[],
  riskRules: RiskRules | null,
  hasJournal: boolean = false
): Trade['disciplineFlags'] {
  if (!riskRules) {
    // If no risk rules are set, default all to true (no violations)
    return {
      respectedDailyLossLimit: true,
      respectedMaxTrades: true,
      respectedMaxContracts: true,
      hadStopDefined: true,
      followedEntryRules: true,
      followedExitRules: true,
      journalCompleted: hasJournal,
    };
  }

  // Get all trades from the same day (excluding the current trade if it's being updated)
  const sameDayTrades = allTrades.filter(
    (t) => t.tradeDate === trade.tradeDate && t.id !== trade.id
  );

  // Calculate cumulative loss for the day (only count losses, not wins)
  // Sum all negative P&L values (losses) for the day
  const dailyLoss = Math.abs(
    sameDayTrades
      .filter(t => t.resultUsd < 0)
      .reduce((sum, t) => sum + t.resultUsd, 0) + 
    (trade.resultUsd < 0 ? trade.resultUsd : 0)
  );

  // Count total trades for the day (including this trade)
  const dailyTradeCount = sameDayTrades.length + 1;

  // Check if stop was defined (if requireStopDefined is true, check if plannedRiskUsd is set)
  // A stop is considered defined if plannedRiskUsd is present and > 0
  const hasStopDefined = trade.plannedRiskUsd > 0;

  return {
    // Check if daily loss limit was respected
    respectedDailyLossLimit: riskRules.dailyLossLimitUsd === 0 || dailyLoss <= riskRules.dailyLossLimitUsd,
    
    // Check if max trades per day was respected
    respectedMaxTrades: riskRules.maxTradesPerDay === 0 || dailyTradeCount <= riskRules.maxTradesPerDay,
    
    // Check if max contracts per trade was respected
    respectedMaxContracts: riskRules.maxContractsPerTrade === 0 || trade.quantity <= riskRules.maxContractsPerTrade,
    
    // Check if stop was defined (if required)
    hadStopDefined: !riskRules.requireStopDefined || hasStopDefined,
    
    // Entry/exit rules are harder to auto-detect without strategy rules
    // For now, default to true (we can enhance this later with strategy rule checking)
    followedEntryRules: true,
    followedExitRules: true,
    
    // Check if journal was completed
    journalCompleted: hasJournal,
  };
}
