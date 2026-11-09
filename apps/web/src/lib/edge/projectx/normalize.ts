// Normalize ProjectX API responses to internal types

import { SIDE_MAP } from '../constants';
import type {
  ProjectXTrade,
  NormalizedExecution,
  ProjectXBar,
  LightweightBar,
} from '../types';
import { isoToUnixSeconds } from '../utils/time';

/**
 * Normalize ProjectX trade to internal execution format
 */
export function normalizeExecution(trade: ProjectXTrade): NormalizedExecution {
  return {
    id: trade.id,
    contractId: trade.contractId,
    timestampUtc: trade.creationTimestamp,
    side: SIDE_MAP[trade.side] || (trade.side === 1 ? 'BUY' : 'SELL'),
    size: trade.size,
    price: trade.price,
    fees: trade.fees,
    profitAndLoss: trade.profitAndLoss,
    orderId: trade.orderId,
    voided: trade.voided,
  };
}

/**
 * Normalize ProjectX bars to Lightweight Charts format
 */
export function normalizeBars(bars: ProjectXBar[]): LightweightBar[] {
  return bars
    .map((bar) => ({
      time: isoToUnixSeconds(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }))
    .sort((a, b) => a.time - b.time); // Ensure sorted by time
}
