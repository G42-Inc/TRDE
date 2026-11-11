import { getEdgeAccountScope, isCurrentEdgeAccount, type EdgeAccountScope } from '../../store/accountScope';
// Export simulated trades to TRDE journal

import type { SimTradeClosed } from './types';
import { FuturesInstrument, Direction, Outcome, AssetClass, Grade, Session, MarketRegime, MarketHoursTag, NewsTag, RthEth, type FuturesTrade, type Trade } from '@trde/core';
import { extractSymbol } from '../../projectx/mapping';
import { format } from 'date-fns';
import * as cloudStorage from '@/lib/storage.db';
import { calculateDisciplineFlags } from '@/lib/discipline-flags';

/**
 * Map contract symbol to FuturesInstrument enum
 */
function mapSymbolToInstrument(symbol: string): FuturesInstrument | null {
  const symbolUpper = symbol.toUpperCase();
  
  if (Object.values(FuturesInstrument).includes(symbolUpper as FuturesInstrument)) {
    return symbolUpper as FuturesInstrument;
  }
  
  const symbolMap: Record<string, FuturesInstrument> = {
    'ENQ': FuturesInstrument.NQ,
    'MNQ': FuturesInstrument.MNQ,
    'MES': FuturesInstrument.MES,
    'MYM': FuturesInstrument.MYM,
    'M2K': FuturesInstrument.M2K,
    'MGC': FuturesInstrument.MGC,
    'MCL': FuturesInstrument.MCL,
  };
  
  return symbolMap[symbolUpper] || null;
}

/**
 * Get default tick size and value for a futures instrument
 */
function getDefaultTickInfo(instrument: FuturesInstrument): { tickSize: number; tickValueUsd: number } {
  // Default tick sizes and values for common futures contracts
  // Using Partial since we don't have all instruments defined
  const defaults: Partial<Record<FuturesInstrument, { tickSize: number; tickValueUsd: number }>> = {
    [FuturesInstrument.ES]: { tickSize: 0.25, tickValueUsd: 12.5 },
    [FuturesInstrument.NQ]: { tickSize: 0.25, tickValueUsd: 5.0 },
    [FuturesInstrument.MNQ]: { tickSize: 0.25, tickValueUsd: 0.5 },
    [FuturesInstrument.MES]: { tickSize: 0.25, tickValueUsd: 1.25 },
    [FuturesInstrument.YM]: { tickSize: 1.0, tickValueUsd: 5.0 },
    [FuturesInstrument.MYM]: { tickSize: 1.0, tickValueUsd: 0.5 },
    [FuturesInstrument.RTY]: { tickSize: 0.1, tickValueUsd: 5.0 },
    [FuturesInstrument.M2K]: { tickSize: 0.1, tickValueUsd: 0.5 },
    [FuturesInstrument.CL]: { tickSize: 0.01, tickValueUsd: 10.0 },
    [FuturesInstrument.MCL]: { tickSize: 0.01, tickValueUsd: 1.0 },
    [FuturesInstrument.GC]: { tickSize: 0.1, tickValueUsd: 10.0 },
    [FuturesInstrument.MGC]: { tickSize: 0.1, tickValueUsd: 1.0 },
  };
  
  const info = defaults[instrument];
  if (!info) throw new Error(`Tick specifications for ${instrument} are not supported for simulation export.`);
  return info;
}

/**
 * Convert simulated trade to TRDE trade form data
 */
export function simTradeToTrdeFormData(trade: SimTradeClosed): {
  tradeDate: string;
  entryTime: string;
  exitTime: string;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  resultUsd: number;
  feesUsd: number;
  outcome: Outcome;
  instrumentRoot: FuturesInstrument;
  notes: string;
  isPractice: boolean;
  source: string;
} {
  const entryDate = new Date(trade.entryTimeUtc);
  const exitDate = new Date(trade.exitTimeUtc);
  
  const symbol = extractSymbol(trade.contractId);
  const instrumentRoot = mapSymbolToInstrument(symbol);
  if (!instrumentRoot) throw new Error(`Instrument ${symbol} is not supported for simulation export.`);
  
  const outcome = trade.netUsd > 0.01 ? Outcome.WIN 
    : trade.netUsd < -0.01 ? Outcome.LOSS 
    : Outcome.BREAKEVEN;
  
  const direction = trade.direction === 'LONG' ? Direction.LONG : Direction.SHORT;
  
  const notes = `Simulated trade from EDGE Replay\n` +
    `Contract: ${trade.contractName || trade.contractId}\n` +
    `Realized: ${trade.realizedTicks.toFixed(1)} ticks / $${trade.realizedUsd.toFixed(2)}\n` +
    `Fees: $${trade.feesUsd.toFixed(2)}\n` +
    `Assumptions: ${trade.assumptions.slippageTicks} ticks slippage, $${trade.assumptions.commissionPerContractPerSide} commission per contract\n` +
    `Sim Trade ID: ${trade.id}`;
  
  return {
    tradeDate: format(entryDate, 'yyyy-MM-dd'),
    entryTime: format(entryDate, 'HH:mm'),
    exitTime: format(exitDate, 'HH:mm'),
    direction,
    quantity: trade.qty,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    resultUsd: trade.netUsd,
    feesUsd: trade.feesUsd,
    outcome,
    instrumentRoot,
    notes,
    isPractice: true,
    source: 'EDGE_SIM',
  };
}

/**
 * Store simulated trades for import into TRDE journal (legacy - redirects to direct save)
 */
export function storeSimTradesForImport(trades: SimTradeClosed[]): Promise<number> {
  return saveSimTradesToJournal(trades);
}

/**
 * Directly save simulated trades to TRDE journal with EDGE tag
 */
export async function saveSimTradesToJournal(trades: SimTradeClosed[], scope: EdgeAccountScope | null = getEdgeAccountScope()): Promise<number> {
  if (!isCurrentEdgeAccount(scope)) return 0;
  if (typeof window === 'undefined') return 0;
  if (trades.length === 0) return 0;

  // Validate the complete batch before writing a collection or any journal rows.
  for (const trade of trades) {
    const instrument = mapSymbolToInstrument(extractSymbol(trade.contractId));
    if (!instrument) throw new Error('This instrument is not supported for simulation export.');
    getDefaultTickInfo(instrument);
  }

  // Get or create EDGE collection
  const collections = await cloudStorage.getCollections();
  if (!isCurrentEdgeAccount(scope)) return 0;
  let edgeCollection = collections.find((c) => c.name === 'EDGE');
  
  if (!edgeCollection) {
    edgeCollection = {
      id: `collection-edge-${Date.now()}`,
      name: 'EDGE',
      description: 'Trades from EDGE simulation',
      tradeIds: [], // Required by Collection type
      createdAt: Date.now(),
      // Note: Collection type doesn't have updatedAt, but database stores it
    };
    await cloudStorage.saveCollections([...collections, edgeCollection]);
    if (!isCurrentEdgeAccount(scope)) return 0;
  }

  // Always get the latest trades to ensure we have the most up-to-date list for duplicate detection
  const existingTrades = await cloudStorage.getTrades();
  if (!isCurrentEdgeAccount(scope)) return 0;
  const riskRules = await cloudStorage.getRiskRules();
  if (!isCurrentEdgeAccount(scope)) return 0;
  const now = Date.now();
  
  // Create a set of existing Sim Trade IDs from notes to prevent duplicates
  const existingSimTradeIds = new Set<string>();
  // Also create a set of trade signatures (entry time, exit time, entry price, exit price, qty, direction)
  // to detect duplicates even if Sim Trade ID is different
  const existingTradeSignatures = new Set<string>();
  
  existingTrades.forEach(trade => {
    // Check for Sim Trade ID in notes
    const notes = trade.notes || '';
    const match = notes.match(/Sim Trade ID: ([^\n]+)/);
    if (match && match[1]) {
      existingSimTradeIds.add(match[1].trim());
    }
    
    // Create a signature for EDGE trades to detect duplicates by trade characteristics
    if (trade.notes?.includes('[EDGE Simulation]')) {
      const signature = `${trade.entryTime}-${trade.exitTime}-${(trade as FuturesTrade).entryPrice}-${(trade as FuturesTrade).exitPrice}-${trade.quantity}-${trade.direction}`;
      existingTradeSignatures.add(signature);
    }
  });
  
  // Also track Sim Trade IDs and signatures we're about to save in this batch to prevent duplicates within the same call
  const batchSimTradeIds = new Set<string>();
  const batchTradeSignatures = new Set<string>();
  
  const newTrades: Trade[] = trades
    .filter((simTrade) => {
      // Check if this trade was already saved (prevent duplicates)
      // First check if Sim Trade ID exists in already saved trades
      if (existingSimTradeIds.has(simTrade.id)) {
        return false;
      }
      // Then check if we're about to save it in this same batch (by ID)
      if (batchSimTradeIds.has(simTrade.id)) {
        return false;
      }
      
      // Also check by trade signature (entry time, exit time, prices, qty, direction)
      // This catches duplicates even if the Sim Trade ID is different
      const entryTime = new Date(simTrade.entryTimeUtc).getTime();
      const exitTime = new Date(simTrade.exitTimeUtc).getTime();
      const direction = simTrade.direction === 'LONG' ? 'LONG' : 'SHORT';
      const signature = `${entryTime}-${exitTime}-${simTrade.entryPrice}-${simTrade.exitPrice}-${simTrade.qty}-${direction}`;
      
      if (existingTradeSignatures.has(signature)) {
        return false;
      }
      if (batchTradeSignatures.has(signature)) {
        return false;
      }
      
      // Mark this ID and signature as being saved in this batch
      batchSimTradeIds.add(simTrade.id);
      batchTradeSignatures.add(signature);
      return true;
    })
    .map((simTrade) => {
    const entryDate = new Date(simTrade.entryTimeUtc);
    const exitDate = new Date(simTrade.exitTimeUtc);
    
    const symbol = extractSymbol(simTrade.contractId);
    const instrumentRoot = mapSymbolToInstrument(symbol);
  if (!instrumentRoot) throw new Error(`Instrument ${symbol} is not supported for simulation export.`);
    
    const direction = simTrade.direction === 'LONG' ? Direction.LONG : Direction.SHORT;
    
    // Get default tick size/value for this instrument
    const tickInfo = getDefaultTickInfo(instrumentRoot);
    const tickSize = tickInfo.tickSize;
    const tickValueUsd = tickInfo.tickValueUsd;
    
    // Calculate points P&L
    const pointsPnL = direction === Direction.LONG
      ? (simTrade.exitPrice - simTrade.entryPrice) * simTrade.qty
      : (simTrade.entryPrice - simTrade.exitPrice) * simTrade.qty;
    
    // Simulation has no planned-risk input; leave R unrated until reviewed.
    const plannedRiskUsd = 0;
    const resultR = 0;
    
    const notes = `[EDGE Simulation] ${simTrade.contractName || simTrade.contractId}\n` +
      `Realized: ${simTrade.realizedTicks.toFixed(1)} ticks / $${simTrade.realizedUsd.toFixed(2)}\n` +
      `Fees: $${simTrade.feesUsd.toFixed(2)}\n` +
      `Assumptions: ${simTrade.assumptions.slippageTicks} ticks slippage, $${simTrade.assumptions.commissionPerContractPerSide} commission per contract\n` +
      `Sim Trade ID: ${simTrade.id}\nPlanned risk not supplied; review this trade to set risk and R.`;
    
    const trade: FuturesTrade = {
      id: `trade-edge-${scope!.userId}-${simTrade.id}`,
      assetClass: AssetClass.FUTURES,
      createdAt: now,
      updatedAt: now,
      tradeDate: format(entryDate, 'yyyy-MM-dd'),
      entryTime: entryDate.getTime(),
      exitTime: exitDate.getTime(),
      direction,
      quantity: simTrade.qty,
      feesUsd: simTrade.feesUsd,
      plannedRiskUsd,
      resultUsd: simTrade.netUsd,
      resultR,
      outcome: simTrade.netUsd > 0.01 ? Outcome.WIN 
        : simTrade.netUsd < -0.01 ? Outcome.LOSS 
        : Outcome.BREAKEVEN,
      grade: Grade.B, // Default grade for simulated trades
      strategyId: '', // Can be set later
      strategyVersionId: '', // Can be set later
      setupTags: [],
      session: Session.NEW_YORK, // Default - can be inferred from time
      marketHoursTag: MarketHoursTag.MIDDAY, // Default
      marketRegime: MarketRegime.RANGE, // Default
      newsTags: [NewsTag.NONE],
      mistakes: [],
      notes,
      attachments: [],
      reviewFlag: false,
      collections: edgeCollection ? [edgeCollection.id] : [], // Tag with EDGE collection
      instrumentRoot,
      entryPrice: simTrade.entryPrice,
      exitPrice: simTrade.exitPrice,
      tickSize,
      tickValueUsd,
      pointsPnL,
      ticksPnL: pointsPnL / tickSize,
      rthEth: RthEth.RTH,
      disciplineFlags: {
        respectedDailyLossLimit: true,
        respectedMaxTrades: true,
        respectedMaxContracts: true,
        hadStopDefined: true,
        followedEntryRules: true,
        followedExitRules: true,
        journalCompleted: false,
      },
    };
    
    // Calculate discipline flags
    const disciplineFlags = calculateDisciplineFlags(trade, existingTrades, riskRules, false);
    return { ...trade, disciplineFlags };
  });
  
  // Only save if there are actually new trades to save
  if (newTrades.length > 0) {
    // Get the latest trades again right before saving to ensure no race conditions
    const latestTrades = await cloudStorage.getTrades();
    if (!isCurrentEdgeAccount(scope)) return 0;
    
    // Build signatures for latest trades
    const latestSignatures = new Set<string>();
    const latestSimTradeIds = new Set<string>();
    latestTrades.forEach((trade: Trade) => {
      // Check for Sim Trade ID in notes
      const notes = trade.notes || '';
      const match = notes.match(/Sim Trade ID: ([^\n]+)/);
      if (match && match[1]) {
        latestSimTradeIds.add(match[1].trim());
      }
      
      // Create signature for EDGE trades
      if (trade.notes?.includes('[EDGE Simulation]')) {
        const signature = `${trade.entryTime}-${trade.exitTime}-${(trade as FuturesTrade).entryPrice}-${(trade as FuturesTrade).exitPrice}-${trade.quantity}-${trade.direction}`;
        latestSignatures.add(signature);
      }
    });
    
    // Double-check for duplicates one more time (in case another save happened between our check and now)
    const finalNewTrades = newTrades.filter(newTrade => {
      const notes = newTrade.notes || '';
      
      // Check by Sim Trade ID
      const match = notes.match(/Sim Trade ID: ([^\n]+)/);
      if (match && match[1]) {
        const simTradeId = match[1].trim();
        if (latestSimTradeIds.has(simTradeId)) {
          return false;
        }
      }
      
      // Check by signature
      const signature = `${newTrade.entryTime}-${newTrade.exitTime}-${(newTrade as FuturesTrade).entryPrice}-${(newTrade as FuturesTrade).exitPrice}-${newTrade.quantity}-${newTrade.direction}`;
      if (latestSignatures.has(signature)) {
        return false;
      }
      
      return true;
    });
    
    if (finalNewTrades.length > 0) {
      await cloudStorage.saveTrades([...latestTrades, ...finalNewTrades]);
      return finalNewTrades.length;
    }
  }
  return 0;
}
