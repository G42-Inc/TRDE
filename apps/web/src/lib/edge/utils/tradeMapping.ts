import { getEdgeAccountScope, isCurrentEdgeAccount, writeEdgeStorage, type EdgeAccountScope } from '../store/accountScope';
import { getTrades as getEdgeTrades } from '../store/edgeStore';
import * as cloudStorage from '@/lib/storage.db';
import type { Trade } from '@trde/core';
// Map EDGE RoundTripTrade to TRDE Trade form data

import type { RoundTripTrade } from '../types';
import { FuturesInstrument, Direction, Outcome } from '@trde/core';
import { extractSymbol } from '../projectx/mapping';
import { format } from 'date-fns';

/**
 * Get tick info for a futures instrument
 */
function getTickInfo(instrument: FuturesInstrument): { tickSize: number; tickValueUsd: number; defaultStopTicks: number } {
  const tickData: Partial<Record<FuturesInstrument, { tickSize: number; tickValueUsd: number; defaultStopTicks: number }>> = {
    // Equity Index Futures
    [FuturesInstrument.ES]: { tickSize: 0.25, tickValueUsd: 12.5, defaultStopTicks: 8 },    // $100 risk
    [FuturesInstrument.NQ]: { tickSize: 0.25, tickValueUsd: 5.0, defaultStopTicks: 20 },    // $100 risk
    [FuturesInstrument.MES]: { tickSize: 0.25, tickValueUsd: 1.25, defaultStopTicks: 16 },  // $20 risk
    [FuturesInstrument.MNQ]: { tickSize: 0.25, tickValueUsd: 0.5, defaultStopTicks: 40 },   // $20 risk
    [FuturesInstrument.YM]: { tickSize: 1.0, tickValueUsd: 5.0, defaultStopTicks: 20 },     // $100 risk
    [FuturesInstrument.MYM]: { tickSize: 1.0, tickValueUsd: 0.5, defaultStopTicks: 40 },    // $20 risk
    [FuturesInstrument.RTY]: { tickSize: 0.1, tickValueUsd: 5.0, defaultStopTicks: 20 },    // $100 risk
    [FuturesInstrument.M2K]: { tickSize: 0.1, tickValueUsd: 0.5, defaultStopTicks: 40 },    // $20 risk
    // Energy Futures
    [FuturesInstrument.CL]: { tickSize: 0.01, tickValueUsd: 10.0, defaultStopTicks: 10 },   // $100 risk
    [FuturesInstrument.MCL]: { tickSize: 0.01, tickValueUsd: 1.0, defaultStopTicks: 20 },   // $20 risk
    // Metals
    [FuturesInstrument.GC]: { tickSize: 0.1, tickValueUsd: 10.0, defaultStopTicks: 10 },    // $100 risk
    [FuturesInstrument.MGC]: { tickSize: 0.1, tickValueUsd: 1.0, defaultStopTicks: 20 },    // $20 risk
  };
  
  return tickData[instrument] || { tickSize: 0.25, tickValueUsd: 12.5, defaultStopTicks: 8 };
}

/**
 * Estimate planned risk for an imported trade
 * Uses tick value and a reasonable default stop distance
 */
function estimatePlannedRisk(
  instrument: FuturesInstrument,
  quantity: number,
  pnlNet: number
): number {
  const tickInfo = getTickInfo(instrument);
  
  // Calculate risk based on default stop distance for this instrument
  // Risk = tickValue × defaultStopTicks × quantity
  const estimatedRisk = tickInfo.tickValueUsd * tickInfo.defaultStopTicks * quantity;
  
  // Ensure minimum risk to avoid extreme R values
  // Use at least $10 per contract or 20% of P&L magnitude (whichever is larger)
  const minRiskPerContract = 10;
  const minRiskFromPnl = Math.abs(pnlNet) * 0.2;
  const minRisk = Math.max(minRiskPerContract * quantity, minRiskFromPnl);
  
  return Math.max(estimatedRisk, minRisk);
}

/**
 * Map contract symbol to FuturesInstrument enum
 */
function mapSymbolToInstrument(symbol: string): FuturesInstrument | null {
  const symbolUpper = symbol.toUpperCase();
  
  // Try direct match first
  if (Object.values(FuturesInstrument).includes(symbolUpper as FuturesInstrument)) {
    return symbolUpper as FuturesInstrument;
  }
  
  // Handle common variations
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
 * Convert EDGE RoundTripTrade to TRDE trade form data
 */
export function edgeTradeToTrdeFormData(trade: RoundTripTrade): {
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
} {
  const entryDate = new Date(trade.entryTime);
  const exitDate = new Date(trade.exitTime);
  
  const symbol = extractSymbol(trade.contractId);
  const instrumentRoot = mapSymbolToInstrument(symbol) || FuturesInstrument.ES; // Default to ES if unknown
  
  // Map outcome
  const outcome = trade.outcome === 'WIN' ? Outcome.WIN 
    : trade.outcome === 'LOSS' ? Outcome.LOSS 
    : Outcome.BREAKEVEN;
  
  // Map direction
  const direction = trade.direction === 'LONG' ? Direction.LONG : Direction.SHORT;
  
  // Create notes with EDGE trade info
  const notes = `Imported from EDGE\n` +
    `Contract: ${trade.contractName || trade.contractId}\n` +
    `Duration: ${Math.round(trade.durationMs / 1000 / 60)} minutes\n` +
    `Fees: $${trade.feesTotal.toFixed(2)}\n` +
    `EDGE Trade ID: ${trade.tradeId}`;
  
  return {
    tradeDate: format(entryDate, 'yyyy-MM-dd'),
    entryTime: format(entryDate, 'HH:mm'),
    exitTime: format(exitDate, 'HH:mm'),
    direction,
    quantity: trade.qty,
    entryPrice: trade.avgEntryPrice,
    exitPrice: trade.avgExitPrice,
    resultUsd: trade.pnlNet,
    feesUsd: trade.feesTotal,
    outcome,
    instrumentRoot,
    notes,
  };
}

/**
 * Store trade data in localStorage for pre-filling form
 */
export function storeTradeForImport(formData: ReturnType<typeof edgeTradeToTrdeFormData>): void {
  if (typeof window === 'undefined') return;
  writeEdgeStorage('edge:importTrade', JSON.stringify({
    ...formData,
    importedAt: new Date().toISOString(),
  }));
}

/**
 * Convert EDGE RoundTripTrade to full TRDE Trade object
 */
export function edgeTradeToTrdeTrade(edgeTrade: RoundTripTrade, allTrades: Trade[] = []): any {
  const { AssetClass, Grade, Session, MarketRegime, MarketHoursTag, RthEth } = require('@trde/core');
  const { calculateDisciplineFlags } = require('@/lib/discipline-flags');
  
  const entryDate = new Date(edgeTrade.entryTime);
  const exitDate = new Date(edgeTrade.exitTime);
  const now = Date.now();
  
  const formData = edgeTradeToTrdeFormData(edgeTrade);
  const riskRules = null; // Can be enhanced later to load risk rules
  
  // Calculate R (risk/reward) using estimated risk based on instrument
  const plannedRiskUsd = estimatePlannedRisk(formData.instrumentRoot, formData.quantity, edgeTrade.pnlNet);
  const resultR = plannedRiskUsd > 0 ? edgeTrade.pnlNet / plannedRiskUsd : 0;
  
  // Create trade ID based on EDGE trade ID to help detect duplicates
  const tradeId = `edge-${edgeTrade.tradeId}`;
  
  const trade: any = {
    id: tradeId,
    assetClass: AssetClass.FUTURES,
    createdAt: entryDate.getTime(),
    updatedAt: now,
    tradeDate: formData.tradeDate,
    entryTime: entryDate.getTime(),
    exitTime: exitDate.getTime(),
    direction: formData.direction,
    quantity: formData.quantity,
    feesUsd: formData.feesUsd,
    plannedRiskUsd,
    resultUsd: formData.resultUsd,
    resultR,
    outcome: formData.outcome,
    grade: Grade.B, // Default grade, user can update later
    strategyId: '', // Empty, user can assign later
    strategyVersionId: '',
    setupTags: [],
    session: Session.NEW_YORK, // Default, user can update
    marketHoursTag: MarketHoursTag.MIDDAY, // Default
    marketRegime: MarketRegime.RANGE, // Default
    newsTags: [],
    mistakes: [],
    notes: formData.notes,
    attachments: [],
    reviewFlag: false,
    collections: [],
    // Futures specific
    instrumentRoot: formData.instrumentRoot,
    entryPrice: formData.entryPrice,
    exitPrice: formData.exitPrice,
    tickSize: getTickInfo(formData.instrumentRoot).tickSize,
    tickValueUsd: getTickInfo(formData.instrumentRoot).tickValueUsd,
    pointsPnL: (formData.exitPrice - formData.entryPrice) * (formData.direction === 'LONG' ? 1 : -1) * formData.quantity,
    ticksPnL: ((formData.exitPrice - formData.entryPrice) / getTickInfo(formData.instrumentRoot).tickSize) * (formData.direction === 'LONG' ? 1 : -1) * formData.quantity,
    rthEth: RthEth.RTH,
  };
  
  // Calculate discipline flags
  trade.disciplineFlags = calculateDisciplineFlags(trade, allTrades, riskRules, false);
  
  return trade;
}

/**
 * Import all EDGE trades to TRDE journal with duplicate detection
 * Returns: { imported: number, skipped: number, duplicates: number }
 * Uses the authenticated cloud journal and an account-bound save callback.
 */
export async function importAllEdgeTradesToJournal(
  saveTradesFn: (trades: any[]) => Promise<any> | any,
  scope: EdgeAccountScope | null = getEdgeAccountScope()
): Promise<{ imported: number; skipped: number; duplicates: number }> {
  if (typeof window === 'undefined') return { imported: 0, skipped: 0, duplicates: 0 };
  
  if (!isCurrentEdgeAccount(scope)) throw new Error('Sign in again before importing trades.');
  const edgeTrades = getEdgeTrades(scope);
  const existingTrades = await cloudStorage.getTrades();
  if (!isCurrentEdgeAccount(scope)) throw new Error('Account changed. Import canceled.');

  // Create a Set of existing trade IDs and notes signatures to detect duplicates
  const existingIds = new Set(existingTrades.map((t: any) => t.id));
  const existingSignatures = new Set(
    existingTrades
      .filter((t: any) => t.notes?.includes('EDGE Trade ID:'))
      .map((t: any) => {
        const match = t.notes?.match(/EDGE Trade ID: ([^\n]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
  );
  
  const newTrades: any[] = [];
  let duplicates = 0;
  let skipped = 0;
  
  for (const edgeTrade of edgeTrades) {
    // Check for duplicates by EDGE trade ID
    if (existingSignatures.has(edgeTrade.tradeId)) {
      duplicates++;
      continue;
    }
    
    // Check for duplicate by generated ID
    const tradeId = `edge-${edgeTrade.tradeId}`;
    if (existingIds.has(tradeId)) {
      duplicates++;
      continue;
    }
    
    try {
      const trade = edgeTradeToTrdeTrade(edgeTrade, existingTrades);
      newTrades.push(trade);
      existingIds.add(tradeId); // Prevent duplicates within this batch
    } catch (error) {
      console.error('Failed to convert edge trade:', error);
      skipped++;
    }
  }
  
  if (newTrades.length > 0) {
    const allTrades = [...existingTrades, ...newTrades];
    if (!isCurrentEdgeAccount(scope)) throw new Error('Account changed. Import canceled.');
    await saveTradesFn(allTrades);
    console.log('[TradeMapping] Imported trades synced to cloud');
  }
  
  return {
    imported: newTrades.length,
    skipped,
    duplicates,
  };
}
