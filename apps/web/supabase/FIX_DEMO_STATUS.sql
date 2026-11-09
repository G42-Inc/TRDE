-- ============================================
-- FIX: Add 'demo' status to entitlements constraint
-- ============================================
-- This fixes the root cause of the demo button not working.
-- The original schema only allowed: active, past_due, canceled, comped
-- We need to also allow 'demo' for view-only demo access.
--
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================

-- Step 1: Drop the old constraint
ALTER TABLE entitlements 
DROP CONSTRAINT IF EXISTS entitlements_status_check;

-- Step 2: Add the new constraint with 'demo' included
ALTER TABLE entitlements 
ADD CONSTRAINT entitlements_status_check 
CHECK (status IN ('active', 'past_due', 'canceled', 'comped', 'demo'));

-- Step 3: Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'entitlements'::regclass
  AND contype = 'c';

-- Expected output:
-- entitlements_status_check | CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'canceled'::text, 'comped'::text, 'demo'::text])))
