# Supabase Database Setup Instructions

## Quick Start

1. **Open Supabase Dashboard** → Your Project → **SQL Editor**

2. **Run the Main Schema**:
   - Copy the entire contents of `schema.sql`
   - Paste into SQL Editor
   - Click **"Run"** or press `Ctrl+Enter` / `Cmd+Enter`

3. **If Profiles Table Already Exists** (optional):
   - Run `migrate.sql` to add `first_name` and `last_name` columns
   - This is safe to run even if columns already exist

4. **Verify Setup**:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   
   -- Check profiles table has all columns
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

## What Gets Created

### Core Tables (2)
- ✅ `profiles` - User profiles (with first_name, last_name, display_name, email)
- ✅ `entitlements` - Subscription/access management

### Trading Data Tables (4)
- ✅ `trades` - All trade records (Futures & Options with all fields)
- ✅ `strategies` - Trading strategies
- ✅ `strategy_versions` - Strategy versions/history
- ✅ `collections` - Trade collections

### Journaling & Reviews Tables (4)
- ✅ `trade_journals` - Pre-trade and post-trade journals
- ✅ `quick_journals` - Daily quick journal entries
- ✅ `daily_biases` - Daily market bias entries
- ✅ `weekly_reviews` - Weekly review summaries

### Risk Management Tables (2)
- ✅ `risk_rules` - User risk management rules
- ✅ `rule_violations` - Detected rule violations

### Preferences & Filters Tables (2)
- ✅ `saved_filters` - Saved trade filter configurations
- ✅ `dashboard_metrics` - User dashboard metric preferences

### Todos Table (1)
- ✅ `todos` - Todo items with categories

### System Tables (2)
- ✅ `api_connections` - Encrypted API tokens (server-only)
- ✅ `audit_log` - Admin action logging (server-only)

**Total: 17 tables**

### Security
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Service role can access everything (server-side)
- ✅ Permissive policies for anon key (Clerk handles auth at app level)
- ✅ `api_connections` and `audit_log` are server-only (no anon access)

### Indexes
- ✅ Indexes on all foreign keys and commonly queried columns
- ✅ Composite indexes for common query patterns

### Functions & Triggers
- ✅ `update_updated_at_column()` function
- ✅ Automatic `updated_at` triggers on profiles, entitlements, api_connections

## Troubleshooting

### "relation already exists"
- This is OK - tables are created with `IF NOT EXISTS`
- If you see this, the table already exists

### "column already exists" (when running migrate.sql)
- This is OK - the migration script checks before adding columns

### "permission denied"
- Make sure you're running as the project owner
- Check that RLS policies are correctly created
- Verify service role key is set in `.env.local`

### Missing Columns Error
- If you get errors about `first_name` or `last_name` not existing:
  1. Run `migrate.sql` to add them
  2. Or manually: 
     ```sql
     ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
     ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
     ```

## Verification Queries

After setup, run these to verify everything works:

```sql
-- Count tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return: 17 tables

-- Check profiles structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Should show: user_id, email, display_name, first_name, last_name, created_at, updated_at

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Should show multiple indexes per table
```

## Next Steps

After schema is set up:
1. ✅ Verify environment variables are set in `.env.local`
2. ✅ Restart dev server: `npm run dev`
3. ✅ Test admin panel search
4. ✅ Test user profile sync (sign in and check profiles table)
5. ✅ Test entitlement management in admin panel
