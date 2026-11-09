# Pricing Page Redirect Fix - Root Cause Analysis

## Problem
User has active entitlement (edge plan, comped status, override_enabled: true, override_expires_at: null) but is still being redirected to pricing page and stuck there.

## Root Cause Found

### Location: `apps/web/src/app/pricing/page.tsx` line 195

**The Bug**:
```typescript
// OLD CODE - BUGGY
if (isActive && hasBasicAccess && !locked) {
  // Redirect to /app
}
```

**The Problem**:
- When `EntitlementGate` redirects user to `/pricing?locked=true` (because it thinks there's no entitlement or before entitlement check completes)
- Pricing page checks entitlement and finds it IS active
- But pricing page has `!locked` check, so it DOESN'T redirect
- User is stuck on pricing page even though they have active entitlement

### Why This Happens

1. **Initial State**: User navigates to `/app`
2. **EntitlementGate**: Starts checking entitlement (async API call)
3. **Timing Issue**: If API call is slow or fails temporarily, EntitlementGate redirects to `/pricing?locked=true`
4. **Pricing Page**: Loads with `locked=true` parameter
5. **Pricing Page Check**: Finds entitlement IS active (API completes)
6. **Redirect Blocked**: Pricing page checks `if (isActive && hasBasicAccess && !locked)` - `!locked` is FALSE, so redirect is blocked
7. **Result**: User stuck on pricing page despite having active entitlement

## Fix Applied

### Changed Logic
```typescript
// NEW CODE - FIXED
// If active and has basic access, ALWAYS auto-redirect to /app
// The 'locked' parameter is only for UI display (warning message), not to prevent redirect
// If user has active entitlement, they should always be able to access the app
if (isActive && hasBasicAccess) {
  // Redirect to /app (regardless of locked parameter)
}
```

### Reasoning
- **The `locked` parameter should only affect UI**: Show a warning message, not prevent redirect
- **Active entitlement = Access granted**: If user has active entitlement, they should ALWAYS be redirected to `/app`
- **Prevents redirect loops**: Even if user is redirected to pricing with `?locked=true`, they'll be immediately redirected back if they have entitlement

## Additional Improvements

### Enhanced Logging
Added detailed logging to both `EntitlementGate` and `pricing/page.tsx` to track:
- Entitlement active check results
- All entitlement fields (override_enabled, override_expires_at, status, etc.)
- Redirect decisions and reasons

This will help debug any future issues.

## Testing Checklist

- [x] User with active entitlement navigates to `/pricing` → redirects to `/app`
- [x] User with active entitlement navigates to `/pricing?locked=true` → redirects to `/app`
- [x] User without entitlement navigates to `/app` → redirects to `/pricing?locked=true`
- [x] User without entitlement sees locked message on pricing page
- [x] No redirect loops between pricing and app

## Flow After Fix

**Scenario 1: User with Active Entitlement**
1. User navigates to `/app`
2. EntitlementGate checks entitlement
3. If slow/fails → redirects to `/pricing?locked=true`
4. Pricing page checks entitlement → finds it active
5. Pricing page redirects to `/app` (regardless of locked parameter)
6. ✅ User reaches `/app`

**Scenario 2: User without Entitlement**
1. User navigates to `/app`
2. EntitlementGate checks entitlement → finds none
3. EntitlementGate redirects to `/pricing?locked=true`
4. Pricing page checks entitlement → finds none
5. Pricing page shows locked message
6. ✅ User sees pricing page with locked warning

## Related Files Modified

1. `apps/web/src/app/pricing/page.tsx`
   - Removed `!locked` check from redirect condition
   - Added detailed logging
   - Updated comment to clarify locked parameter purpose

2. `apps/web/src/lib/entitlements/route-protection.tsx`
   - Added detailed logging for entitlement active check
   - Better debugging information

## Future Improvements

1. Consider removing `locked` parameter entirely if it's only for UI
2. Add a query parameter to disable auto-redirect (for users who want to view pricing)
3. Consider debouncing entitlement checks to prevent race conditions