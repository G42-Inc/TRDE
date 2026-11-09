# TRDE Security Review - Database & Token Storage

## Critical Issues Found

### 🔴 CRITICAL: ProjectX Tokens in Cookies
**Location**: `apps/web/src/app/api/edge/projectx/auth/login/route.ts`

**Issue**: ProjectX authentication tokens are stored in httpOnly cookies and returned to the client in JSON response.

**Risk**: 
- Tokens in cookies can be intercepted (even with httpOnly)
- Token returned in response body exposes it to client-side JavaScript
- Tokens not encrypted at rest
- Should use same encrypted storage as other API tokens

**Fix Required**: 
- Store ProjectX tokens encrypted in `api_connections` table
- Never return tokens to client
- Use server-side session management

### 🟡 MEDIUM: RLS Policies Too Permissive
**Location**: `apps/web/supabase/schema.sql`

**Issue**: Sensitive tables have permissive policies that could allow access if anon key is used.

**Risk**:
- `api_connections` table has no explicit DENY policy for anon key
- `audit_log` table has no explicit DENY policy
- If code accidentally uses anon key instead of service role, data could be exposed

**Fix Required**:
- Add explicit DENY policies for anon key on sensitive tables
- Ensure service role policies are explicit

### 🟢 GOOD: Encryption Implementation
**Location**: `apps/web/src/lib/security/crypto.server.ts`

**Status**: ✅ Correctly implemented
- AES-256-GCM (authenticated encryption)
- Random IV per encryption
- Proper key validation
- Base64 encoding for storage

### 🟢 GOOD: Token Storage for Connections API
**Location**: `apps/web/src/app/api/connections/projectx/connect/route.ts`

**Status**: ✅ Correctly implemented
- Tokens encrypted before storage
- Never returned to client
- Uses service role for database access

## Security Recommendations

### 1. Token Storage Strategy
- ✅ **DO**: Encrypt all tokens with AES-256-GCM
- ✅ **DO**: Store encrypted tokens in `api_connections` table
- ✅ **DO**: Use service role key for all token operations
- ❌ **DON'T**: Store tokens in cookies (even httpOnly)
- ❌ **DON'T**: Return tokens in API responses
- ❌ **DON'T**: Store tokens in localStorage/sessionStorage

### 2. RLS Policy Best Practices
- ✅ **DO**: Explicitly deny anon key access to sensitive tables
- ✅ **DO**: Use service role for all server-side operations
- ✅ **DO**: Enable RLS on all tables (defense-in-depth)
- ❌ **DON'T**: Rely on "no policy = no access" (be explicit)

### 3. Environment Variables
- ✅ **DO**: Store `ENCRYPTION_KEY` in Vercel env vars (server-only)
- ✅ **DO**: Store `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars (server-only)
- ✅ **DO**: Never expose service role key to client
- ❌ **DON'T**: Commit keys to git
- ❌ **DON'T**: Log keys or tokens

### 4. Access Control
- ✅ **DO**: Verify user_id in all queries (even with service role)
- ✅ **DO**: Use `requireAuth()` and `requireEntitlement()` in API routes
- ✅ **DO**: Log all admin actions to `audit_log`
- ❌ **DON'T**: Trust client-provided user_id

## Action Items

1. **URGENT**: Fix ProjectX token storage
   - Remove cookie storage
   - Store encrypted in `api_connections` table
   - Remove token from API responses

2. **HIGH**: Strengthen RLS policies
   - Add explicit DENY policies for anon key
   - Document service role usage

3. **MEDIUM**: Add security monitoring
   - Log failed token access attempts
   - Monitor for unusual access patterns

4. **LOW**: Security documentation
   - Document encryption key rotation process
   - Document token refresh strategy
