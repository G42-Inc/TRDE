# Access Check Flow Documentation

## Current Flow When Visiting `/app`:

1. **Middleware** (`middleware.ts`)
   - Runs on every request
   - Gets `userId` from Clerk `auth()`
   - Sets `x-clerk-user-id` header for API routes
   - Allows `/app` route if user is authenticated

2. **Page Render** (`/app/layout.tsx`)
   - Server-side: Layout wraps children with `<EntitlementGate>`
   - Client-side: `EntitlementGate` component mounts

3. **EntitlementGate** (`route-protection.tsx`)
   - Client component
   - Waits for Clerk to load (`isLoaded`)
   - Gets `userId` from `useUser()` hook
   - Calls `/api/entitlements/current` via `fetch()`
   - Checks response:
     - If `isAdmin: true` → Allow access
     - If `entitlement: null` → Redirect to `/pricing?locked=true`
     - If entitlement exists → Check if active → Check plan access

4. **API Route** (`/api/entitlements/current/route.ts`)
   - Gets `userId` from `x-clerk-user-id` header (set by middleware)
   - Falls back to decoding Clerk session cookie if header missing
   - Calls `getUserEntitlement(userId)` to query database
   - Returns `{entitlement, isAdmin}`

5. **Database Query** (`check.server.ts`)
   - Uses Supabase service role client (bypasses RLS)
   - Queries: `SELECT * FROM entitlements WHERE user_id = userId`
   - Returns entitlement or null

## Potential Issues:

1. **Middleware not setting header**: If `userId` is null in middleware, header won't be set
2. **Header not reaching API**: Next.js header forwarding issue
3. **UserId mismatch**: Clerk userId doesn't match database `user_id`
4. **Database query issue**: RLS, connection, or query syntax problem
5. **Timing issue**: Client check happens before server check completes

## Debugging:

- Check server terminal for: `Middleware: Set x-clerk-user-id header`
- Check server terminal for: `getUserEntitlement: Sample entitlements in DB:`
- Check server terminal for: `Current entitlement API: DEBUG - All entitlements in DB:`
- Visit `/api/debug/entitlement` in browser (while signed in) to see full status
