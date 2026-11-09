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

export const AssetClassEnum = z.enum(['futures', 'options']);

export const DirectionEnum = z.enum(['long', 'short']);

export const OutcomeEnum = z.enum(['win', 'loss', 'breakeven']);

export const GradeEnum = z.enum(['A', 'B', 'C', 'D', 'F']).nullable().optional();

export const SessionEnum = z.enum(['london', 'new_york', 'asia', 'overnight']).nullable().optional();

export const MarketRegimeEnum = z.enum(['trending', 'ranging', 'volatile', 'quiet']).nullable().optional();

/**
 * Base trade schema - common fields for all trade types
 */
const BaseTradeSchema = z.object({
  id: z.string().uuid(),
  assetClass: AssetClassEnum,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  entryTime: z.string().optional().nullable(),
  exitTime: z.string().optional().nullable(),
  direction: DirectionEnum,
  quantity: z.number().int().positive().max(10000),
  feesUsd: z.number().min(0).max(100000).optional().nullable(),
  plannedRiskUsd: z.number().min(0).max(1000000).optional().nullable(),
  resultUsd: z.number().min(-10000000).max(10000000),
  resultR: z.number().min(-100).max(100).optional().nullable(),
  outcome: OutcomeEnum,
  grade: GradeEnum,
  strategyId: z.string().max(100).optional().nullable(),
  strategyVersionId: z.string().max(100).optional().nullable(),
  session: SessionEnum,
  marketRegime: MarketRegimeEnum,
  marketHoursTag: z.string().max(50).optional().nullable(),
  setupTags: z.array(z.string().max(50)).max(20).optional(),
  newsTags: z.array(z.string().max(100)).max(10).optional(),
  mistakes: z.array(z.string().max(200)).max(10).optional(),
  notes: z.string().max(10000).optional(),
  attachments: z.array(z.string().url().max(2000)).max(10).optional(),
  reviewFlag: z.boolean().optional(),
  collections: z.array(z.string().max(100)).max(20).optional(),
  disciplineFlags: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Futures-specific fields
 */
const FuturesFieldsSchema = z.object({
  instrumentRoot: z.string().min(1).max(20),
  entryPrice: z.number().min(0).max(1000000).optional(),
  exitPrice: z.number().min(0).max(1000000).optional(),
  tickSize: z.number().positive().max(1000).optional(),
  tickValueUsd: z.number().positive().max(10000).optional(),
  pointsPnL: z.number().min(-100000).max(100000).optional(),
  ticksPnL: z.number().min(-1000000).max(1000000).optional(),
  rthEth: z.enum(['rth', 'eth']).optional().nullable(),
});

/**
 * Options-specific fields
 */
const OptionsFieldsSchema = z.object({
  underlying: z.string().min(1).max(20),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dte: z.number().int().min(0).max(1000).optional(),
  strike: z.number().min(0).max(100000).optional(),
  optionType: z.enum(['call', 'put']).optional(),
  entryPremium: z.number().min(0).max(100000).optional(),
  exitPremium: z.number().min(0).max(100000).optional(),
  netPremiumPnLUsd: z.number().min(-10000000).max(10000000).optional(),
  contractMultiplier: z.number().int().min(1).max(10000).optional(),
});

/**
 * Complete trade schema with asset-class-specific fields
 */
export const TradeSchema = BaseTradeSchema.and(
  FuturesFieldsSchema.partial()
).and(
  OptionsFieldsSchema.partial()
);

/**
 * Array of trades for bulk operations
 */
export const TradesArraySchema = z.object({
  trades: z.array(TradeSchema).max(1000),
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
