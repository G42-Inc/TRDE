// Group executions into round-trip trades

import { BREAKEVEN_THRESHOLD } from '../constants';
import type { NormalizedExecution, RoundTripTrade } from '../types';
import { isoToUnixSeconds } from '../utils/time';

/**
 * Group executions into round-trip trades
 * 
 * Algorithm:
 * 1. Sort executions by timestamp
 * 2. Track net position
 * 3. When net position returns to 0, close a trade
 * 4. Compute weighted average entry/exit prices
 */
export function groupExecutionsIntoRoundTrips(
  executions: NormalizedExecution[]
): RoundTripTrade[] {
  if (executions.length === 0) return [];

  // Sort by timestamp
  const sorted = [...executions].sort(
    (a, b) => new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime()
  );

  const trades: RoundTripTrade[] = [];
  let currentTrade: {
    executions: NormalizedExecution[];
    netPosition: number;
    entryPriceSum: number;
    entrySizeSum: number;
    exitPriceSum: number;
    exitSizeSum: number;
    feesTotal: number;
    pnlGross: number;
  } | null = null;

  for (const exec of sorted) {
    if (exec.voided) continue; // Skip voided executions

    const size = exec.side === 'BUY' ? exec.size : -exec.size;
    const newPosition = (currentTrade?.netPosition || 0) + size;

    if (currentTrade === null) {
      // Start new trade
      if (size === 0) continue;
      
      currentTrade = {
        executions: [exec],
        netPosition: size,
        entryPriceSum: exec.price * Math.abs(size),
        entrySizeSum: Math.abs(size),
        exitPriceSum: 0,
        exitSizeSum: 0,
        feesTotal: exec.fees,
        pnlGross: exec.profitAndLoss || 0,
      };
    } else {
      // Add to current trade
      currentTrade.executions.push(exec);
      currentTrade.feesTotal += exec.fees;
      currentTrade.pnlGross += exec.profitAndLoss || 0;

      if (newPosition === 0) {
        // Close trade
        const direction = currentTrade.netPosition > 0 ? 'LONG' : 'SHORT';
        const qty = Math.abs(currentTrade.netPosition);
        
        // Calculate weighted averages
        const avgEntryPrice = currentTrade.entryPriceSum / currentTrade.entrySizeSum;
        const avgExitPrice = currentTrade.exitPriceSum / currentTrade.exitSizeSum || avgEntryPrice;

        // If we don't have PnL from API, estimate it
        let pnlGross = currentTrade.pnlGross;
        if (pnlGross === 0 && currentTrade.executions.length > 1) {
          // Estimate from price difference (will need contract metadata for tickValue)
          // For now, use simple price difference
          const priceDiff = direction === 'LONG' 
            ? avgExitPrice - avgEntryPrice
            : avgEntryPrice - avgExitPrice;
          pnlGross = priceDiff * qty; // This is approximate, needs tickValue
        }

        const pnlNet = pnlGross - currentTrade.feesTotal;
        
        const entryTime = currentTrade.executions[0].timestampUtc;
        const exitTime = exec.timestampUtc;
        const durationMs = new Date(exitTime).getTime() - new Date(entryTime).getTime();

        trades.push({
          tradeId: `trade-${trades.length + 1}-${isoToUnixSeconds(entryTime)}`,
          contractId: exec.contractId,
          entryTime,
          exitTime,
          avgEntryPrice,
          avgExitPrice,
          direction,
          qty,
          feesTotal: currentTrade.feesTotal,
          pnlGross,
          pnlNet,
          outcome: pnlNet > BREAKEVEN_THRESHOLD ? 'WIN' 
            : pnlNet < -BREAKEVEN_THRESHOLD ? 'LOSS' 
            : 'BREAKEVEN',
          executions: [...currentTrade.executions],
          durationMs,
        });

        currentTrade = null;
      } else {
        // Update position
        const absSize = Math.abs(size);
        if (Math.sign(newPosition) === Math.sign(currentTrade.netPosition) || currentTrade.netPosition === 0) {
          // Same direction or starting new - add to entry
          currentTrade.entryPriceSum += exec.price * absSize;
          currentTrade.entrySizeSum += absSize;
        } else {
          // Opposite direction - closing position, add to exit
          currentTrade.exitPriceSum += exec.price * absSize;
          currentTrade.exitSizeSum += absSize;
        }
        currentTrade.netPosition = newPosition;
      }
    }
  }

  // Handle any open position (shouldn't happen in practice, but handle gracefully)
  if (currentTrade !== null && currentTrade.executions.length > 0) {
    // Mark as partial trade or handle as needed
    // For now, we'll skip it as it's not a complete round trip
  }

  return trades;
}
