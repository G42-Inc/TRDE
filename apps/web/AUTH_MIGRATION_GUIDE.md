# Authentication System Migration Guide

## Overview

This guide documents the migration from the old multi-layer authentication system to the new unified Clerk-based system.

## Key Changes

### 1. Removed Components
- ❌ `EntitlementGate` (client-side) → Replaced by `ProtectedRoute` (server-side)
- ❌ Standalone admin auth (`admin.dev.ts`, `admin_session_dev` cookie)
- ❌ Multiple fallback userId extraction methods
- ❌ Client-side entitlement checks with redirects

### 2. New Components
- ✅ `checkUserAccess()` - Single source of truth for entitlement checks
- ✅ `ProtectedRoute` - Server-side route protection component
- ✅ `requireAdmin()` - Admin verification using Clerk metadata
- ✅ `/api/auth/check-access` - Unified access check API

### 3. Architecture Changes

#### Old System (Multiple Layers)
```
Client Component → EntitlementGate (client) → API call → Server check → Redirect
Middleware → Cookie extraction → Header → Multiple fallbacks
Admin → Standalone cookie → Separate auth system
```

#### New System (Single Path)
```
Middleware → Clerk auth only
Server Component → ProtectedRoute → checkUserAccess() → Render/Redirect
Admin → Clerk metadata check → Same auth system
```

## Migration Steps

### Step 1: Replace Middleware
1. Backup current `middleware.ts`
2. Replace with `middleware.new.ts` (rename to `middleware.ts`)
3. Test Clerk authentication still works

### Step 2: Update App Layout
1. Backup current `apps/web/src/app/(app)/layout.tsx`
2. Replace with `apps/web/src/app/(app)/layout.new.tsx`
3. Ensure `AppShell.tsx` component exists

### Step 3: Update Admin System
1. Set admin role in Clerk Dashboard for admin users:
   ```json
   {
     "role": "admin",
     "isAdmin": true,
     "admin": true
   }
   ```
2. Backup current `apps/web/src/app/admin/layout.tsx`
3. Replace with `apps/web/src/app/admin/layout.new.tsx`
4. Update `apps/web/src/app/admin/page.tsx` to get userId from Clerk:
   ```tsx
   import { currentUser } from '@clerk/nextjs/server';
   
   export default async function AdminPage() {
     const user = await currentUser();
     const adminUserId = user?.id || '';
     
     return (
       <div className="min-h-screen theme-bg p-6">
         <div className="max-w-7xl mx-auto">
           <AdminPanel adminUserId={adminUserId} />
         </div>
       </div>
     );
   }
   ```

### Step 4: Update API Routes
1. Backup current API routes:
   - `apps/web/src/app/api/admin/entitlements/route.ts`
   - `apps/web/src/app/api/admin/search/route.ts`
   - `apps/web/src/app/api/admin/sync-profile/route.ts`
2. Replace with `.new.ts` versions (remove `.new` extension)
3. Update any routes using `/api/entitlements/current` to use `/api/auth/check-access`

### Step 5: Update Auth Redirect
1. Backup `apps/web/src/app/auth-redirect/page.tsx`
2. Replace with `apps/web/src/app/auth-redirect/page.new.tsx`

### Step 6: Update Pricing Page
1. Backup `apps/web/src/app/pricing/page.tsx`
2. Replace with `apps/web/src/app/pricing/page.new.tsx`

### Step 7: Clean Up
1. Delete old files:
   - `apps/web/src/lib/auth/admin.dev.ts` (standalone admin auth)
   - `apps/web/src/lib/entitlements/route-protection.tsx` (old EntitlementGate)
   - `apps/web/src/app/api/admin/login/route.ts` (standalone login)
   - `apps/web/src/app/api/admin/logout/route.ts` (standalone logout)
   - `apps/web/src/app/admin/login/page.tsx` (standalone login page)
2. Remove unused imports and code

### Step 8: Update UserSync
Update `apps/web/src/components/UserSync.tsx` to work with new system:
- Remove admin route checks (admin now uses Clerk)
- Keep sign-in/sign-up/auth-redirect checks

## Setting Admin Role in Clerk

1. Go to Clerk Dashboard → Users
2. Find your admin user
3. Click "Edit metadata"
4. Add to `publicMetadata`:
   ```json
   {
     "role": "admin",
     "isAdmin": true,
     "admin": true
   }
   ```
5. Save

## Testing Checklist

- [ ] Normal user sign-in → Redirects to `/app` if has entitlement
- [ ] Normal user sign-in → Redirects to `/pricing` if no entitlement
- [ ] Admin sign-in → Redirects to `/admin`
- [ ] Admin panel → Can search users
- [ ] Admin panel → Can grant entitlements
- [ ] Protected routes → Redirect to sign-in if not authenticated
- [ ] Protected routes → Redirect to pricing if no entitlement
- [ ] Pricing page → Auto-redirects to `/app` if user has entitlement
- [ ] UserSync → Syncs profile after sign-in

## Rollback Plan

If issues occur:
1. Restore backed up files
2. Revert middleware
3. Restore standalone admin auth if needed
4. Check Clerk metadata is set correctly

## Benefits

1. **No Race Conditions**: Server-side checks prevent timing issues
2. **Simpler Code**: Single path for entitlement checks
3. **Better Security**: All checks server-side
4. **Easier Debugging**: Clear, single code path
5. **Unified System**: Admin and users use same auth
