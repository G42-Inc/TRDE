// PnL Calculation Utilities

import type { SimPosition, SimFill, SimTradeClosed, SimSettings, SimPnL, SimStats } from './types';

export interface ContractMetadata {
  tickSize: number;
  tickValue: number;
}

/**
 * Calculate unrealized P&L for a position
 */
export function calculateUnrealizedPnL(
  position: SimPosition,
  currentPrice: number,
  contract: ContractMetadata
): { ticks: number; usd: number } {
  if (position.qty === 0 || position.avgPrice === null) {
    return { ticks: 0, usd: 0 };
  }

  const priceDiff = currentPrice - position.avgPrice;
  const sign = position.qty > 0 ? 1 : -1; // Long = +1, Short = -1
  
  const unrealizedTicks = (priceDiff * sign) / contract.tickSize;
  const unrealizedUsd = unrealizedTicks * contract.tickValue * Math.abs(position.qty);

  return { ticks: unrealizedTicks, usd: unrealizedUsd };
}

/**
 * Calculate realized P&L for a closing fill
 */
export function calculateRealizedPnL(
  entryPrice: number,
  exitPrice: number,
  qty: number,
  direction: 'LONG' | 'SHORT',
  contract: ContractMetadata
): { ticks: number; usd: number } {
  const priceDiff = exitPrice - entryPrice;
  const sign = direction === 'LONG' ? 1 : -1;
  
  const realizedTicks = (priceDiff * sign) / contract.tickSize;
  const realizedUsd = realizedTicks * contract.tickValue * Math.abs(qty);

  return { ticks: realizedTicks, usd: realizedUsd };
}

/**
 * Apply slippage to fill price
 */
export function applySlippage(
  basePrice: number,
  side: 'BUY' | 'SELL',
  slippageTicks: number,
  tickSize: number
): number {
  if (slippageTicks === 0) return basePrice;
  
  const slippageAmount = slippageTicks * tickSize;
  return side === 'BUY' ? basePrice + slippageAmount : basePrice - slippageAmount;
}

/**
 * Calculate fees for a fill
 */
export function calculateFees(
  qty: number,
  commissionPerContractPerSide: number
): number {
  return Math.abs(qty) * commissionPerContractPerSide;
}

/**
 * Calculate total P&L from session state
 */
export function calculateTotalPnL(
  position: SimPosition,
  currentPrice: number,
  closedTrades: SimTradeClosed[],
  contract: ContractMetadata
): SimPnL {
  // Unrealized P&L
  const unrealized = calculateUnrealizedPnL(position, currentPrice, contract);
  
  // Realized P&L from closed trades
  const realizedTicks = closedTrades.reduce((sum, trade) => sum + trade.realizedTicks, 0);
  const realizedUsd = closedTrades.reduce((sum, trade) => sum + trade.netUsd, 0);
  
  // Total fees paid
  const entryFees = position.entryFeesUsd ?? 0;
  const feesPaid = closedTrades.reduce((sum, trade) => sum + trade.feesUsd, 0) + entryFees;
  
  return {
    unrealizedTicks: unrealized.ticks,
    unrealizedUsd: unrealized.usd,
    realizedTicks,
    realizedUsd,
    totalTicks: unrealized.ticks + realizedTicks,
    totalUsd: unrealized.usd + realizedUsd - entryFees,
    feesPaid,
  };
}

/**
 * Calculate session statistics
 */
export function calculateStats(closedTrades: SimTradeClosed[]): SimStats {
  if (closedTrades.length === 0) {
    return {
      tradesClosed: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
    };
  }

  const wins = closedTrades.filter(t => t.netUsd > 0.01);
  const losses = closedTrades.filter(t => t.netUsd < -0.01);
  const breakevens = closedTrades.filter(t => Math.abs(t.netUsd) <= 0.01);

  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.netUsd, 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? losses.reduce((sum, t) => sum + t.netUsd, 0) / losses.length
    : 0;

  const grossProfit = wins.reduce((sum, t) => sum + t.netUsd, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.netUsd, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.netUsd)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.netUsd)) : 0;

  return {
    tradesClosed: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
  };
}
