# Current deployment schema

For a **new, empty, dedicated TRDE project**, use [`bootstrap.sql`](bootstrap.sql) as one migration named `trde_server_only_baseline`, then apply [`patches/precise-instrument-prices.sql`](patches/precise-instrument-prices.sql) as `trde_precise_instrument_prices`. Do not run the overlapping historical setup and repair scripts below in sequence. The bootstrap refuses any nonempty public schema; an existing installation needs a separately reviewed migration.

The canonical bootstrap separates private `user_strategies` from community `strategies`, includes the JSONB journal columns used by the current API, and enables RLS on all 34 tables. Browser `anon`/`authenticated` roles have no table, view or function access. The Worker verifies Clerk identity and uses a secret service-role client, with ownership filtering and immutable `user_id` database triggers. Keep the service-role key only in server secret storage. No user, admin or entitlement records are seeded; only 46 product achievement definitions are inserted.

On November 8, 2026, the dedicated TRDE project passed service-role create/read/edit SQL checks, JSONB journal roundtrips, ownership-change rejection, and XP/streak RPC checks inside a transaction that was rolled back. The Supabase security advisor returned no findings. This verifies the database layer; authenticated browser/Worker tests are a separate deployment requirement.

## Historical setup reference

# Supabase Database Setup

This directory contains the database schema and migration scripts for the TRDE application.

## Initial Setup

1. **Go to your Supabase Dashboard** → SQL Editor
2. **Copy and paste the entire contents of `schema.sql`** into the SQL Editor
3. **Click "Run"** to execute the schema

This will create all necessary tables, RLS policies, indexes, and triggers.

## Migrations

If you need to update an existing database:

1. **Check if migration is needed**: Run `migrate.sql` to add any missing columns
2. **Run migrations in order**: If you have multiple migration files, run them sequentially

## Schema Overview

### Core Tables

- **profiles** - User profile information (synced from Clerk)
- **entitlements** - Subscription/access management (paywall source of truth)
- **api_connections** - Encrypted API tokens for external services (server-only)

### User Data Tables

- **trades** - Trading journal entries
- **strategies** - Trading strategies
- **strategy_versions** - Strategy versions/history
- **collections** - Trade collections
- **daily_biases** - Daily market bias entries
- **quick_journals** - Quick journal entries

### Admin Tables

- **audit_log** - Admin action logging (server-only)

## Verification

After running the schema, verify it worked:

```sql
-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Important Notes

- All tables use **Clerk user IDs** (TEXT), not Supabase Auth UUIDs
- RLS is enabled but policies are permissive (Clerk handles auth at app level)
- Service role key bypasses RLS (used for server-side operations)
- The `api_connections` table stores encrypted tokens (server-only access)
