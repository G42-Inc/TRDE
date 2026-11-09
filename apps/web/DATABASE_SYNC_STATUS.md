# Database Sync Status: Web ↔ Mobile

## Current Status: ❌ **NOT SYNCING**

### Web App
- ✅ Supabase database integration complete
- ✅ Clerk authentication integrated
- ✅ API routes for all data types
- ✅ User-scoped data (filtered by user_id)

### Mobile App
- ❌ Still uses AsyncStorage (local only)
- ❌ No authentication
- ❌ No database integration
- ❌ Cannot sync with web app

## What This Means

**Right now:**
- Web app data is stored in Supabase (cloud)
- Mobile app data is stored locally (device only)
- **No sync between them** - they're completely separate

**To enable sync, we need:**
1. Mobile app authentication (Clerk)
2. Mobile app database integration (Supabase or API routes)
3. Both apps using same user ID

## Architecture for Sync

### Option A: Mobile Uses API Routes (Recommended)
```
Mobile App → API Routes → Supabase
Web App   → API Routes → Supabase
```
- ✅ Reuses existing API routes
- ✅ Consistent validation
- ✅ Easier to maintain

### Option B: Mobile Uses Supabase Directly
```
Mobile App → Supabase (direct)
Web App   → API Routes → Supabase
```
- ✅ Faster (no API layer)
- ❌ More complex (auth token handling)
- ❌ Duplicate validation logic

## Implementation Required

### 1. Mobile Authentication
- Install `@clerk/clerk-expo`
- Add sign-in/sign-up screens
- Get user ID from Clerk session

### 2. Mobile Database Layer
- Create `apps/mobile/src/lib/storage.db.ts`
- Use same API endpoints as web
- Or use Supabase client directly

### 3. Update Mobile Components
- Replace AsyncStorage with database calls
- Add loading states
- Handle authentication

## Quick Start (If Implementing)

1. **Add dependencies:**
   ```bash
   cd apps/mobile
   pnpm add @clerk/clerk-expo @supabase/supabase-js
   ```

2. **Set up Clerk:**
   - Add publishable key to `app.json`
   - Wrap app with `ClerkProvider`

3. **Create storage layer:**
   - Copy `apps/web/src/lib/storage.db.ts` pattern
   - Update API base URL for mobile

4. **Update components:**
   - Change imports from `storage.ts` to `storage.db.ts`
   - Add async/await handling

## Testing Sync

Once implemented:
1. Sign in on web → Create trade
2. Sign in on mobile → Should see trade
3. Create trade on mobile → Should appear on web
4. Edit trade on web → Should update on mobile

## Summary

**Current State:**
- Web: ✅ Database ready, authenticated
- Mobile: ❌ Local storage only, no auth

**To Enable Sync:**
- Need to implement mobile authentication + database integration
- Estimated: 12-18 hours of work

**Recommendation:**
- Implement mobile sync if cross-platform access is important
- Can be done incrementally (auth first, then database)
