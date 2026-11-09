# Webhook Retry Queue Database Migration

## What This Migration Does

This migration adds a `webhook_retry_queue` table to your Supabase database. This table stores failed webhook events (from both Stripe and Clerk) so they can be retried automatically with exponential backoff.

## When to Apply

**Apply this migration if:**
- You're setting up the webhook retry queue system
- You want automatic retries for failed webhook events
- You're deploying the latest version of the application

**Note:** The application will continue to work without this table, but failed webhooks won't be queued for retry (they'll just be logged as errors).

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open a new query
4. Copy and paste the contents of `webhook_retry_queue.sql`
5. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
6. Verify the migration succeeded (should show "Success. No rows returned")

### Option 2: Using psql Command Line

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f apps/web/supabase/webhook_retry_queue.sql
```

Replace:
- `[YOUR-PASSWORD]` with your Supabase database password
- `[YOUR-PROJECT-REF]` with your Supabase project reference ID

### Option 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
# Or manually run the SQL file
supabase db execute -f apps/web/supabase/webhook_retry_queue.sql
```

## What Gets Created

### Table: `webhook_retry_queue`

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier for each queued webhook
- `webhook_event_id` (TEXT) - The original Stripe or Clerk event ID
- `webhook_type` (TEXT) - Either 'stripe' or 'clerk'
- `event_type` (TEXT) - The type of event (e.g., 'checkout.session.completed', 'user.created')
- `event_data` (JSONB) - The full event payload stored as JSON
- `retry_count` (INTEGER) - How many times this webhook has been retried (default: 0)
- `max_retries` (INTEGER) - Maximum number of retries allowed (default: 5)
- `next_retry_at` (TIMESTAMPTZ) - When to retry this webhook next
- `last_error` (TEXT) - The last error message if any
- `status` (TEXT) - Current status: 'pending', 'processing', 'succeeded', or 'failed'
- `created_at` (TIMESTAMPTZ) - When this webhook was queued
- `updated_at` (TIMESTAMPTZ) - Last update timestamp (auto-updated via trigger)
- `processed_at` (TIMESTAMPTZ) - When the webhook was successfully processed (if succeeded)

**Indexes:**
- `idx_webhook_retry_queue_status` - For efficiently querying by status and next_retry_at
- `idx_webhook_retry_queue_webhook_type` - For filtering by webhook type
- `idx_webhook_retry_queue_event_id` - For looking up specific events

**Row Level Security (RLS):**
- Only the service role can access this table (for security)
- All policies are configured automatically

### Function: `calculate_next_retry_at`

A helper function that calculates when to retry a webhook based on the retry count using exponential backoff:
- Retry 0: 1 minute
- Retry 1: 5 minutes
- Retry 2: 15 minutes
- Retry 3: 1 hour
- Retry 4: 6 hours
- Retry 5+: 24 hours

### Trigger: `update_webhook_retry_queue_updated_at`

Automatically updates the `updated_at` column whenever a row is modified.

## Verification

After applying the migration, verify it worked:

### 1. Check Table Exists

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'webhook_retry_queue';
```

Should return 1 row with `webhook_retry_queue`.

### 2. Check Table Structure

```sql
\d webhook_retry_queue
```

Should show all columns, indexes, and triggers.

### 3. Check Indexes

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'webhook_retry_queue';
```

Should show 3 indexes (plus primary key index).

### 4. Check RLS Policies

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'webhook_retry_queue';
```

Should show 1 policy: "Allow service role full access to webhook_retry_queue".

### 5. Test Function

```sql
SELECT calculate_next_retry_at(0);
```

Should return a timestamp 1 minute from now.

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS update_webhook_retry_queue_updated_at ON webhook_retry_queue;

-- Drop the function
DROP FUNCTION IF EXISTS calculate_next_retry_at(INTEGER);

-- Drop the table (this will also drop all indexes and policies)
DROP TABLE IF EXISTS webhook_retry_queue;
```

**Warning:** Dropping the table will delete all queued webhook retries. Only do this if you're sure you want to remove the retry queue system.

## Next Steps

After applying this migration:

1. **Set up the cron job** to process retries (see `WEBHOOK_SETUP.md`)
2. **Configure webhook endpoints** in Stripe and Clerk (see `WEBHOOK_SETUP.md`)
3. **Set environment variables**:
   - `WEBHOOK_RETRY_API_KEY` (optional but recommended)
4. **Test the retry system** by temporarily breaking a webhook and verifying it gets queued

## Troubleshooting

### Migration Fails with "relation already exists"

The table already exists. You can either:
- Skip the migration (if it's already applied)
- Drop and recreate (if you want to reset): `DROP TABLE IF EXISTS webhook_retry_queue CASCADE;` then re-run the migration

### Migration Fails with "function already exists"

The function already exists. You can either:
- Skip the migration (if it's already applied)
- Drop and recreate: `DROP FUNCTION IF EXISTS calculate_next_retry_at(INTEGER);` then re-run the migration

### Migration Fails with Permission Denied

Make sure you're using the **service role** key or a database user with sufficient permissions. The `anon` key won't work for creating tables.

### Need Help?

Check the main `schema.sql` file for examples of how other tables are structured, or refer to the Supabase documentation for table creation.
