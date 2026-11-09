# Trades Database Migration

This migration creates all tables needed for cross-platform trade synchronization between mobile and web apps.

## What This Migration Does

Creates the following tables in your Supabase database:
- `trades` - All trade data (futures and options)
- `strategies` - Trading strategies
- `strategy_versions` - Strategy versions
- `collections` - Trade collections
- `daily_biases` - Daily market biases
- `quick_journals` - Quick journal entries
- `trade_journals` - Detailed trade journals
- `weekly_reviews` - Weekly review data
- `risk_rules` - Risk management rules
- `saved_filters` - Saved trade filters
- `todos` - Trading todos
- `rule_violations` - Risk rule violations
- `dashboard_metrics` - Dashboard metric preferences

All tables include:
- Row Level Security (RLS) policies
- Indexes for performance
- `user_id` column for multi-user support

## How to Run

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `20250124000000_create_trades_tables.sql`
6. Paste into the SQL editor
7. Click **Run** (or press `Cmd/Ctrl + Enter`)

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: psql

```bash
# If you have direct database access
psql $DATABASE_URL -f apps/web/supabase/migrations/20250124000000_create_trades_tables.sql
```

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
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
  'dashboard_metrics'
)
ORDER BY table_name;
```

You should see all 13 tables listed.

## After Migration

1. **Web App**: Trades will automatically sync to the database when:
   - Creating new trades
   - Editing trades
   - Deleting trades
   - Importing from broker
   - Signing in/out
   - Manual sync from Settings

2. **Mobile App**: Trades will automatically sync to the database when:
   - Creating new trades
   - Editing trades
   - Deleting trades
   - Manual sync from Settings

3. **Data Sharing**: Once both apps are using the same database:
   - Trades created on mobile will appear on web
   - Trades created on web will appear on mobile
   - All data is synced via `user_id` (Clerk user ID)

## Troubleshooting

### "relation already exists" error
- Some tables may already exist
- This is OK - the migration uses `CREATE TABLE IF NOT EXISTS`
- The migration is safe to run multiple times

### "permission denied" error
- Make sure you're using the service role key or have proper permissions
- Check your Supabase project settings

### Tables created but no data syncing
- Verify your web app's `.env.local` has correct Supabase credentials
- Verify your mobile app's `.env` has correct `EXPO_PUBLIC_WEB_URL`
- Check that both apps are using the same Clerk publishable key
- Check server logs: `pm2 logs trde-web | grep -E "Error|trades"`

## Next Steps

1. Run the migration SQL
2. Deploy the updated web app code
3. Test creating a trade on web - it should save to database
4. Test creating a trade on mobile - it should sync to web
5. Verify trades appear on both platforms
