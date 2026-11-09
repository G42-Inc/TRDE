# Complete Database Migration Guide

## Overview

This guide covers ALL database migrations needed for the TRDE application, including the main schema and all additional migrations.

---

## Migration Order

Apply migrations in this order:

1. ✅ Main Schema (`schema.sql`)
2. ⚠️ Webhook Retry Queue (`webhook_retry_queue.sql`) - **REQUIRED**
3. ⚠️ Stripe Customers Trigger Fix (`fix_stripe_customers_trigger.sql`) - **RECOMMENDED**

---

## Step 1: Main Schema

**File:** `apps/web/supabase/schema.sql`

**What It Creates:**
- All 19 core tables (profiles, entitlements, trades, etc.)
- All indexes, RLS policies, triggers
- Core functions

**How to Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `schema.sql`
3. Paste and click **Run**

**Verification:**
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should show 19 tables (20 after step 2)
```

---

## Step 2: Webhook Retry Queue (REQUIRED)

**File:** `apps/web/supabase/webhook_retry_queue.sql`

**What It Creates:**
- `webhook_retry_queue` table
- `calculate_next_retry_at()` function
- `update_webhook_retry_queue_updated_at` trigger
- Indexes and RLS policies

**Why It's Needed:**
- Enables automatic retry of failed webhooks
- Required for production reliability
- Without this, failed webhooks won't be queued for retry

**How to Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `webhook_retry_queue.sql`
3. Paste and click **Run**

**Verification:**
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'webhook_retry_queue';
-- Should return 1 row

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'calculate_next_retry_at';
-- Should return 1 row

-- Check trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'webhook_retry_queue';
-- Should show update_webhook_retry_queue_updated_at
```

---

## Step 3: Stripe Customers Trigger Fix (RECOMMENDED)

**File:** `apps/web/supabase/fix_stripe_customers_trigger.sql`

**What It Creates:**
- Trigger to auto-update `stripe_customers.updated_at`

**Why It's Recommended:**
- Ensures `updated_at` is always current when rows are modified
- Consistent with other tables (profiles, entitlements, api_connections)
- Helps with debugging and audit trails

**How to Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `fix_stripe_customers_trigger.sql`
3. Paste and click **Run**

**Verification:**
```sql
-- Check trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'stripe_customers'
AND trigger_name = 'update_stripe_customers_updated_at';
-- Should return 1 row
```

---

## Complete Verification Script

Run this after all migrations to verify everything:

```sql
-- ============================================
-- COMPLETE DATABASE VERIFICATION
-- ============================================

-- 1. Check Extension
SELECT 'Extension Check' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
  ) THEN '✅ uuid-ossp extension exists'
  ELSE '❌ uuid-ossp extension missing'
  END as result;

-- 2. Check All Tables (Should be 20 total)
SELECT 'Tables Check' as check_type,
  COUNT(*) as table_count,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ All tables present'
    WHEN COUNT(*) >= 19 THEN '⚠️ Missing webhook_retry_queue (run step 2)'
    ELSE '❌ Missing tables - check schema.sql'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles',
  'entitlements',
  'stripe_customers',
  'stripe_webhook_events',
  'webhook_retry_queue',
  'api_connections',
  'trades',
  'strategies',
  'strategy_versions',
  'collections',
  'daily_biases',
  'quick_journals',
  'trade_journals',
  'weekly_reviews',
  'risk_rules',
  'saved_filters',
  'todos',
  'rule_violations',
  'dashboard_metrics',
  'audit_log'
);

-- 3. Check Critical Functions
SELECT 'Functions Check' as check_type,
  routine_name,
  CASE 
    WHEN routine_name = 'update_updated_at_column' THEN '✅ Core trigger function'
    WHEN routine_name = 'calculate_next_retry_at' THEN '✅ Retry queue function'
    ELSE '✅ Function exists'
  END as result
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_updated_at_column',
  'calculate_next_retry_at'
)
ORDER BY routine_name;

-- 4. Check Critical Triggers
SELECT 'Triggers Check' as check_type,
  trigger_name,
  event_object_table,
  CASE 
    WHEN event_object_table = 'stripe_customers' AND trigger_name LIKE '%updated_at%' 
      THEN '✅ Stripe customers trigger'
    WHEN event_object_table = 'webhook_retry_queue' 
      THEN '✅ Webhook retry queue trigger'
    WHEN trigger_name LIKE '%updated_at%' 
      THEN '✅ Updated_at trigger'
    ELSE '✅ Trigger exists'
  END as result
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- 5. Check RLS is Enabled
SELECT 'RLS Check' as check_type,
  tablename,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS enabled'
    ELSE '❌ RLS disabled'
  END as result
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE pt.schemaname = 'public' 
AND tablename IN (
  'profiles',
  'entitlements',
  'stripe_customers',
  'stripe_webhook_events',
  'webhook_retry_queue',
  'api_connections',
  'audit_log'
)
ORDER BY tablename;

-- 6. Check Critical Indexes
SELECT 'Indexes Check' as check_type,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE '%_pkey' THEN '✅ Primary key'
    WHEN indexname LIKE 'idx_%' THEN '✅ Performance index'
    ELSE '✅ Index exists'
  END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
  tablename IN ('stripe_webhook_events', 'webhook_retry_queue', 'entitlements')
  OR indexname LIKE '%user_id%'
  OR indexname LIKE '%stripe_event_id%'
)
ORDER BY tablename, indexname;

-- Summary
SELECT 'Summary' as check_type,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
   AND table_name IN ('profiles', 'entitlements', 'stripe_customers', 'stripe_webhook_events', 'webhook_retry_queue', 'api_connections', 'trades', 'strategies', 'strategy_versions', 'collections', 'daily_biases', 'quick_journals', 'trade_journals', 'weekly_reviews', 'risk_rules', 'saved_filters', 'todos', 'rule_violations', 'dashboard_metrics', 'audit_log')) as tables_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' 
   AND routine_name IN ('update_updated_at_column', 'calculate_next_retry_at')) as functions_count,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' 
   AND trigger_name LIKE '%updated_at%') as triggers_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
          AND table_name = 'webhook_retry_queue') = 1 
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' 
           AND routine_name = 'calculate_next_retry_at') = 1
      AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' 
           AND event_object_table = 'stripe_customers' AND trigger_name LIKE '%updated_at%') = 1
    THEN '✅ All migrations applied successfully!'
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
          AND table_name = 'webhook_retry_queue') = 0
    THEN '⚠️ Missing webhook_retry_queue - Run step 2'
    WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' 
          AND event_object_table = 'stripe_customers' AND trigger_name LIKE '%updated_at%') = 0
    THEN '⚠️ Missing stripe_customers trigger - Run step 3 (recommended)'
    ELSE '⚠️ Some elements missing - Check individual results above'
  END as overall_status;
```

---

## Quick Start (All at Once)

If you want to apply everything at once:

```sql
-- 1. Run main schema.sql contents here
-- (Copy and paste entire schema.sql)

-- 2. Run webhook_retry_queue.sql contents here
-- (Copy and paste entire webhook_retry_queue.sql)

-- 3. Add missing trigger
CREATE TRIGGER update_stripe_customers_updated_at 
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Verify everything
-- (Run verification script above)
```

---

## Troubleshooting

### Error: "relation already exists"

**Solution:** The table/trigger already exists. You can either:
- Skip that part of the migration
- Drop and recreate: `DROP TABLE IF EXISTS webhook_retry_queue CASCADE;` then re-run

### Error: "function already exists"

**Solution:** The function already exists. You can either:
- Skip that part of the migration
- Drop and recreate: `DROP FUNCTION IF EXISTS calculate_next_retry_at(INTEGER);` then re-run

### Error: "permission denied"

**Solution:** Make sure you're using the **service role** key or a database user with sufficient permissions. The `anon` key won't work for creating tables.

### Error: "extension uuid-ossp does not exist"

**Solution:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Summary

**Required Migrations:**
1. ✅ `schema.sql` - Main schema (19 tables)
2. ⚠️ `webhook_retry_queue.sql` - Retry queue (1 table) - **YOU MUST RUN THIS**

**Recommended Fixes:**
3. ⚠️ `fix_stripe_customers_trigger.sql` - Missing trigger - **RECOMMENDED**

**Total Tables After Migrations: 20**

**Verification:** Use the complete verification script above to ensure everything is properly set up.
