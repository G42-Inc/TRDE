# Database Migration Guide

## Overview

This guide covers the migration from localStorage-based storage to Supabase production database.

## Current Status

✅ **Completed:**
- Database schema created (`supabase/schema.sql`)
- API routes for core data types (trades, strategies, versions, collections, daily biases, quick journals)
- Database storage layer (`lib/storage.db.ts`)
- Migration API endpoint (`/api/data/migrate`)
- Migration UI component (`components/DataMigration.tsx`)

⚠️ **Remaining:**
- API routes for: saved filters, risk rules, journals, weekly reviews, todos, rule violations
- Update components to use async storage functions
- Environment variable setup
- Testing and validation

## Database Schema

The production database includes the following tables:

- `profiles` - User profiles (synced from Clerk)
- `entitlements` - Subscription/paywall status
- `api_connections` - Encrypted API tokens
- `trades` - User trade data
- `strategies` - Trading strategies
- `strategy_versions` - Strategy versioning
- `collections` - Trade collections
- `daily_biases` - Daily market bias entries
- `quick_journals` - Quick journal notes
- `audit_log` - Admin action logging

## Setup Steps

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for project to be ready (~2 minutes)

### 2. Run Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `apps/web/supabase/schema.sql`
3. Paste and execute
4. Verify all tables were created

### 3. Get Environment Variables

From Supabase Dashboard → Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL` - Project URL (e.g., `https://xxxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

### 4. Add to Environment Variables

**Local Development** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Vercel Production**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all three variables
3. Redeploy application

### 5. Test Database Connection

1. Sign in to the application
2. Check browser console for any errors
3. Try creating a trade - it should save to database

## Migration Process

### For Existing Users (localStorage → Database)

1. **Automatic Detection**: The `DataMigration` component will detect localStorage data
2. **User Prompt**: User sees migration prompt on first login after database is enabled
3. **One-Click Migration**: User clicks "Start Migration" to migrate all data
4. **Verification**: User can verify data in the app
5. **Cleanup**: User can manually clear localStorage after verifying

### Migration Endpoint

The migration endpoint (`/api/data/migrate`) accepts:
```json
{
  "data": {
    "trades": [...],
    "strategies": [...],
    "versions": [...],
    "collections": [...],
    "dailyBiases": [...],
    "quickJournals": [...]
  }
}
```

And returns:
```json
{
  "success": true,
  "results": {
    "trades": { "success": true, "count": 150 },
    "strategies": { "success": true, "count": 5 },
    ...
  }
}
```

## Code Changes Required

### 1. Update Storage Imports

**Before:**
```typescript
import { getTrades, saveTrades } from '@/lib/storage';
```

**After:**
```typescript
import { getTrades, saveTrades } from '@/lib/storage.db';
```

### 2. Update Function Calls (Make Async)

**Before:**
```typescript
const trades = getTrades();
saveTrades(updatedTrades);
```

**After:**
```typescript
const trades = await getTrades();
await saveTrades(updatedTrades);
```

### 3. Update Components

**Before:**
```tsx
useEffect(() => {
  const trades = getTrades();
  setTrades(trades);
}, []);
```

**After:**
```tsx
useEffect(() => {
  async function loadData() {
    const trades = await getTrades();
    setTrades(trades);
  }
  loadData();
}, []);
```

### 4. Add Migration Component

Add to your main app layout or dashboard:
```tsx
import { DataMigration } from '@/components/DataMigration';

// In your component:
<DataMigration />
```

## Files to Update

### High Priority (Core Functionality)
- `apps/web/src/app/trades/page.tsx`
- `apps/web/src/app/trades/[id]/page.tsx`
- `apps/web/src/app/trades/new/page.tsx`
- `apps/web/src/app/strategies/page.tsx`
- `apps/web/src/app/journal/page.tsx`
- `apps/web/src/app/app/page.tsx` (dashboard)

### Medium Priority
- `apps/web/src/app/review/page.tsx`
- `apps/web/src/app/risk/page.tsx`
- `apps/web/src/app/analytics/page.tsx`

### Low Priority (Can use localStorage fallback)
- Settings, preferences, UI state

## Testing Checklist

- [ ] Supabase project created
- [ ] Schema SQL executed successfully
- [ ] Environment variables added
- [ ] API routes tested (use Postman or curl)
- [ ] Migration component displays correctly
- [ ] Data migration works end-to-end
- [ ] Trades can be created and saved
- [ ] Trades can be retrieved and displayed
- [ ] Strategies work correctly
- [ ] Collections work correctly
- [ ] Journal entries work correctly
- [ ] Data persists after page refresh
- [ ] Data is user-scoped (can't see other users' data)

## Rollback Plan

If issues occur:

1. **Keep localStorage as fallback**: Don't remove `storage.ts` immediately
2. **Feature flag**: Use environment variable to toggle between localStorage and database
3. **Gradual rollout**: Migrate one feature at a time
4. **Data backup**: Export localStorage data before migration

## Feature Flag Implementation

Create `apps/web/src/lib/storage.config.ts`:
```typescript
export const USE_DATABASE = process.env.NEXT_PUBLIC_USE_DATABASE === 'true';

export function getStorage() {
  if (USE_DATABASE) {
    return require('./storage.db');
  }
  return require('./storage');
}
```

Then update imports:
```typescript
import { getStorage } from '@/lib/storage.config';
const { getTrades, saveTrades } = getStorage();
```

## Next Steps

1. **Complete remaining API routes** for:
   - Saved filters
   - Risk rules
   - Trade journals
   - Weekly reviews
   - Todos
   - Rule violations

2. **Update components** to use async storage functions

3. **Add error handling** for network failures

4. **Add offline support** (optional - use IndexedDB as cache)

5. **Performance optimization**:
   - Add pagination for large datasets
   - Add caching layer
   - Optimize queries with indexes

6. **Monitoring**:
   - Add error tracking (Sentry)
   - Add analytics for migration success rate
   - Monitor database performance

## Support

If you encounter issues:

1. Check Supabase Dashboard → Logs for errors
2. Check browser console for client-side errors
3. Verify environment variables are set correctly
4. Verify RLS policies are correct
5. Check API route logs in Vercel

## Security Notes

- All API routes require authentication (Clerk)
- All queries filter by `user_id` (server-side)
- Service role key is server-only (never exposed to client)
- RLS policies provide defense-in-depth
- All user data is encrypted in transit (HTTPS)
