# Authentication System Verification Checklist

Use this checklist to verify the new auth system is working correctly.

## Pre-Migration Verification

### Clerk Setup
- [ ] Clerk application configured
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
- [ ] `CLERK_SECRET_KEY` in `.env.local`
- [ ] Clerk Dashboard accessible

### Supabase Setup
- [ ] Supabase project configured
- [ ] `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- [ ] Database schema applied (including `entitlements` and `profiles` tables)

### Admin User Setup
- [ ] Admin user account exists in Clerk
- [ ] Admin user has `publicMetadata` set:
  ```json
  {
    "role": "admin",
    "isAdmin": true,
    "admin": true
  }
  ```

## Post-Migration Verification

### File Replacements
- [ ] `middleware.ts` replaced with new version
- [ ] `app/(app)/layout.tsx` replaced with new version
- [ ] `app/admin/layout.tsx` replaced with new version
- [ ] `app/admin/page.tsx` updated to use Clerk
- [ ] `app/auth-redirect/page.tsx` replaced with new version
- [ ] `app/pricing/page.tsx` replaced with new version
- [ ] All API routes in `app/api/admin/` replaced
- [ ] `components/AppShell.tsx` created
- [ ] `components/ProtectedRoute.tsx` created

### Functional Tests

#### Authentication Flow
1. [ ] Sign out completely
2. [ ] Navigate to `/app` → Should redirect to `/sign-in`
3. [ ] Sign in as normal user → Should redirect to `/auth-redirect`
4. [ ] If user has entitlement → Should redirect to `/app`
5. [ ] If user has no entitlement → Should redirect to `/pricing?locked=true`

#### Admin Flow
1. [ ] Sign in as admin user → Should redirect to `/admin`
2. [ ] Admin panel loads without errors
3. [ ] Can search for users
4. [ ] Can grant entitlement to user
5. [ ] Granted user can access `/app`

#### Protected Routes
1. [ ] Navigate to `/app` while signed in → Should show dashboard if has access
2. [ ] Navigate to `/app` while signed in → Should redirect to `/pricing` if no access
3. [ ] Navigate to `/admin` as admin → Should show admin panel
4. [ ] Navigate to `/admin` as non-admin → Should redirect to sign-in
5. [ ] Navigate to `/app` while signed out → Should redirect to sign-in

#### Pricing Page
1. [ ] User with active entitlement → Auto-redirects to `/app`
2. [ ] User without entitlement → Shows pricing tiers
3. [ ] `?locked=true` parameter → Shows locked message

#### Profile Sync
1. [ ] New user signs in → Profile synced to Supabase
2. [ ] Admin syncs user → Profile updated in Supabase
3. [ ] Search finds synced users

### Error Scenarios

#### Missing Entitlement
- [ ] User without entitlement → Redirected to pricing
- [ ] User with expired entitlement → Redirected to pricing
- [ ] User with canceled entitlement → Redirected to pricing

#### Invalid Admin
- [ ] Non-admin user tries `/admin` → Redirected to sign-in
- [ ] User without admin metadata → Cannot access admin panel

#### Database Errors
- [ ] Supabase connection fails → Error logged, user redirected safely
- [ ] Missing environment variables → Clear error message

## Code Quality Checks

### No Linter Errors
- [ ] Run `npm run lint` → No errors
- [ ] TypeScript compiles without errors
- [ ] No unused imports

### Code Review
- [ ] No hardcoded credentials
- [ ] All error messages are user-friendly
- [ ] Logging is structured and informative
- [ ] No console.log in production code (use proper logging)

### Performance
- [ ] No unnecessary database queries
- [ ] No client-side redirect loops
- [ ] Server-side checks are fast

## Security Verification

### Access Control
- [ ] Admin routes require admin role
- [ ] Protected routes require entitlement
- [ ] API routes validate admin access
- [ ] No sensitive data in client responses

### Input Validation
- [ ] All user inputs validated
- [ ] SQL injection prevention (using Supabase client)
- [ ] XSS prevention (Next.js default)

### Error Handling
- [ ] No sensitive information in error messages
- [ ] Errors logged server-side only
- [ ] User-friendly error messages

## Rollback Readiness

### Backup Files
- [ ] Old `middleware.ts` backed up
- [ ] Old layouts backed up
- [ ] Old API routes backed up
- [ ] `.migration-backup/` directory exists

### Rollback Steps Documented
- [ ] Know how to restore old files
- [ ] Know how to restore standalone admin auth if needed
- [ ] Clerk admin metadata can be removed if needed

## Production Readiness

### Environment Variables
- [ ] All required env vars set
- [ ] Clerk keys are production keys
- [ ] Supabase keys are production keys
- [ ] No development keys in production

### Monitoring
- [ ] Error logging configured
- [ ] Access check failures logged
- [ ] Admin actions logged

### Documentation
- [ ] Migration guide reviewed
- [ ] System architecture understood
- [ ] Team knows how admin access works

## Known Limitations

1. **Request-Level Caching**: Entitlement checks query database each time (consider caching)
2. **Batch Operations**: Admin search queries users one at a time (could batch)
3. **Rate Limiting**: Not yet implemented for admin actions (future enhancement)

## Support

If issues arise:
1. Check server logs for `checkUserAccess` results
2. Verify Clerk metadata is set correctly
3. Verify Supabase entitlements table has correct data
4. Check middleware is running (check logs)
5. Verify all files were replaced correctly
