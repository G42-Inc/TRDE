# Authentication System Setup Instructions

## ✅ System Migration Complete

The new unified Clerk-based authentication system has been installed. Follow these steps to complete setup.

## Step 1: Set Admin Role in Clerk Dashboard

**CRITICAL**: You must set the admin role in Clerk for your admin user account.

### How to Set Admin Role:

1. **Go to Clerk Dashboard**
   - Visit: https://dashboard.clerk.com
   - Sign in to your Clerk account
   - Select your application

2. **Navigate to Users**
   - Click "Users" in the left sidebar
   - Find your admin user account (search by email if needed)
   - Click on the user to open their details

3. **Edit Public Metadata**
   - Scroll to the "Public metadata" section
   - Click "Edit" or the pencil icon
   - Add the following JSON (replace existing if present):
     ```json
     {
       "role": "admin",
       "isAdmin": true,
       "admin": true
     }
     ```
   - Click "Save"

4. **Verify**
   - The metadata should now show:
     - `role: "admin"`
     - `isAdmin: true`
     - `admin: true`

## Step 2: Verify Environment Variables

Make sure your `.env.local` file has all required variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

If any are missing, add them and restart your dev server.

## Step 3: Test the System

### Test Normal User Flow:
1. Sign out completely (if signed in)
2. Navigate to `/app` → Should redirect to `/sign-in`
3. Sign in with a normal user account
4. If user has entitlement → Should redirect to `/app`
5. If user has no entitlement → Should redirect to `/pricing?locked=true`

### Test Admin Flow:
1. Sign out completely
2. Sign in with your admin account (the one you set role for in Step 1)
3. Should automatically redirect to `/admin`
4. Admin panel should load
5. Test searching for users
6. Test granting entitlements to users

### Test Admin Access:
1. While signed in as admin, navigate to `/app`
2. Should have full access (admins bypass entitlement checks)

## Step 4: Grant Yourself Access (If Needed)

If you need to grant access to a user account:

1. Sign in as admin (must have admin role set in Clerk)
2. Go to `/admin`
3. Search for the user (by email, name, or userId)
4. Click "Grant Access" on the user
5. Select plan (basic/edge/pro)
6. Optionally set expiration date (leave empty for permanent)
7. Click "Grant Access"
8. User should now be able to access `/app`

## Troubleshooting

### "Admin access denied" when trying to access `/admin`

**Solution**: Make sure you set the admin role in Clerk Dashboard (Step 1). The role must be in `publicMetadata`:
```json
{
  "role": "admin",
  "isAdmin": true,
  "admin": true
}
```

### User has entitlement but still redirected to pricing

**Check**:
1. Is entitlement `status` set to `'active'` or `'comped'`?
2. Is `override_enabled` set to `true`?
3. If `override_expires_at` is set, is it in the future?
4. Check server logs for `checkUserAccess` results

### "User not found" in admin search

**Solution**: User profile may not be synced to Supabase. Click "Sync from Clerk" button in admin panel to sync the user's profile.

### Build/TypeScript errors

**Solution**: 
1. Run `npm run build` to check for errors
2. Check that all files were properly replaced
3. Make sure TypeScript can find all imports

## Files Changed

### New Files Created:
- `src/lib/auth/entitlements.server.ts` - Unified entitlement check
- `src/lib/auth/admin.server.ts` - Admin verification
- `src/components/ProtectedRoute.tsx` - Server-side route protection
- `src/components/AppShell.tsx` - Client UI shell
- `src/app/api/auth/check-access/route.ts` - Access check API

### Files Replaced:
- `middleware.ts` - Simplified middleware
- `src/app/(app)/layout.tsx` - Uses ProtectedRoute
- `src/app/admin/layout.tsx` - Uses Clerk admin check
- `src/app/admin/page.tsx` - Gets userId from Clerk
- `src/app/auth-redirect/page.tsx` - Simplified redirect
- `src/app/pricing/page.tsx` - Uses new access check API
- `src/app/api/admin/*` - All admin API routes updated

### Files Removed:
- `src/lib/auth/admin.dev.ts` - Old standalone admin auth
- `src/lib/entitlements/route-protection.tsx` - Old EntitlementGate
- `src/app/admin/login/page.tsx` - Old standalone login
- `src/app/api/admin/login/route.ts` - Old login API
- `src/app/api/admin/logout/route.ts` - Old logout API

## Next Steps

1. ✅ Complete Step 1 (Set admin role in Clerk)
2. ✅ Test admin access to `/admin`
3. ✅ Test user sign-in flow
4. ✅ Test granting entitlements
5. ✅ Verify users can access `/app` after entitlement granted

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify Clerk metadata is set correctly
3. Check Supabase entitlements table for correct data
4. Review `AUTH_SYSTEM_VERIFICATION.md` for testing checklist
