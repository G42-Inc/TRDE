# Security Fixes Required

## 🔴 CRITICAL: ProjectX Token Storage

### Current Issue
ProjectX authentication tokens are stored in httpOnly cookies and returned in API responses. This is insecure because:
1. Tokens are not encrypted at rest
2. Tokens are exposed in API response body
3. Cookie-based storage is less secure than database storage

### Required Fix

**File**: `apps/web/src/app/api/edge/projectx/auth/login/route.ts`

**Changes Needed**:
1. Encrypt token before storage
2. Store in `api_connections` table (encrypted)
3. Remove token from response body
4. Remove cookie storage
5. Create session management endpoint

**Implementation**:
```typescript
// After authentication, encrypt and store:
const encryptedToken = encrypt(authResponse.token);
await supabase.from('api_connections').upsert({
  user_id: userId,
  provider: 'projectx',
  access_token_encrypted: encryptedToken,
  status: 'connected',
  // ...
});

// Return success WITHOUT token
return NextResponse.json({ success: true });
```

**Additional Changes**:
- Update all ProjectX API routes to read token from database (not cookies)
- Add token refresh logic
- Add token expiration handling

### Migration Path
1. Update login endpoint to store encrypted token
2. Update all ProjectX API routes to use database token
3. Remove cookie-based token reading
4. Test all EDGE features

## ✅ COMPLETED: RLS Policy Hardening

### Changes Made
1. Added explicit DENY policies for `api_connections` table
2. Added explicit DENY policies for `audit_log` table
3. Added explicit DENY policies for `entitlements` write operations
4. Documented service role usage

### Security Improvement
- Defense-in-depth: Even if code accidentally uses anon key, sensitive data is protected
- Explicit policies make security model clear
- Prevents accidental data exposure

## 🔐 Encryption Key Management

### Current Status: ✅ Good
- AES-256-GCM encryption implemented correctly
- Key validation on startup
- Random IV per encryption
- Authenticated encryption (prevents tampering)

### Recommendations
1. **Key Rotation**: Plan for encryption key rotation
   - Generate new key
   - Re-encrypt all tokens with new key
   - Update environment variable
   - Monitor for errors

2. **Key Storage**: 
   - ✅ Store in Vercel environment variables
   - ✅ Never commit to git
   - ✅ Use different keys for dev/staging/prod
   - ✅ Restrict access to key (only server can access)

3. **Key Backup**:
   - Store encrypted backup in secure location
   - Document key rotation process
   - Never store plaintext key

## 📋 Security Checklist

### Database Security
- [x] RLS enabled on all tables
- [x] Explicit DENY policies for sensitive tables
- [x] Service role used for all token operations
- [x] User data filtered by user_id in queries
- [ ] Audit logging for sensitive operations (partially done)

### Token Security
- [x] Tokens encrypted with AES-256-GCM
- [x] Tokens stored in database (for connections API)
- [ ] ProjectX tokens moved to database (TODO)
- [x] Tokens never returned to client (for connections API)
- [ ] Token refresh logic implemented (TODO)

### Access Control
- [x] Clerk authentication required
- [x] Entitlement checks on protected routes
- [x] Admin role verification server-side
- [x] User ID verified in all queries
- [ ] Rate limiting on sensitive endpoints (TODO)

### Environment Security
- [x] Service role key in env vars
- [x] Encryption key in env vars
- [x] Keys never exposed to client
- [ ] Key rotation process documented (TODO)

## Next Steps

1. **URGENT**: Fix ProjectX token storage (see above)
2. **HIGH**: Implement token refresh for ProjectX
3. **MEDIUM**: Add rate limiting to sensitive endpoints
4. **MEDIUM**: Add audit logging for token access
5. **LOW**: Document key rotation process
