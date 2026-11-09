# Mobile App Database Sync Integration

## Current Status

❌ **NOT YET IMPLEMENTED**

The mobile app currently:
- Uses AsyncStorage (local device storage only)
- Has no authentication
- Cannot sync with web app

## What's Needed for Sync

### 1. Authentication (Clerk)
- Install `@clerk/clerk-expo` package
- Set up Clerk provider in App.tsx
- Add sign-in/sign-up screens
- Get user ID from Clerk session

### 2. Database Integration (Supabase)
- Install `@supabase/supabase-js` package
- Create storage layer similar to web app
- Use same API endpoints or direct Supabase client
- Handle offline/online sync

### 3. Shared User IDs
- Both apps use Clerk user ID
- Same user ID = same data in database
- Data automatically syncs when both apps use same user

## Implementation Options

### Option 1: Use Web API Routes (Recommended)
- Mobile app calls same API routes as web app
- Simpler: reuse existing API routes
- Consistent: same validation and logic
- Requires: API base URL configuration

### Option 2: Direct Supabase Client
- Mobile app uses Supabase client directly
- Faster: no API layer
- More complex: need to handle auth tokens
- Requires: Supabase client setup in mobile

## Recommended Approach

**Use API Routes** (Option 1) because:
1. ✅ Reuses existing web API routes
2. ✅ Consistent validation and business logic
3. ✅ Easier to maintain (one source of truth)
4. ✅ Better security (server-side validation)
5. ✅ Works with existing Clerk authentication

## Implementation Steps

### Step 1: Add Dependencies
```bash
cd apps/mobile
pnpm add @clerk/clerk-expo @supabase/supabase-js
```

### Step 2: Set Up Clerk
- Add Clerk publishable key to app config
- Wrap app with ClerkProvider
- Add sign-in/sign-up screens

### Step 3: Create Storage Layer
- Create `apps/mobile/src/lib/storage.db.ts`
- Use same API endpoints as web app
- Handle offline caching with AsyncStorage

### Step 4: Update Components
- Replace AsyncStorage calls with database calls
- Add loading states
- Handle offline/online sync

## API Base URL Configuration

The mobile app needs to know where the web API is hosted:

**Development:**
```typescript
const API_BASE = 'http://localhost:3000/api/data';
```

**Production:**
```typescript
const API_BASE = 'https://your-domain.com/api/data';
```

Use environment variables:
```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/data';
```

## Offline Support

For offline support, implement:
1. **Cache layer**: Store data in AsyncStorage as cache
2. **Sync queue**: Queue writes when offline, sync when online
3. **Conflict resolution**: Handle conflicts when syncing

## Files to Create

1. `apps/mobile/src/lib/storage.db.ts` - Database storage layer
2. `apps/mobile/src/lib/auth/clerk.ts` - Clerk auth helpers
3. `apps/mobile/src/components/AuthProvider.tsx` - Clerk provider wrapper
4. `apps/mobile/src/screens/SignInScreen.tsx` - Sign-in screen
5. `apps/mobile/src/screens/SignUpScreen.tsx` - Sign-up screen

## Files to Update

1. `apps/mobile/App.tsx` - Add Clerk provider
2. `apps/mobile/package.json` - Add dependencies
3. `apps/mobile/app.json` - Add Clerk configuration
4. All screens using storage - Update to use `storage.db.ts`

## Testing

1. Sign in on web app → Create trade
2. Sign in on mobile app → Should see same trade
3. Create trade on mobile → Should appear on web
4. Test offline → Should cache and sync when online

## Timeline

- **Phase 1**: Authentication (Clerk) - 2-3 hours
- **Phase 2**: Database storage layer - 2-3 hours
- **Phase 3**: Update components - 4-6 hours
- **Phase 4**: Offline support - 4-6 hours
- **Total**: ~12-18 hours

## Next Steps

Would you like me to:
1. ✅ Set up Clerk authentication for mobile?
2. ✅ Create database storage layer for mobile?
3. ✅ Update mobile components to use database?
4. ✅ Add offline sync support?
