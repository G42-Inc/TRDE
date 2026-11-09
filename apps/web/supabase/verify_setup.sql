-- Verification queries to run in Supabase SQL Editor
-- These will confirm all tables, columns, and indexes were created correctly

-- 1. Count all tables (should return 17)
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- 2. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Verify profiles table has all columns including first_name and last_name
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check that RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Count all indexes (should have many indexes)
SELECT COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public';

-- 6. List all indexes by table
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. Verify all required tables exist (should return 17 rows)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'api_connections',
    'audit_log',
    'collections',
    'daily_biases',
    'dashboard_metrics',
    'entitlements',
    'profiles',
    'quick_journals',
    'risk_rules',
    'rule_violations',
    'saved_filters',
    'strategies',
    'strategy_versions',
    'trade_journals',
    'trades',
    'todos',
    'weekly_reviews'
  )
ORDER BY table_name;
