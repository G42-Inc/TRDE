import { Direction, Outcome } from '@trde/core';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

export interface FuturesTickInfo {
  tickSize: number;
  tickValueUsd: number;
}

// Outright-contract specifications, checked against CME on 2026-11-08:
// https://www.cmegroup.com/markets/equities/sp-500-and-nasdaq-100-futures.html
// https://www.cmegroup.com/trading/equity-index/files/cme-micro-e-mini-futures-fact-card.pdf
// https://www.cmegroup.com/education/lessons/e-mini-dow-product-overview
// https://www.cmegroup.com/education/courses/futures-vs-etfs/reasons-to-trade-e-mini-russell-2000-futures-over-russell-2000-etf
// https://www.cmegroup.com/education/articles-and-reports/micro-wti-crude-oil-futures-faq
// https://www.cmegroup.com/education/courses/event-contracts-underlying-markets/product-gold
// https://www.cmegroup.com/education/lessons/micro-gold-and-micro-silver-futures-product-overview
const FUTURES_TICKS: Readonly<Record<string, FuturesTickInfo>> = {
  ES: { tickSize: 0.25, tickValueUsd: 12.5 },
  MES: { tickSize: 0.25, tickValueUsd: 1.25 },
  NQ: { tickSize: 0.25, tickValueUsd: 5 },
  MNQ: { tickSize: 0.25, tickValueUsd: 0.5 },
  YM: { tickSize: 1, tickValueUsd: 5 },
  MYM: { tickSize: 1, tickValueUsd: 0.5 },
  RTY: { tickSize: 0.1, tickValueUsd: 5 },
  M2K: { tickSize: 0.1, tickValueUsd: 0.5 },
  CL: { tickSize: 0.01, tickValueUsd: 10 },
  MCL: { tickSize: 0.01, tickValueUsd: 1 },
  GC: { tickSize: 0.1, tickValueUsd: 10 },
  MGC: { tickSize: 0.1, tickValueUsd: 1 },
};

export function getFuturesTickInfo(instrumentRoot: string): FuturesTickInfo | undefined {
  return Object.hasOwn(FUTURES_TICKS, instrumentRoot) ? FUTURES_TICKS[instrumentRoot] : undefined;
}

/** Keep import precision and overnight dates when the editor only displays HH:mm. */
export function editedTradeTimestamp(original: number, originalTradeDate: string, tradeDate: string, time: string): number {
  const originalDate = new Date(original);
  if (tradeDate === originalTradeDate && time === format(originalDate, 'HH:mm')) return original;
  const dayOffset = differenceInCalendarDays(originalDate, parseISO(originalTradeDate));
  const day = format(addDays(parseISO(tradeDate), dayOffset), 'yyyy-MM-dd');
  return new Date(`${day}T${time}:00`).getTime();
}

interface CommonInput {
  direction: Direction;
  quantity: number;
  feesUsd: number;
  plannedRiskUsd: number;
}

export interface FuturesCalculationInput extends CommonInput {
  instrumentRoot: string;
  entryPrice: number;
  exitPrice: number;
  tickSize?: number;
  tickValueUsd?: number;
}

interface Results {
  resultUsd: number;
  resultR: number;
  outcome: Outcome;
}

export interface FuturesCalculationReference extends FuturesCalculationInput {
  resultUsd: number;
  resultR?: number;
  outcome?: Outcome;
  pointsPnL?: number;
  ticksPnL?: number;
}

export interface OptionsCalculationInput extends CommonInput {
  underlying: string;
  strike: number;
  optionType: string;
  expiration: string;
  entryPremium: number;
  exitPremium: number;
  contractMultiplier: number;
}

type OptionsCalculationReference = OptionsCalculationInput & Results & { netPremiumPnLUsd: number };

function assertNumber(value: number, label: string, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${label} must be a valid number${minimum === 0 ? ' of zero or more' : ''}.`);
}

function validateCommon(input: CommonInput) {
  assertNumber(input.quantity, 'Quantity', 1);
  assertNumber(input.feesUsd, 'Total fees', 0);
  assertNumber(input.plannedRiskUsd, 'Planned risk', 0);
  if (input.direction !== Direction.LONG && input.direction !== Direction.SHORT) throw new Error('Choose Long or Short.');
}

function outcomeFor(resultUsd: number) {
  return resultUsd > 0 ? Outcome.WIN : resultUsd < 0 ? Outcome.LOSS : Outcome.BREAKEVEN;
}

// Round money only after aggregating the contract quantity; avoid floating point
// price subtraction artifacts such as 70.03 - 70.00 producing 2.99999 ticks.
function dollars(value: number) {
  return Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
}

function results(resultUsd: number, plannedRiskUsd: number): Results {
  return { resultUsd, resultR: plannedRiskUsd > 0 ? resultUsd / plannedRiskUsd : 0, outcome: outcomeFor(resultUsd) };
}

function preservedResults(input: CommonInput, previous: Pick<FuturesCalculationReference, 'feesUsd' | 'plannedRiskUsd' | 'resultUsd' | 'resultR' | 'outcome'>): Results {
  // Imported averages may not reconstruct the broker's actual realized amount.
  // A fee edit adjusts the known gross P&L, never the rounded import prices.
  const sameFees = input.feesUsd === previous.feesUsd;
  const resultUsd = sameFees ? previous.resultUsd : dollars(previous.resultUsd + previous.feesUsd - input.feesUsd);
  const calculated = results(resultUsd, input.plannedRiskUsd);
  return {
    ...calculated,
    resultR: sameFees && input.plannedRiskUsd === previous.plannedRiskUsd ? previous.resultR ?? calculated.resultR : calculated.resultR,
    outcome: sameFees ? previous.outcome ?? calculated.outcome : calculated.outcome,
  };
}

export function calculateFuturesResults(input: FuturesCalculationInput, previous?: FuturesCalculationReference) {
  validateCommon(input);
  assertNumber(input.entryPrice, 'Entry price');
  assertNumber(input.exitPrice, 'Exit price');
  const knownTicks = getFuturesTickInfo(input.instrumentRoot);
  const ticks = knownTicks ?? (input.tickSize && input.tickValueUsd ? { tickSize: input.tickSize, tickValueUsd: input.tickValueUsd } : undefined);
  const unchangedExecution = previous && input.instrumentRoot === previous.instrumentRoot &&
    input.direction === previous.direction && input.quantity === previous.quantity &&
    input.entryPrice === previous.entryPrice && input.exitPrice === previous.exitPrice &&
    (knownTicks || (input.tickSize === previous.tickSize && input.tickValueUsd === previous.tickValueUsd));

  // Preserve existing financial fields on review-only edits, including legacy or
  // imported records. Merely opening a trade must not migrate its financial data.
  if (unchangedExecution && previous.pointsPnL !== undefined && previous.ticksPnL !== undefined) {
    return {
      ...preservedResults(input, previous),
      pointsPnL: previous.pointsPnL, ticksPnL: previous.ticksPnL,
      tickSize: previous.tickSize, tickValueUsd: previous.tickValueUsd,
    };
  }
  if (!ticks || !Number.isFinite(ticks.tickSize) || ticks.tickSize <= 0 || !Number.isFinite(ticks.tickValueUsd) || ticks.tickValueUsd <= 0) {
    throw new Error(`Enter a positive tick size and tick value for ${input.instrumentRoot} before recalculating P&L.`);
  }
  const sign = input.direction === Direction.LONG ? 1 : -1;
  const pointsPnL = Number(((input.exitPrice - input.entryPrice) * sign * input.quantity).toFixed(10));
  const ticksPnL = Number((pointsPnL / ticks.tickSize).toFixed(8));
  const financials = unchangedExecution
    ? preservedResults(input, previous)
    : results(dollars(ticksPnL * ticks.tickValueUsd - input.feesUsd), input.plannedRiskUsd);
  return { ...financials, pointsPnL, ticksPnL, ...ticks };
}

export function calculateOptionsResults(input: OptionsCalculationInput, previous?: OptionsCalculationReference) {
  validateCommon(input);
  assertNumber(input.entryPremium, 'Entry premium', 0);
  assertNumber(input.exitPremium, 'Exit premium', 0);
  if (!Number.isFinite(input.contractMultiplier) || input.contractMultiplier <= 0) throw new Error('Contract multiplier must be positive.');
  const unchangedExecution = previous && input.direction === previous.direction && input.quantity === previous.quantity &&
    input.entryPremium === previous.entryPremium && input.exitPremium === previous.exitPremium &&
    input.contractMultiplier === previous.contractMultiplier && input.underlying === previous.underlying &&
    input.strike === previous.strike && input.optionType === previous.optionType && input.expiration === previous.expiration;
  if (unchangedExecution) {
    const financials = preservedResults(input, previous);
    return { ...financials, netPremiumPnLUsd: input.feesUsd === previous.feesUsd ? previous.netPremiumPnLUsd : financials.resultUsd };
  }
  const sign = input.direction === Direction.LONG ? 1 : -1;
  const resultUsd = dollars((input.exitPremium - input.entryPremium) * sign * input.quantity * input.contractMultiplier - input.feesUsd);
  return { ...results(resultUsd, input.plannedRiskUsd), netPremiumPnLUsd: resultUsd };
}
