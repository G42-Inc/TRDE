-- Manual Fix Script for Missing Entitlements
-- 
-- Use this script if a user paid successfully but didn't receive entitlements
-- (e.g., due to webhook failures or configuration issues)
--
-- BEFORE RUNNING:
-- 1. Verify the user paid successfully in Stripe Dashboard
-- 2. Get their subscription details (subscription ID, plan, period_end)
-- 3. Replace the placeholder values below with actual data

-- Step 1: Find the user's Stripe customer ID (if exists)
-- SELECT * FROM stripe_customers WHERE user_id = 'user_384oRva3PdSTso5UjDrBtH36tk2';

-- Step 2: Get subscription details from Stripe Dashboard or API
-- You'll need:
-- - subscription.id (e.g., 'sub_xxxxx')
-- - subscription.items.data[0].price.id (to determine plan: basic/edge/pro)
-- - subscription.current_period_end (Unix timestamp)
-- - subscription.status (should be 'active' for new subscriptions)

-- Step 3: Create/Update entitlement
-- Replace the values below with actual data from Stripe:
INSERT INTO entitlements (
  user_id,
  plan,                    -- 'basic', 'edge', or 'pro' (based on price ID)
  status,                  -- 'active', 'past_due', or 'canceled'
  current_period_end,      -- Convert Unix timestamp to ISO string
  source,
  override_enabled,
  override_expires_at,
  notes,
  created_at,
  updated_at
)
VALUES (
  'user_384oRva3PdSTso5UjDrBtH36tk2',  -- Replace with actual user_id
  'basic',                              -- Replace with actual plan (basic/edge/pro)
  'active',                             -- Replace with actual status
  '2025-02-09T00:00:00Z',              -- Replace with actual period_end (convert from Unix timestamp)
  'stripe',
  false,
  null,
  'Manually created - payment received but webhook failed. Subscription ID: sub_xxxxx', -- Replace with actual subscription ID
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET 
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Step 4: Verify entitlement was created
-- SELECT * FROM entitlements WHERE user_id = 'user_384oRva3PdSTso5UjDrBtH36tk2';

-- Helper: Convert Unix timestamp to ISO string (for period_end)
-- Example: 1738540800 (Unix timestamp) = '2025-02-02T00:00:00Z'
-- Use: new Date(timestamp * 1000).toISOString() in JavaScript/TypeScript
-- Or: to_timestamp(timestamp) AT TIME ZONE 'UTC' in PostgreSQL
