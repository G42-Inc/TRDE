/**
 * Zod validation schemas for API input validation
 * 
 * SECURITY: Always validate untrusted input before processing.
 * These schemas ensure data integrity and prevent injection attacks.
 */

import { z } from 'zod';

// ============================================================================
// Trade Schemas
// ============================================================================

// Keep the API contract aligned with packages/core and the BIGINT/JSONB SQL schema.
export const AssetClassEnum = z.enum(['FUTURES', 'OPTIONS']);
export const DirectionEnum = z.enum(['LONG', 'SHORT']);
export const OutcomeEnum = z.enum(['WIN', 'LOSS', 'BREAKEVEN']);
export const GradeEnum = z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'F']);
export const SessionEnum = z.enum(['ASIA', 'LONDON', 'NEW_YORK']);
export const MarketRegimeEnum = z.enum(['TREND_UP', 'TREND_DOWN', 'RANGE', 'HIGH_VOLATILITY', 'LOW_VOLATILITY']);

const IdSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_.:-]+$/, 'Invalid identifier');
const EpochSchema = z.number().int().min(0).max(8640000000000000);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
const MoneySchema = z.number().min(-99999999.99).max(99999999.99);
const PositiveMoneySchema = MoneySchema.nonnegative();
const ImageUriSchema = z.string().max(7_000_000).refine(value => {
  // Raster data URLs are emitted by ImageUpload; temporary blob/file URLs do not persist.
  if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+=*$/.test(value)) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Use an HTTP(S) image URL or a PNG, JPEG, GIF, WebP or AVIF data URL');

const BaseTradeSchema = z.object({
  id: IdSchema,
  createdAt: EpochSchema,
  updatedAt: EpochSchema,
  tradeDate: DateSchema,
  entryTime: EpochSchema,
  exitTime: EpochSchema,
  direction: DirectionEnum,
  quantity: z.number().int().positive().max(10000),
  feesUsd: PositiveMoneySchema,
  plannedRiskUsd: PositiveMoneySchema,
  resultUsd: MoneySchema,
  resultR: z.number().min(-999999.9999).max(999999.9999),
  outcome: OutcomeEnum,
  grade: GradeEnum,
  strategyId: z.string().max(200).default(''),
  strategyVersionId: z.string().max(200).default(''),
  session: SessionEnum,
  marketRegime: MarketRegimeEnum,
  marketHoursTag: z.enum(['PREMARKET', 'RTH_OPEN', 'MIDDAY', 'POWER_HOUR', 'AFTER_HOURS', 'ETH']),
  setupTags: z.array(z.string().max(50)).max(30).default([]),
  newsTags: z.array(z.string().max(100)).max(20).default([]),
  mistakes: z.array(z.string().max(200)).max(30).default([]),
  managementStyle: z.enum(['SCALP', 'INTRADAY', 'SWING']).optional(),
  notes: z.string().max(10000).default(''),
  attachments: z.array(z.object({
    id: IdSchema,
    type: z.literal('image'),
    uri: ImageUriSchema,
    caption: z.string().max(2000).optional(),
  })).max(10).default([]),
  reviewFlag: z.boolean().default(false),
  collections: z.array(z.string().max(200)).max(50).default([]),
  disciplineFlags: z.object({
    respectedDailyLossLimit: z.boolean(),
    respectedMaxTrades: z.boolean(),
    respectedMaxContracts: z.boolean(),
    hadStopDefined: z.boolean(),
    followedEntryRules: z.boolean(),
    followedExitRules: z.boolean(),
    journalCompleted: z.boolean(),
  }),
});

export const TradeSchema = z.discriminatedUnion('assetClass', [
  BaseTradeSchema.extend({
    assetClass: z.literal('FUTURES'),
    instrumentRoot: z.string().min(1).max(20),
    contractSymbol: z.string().max(100).optional(),
    entryPrice: MoneySchema,
    exitPrice: MoneySchema,
    tickSize: z.number().positive().max(999999.9999).optional(),
    tickValueUsd: PositiveMoneySchema.positive().optional(),
    pointsPnL: z.number().min(-999999.9999).max(999999.9999),
    ticksPnL: z.number().min(-999999.9999).max(999999.9999),
    rthEth: z.enum(['RTH', 'ETH']),
  }),
  BaseTradeSchema.extend({
    assetClass: z.literal('OPTIONS'),
    underlying: z.string().min(1).max(20),
    expiration: DateSchema,
    dte: z.number().int().min(0).max(10000),
    strike: PositiveMoneySchema,
    optionType: z.enum(['CALL', 'PUT']),
    entryPremium: PositiveMoneySchema,
    exitPremium: PositiveMoneySchema,
    netPremiumPnLUsd: MoneySchema,
    contractMultiplier: z.number().int().min(1).max(10000),
  }),
]);

export type ValidatedTrade = z.infer<typeof TradeSchema>;

export const TradesArraySchema = z.object({
  trades: z.array(TradeSchema).max(1000),
  deletedIds: z.array(IdSchema).max(1000).default([]),
  clearAll: z.boolean().default(false),
}).superRefine(({ trades, deletedIds, clearAll }, ctx) => {
  const ids = new Set(trades.map(trade => trade.id));
  if (ids.size !== trades.length) ctx.addIssue({ code: 'custom', path: ['trades'], message: 'Duplicate trade identifiers' });
  if (deletedIds.some(id => ids.has(id))) ctx.addIssue({ code: 'custom', path: ['deletedIds'], message: 'Cannot save and delete the same trade' });
  if (clearAll && trades.length) ctx.addIssue({ code: 'custom', path: ['clearAll'], message: 'Cannot clear and save trades together' });
});

// ============================================================================
// Checkout Schemas
// ============================================================================

export const PlanTierEnum = z.enum(['basic', 'edge', 'pro']);

export const CheckoutModeEnum = z.enum(['redirect', 'embedded']);

export const CheckoutRequestSchema = z.object({
  plan: PlanTierEnum,
  mode: CheckoutModeEnum.optional().default('redirect'),
});

// ============================================================================
// Admin Schemas
// ============================================================================

export const AdminLoginSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

// ============================================================================
// API Keys Schemas
// ============================================================================

export const ApiProviderEnum = z.enum(['alphavantage', 'topstep']);

export const ApiKeyCreateSchema = z.object({
  provider: ApiProviderEnum,
  apiKey: z.string()
    .min(8, 'API key must be at least 8 characters')
    .max(128, 'API key must not exceed 128 characters'),
  isPremium: z.boolean().optional(),
});

export const ApiKeyUpdateSchema = z.object({
  provider: ApiProviderEnum,
  isEnabled: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

// ============================================================================
// Helper function for validation
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns { success: true, data } on success
 * Returns { success: false, error } on failure
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    // Format error message for API response
    const errors = result.error.issues.map((e) => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    });
    return { success: false, error: errors.join(', ') };
  }
  
  return { success: true, data: result.data };
}
