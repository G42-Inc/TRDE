// Simulation Trading Engine

import type {
  SimOrderIntent,
  SimFill,
  SimPosition,
  SimTradeClosed,
  SimSessionState,
  SimSettings,
  SimOrderSide,
} from './types';
import { applySlippage, calculateFees, calculateRealizedPnL } from './pnl';

export interface ContractMetadata {
  tickSize: number;
  tickValue: number;
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Create a new simulation session
 */
export function createSimSession(
  contractId: string,
  contractName: string | undefined,
  settings: SimSettings
): SimSessionState {
  const sessionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  return {
    sessionId,
    contractId,
    contractName, // Store contractName in session state
    position: { qty: 0, avgPrice: null, entryTimeUtc: null },
    fills: [],
    closedTrades: [],
    orderIntents: [],
    settings,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Place a market order (queued for next bar open)
 */
export function placeMarketOrder(
  session: SimSessionState,
  side: SimOrderSide,
  qty: number,
  currentReplayIndex: number
): SimSessionState {
  if (qty <= 0) return session;

  const intent: SimOrderIntent = {
    side,
    qty,
    type: 'MARKET',
    placedAtReplayIndex: currentReplayIndex,
    targetReplayIndex: currentReplayIndex + 1,
    timestamp: new Date().toISOString(),
  };

  return {
    ...session,
    orderIntents: [...session.orderIntents, intent],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Process fills at current replay index
 */
export function processFills(
  session: SimSessionState,
  currentReplayIndex: number,
  nextBar: Bar | null,
  contract: ContractMetadata
): SimSessionState {
  if (!nextBar) return session;

  // Find intents that should fill at this index
  const intentsToFill = session.orderIntents.filter(
    (intent) => intent.targetReplayIndex === currentReplayIndex
  );

  if (intentsToFill.length === 0) return session;

  let newPosition = { ...session.position };
  const newFills: SimFill[] = [];
  const newClosedTrades: SimTradeClosed[] = [];
  const remainingIntents = session.orderIntents.filter(
    (intent) => intent.targetReplayIndex !== currentReplayIndex
  );

  for (const intent of intentsToFill) {
    // Apply slippage to fill price
    const fillPrice = applySlippage(
      nextBar.open,
      intent.side,
      session.settings.slippageTicks,
      contract.tickSize
    );

    // Calculate fees
    const fees = calculateFees(
      intent.qty,
      session.settings.commissionPerContractPerSide
    );

    const fill: SimFill = {
      timeUtc: new Date(nextBar.time * 1000).toISOString(),
      replayIndex: currentReplayIndex,
      side: intent.side,
      qty: intent.qty,
      price: fillPrice,
      feesApplied: fees,
      slippageTicks: session.settings.slippageTicks,
      commissionPerContract: session.settings.commissionPerContractPerSide,
    };

    newFills.push(fill);

    // Update position and calculate realized P&L if closing/reducing
    const { position, closedTrades } = processFill(
      newPosition,
      fill,
      contract,
      session.contractId,
      session.contractName,
      session.settings
    );

    newPosition = position;
    newClosedTrades.push(...closedTrades);
  }

  return {
    ...session,
    position: newPosition,
    fills: [...session.fills, ...newFills],
    closedTrades: [...session.closedTrades, ...newClosedTrades],
    orderIntents: remainingIntents,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Process a single fill and update position
 */
function processFill(
  currentPosition: SimPosition,
  fill: SimFill,
  contract: ContractMetadata,
  contractId: string,
  contractName: string | undefined,
  settings: SimSettings
): { position: SimPosition; closedTrades: SimTradeClosed[] } {
  const closedTrades: SimTradeClosed[] = [];
  let position = { ...currentPosition };

  const fillQty = fill.side === 'BUY' ? fill.qty : -fill.qty;
  const newQty = (position.qty || 0) + fillQty;

  // Case 1: Opening a new position
  if (position.qty === 0) {
    position = {
      qty: newQty,
      avgPrice: fill.price,
      entryTimeUtc: fill.timeUtc,
    };
  }
  // Case 2: Adding to existing position (same direction)
  else if ((position.qty > 0 && fillQty > 0) || (position.qty < 0 && fillQty < 0)) {
    const totalCost = (position.avgPrice || 0) * Math.abs(position.qty) + fill.price * Math.abs(fillQty);
    const totalQty = Math.abs(position.qty) + Math.abs(fillQty);
    position = {
      qty: newQty,
      avgPrice: totalCost / totalQty,
      entryTimeUtc: position.entryTimeUtc, // Keep original entry time when scaling in
    };
  }
  // Case 3: Reducing or flipping position
  else {
    const absCurrentQty = Math.abs(position.qty);
    const absFillQty = Math.abs(fillQty);
    const absNewQty = Math.abs(newQty);

    // Calculate how much is being closed
    const closingQty = Math.min(absCurrentQty, absFillQty);
    const remainingQty = absCurrentQty - closingQty;

    // Realize P&L on closed portion
    if (closingQty > 0 && position.avgPrice !== null && position.entryTimeUtc !== null) {
      const direction = position.qty > 0 ? 'LONG' : 'SHORT';
      const realized = calculateRealizedPnL(
        position.avgPrice,
        fill.price,
        closingQty,
        direction,
        contract
      );

      const fees = calculateFees(closingQty, settings.commissionPerContractPerSide);

      const closedTrade: SimTradeClosed = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entryTimeUtc: position.entryTimeUtc, // Use the original entry time when position was opened
        exitTimeUtc: fill.timeUtc, // Exit time is when the opposite order was filled
        entryPrice: position.avgPrice,
        exitPrice: fill.price,
        direction,
        qty: closingQty,
        realizedTicks: realized.ticks,
        realizedUsd: realized.usd,
        feesUsd: fees,
        netUsd: realized.usd - fees,
        assumptions: {
          slippageTicks: settings.slippageTicks,
          commissionPerContractPerSide: settings.commissionPerContractPerSide,
        },
        contractId,
        contractName,
      };

      closedTrades.push(closedTrade);
    }

    // Update position
    if (remainingQty > 0) {
      // Partial close - position remains in same direction
      position = {
        qty: position.qty > 0 ? remainingQty : -remainingQty,
        avgPrice: position.avgPrice, // Keep same avg price
        entryTimeUtc: position.entryTimeUtc, // Keep same entry time
      };
    } else if (absNewQty > 0) {
      // Flipped - new position in opposite direction
      position = {
        qty: newQty,
        avgPrice: fill.price,
        entryTimeUtc: fill.timeUtc, // New entry time for flipped position
      };
    } else {
      // Fully closed
      position = {
        qty: 0,
        avgPrice: null,
        entryTimeUtc: null,
      };
    }
  }

  return { position, closedTrades };
}

/**
 * Place a market order and fill immediately at current bar (for bid/ask buttons)
 */
export function placeMarketOrderImmediate(
  session: SimSessionState,
  side: SimOrderSide,
  qty: number,
  currentReplayIndex: number,
  currentBar: Bar,
  contract: ContractMetadata
): SimSessionState {
  if (qty <= 0) return session;

  // Apply slippage to fill price (bid = current price - slippage, ask = current price + slippage)
  const fillPrice = applySlippage(
    currentBar.close, // Use current bar close as base price
    side,
    session.settings.slippageTicks,
    contract.tickSize
  );

  // Calculate fees
  const fees = calculateFees(
    qty,
    session.settings.commissionPerContractPerSide
  );

  const fill: SimFill = {
    timeUtc: new Date(currentBar.time * 1000).toISOString(),
    replayIndex: currentReplayIndex,
    side,
    qty,
    price: fillPrice,
    feesApplied: fees,
    slippageTicks: session.settings.slippageTicks,
    commissionPerContract: session.settings.commissionPerContractPerSide,
  };

  // Process fill immediately
  const { position, closedTrades } = processFill(
    session.position,
    fill,
    contract,
    session.contractId,
    session.contractName,
    session.settings
  );

  // Set entry time if opening new position
  const updatedPosition = position.qty !== 0 && position.entryTimeUtc === null
    ? { ...position, entryTimeUtc: fill.timeUtc }
    : position;

  return {
    ...session,
    position: updatedPosition,
    fills: [...session.fills, fill],
    closedTrades: [...session.closedTrades, ...closedTrades],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Close entire position
 */
export function closePosition(
  session: SimSessionState,
  currentReplayIndex: number
): SimSessionState {
  if (session.position.qty === 0) return session;

  const side: SimOrderSide = session.position.qty > 0 ? 'SELL' : 'BUY';
  const qty = Math.abs(session.position.qty);

  return placeMarketOrder(session, side, qty, currentReplayIndex);
}

/**
 * Reset simulation session
 */
export function resetSimulation(session: SimSessionState): SimSessionState {
  return {
    ...session,
    position: { qty: 0, avgPrice: null, entryTimeUtc: null },
    fills: [],
    closedTrades: [],
    orderIntents: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update simulation settings
 */
export function updateSimSettings(
  session: SimSessionState,
  settings: Partial<SimSettings>
): SimSessionState {
  return {
    ...session,
    settings: { ...session.settings, ...settings },
    updatedAt: new Date().toISOString(),
  };
}
