# TRDE Integration Implementation Checklist

## ✅ Core Infrastructure

### Authentication (Clerk)
- [x] Clerk package installed
- [x] ClerkProvider in root layout
- [x] Sign-in page (`/sign-in`)
- [x] Sign-up page (`/sign-up`)
- [x] Auth utilities (`lib/auth/clerk.ts`)
- [x] Admin role checking (server-side)

### Database (Supabase)
- [x] Supabase package installed
- [x] Schema SQL created (`supabase/schema.sql`)
- [x] Service role client utility
- [x] Anon client utility
- [x] RLS policies defined
- [x] Tables: profiles, entitlements, api_connections, trades, audit_log

### Entitlement System
- [x] Plan types defined (`lib/entitlements/types.ts`)
- [x] Server-side checking (`lib/entitlements/check.server.ts`)
- [x] Client-side gate component (`lib/entitlements/route-protection.tsx`)
- [x] Plan hierarchy logic

### Security
- [x] Token encryption utilities (`lib/security/crypto.server.ts`)
- [x] AES-256-GCM encryption
- [x] Server-only token access
- [x] Never expose tokens to client

### Route Protection
- [x] Middleware for auth checks
- [x] Layout-based entitlement gates
- [x] Server-side verification

## ✅ Pages & UI

### Public Pages
- [x] Landing page (`/`)
- [x] Pricing page (`/pricing`)
- [x] Sign-in page
- [x] Sign-up page

### Protected Pages
- [x] App routes layout (Basic+)
- [x] Edge routes layout (Edge+)
- [x] Admin routes layout (Admin only)

## ✅ API Routes

### Billing
- [x] `/api/billing/checkout` - Create Stripe session
- [x] `/api/billing/webhook` - Handle Stripe events

### Entitlements
- [x] `/api/entitlements/current` - Get user entitlement

### Admin
- [x] `/api/admin/search` - Search users
- [x] `/api/admin/entitlements` - Grant/revoke access
- [x] `/api/admin/sync-profile` - Sync Clerk user

### Connections
- [x] `/api/connections/projectx/connect` - Store encrypted tokens

## ✅ Admin Panel
- [x] Admin page (`/admin`)
- [x] User search
- [x] Grant entitlements
- [x] Revoke entitlements
- [x] Audit logging

## 📋 Setup Required

### 1. Environment Variables
Add to `.env.local`:
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_BASIC=...
STRIPE_PRICE_ID_EDGE=...
STRIPE_PRICE_ID_PRO=...

# Encryption
ENCRYPTION_KEY=<32-byte base64>
```

### 2. Supabase Setup
1. Create Supabase project
2. Run `supabase/schema.sql` in SQL Editor
3. Verify RLS is enabled

### 3. Stripe Setup
1. Create 3 products (Basic, Edge, Pro)
2. Create monthly prices (no trial)
3. Copy Price IDs
4. Set up webhook endpoint: `/api/billing/webhook`
5. Copy webhook secret

### 4. Clerk Setup
1. Create Clerk application
2. Configure sign-in methods
3. Set admin role: User → Metadata → `publicMetadata.role = "admin"`

### 5. Generate Encryption Key
```bash
openssl rand -base64 32
```

## 🔒 Security Verification

- [ ] `ENCRYPTION_KEY` is 32 bytes
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] RLS enabled on all tables
- [ ] Admin checks are server-side only
- [ ] Tokens never logged or returned
- [ ] Webhook signature verified

## 🧪 Testing Checklist

- [ ] Public routes accessible without auth
- [ ] Sign-up flow works
- [ ] Sign-in flow works
- [ ] Unpaid user redirected to pricing
- [ ] Basic user can access `/app/*`
- [ ] Basic user cannot access `/edge/*`
- [ ] Edge user can access `/edge/*`
- [ ] Admin can access `/admin`
- [ ] Non-admin cannot access `/admin`
- [ ] Stripe checkout creates session
- [ ] Webhook updates entitlements
- [ ] Admin can grant/revoke access
- [ ] Tokens encrypted in database
- [ ] Tokens never returned to client

## 📝 Notes

- Route groups `(app)` and `(public)` are for layout organization
- Actual routes remain at `/app`, `/edge`, `/admin`, etc.
- All entitlement checks happen server-side
- Client-side gates provide UX but don't enforce security
- Middleware handles auth, layouts handle entitlements

## 🚨 Important

**NO FREE/TRIAL PATH EXISTS** - All routes require active entitlement.

**TOKENS ARE NEVER EXPOSED** - Encryption + server-only access enforced.

**RLS IS REQUIRED** - Database-level security is mandatory.
