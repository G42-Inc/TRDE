# TRDE Integration Setup Guide

This guide covers the setup for Clerk authentication, Supabase database, Stripe billing, and the paywall system.

## Prerequisites

1. **Clerk Account**: Sign up at https://clerk.com
2. **Supabase Project**: Create a project at https://supabase.com
3. **Stripe Account**: Sign up at https://stripe.com

## Environment Variables

Create a `.env.local` file in `apps/web/` with the following:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Server-only, never expose to client

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...  # Create in Stripe dashboard
STRIPE_PRICE_ID_EDGE=price_...   # Create in Stripe dashboard
STRIPE_PRICE_ID_PRO=price_...    # Create in Stripe dashboard

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=...  # 32-byte base64-encoded key for token encryption
```

## Setup Steps

### 1. Clerk Setup

1. Create a Clerk application
2. Configure sign-in/sign-up methods (email, etc.)
3. Add environment variables
4. Set up admin role:
   - Go to Users → Select a user → Metadata
   - Add `publicMetadata.role = "admin"` for admin users

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the schema SQL:
   ```bash
   # Copy contents of apps/web/supabase/schema.sql
   # Paste into Supabase SQL Editor and execute
   ```
3. Verify RLS is enabled on all tables
4. Add environment variables

### 3. Stripe Setup

1. Create three products in Stripe Dashboard:
   - **TRDE Basic**: $9.99/month (recurring)
   - **TRDE Edge**: $14.99/month (recurring)
   - **TRDE Pro**: $19.99/month (recurring)

2. For each product, create a Price:
   - Billing period: Monthly
   - No trial period
   - Copy the Price ID (starts with `price_`)

3. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the webhook signing secret

4. Add Price IDs and webhook secret to environment variables

### 4. Encryption Key Generation

Generate a secure encryption key:

```bash
openssl rand -base64 32
```

Add this to `ENCRYPTION_KEY` in your environment variables.

## Database Schema

The schema includes:

- **profiles**: User profiles synced from Clerk
- **entitlements**: Subscription/access control (paywall source of truth)
- **api_connections**: Encrypted broker API tokens (server-only access)
- **trades**: User trade data with RLS
- **audit_log**: Admin action logging

## Route Protection

- **Public**: `/`, `/pricing`, `/legal/*`
- **Protected (Basic+)**: `/app/*`
- **Protected (Edge+)**: `/edge/*`
- **Protected (Admin)**: `/admin/*`

## Testing

1. **Test Sign-Up Flow**:
   - Visit `/pricing`
   - Click "Get Started" on a plan
   - Sign up with Clerk
   - Complete Stripe checkout
   - Verify redirect to `/app`

2. **Test Paywall**:
   - Sign in without subscription
   - Try accessing `/app` → should redirect to `/pricing?locked=true`

3. **Test Plan Gates**:
   - Sign in with Basic plan
   - Try accessing `/edge/*` → should redirect to `/pricing?upgrade=edge`

4. **Test Admin Panel**:
   - Sign in as admin user
   - Visit `/admin`
   - Search for users and grant/revoke access

5. **Test Token Vault**:
   - Connect ProjectX account via `/api/connections/projectx/connect`
   - Verify token is encrypted in database
   - Verify token is never returned to client

## Security Checklist

- [ ] `ENCRYPTION_KEY` is 32 bytes and stored securely
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client
- [ ] RLS is enabled on all Supabase tables
- [ ] Admin role is set in Clerk metadata (not just client-side)
- [ ] Stripe webhook signature is verified
- [ ] All entitlement checks happen server-side
- [ ] Tokens are never logged or returned to client

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure all Supabase env vars are set in `.env.local`

### "ENCRYPTION_KEY must be 32 bytes"
- Regenerate key: `openssl rand -base64 32`
- Ensure it's exactly 32 bytes when decoded

### "Admin access required"
- Set `publicMetadata.role = "admin"` in Clerk for your user

### Webhook not receiving events
- Verify webhook URL is correct
- Check Stripe dashboard → Webhooks → Recent events
- Ensure webhook secret matches environment variable

### Entitlement not updating after payment
- Check Stripe webhook logs
- Verify webhook endpoint is accessible
- Check Supabase `entitlements` table directly

## Next Steps

1. Install dependencies: `pnpm install`
2. Set up environment variables
3. Run Supabase schema
4. Configure Stripe products
5. Test the integration
6. Deploy to production

## Production Considerations

- Use production Clerk instance
- Use production Supabase project
- Use production Stripe account
- Rotate encryption keys periodically
- Monitor webhook delivery
- Set up error tracking (Sentry, etc.)
- Enable Supabase backups
- Configure Clerk webhooks for user sync
