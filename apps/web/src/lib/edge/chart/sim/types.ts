// Simulation Trading Types

export type SimOrderSide = 'BUY' | 'SELL';
export type SimOrderType = 'MARKET';

export interface SimOrderIntent {
  side: SimOrderSide;
  qty: number;
  type: SimOrderType;
  placedAtReplayIndex: number;
  targetReplayIndex: number; // Index where it should fill (currentIndex + 1)
  timestamp: string; // ISO timestamp when order was placed
}

export interface SimFill {
  timeUtc: string; // ISO timestamp
  replayIndex: number;
  side: SimOrderSide;
  qty: number;
  price: number; // Fill price (next bar open + slippage)
  feesApplied: number;
  slippageTicks: number;
  commissionPerContract: number;
}

export interface SimPosition {
  entryFeesUsd?: number; // Unallocated opening commissions; optional for older saved sessions.
  qty: number; // Positive = long, negative = short, 0 = flat
  avgPrice: number | null; // Average entry price
  entryTimeUtc: string | null; // Entry time for the current position (for tracking when position was opened)
}

export interface SimTradeClosed {
  id: string; // Generated UUID
  entryTimeUtc: string;
  exitTimeUtc: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'LONG' | 'SHORT';
  qty: number;
  realizedTicks: number;
  realizedUsd: number;
  feesUsd: number;
  netUsd: number;
  assumptions: {
    slippageTicks: number;
    commissionPerContractPerSide: number;
  };
  contractId: string;
  contractName?: string;
}

export interface SimSessionState {
  sessionId: string; // Unique session identifier
  contractId: string;
  contractName?: string; // Optional contract name for display
  position: SimPosition;
  fills: SimFill[];
  closedTrades: SimTradeClosed[];
  orderIntents: SimOrderIntent[];
  settings: SimSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SimSettings {
  slippageTicks: number;
  commissionPerContractPerSide: number;
}

export interface SimPnL {
  unrealizedTicks: number;
  unrealizedUsd: number;
  realizedTicks: number;
  realizedUsd: number;
  totalTicks: number;
  totalUsd: number;
  feesPaid: number;
}

export interface SimStats {
  tradesClosed: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}
