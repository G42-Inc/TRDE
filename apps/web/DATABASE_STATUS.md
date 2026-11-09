# TRDE Production Database Status

## Current Status: ✅ Schema Ready, Needs Deployment

### What's Complete

1. **Schema File Created** (`apps/web/supabase/schema.sql`)
   - ✅ All core tables defined
   - ✅ RLS policies configured for Clerk authentication
   - ✅ Indexes for performance
   - ✅ Triggers for `updated_at` timestamps
   - ✅ Service role policies for server-side operations

2. **Code Integration**
   - ✅ Supabase client setup (`lib/db/supabase.server.ts`)
   - ✅ Service role client for server-side operations
   - ✅ All API routes use service role (bypasses RLS)
   - ✅ Application-level access control implemented

3. **Tables Defined**
   - ✅ `profiles` - User profiles synced from Clerk
   - ✅ `entitlements` - Subscription/paywall source of truth
   - ✅ `api_connections` - Encrypted token vault (server-only)
   - ✅ `trades` - User trade data
   - ✅ `strategies` - Trading strategies
   - ✅ `strategy_versions` - Strategy versioning
   - ✅ `collections` - Trade collections
   - ✅ `daily_biases` - Daily trading biases
   - ✅ `quick_journals` - Quick journal entries
   - ✅ `audit_log` - Admin action logging

### What Needs to Be Done

1. **Create Supabase Project** (if not already done)
   - Go to https://supabase.com
   - Create a new project
   - Wait for project to be ready (~2 minutes)

2. **Run Schema SQL**
   - Open Supabase Dashboard → SQL Editor
   - Copy entire contents of `apps/web/supabase/schema.sql`
   - Paste and execute
   - Verify all tables were created successfully

3. **Get Environment Variables**
   - From Supabase Dashboard → Settings → API:
     - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon/public key
     - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

4. **Add to `.env.local`**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-only, never expose!
   ```

5. **Verify Setup**
   - Test connection with a simple query
   - Verify RLS is enabled on all tables
   - Test profile sync after user signs up

### Important Notes

**Clerk + Supabase Architecture:**
- We use **Clerk** for authentication (not Supabase Auth)
- All database operations use **service role** key (bypasses RLS)
- Access control is handled in **application code** (checking `user_id` in queries)
- RLS policies are permissive but enabled for defense-in-depth

**Security Model:**
- Service role key is **server-only** (never exposed to client)
- All sensitive operations (entitlements, tokens) use service role
- User data queries filter by `user_id` in application code
- `api_connections` table has no user policies (server-only access)

**Next Steps:**
1. Create Supabase project
2. Run schema SQL
3. Add environment variables
4. Test profile sync on user sign-up
5. Test entitlement creation via Stripe webhook

### Schema Highlights

- **User ID Format**: Clerk user IDs are stored as `TEXT` (not UUID)
- **RLS Strategy**: Permissive policies since Clerk handles auth
- **Service Role**: Full access to all tables for server operations
- **Indexes**: Optimized for common query patterns (user_id, dates)
- **Triggers**: Auto-update `updated_at` timestamps

### Testing Checklist

- [ ] Supabase project created
- [ ] Schema SQL executed successfully
- [ ] All tables visible in Supabase Dashboard
- [ ] RLS enabled on all tables
- [ ] Environment variables added
- [ ] Service role client works
- [ ] Profile sync works on sign-up
- [ ] Entitlement queries work
- [ ] Trade queries work (with user_id filter)
