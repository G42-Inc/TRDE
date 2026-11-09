# TRDE Paywall + Auth + Database Integration

## Overview

This integration adds:
- **Clerk Authentication** for web sign-in/sign-up
- **Supabase Production Database** with RLS
- **Strict Paywall** (NO FREE / NO TRIAL)
- **3 Subscription Tiers**: Basic ($9.99), Edge ($14.99), Pro ($19.99)
- **Admin Panel** for manual entitlements
- **Secure Token Vault** with encryption at rest

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables** (see `INTEGRATION_SETUP.md`)

3. **Run Supabase schema**:
   - Copy `supabase/schema.sql`
   - Paste into Supabase SQL Editor
   - Execute

4. **Configure Stripe**:
   - Create 3 products with monthly prices
   - Set up webhook endpoint
   - Add Price IDs to env vars

5. **Set admin role in Clerk**:
   - User → Metadata → `publicMetadata.role = "admin"`

6. **Generate encryption key**:
   ```bash
   openssl rand -base64 32
   ```

## Architecture

### Route Protection
- **Middleware**: Checks authentication (Clerk)
- **Layouts**: Check entitlements (server + client)
- **API Routes**: Server-side entitlement verification

### Security Model
- **Tokens**: Encrypted with AES-256-GCM, stored server-only
- **Database**: RLS on all user tables
- **Admin**: Server-side role verification
- **Entitlements**: Webhook-driven, no client trust

### Plan Tiers
- **Basic**: `/app/*` routes
- **Edge**: `/app/*` + `/edge/*` routes
- **Pro**: Edge + mobile access flag

## Key Files

- `middleware.ts` - Route protection
- `lib/auth/clerk.ts` - Auth utilities
- `lib/entitlements/` - Plan checking
- `lib/security/crypto.server.ts` - Token encryption
- `lib/db/supabase.server.ts` - Database clients
- `app/api/billing/` - Stripe integration
- `app/api/admin/` - Admin endpoints
- `app/api/connections/` - Token vault

## Testing

See `IMPLEMENTATION_CHECKLIST.md` for full testing guide.

## Documentation

- `INTEGRATION_SETUP.md` - Detailed setup instructions
- `INTEGRATION_SUMMARY.md` - Implementation overview
- `IMPLEMENTATION_CHECKLIST.md` - Testing checklist
