import assert from 'node:assert/strict';
import test from 'node:test';
import { Direction, Outcome } from '@trde/core';
import { calculateFuturesResults, calculateOptionsResults, editedTradeTimestamp, getFuturesTickInfo, type FuturesCalculationInput, type FuturesCalculationReference } from '../src/lib/trades/calculations';

const es: FuturesCalculationInput = {
  instrumentRoot: 'ES', direction: Direction.LONG, quantity: 1,
  entryPrice: 4000, exitPrice: 4010, feesUsd: 10, plannedRiskUsd: 100,
};
const option = {
  underlying: 'SPY', strike: 400, optionType: 'CALL', expiration: '2026-12-18',
  direction: Direction.LONG, quantity: 1, entryPremium: 5, exitPremium: 6,
  contractMultiplier: 100, feesUsd: 10, plannedRiskUsd: 100,
};

test('ES converts points to ticks before applying tick value and total fees', () => {
  assert.deepEqual(calculateFuturesResults(es), {
    tickSize: .25, tickValueUsd: 12.5, pointsPnL: 10, ticksPnL: 40,
    resultUsd: 490, resultR: 4.9, outcome: Outcome.WIN,
  });
  assert.equal(calculateFuturesResults({ ...es, direction: Direction.SHORT }).resultUsd, -510);
});

test('MNQ uses micro contract value and preserves zero fees and zero planned risk', () => {
  const result = calculateFuturesResults({ ...es, instrumentRoot: 'MNQ', quantity: 2, feesUsd: 0, plannedRiskUsd: 0 });
  assert.equal(result.resultUsd, 40);
  assert.equal(result.tickValueUsd, .5);
  assert.equal(result.ticksPnL, 80);
  assert.equal(result.resultR, 0);
});

test('CL handles fractional prices, multiple contracts and short direction without rounding drift', () => {
  const trade = { ...es, instrumentRoot: 'CL', entryPrice: 70, exitPrice: 70.03, quantity: 2, feesUsd: 0 };
  const long = calculateFuturesResults(trade);
  assert.equal(long.pointsPnL, .06);
  assert.equal(long.ticksPnL, 6);
  assert.equal(long.resultUsd, 60);
  assert.equal(calculateFuturesResults({ ...trade, direction: Direction.SHORT, feesUsd: 2.25 }).resultUsd, -62.25);
});

test('notes-only editing keeps authoritative imported P&L, fees, outcome and legacy fields exactly', () => {
  const imported: FuturesCalculationReference = {
    ...es, feesUsd: 0, resultUsd: 217.31, resultR: 1.87654, outcome: Outcome.WIN,
    tickSize: .25, tickValueUsd: 12.5, pointsPnL: 9.25, ticksPnL: 37,
  };
  const form = { ...imported, notes: 'Reviewed chart and execution', grade: 'A+' };
  assert.deepEqual(calculateFuturesResults(form, imported), {
    resultUsd: 217.31, resultR: 1.87654, outcome: Outcome.WIN,
    tickSize: .25, tickValueUsd: 12.5, pointsPnL: 9.25, ticksPnL: 37,
  });
  const legacy = { ...imported, resultUsd: 115, resultR: 1.15 };
  assert.equal(calculateFuturesResults(legacy, legacy).resultUsd, 115);
  assert.equal(calculateFuturesResults({ ...legacy, exitPrice: 4020 }, legacy).resultUsd, 1000);
});

test('import review preserves broker amount until execution changes; fee and risk edits use original gross', () => {
  const imported = { ...es, resultUsd: 487.13, outcome: Outcome.WIN };
  assert.equal(calculateFuturesResults(es, imported).resultUsd, 487.13);
  assert.equal(calculateFuturesResults({ ...es, feesUsd: 0 }, imported).resultUsd, 497.13);
  assert.equal(calculateFuturesResults({ ...es, plannedRiskUsd: 50 }, imported).resultR, 487.13 / 50);
  assert.equal(calculateFuturesResults({ ...es, exitPrice: 4020 }, imported).resultUsd, 990);
  assert.equal(calculateFuturesResults({ ...es, instrumentRoot: 'MNQ' }, imported).resultUsd, 10);
});

test('unsupported contracts require explicit specs for calculations but allow notes-only existing edits', () => {
  assert.equal(getFuturesTickInfo('6E'), undefined);
  assert.equal(getFuturesTickInfo('toString'), undefined);
  const fx = { ...es, instrumentRoot: '6E', entryPrice: 1.08, exitPrice: 1.0801, feesUsd: 0 };
  assert.throws(() => calculateFuturesResults(fx), /tick size and tick value/);
  assert.equal(calculateFuturesResults({ ...fx, tickSize: .00005, tickValueUsd: 6.25 }).resultUsd, 12.5);
  const saved = { ...fx, resultUsd: 12.49, resultR: .1249, outcome: Outcome.WIN, pointsPnL: .0001, ticksPnL: 2 };
  assert.equal(calculateFuturesResults(saved, saved).resultUsd, 12.49);
  assert.throws(() => calculateFuturesResults({ ...saved, exitPrice: 1.0802 }, saved), /tick size and tick value/);
  assert.throws(() => calculateFuturesResults({ ...fx, tickSize: -1, tickValueUsd: 6.25 }), /positive tick/);
});

test('short options use selected direction, entered risk, quantity and zero fees', () => {
  const result = calculateOptionsResults({ ...option, direction: Direction.SHORT, exitPremium: 3, quantity: 2, feesUsd: 0 });
  assert.deepEqual(result, { resultUsd: 400, resultR: 4, outcome: Outcome.WIN, netPremiumPnLUsd: 400 });
  assert.equal(calculateOptionsResults({ ...option, direction: Direction.SHORT }).resultUsd, -110);
  assert.equal(calculateOptionsResults(option).resultR, .9);
  assert.equal(calculateOptionsResults({ ...option, plannedRiskUsd: 0 }).resultR, 0);
});

test('options keep imported amounts on review edits and retain adjusted contract multiplier on recalculation', () => {
  const saved = { ...option, contractMultiplier: 50, resultUsd: 39.75, resultR: .3975, outcome: Outcome.WIN, netPremiumPnLUsd: 39.75 };
  const review = { ...saved, notes: 'Review only' };
  assert.equal(calculateOptionsResults(review, saved).resultUsd, 39.75);
  assert.equal(calculateOptionsResults({ ...saved, exitPremium: 7 }, saved).resultUsd, 90);
  assert.equal(calculateOptionsResults({ ...saved, feesUsd: 0 }, saved).resultUsd, 49.75);
});

test('a real one-cent gain is a win regardless of risk; flat net result is breakeven', () => {
  assert.equal(calculateOptionsResults({ ...option, entryPremium: 5, exitPremium: 5.01, feesUsd: .99 }).outcome, Outcome.WIN);
  assert.equal(calculateOptionsResults({ ...option, entryPremium: 5, exitPremium: 5.01, feesUsd: 1 }).outcome, Outcome.BREAKEVEN);
});

test('review-only time fields keep seconds and overnight dates; changing time keeps its day offset', () => {
  const entry = new Date(2026, 10, 8, 23, 59, 42, 125).getTime();
  const exit = new Date(2026, 10, 9, 0, 30, 16, 875).getTime();
  assert.equal(editedTradeTimestamp(entry, '2026-11-08', '2026-11-08', '23:59'), entry);
  assert.equal(editedTradeTimestamp(exit, '2026-11-08', '2026-11-08', '00:30'), exit);
  assert.equal(editedTradeTimestamp(exit, '2026-11-08', '2026-11-08', '00:45'), new Date(2026, 10, 9, 0, 45).getTime());
  assert.equal(editedTradeTimestamp(exit, '2026-11-08', '2026-11-10', '00:30'), new Date(2026, 10, 11, 0, 30).getTime());
});
