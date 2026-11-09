# Unified Authentication System Design

## Architecture Overview

### Core Principles
1. **Single Source of Truth**: Clerk for authentication, Supabase for entitlements
2. **Server-Side Only**: All access checks happen server-side to prevent race conditions
3. **Simple Flow**: Auth → Entitlement Check → Access Granted/Denied
4. **No Client-Side Redirects**: Server-side redirects only, client shows loading states
5. **Clean Admin**: Admin uses Clerk metadata, no separate cookie system

## Components

### 1. Auth Layer (Clerk)
- **Purpose**: Authentication only
- **Users**: All users authenticate via Clerk (normal users + admins)
- **Admin Identification**: Store `role: 'admin'` in Clerk `publicMetadata`
- **No Custom Auth**: Remove standalone admin cookie system

### 2. Entitlement Layer (Supabase)
- **Purpose**: Authorization (who has access to what)
- **Storage**: `entitlements` table in Supabase
- **Check Function**: Single server-side function `checkUserAccess(userId, requiredPlan)`
- **Returns**: `{ hasAccess: boolean, entitlement: Entitlement | null, isAdmin: boolean }`

### 3. Route Protection Layer
- **Middleware**: Checks Clerk auth + entitlement server-side
- **Layout Components**: Server-side entitlement checks before rendering
- **No Client Checks**: Client components only show loading, never check entitlements

### 4. Admin Panel
- **Auth**: Requires Clerk auth + `publicMetadata.role === 'admin'`
- **User Lookup**: Use Clerk API to search users
- **Grant Access**: Update Supabase entitlements table
- **Sync Profiles**: Ensure Supabase profiles table is in sync

## Data Flow

### User Sign-In Flow
1. User signs in via Clerk → Clerk session established
2. User navigates to `/app` → Middleware checks auth
3. Middleware redirects to `/auth-redirect` if authenticated
4. `/auth-redirect` checks entitlement server-side
5. If has access → redirect to `/app`
6. If no access → redirect to `/pricing?locked=true`

### Admin Grant Access Flow
1. Admin signs in via Clerk (has `role: 'admin'` in metadata)
2. Admin accesses `/admin` → Server checks Clerk auth + admin metadata
3. Admin searches user via Clerk API or Supabase profiles
4. Admin grants access → Updates Supabase `entitlements` table
5. User's next request checks entitlement → Access granted

### Access Check Flow (Single Source)
```
Request → Middleware (Clerk auth) → Server Component/Layout
  → checkUserAccess(userId, requiredPlan)
    → Check Clerk metadata for admin
    → If admin: return { hasAccess: true, isAdmin: true }
    → If not admin: Query Supabase entitlements
      → Check if entitlement exists and is active
      → Return { hasAccess: boolean, entitlement, isAdmin: false }
  → If hasAccess: render content
  → If !hasAccess: redirect to /pricing
```

## Security Measures

1. **Server-Side Only Checks**: No client-side entitlement logic
2. **Admin Verification**: Check Clerk metadata, not cookies
3. **Input Validation**: Validate all admin actions
4. **Audit Logging**: Log all entitlement grants/revokes
5. **Rate Limiting**: Apply to admin actions (future)

## Error Handling

1. **Structured Logging**: All functions log structured data
2. **Error Types**: Distinguish between auth errors, entitlement errors, and system errors
3. **Fallbacks**: Graceful degradation (show pricing page if check fails)
4. **Debug Endpoints**: Admin-only debug endpoints for troubleshooting

## Performance

1. **Caching**: Cache entitlement checks per request
2. **Batch Operations**: Admin panel can batch user lookups
3. **Minimal Queries**: Single query per entitlement check
4. **Efficient Indexes**: Proper database indexes on `user_id`

## Files to Create/Modify

### New Files
- `lib/auth/entitlements.server.ts` - Single entitlement check function
- `lib/auth/admin.server.ts` - Admin verification (Clerk metadata)
- `components/ProtectedRoute.tsx` - Server component for route protection
- `lib/auth/debug.ts` - Debugging utilities

### Modified Files
- `middleware.ts` - Simplified, remove cookie extraction
- `app/(app)/layout.tsx` - Use new ProtectedRoute component
- `app/admin/layout.tsx` - Use Clerk admin check
- `app/api/admin/*` - Update to use Clerk admin check
- `app/auth-redirect/page.tsx` - Simplified, use new check function

### Removed Files
- Standalone admin auth system
- Client-side entitlement checks
- Multiple fallback mechanisms
