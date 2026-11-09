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
