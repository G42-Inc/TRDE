-- Complete Database Verification and Fix Script
-- Run this to check what's missing and apply fixes

-- ============================================
-- STEP 1: CHECK WHAT EXISTS
-- ============================================

-- Check if main tables exist
SELECT 
  'Table Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'entitlements', 'stripe_customers', 'stripe_webhook_events', 'api_connections') 
      THEN 'Core Table'
    WHEN table_name = 'webhook_retry_queue'
      THEN 'Retry Queue Table'
    ELSE 'User Data Table'
  END as table_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM (VALUES
  ('profiles'),
  ('entitlements'),
  ('stripe_customers'),
  ('stripe_webhook_events'),
  ('webhook_retry_queue'),
  ('api_connections'),
  ('audit_log')
) AS t(table_name)
ORDER BY 
  CASE table_category 
    WHEN 'Core Table' THEN 1
    WHEN 'Retry Queue Table' THEN 2
    ELSE 3
  END,
  table_name;

-- Check if extension exists
SELECT 
  'Extension Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
      THEN '✅ uuid-ossp extension exists'
    ELSE '❌ uuid-ossp extension missing - RUN: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
  END as status;

-- Check if functions exist
SELECT 
  'Function Check' as check_type,
  routine_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = f.routine_name
    ) THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM (VALUES
  ('update_updated_at_column'),
  ('calculate_next_retry_at')
) AS f(routine_name);

-- ============================================
-- STEP 2: FIX MISSING ELEMENTS (if needed)
-- ============================================

-- If stripe_customers doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stripe_customers'
  ) THEN
    -- Create stripe_customers table
    CREATE TABLE stripe_customers (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT NOT NULL UNIQUE,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
    
    -- Service role has full access
    CREATE POLICY "Allow service role full access to stripe_customers"
      ON stripe_customers FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    
    -- Users can read their own customer mapping
    CREATE POLICY "Users can view own stripe customer"
      ON stripe_customers FOR SELECT
      USING (true);
    
    -- Deny write access via anon key
    CREATE POLICY "Deny anon key write access to stripe_customers"
      ON stripe_customers FOR ALL
      TO anon
      USING (false)
      WITH CHECK (false);
    
    RAISE NOTICE '✅ Created stripe_customers table';
  ELSE
    RAISE NOTICE '✅ stripe_customers table already exists';
  END IF;
END $$;

-- Add trigger for stripe_customers.updated_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND event_object_table = 'stripe_customers'
    AND trigger_name = 'update_stripe_customers_updated_at'
  ) THEN
    -- Check if function exists first
    IF EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'update_updated_at_column'
    ) THEN
      CREATE TRIGGER update_stripe_customers_updated_at 
        BEFORE UPDATE ON stripe_customers
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      RAISE NOTICE '✅ Created trigger update_stripe_customers_updated_at';
    ELSE
      RAISE NOTICE '⚠️ Function update_updated_at_column does not exist - run schema.sql first';
    END IF;
  ELSE
    RAISE NOTICE '✅ Trigger update_stripe_customers_updated_at already exists';
  END IF;
END $$;

-- ============================================
-- STEP 3: FINAL VERIFICATION
-- ============================================

-- Verify all critical tables exist
SELECT 
  'Final Verification' as check_type,
  COUNT(*) as tables_found,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ All 20 tables present'
    WHEN COUNT(*) >= 19 THEN '⚠️ Missing webhook_retry_queue - run webhook_retry_queue.sql'
    WHEN COUNT(*) >= 17 THEN '⚠️ Missing stripe tables - run schema.sql'
    ELSE '❌ Missing tables - check schema.sql'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'entitlements', 'stripe_customers', 'stripe_webhook_events', 
  'webhook_retry_queue', 'api_connections', 'audit_log', 'trades', 
  'strategies', 'strategy_versions', 'collections', 'daily_biases', 
  'quick_journals', 'trade_journals', 'weekly_reviews', 'risk_rules', 
  'saved_filters', 'todos', 'rule_violations', 'dashboard_metrics'
);

-- Verify all triggers
SELECT 
  'Trigger Verification' as check_type,
  trigger_name,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;
