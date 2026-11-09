# Mobile App Database Sync Setup

## ✅ Completed Implementation

### 1. Clerk Authentication
- ✅ `@clerk/clerk-expo` package added
- ✅ `ClerkProviderWrapper` component created
- ✅ Sign-in and Sign-up screens created
- ✅ Auth helpers (`lib/auth/clerk.ts`) created
- ✅ App.tsx updated with authentication flow

### 2. Database Storage Layer
- ✅ `lib/storage.db.ts` - Database storage layer with offline support
- ✅ Uses same API routes as web app
- ✅ Offline caching with AsyncStorage
- ✅ Sync queue for offline writes
- ✅ Automatic sync when coming back online

### 3. Configuration
- ✅ `lib/config.ts` - API base URL and Clerk key configuration
- ✅ `app.json` - Expo configuration with SecureStore plugin
- ✅ Environment variable support

### 4. Migration Tools
- ✅ `components/DataMigration.tsx` - UI for migrating AsyncStorage data
- ✅ Migration API endpoint (reuses web `/api/data/migrate`)

## Package Differences

### Web App
- Uses: `@clerk/nextjs` (Next.js specific)
- Provider: `ClerkProvider` from `@clerk/nextjs`
- Auth: Server-side `auth()` function
- Tokens: Automatic via cookies

### Mobile App
- Uses: `@clerk/clerk-expo` (Expo/React Native specific)
- Provider: `ClerkProvider` from `@clerk/clerk-expo`
- Auth: Client-side hooks (`useAuth`, `useUser`)
- Tokens: Stored in SecureStore, sent as Bearer token

## Setup Steps

### 1. Install Dependencies
```bash
cd apps/mobile
pnpm install
```

### 2. Environment Variables

Create `.env` or `.env.local` in `apps/mobile/`:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_WEB_URL=https://your-domain.com
# OR
EXPO_PUBLIC_API_URL=https://your-domain.com/api/data
```

### 3. Update app.json (Already Done)
- ✅ SecureStore plugin added
- ✅ Clerk key in extra config

### 4. Test Authentication
1. Run mobile app: `pnpm dev:mobile`
2. Should see sign-in screen if not authenticated
3. Sign in with Clerk account
4. Should navigate to main app

### 5. Test Data Sync
1. Sign in on web → Create trade
2. Sign in on mobile → Should see same trade
3. Create trade on mobile → Should appear on web
4. Test offline → Should cache and sync when online

## How It Works

### Authentication Flow
1. User opens mobile app
2. `AppNavigator` checks `isSignedIn` from Clerk
3. If not signed in → Shows `AuthNavigator` (SignIn/SignUp)
4. If signed in → Shows `TabNavigator` (main app)

### Data Sync Flow
1. Mobile app calls API routes (same as web)
2. API routes verify Clerk token (Bearer or cookie)
3. Data stored in Supabase with `user_id`
4. Both apps see same data (same user_id)

### Offline Support
1. When offline: Data cached in AsyncStorage
2. Writes queued for sync
3. When online: Queue automatically syncs
4. Cache updated after successful sync

## API Authentication

### Web Requests
- Uses Clerk session cookies (automatic)
- Middleware verifies session

### Mobile Requests
- Sends Bearer token in `Authorization` header
- Token from `tokenCache.getToken()`
- Middleware verifies Bearer token

**Note**: Clerk's Next.js middleware automatically handles both cookies and Bearer tokens, so no changes needed to API routes!

## Files Created

### Authentication
- `apps/mobile/src/lib/auth/clerk.ts` - Auth helpers
- `apps/mobile/src/components/ClerkProviderWrapper.tsx` - Clerk provider
- `apps/mobile/src/screens/SignInScreen.tsx` - Sign-in screen
- `apps/mobile/src/screens/SignUpScreen.tsx` - Sign-up screen

### Storage
- `apps/mobile/src/lib/storage.db.ts` - Database storage layer
- `apps/mobile/src/lib/config.ts` - Configuration
- `apps/mobile/src/lib/sync.ts` - Auto-sync utilities

### Migration
- `apps/mobile/src/components/DataMigration.tsx` - Migration UI

## Files Updated

- `apps/mobile/App.tsx` - Added Clerk provider and auth flow
- `apps/mobile/package.json` - Added Clerk and SecureStore packages
- `apps/mobile/app.json` - Added SecureStore plugin

## Next Steps

1. **Install packages**: Run `pnpm install` in mobile directory
2. **Set environment variables**: Add Clerk key and API URL
3. **Test authentication**: Sign in/up flow
4. **Test data sync**: Create data on web, verify on mobile
5. **Update components**: Gradually migrate from `storage.ts` to `storage.db.ts`

## Migration Path

### For Components

**Before:**
```typescript
import { getTrades, saveTrades } from '@/lib/storage';

const trades = await getTrades();
await saveTrades(updatedTrades);
```

**After:**
```typescript
import { getTrades, saveTrades } from '@/lib/storage.db';

const trades = await getTrades();
await saveTrades(updatedTrades);
```

**Note**: Functions are already async, so minimal changes needed!

## Testing Checklist

- [ ] Install dependencies
- [ ] Set environment variables
- [ ] Test sign-in flow
- [ ] Test sign-up flow
- [ ] Test data fetch from API
- [ ] Test data save to API
- [ ] Test offline caching
- [ ] Test sync queue
- [ ] Test cross-platform sync (web ↔ mobile)
- [ ] Test migration from AsyncStorage

## Troubleshooting

### "Clerk publishable key not set"
- Add `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to environment variables
- Restart Expo dev server

### "Failed to fetch" errors
- Check `EXPO_PUBLIC_WEB_URL` or `EXPO_PUBLIC_API_URL` is set
- Verify web app is running and accessible
- Check network connectivity

### "Unauthorized" errors
- Verify user is signed in
- Check token is being sent in Authorization header
- Verify Clerk key matches between web and mobile

### Offline sync not working
- Check `@react-native-community/netinfo` is installed
- Verify sync queue is being processed
- Check console for sync errors
