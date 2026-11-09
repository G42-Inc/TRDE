# Race Condition Analysis: Entitlement Checks and Redirects

## Identified Race Conditions

### 1. **Pricing Page Auto-Redirect vs EntitlementGate**
**Location**: `pricing/page.tsx` (line 151) + `route-protection.tsx` (line 131)

**Problem**:
- Pricing page checks entitlements and redirects to `/app` if active (client-side)
- EntitlementGate on `/app` also checks entitlements and redirects to `/pricing` if no access
- Both run simultaneously when user has active entitlement
- If EntitlementGate's check completes first and returns null (temporary API issue), it redirects back to pricing
- This creates a redirect loop: Pricing → App → Pricing → App

**Trigger**:
1. User with active entitlement navigates to `/pricing`
2. Pricing page `useEffect` fires, checks entitlement, redirects to `/app`
3. EntitlementGate on `/app` mounts and starts checking
4. If EntitlementGate's API call fails or is slow, it redirects to `/pricing?locked=true`
5. Pricing page checks again, sees entitlement, redirects to `/app`
6. Loop continues

### 2. **Pricing Page Missing userId Parameter**
**Location**: `pricing/page.tsx` (line 100) vs `route-protection.tsx` (line 94)

**Problem**:
- Pricing page calls `/api/entitlements/current` WITHOUT `userId` query parameter
- EntitlementGate calls it WITH `userId` query parameter
- These two calls might return different results if server-side extraction fails for one but not the other
- Pricing page might see `null` while EntitlementGate sees the entitlement (or vice versa)

**Impact**: Inconsistent entitlement checks leading to incorrect redirects

### 3. **No Navigation Guard in Pricing Page**
**Location**: `pricing/page.tsx` (line 151)

**Problem**:
- Pricing page doesn't check if navigation is already in progress
- Multiple redirects can be queued if the component re-renders
- No cleanup for pending redirects

### 4. **Auth-Redirect vs Client-Side Checks**
**Location**: `auth-redirect/page.tsx` (server) + `route-protection.tsx` (client)

**Problem**:
- Auth-redirect is server-side and redirects immediately
- EntitlementGate is client-side and runs after render
- If auth-redirect redirects to `/app`, EntitlementGate might not be ready yet
- EntitlementGate might redirect again before the page fully loads

### 5. **Multiple Timeouts Without Cleanup**
**Location**: Both `pricing/page.tsx` and `route-protection.tsx`

**Problem**:
- Pricing page doesn't use `AbortController` or cleanup for fetch requests
- EntitlementGate uses `AbortController` but redirects use `setTimeout` which might not be cleared if component unmounts mid-redirect
- Multiple redirects can fire if component remounts

## Recommended Fixes

1. **Add userId parameter to pricing page API call**
2. **Add navigation guard to pricing page**
3. **Add cleanup for redirects in pricing page**
4. **Ensure consistent entitlement checking logic**
5. **Prevent redirect loops by checking current pathname**