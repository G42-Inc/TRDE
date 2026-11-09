import type { Trade, RuleViolation } from '@trde/core';

/**
 * Detects rule violations from a trade's discipline flags
 */
export function detectViolationsFromTrade(trade: Trade): string[] {
  const violations: string[] = [];
  const flags = trade.disciplineFlags;

  if (!flags.respectedDailyLossLimit) {
    violations.push('respectedDailyLossLimit');
  }
  if (!flags.respectedMaxTrades) {
    violations.push('respectedMaxTrades');
  }
  if (!flags.respectedMaxContracts) {
    violations.push('respectedMaxContracts');
  }
  if (!flags.hadStopDefined) {
    violations.push('hadStopDefined');
  }
  if (!flags.followedEntryRules) {
    violations.push('followedEntryRules');
  }
  if (!flags.followedExitRules) {
    violations.push('followedExitRules');
  }
  // Note: journalCompleted is not typically a "violation" that needs immediate review
  // but we can include it if desired

  return violations;
}

/**
 * Get a human-readable name for a violation rule
 */
export function getViolationRuleName(rule: string): string {
  const names: Record<string, string> = {
    respectedDailyLossLimit: 'Respected Daily Loss Limit',
    respectedMaxTrades: 'Respected Max Trades',
    respectedMaxContracts: 'Respected Max Contracts',
    hadStopDefined: 'Had Stop Defined',
    followedEntryRules: 'Followed Entry Rules',
    followedExitRules: 'Followed Exit Rules',
    journalCompleted: 'Journal Completed',
  };
  return names[rule] || rule;
}
