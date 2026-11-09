# PRODUCTION FIX REQUIRED: Admin Authentication

## ⚠️ CRITICAL: This MUST be fixed before production deployment

## Current Status

The admin authentication system is currently using a **standalone, dev-only implementation** that bypasses Clerk. This was implemented to avoid Clerk middleware detection issues during development.

## What Needs to Be Fixed

1. **Integrate admin auth back into Clerk system**
   - Remove standalone admin authentication (`/lib/auth/admin.dev.ts`)
   - Update admin routes to use Clerk's `isAdmin()` function
   - Ensure admin status is checked via Clerk metadata (`publicMetadata.role === 'admin'`)

2. **Fix Clerk middleware detection issue**
   - Resolve the `auth() was called but Clerk can't detect usage of clerkMiddleware()` error
   - Ensure all API routes use `currentUser()` instead of `auth()` where appropriate
   - Verify middleware configuration is correct

3. **Update admin routes**
   - `/app/admin/login/page.tsx` - Should require Clerk sign-in first
   - `/app/admin/layout.tsx` - Should use Clerk's `isAdmin()` check
   - `/app/api/admin/login/route.ts` - Should verify Clerk user + password
   - `/app/api/admin/*` - Should use Clerk's `requireAdmin()` helper

4. **Remove dev-only code**
   - Remove rate limiting from `admin.dev.ts` (use Clerk's built-in rate limiting)
   - Remove standalone session management (use Clerk sessions)
   - Remove placeholder admin IDs

## Files That Need Changes

- `apps/web/src/lib/auth/admin.dev.ts` - **DELETE** (dev-only)
- `apps/web/src/app/admin/login/page.tsx` - Restore Clerk auth requirement
- `apps/web/src/app/admin/layout.tsx` - Use Clerk `isAdmin()`
- `apps/web/src/app/admin/page.tsx` - Use real Clerk userId
- `apps/web/src/app/api/admin/login/route.ts` - Integrate with Clerk
- `apps/web/src/app/api/admin/logout/route.ts` - **DELETE** or integrate with Clerk
- `apps/web/src/app/api/admin/entitlements/route.ts` - Use Clerk `requireAdmin()`
- `apps/web/src/app/api/admin/search/route.ts` - Use Clerk `requireAdmin()`
- `apps/web/middleware.ts` - May need adjustments for Clerk integration

## Security Considerations

The current dev implementation has:
- ✅ Basic rate limiting (5 attempts per 15 minutes)
- ✅ Secure httpOnly cookies
- ✅ Session expiration (24 hours)

**BUT missing:**
- ❌ MFA/2FA support
- ❌ Proper audit logging integration
- ❌ SSO integration
- ❌ Centralized user management
- ❌ Integration with Clerk's security features

## Testing Checklist

Before deploying to production:

- [ ] Admin login requires Clerk authentication
- [ ] Admin status is verified via Clerk metadata
- [ ] No middleware detection errors in console
- [ ] Admin logout properly clears Clerk session
- [ ] Rate limiting works through Clerk
- [ ] All admin API routes properly authenticate
- [ ] Audit logs track admin actions correctly

## Implementation Notes

1. The Clerk middleware detection issue should be solvable by:
   - Ensuring all server-side auth uses `currentUser()` not `auth()`
   - Verifying middleware configuration
   - Checking that ClerkProvider is properly set up

2. Admin roles should be set in Clerk Dashboard:
   - Set `publicMetadata.role = "admin"` for admin users
   - Or use Clerk's built-in role system

3. Consider using Clerk's Organizations feature if you need multiple admin levels

## Timeline

**MUST BE COMPLETED BEFORE:** Production deployment

**Priority:** High - Security-critical

---

*This file was auto-generated as a reminder to fix the admin authentication before production.*
