# Entitlement Debugging Guide

## Current Situation
- API returns: `{entitlement: null, isAdmin: false}`
- Expected entitlement: `user_37zYliC1FnVdUccn5UjEQwjBLKl` with `status: 'comped'`, `override_enabled: true`, `override_expires_at: NULL`

## What to Check in Server Terminal

When you visit `/app`, look for these logs in your server terminal (where `npm run dev` is running):

### 1. Middleware Logs (should appear first)
```
Middleware: Set x-clerk-user-id header for API route: { pathname: '/api/entitlements/current', userId: '...', headerSet: true }
```

### 2. API Route Logs
```
Current entitlement API: Starting request
Current entitlement API: userId from middleware header: user_37zYliC1FnVdUccn5UjEQwjBLKl
Current entitlement API: Calling getUserEntitlement for: user_37zYliC1FnVdUccn5UjEQwjBLKl
```

### 3. Database Query Logs (CRITICAL - shows what's in DB)
```
getUserEntitlement: Sample entitlements in DB: {
  count: 1,
  userIds: ['user_37zYliC1FnVdUccn5UjEQwjBLKl'],
  error: null
}
```

### 4. Query Result (CRITICAL - shows if match was found)
```
getUserEntitlement: Query result: {
  hasData: true/false,
  hasError: true/false,
  searchedUserId: 'user_37zYliC1FnVdUccn5UjEQwjBLKl',
  foundUserId: '...',
  userIdsMatch: true/false
}
```

### 5. Debug Output (shows all entitlements if none found)
```
Current entitlement API: DEBUG - All entitlements in DB: {
  count: ...,
  entitlements: [...],
  searchingFor: 'user_37zYliC1FnVdUccn5UjEQwjBLKl'
}
```

## Common Issues

### Issue 1: Entitlement doesn't exist
- **Symptom**: `getUserEntitlement: Sample entitlements in DB: { count: 0, userIds: [] }`
- **Fix**: Run the INSERT statement in `fix_entitlement.sql` (uncomment it)

### Issue 2: userId mismatch
- **Symptom**: `userIdsMatch: false` or `searchedUserId` !== `foundUserId`
- **Fix**: Check for typos, encoding issues, or whitespace

### Issue 3: Query error
- **Symptom**: `hasError: true` with error details
- **Fix**: Check Supabase connection and table structure

## Quick Fix: Verify Entitlement Exists

Run this in Supabase SQL Editor:

```sql
-- Check if entitlement exists
SELECT * FROM entitlements WHERE user_id = 'user_37zYliC1FnVdUccn5UjEQwjBLKl';

-- If it doesn't exist, create it:
INSERT INTO entitlements (
  user_id, plan, status, override_enabled, override_expires_at, 
  current_period_end, source, notes, created_at, updated_at
) VALUES (
  'user_37zYliC1FnVdUccn5UjEQwjBLKl',
  'pro',
  'comped',
  true,
  NULL,
  NULL,
  'manual',
  'Permanent access',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  override_enabled = EXCLUDED.override_enabled,
  override_expires_at = EXCLUDED.override_expires_at,
  updated_at = NOW();
```

## Current Check Logic

An entitlement is considered **active** if:

1. **Override is enabled** (`override_enabled = true`):
   - If `override_expires_at` is NULL or empty → **PERMANENT ACCESS** ✓
   - If `override_expires_at` is set → check if it's in the future

2. **OR regular subscription**:
   - `status` must be `'active'` OR `'comped'`
   - AND `current_period_end` must be NULL or in the future

Your entitlement should match case #1 (override enabled with NULL expiration = permanent).
