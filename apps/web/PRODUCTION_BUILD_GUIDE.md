# Production Build Guide

This document provides step-by-step instructions for building and deploying TRDE to production.

## ✅ Seeded Data Protection

**CONFIRMED:** Seeded data is disabled in production for both web and mobile apps:
- ✅ `apps/web/src/lib/init.ts` - Checks `process.env.NODE_ENV === 'production'` before seeding
- ✅ `apps/mobile/src/lib/init.ts` - Checks `process.env.NODE_ENV === 'production'` before seeding

New users in production will start with empty data (no demo trades, strategies, etc.).

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **pnpm** (package manager)
3. **Environment Variables** configured (see below)
4. **Stripe Account** with live keys
5. **Clerk Account** configured for production
6. **Supabase Project** set up with production database

## Environment Variables

Create a `.env.production` file (or configure in your hosting platform) with the following:

### Required Variables

```bash
# Stripe (LIVE keys - not test keys!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard → Webhooks → Your endpoint)
STRIPE_PRICE_ID_BASIC=price_... (LIVE price ID)
STRIPE_PRICE_ID_EDGE=price_... (LIVE price ID)
STRIPE_PRICE_ID_PRO=price_... (LIVE price ID)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clerk
CLERK_WEBHOOK_SECRET=whsec_... (from Clerk Dashboard → Webhooks)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Encryption
ENCRYPTION_KEY=your-32-byte-base64-encoded-key
```

### Optional Variables

```bash
# Admin Access (comma-separated emails)
ALLOWED_ADMIN_EMAILS=admin@example.com,another@example.com

# Webhook Retry (if using external retry service)
WEBHOOK_RETRY_API_KEY=your-api-key

# Node Environment (automatically set by Next.js in production builds)
NODE_ENV=production
```

## Build Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Verify Environment Variables

The application will validate all required environment variables at startup. Missing variables will cause the application to fail fast with clear error messages.

### 3. Build the Application

```bash
cd apps/web
pnpm build
```

This will:
- Type-check the codebase
- Build optimized production bundles
- Validate environment variables (if `NODE_ENV=production`)
- Generate static pages where possible
- Create optimized server-side code

### 4. Start Production Server

```bash
cd apps/web
pnpm start
```

Or use a process manager like PM2:

```bash
pm2 start npm --name "trde-web" -- start
```

### 5. Verify Build

- Check that the application starts without errors
- Verify health endpoint: `GET /api/health`
- Test authentication flow
- Verify that new users see empty state (no seeded data)

## Database Setup

### Supabase Tables

Ensure all required tables exist in your production Supabase database:

- `profiles`
- `entitlements`
- `stripe_customers`
- `stripe_webhook_events`
- `clerk_webhook_events`
- `webhook_retry_queue`

Refer to `apps/web/supabase/schema.sql` for the complete schema.

### Data Cleanup (If Needed)

If you have test/demo data in production tables, clean it up:

```sql
-- Clean up test entitlements (be careful!)
DELETE FROM entitlements WHERE user_id IN (
  SELECT user_id FROM profiles WHERE email LIKE '%test%' OR email LIKE '%demo%'
);

-- Clean up test webhook events (optional)
DELETE FROM stripe_webhook_events WHERE created_at < NOW() - INTERVAL '30 days';

-- Clean up test customers (be careful!)
-- Only delete if you're sure they're test data
```

## Stripe Configuration

### 1. Switch to Live Mode

- Go to Stripe Dashboard
- Toggle to "Live mode" (top right)
- Copy your live API keys

### 2. Create Products and Prices

Create three products with prices:
- **Basic Plan** - Copy the `price_` ID → `STRIPE_PRICE_ID_BASIC`
- **EDGE Plan** - Copy the `price_` ID → `STRIPE_PRICE_ID_EDGE`
- **Pro Plan** - Copy the `price_` ID → `STRIPE_PRICE_ID_PRO`

### 3. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`

## Clerk Configuration

### 1. Production Application

- Ensure you're using the production Clerk application (not test/dev)
- Copy production publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 2. Webhook Configuration

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/clerk/webhook`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret → `CLERK_WEBHOOK_SECRET`

## Security Checklist

- ✅ All API keys use **live/production** keys (not test keys)
- ✅ `NODE_ENV=production` is set
- ✅ Debug endpoints are disabled (automatically disabled in production)
- ✅ Error messages are sanitized (no stack traces exposed to users)
- ✅ Security headers are configured (in `next.config.js`)
- ✅ CORS is properly configured
- ✅ Webhook secrets are set and validated
- ✅ Admin email list is configured (if using admin features)
- ✅ Encryption key is set and secure

## Deployment Platforms

### Vercel (Recommended for Next.js)

1. Connect your GitHub repository
2. Configure environment variables in Vercel Dashboard
3. Set build command: `cd apps/web && pnpm build`
4. Set output directory: `apps/web/.next`
5. Deploy

### Other Platforms

For other platforms (AWS, GCP, Azure, etc.):
- Ensure Node.js 18+ is available
- Set `NODE_ENV=production`
- Configure all environment variables
- Run `pnpm build` then `pnpm start`
- Set up reverse proxy if needed (for webhooks)

## Post-Deployment Verification

1. **Health Check**: `curl https://yourdomain.com/api/health`
2. **Test Sign-Up**: Create a new user account
3. **Verify Empty State**: New user should see empty dashboard (no seeded data)
4. **Test Checkout**: Complete a test purchase (use Stripe test mode first, then switch to live)
5. **Verify Webhooks**: Check Stripe Dashboard → Webhooks → Logs for successful deliveries
6. **Test Entitlements**: Verify user gets proper access after payment
7. **Monitor Logs**: Check for any errors or warnings

## Monitoring

- **Health Endpoint**: Monitor `/api/health` for uptime checks
- **Error Logging**: Set up error tracking (Sentry, LogRocket, etc.)
- **Webhook Logs**: Monitor Stripe and Clerk webhook delivery logs
- **Database**: Monitor Supabase database performance and errors

## Troubleshooting

### Build Fails

- Check environment variables are set
- Verify TypeScript types are correct: `pnpm typecheck`
- Check for syntax errors: `pnpm lint`

### Webhooks Not Working

- Verify webhook secrets match Stripe/Clerk dashboard
- Check webhook endpoint is accessible (no firewall blocking)
- Verify webhook events are selected correctly
- Check application logs for webhook errors

### Users Not Getting Access

- Check Stripe webhook logs for delivery status
- Verify entitlements are being created in database
- Check application logs for entitlement creation errors
- Verify user email matches Clerk user email

## Rollback Plan

If issues occur:

1. Revert to previous deployment
2. Check environment variables haven't changed
3. Verify database schema is intact
4. Check webhook configurations
5. Review error logs

## Additional Resources

- Stripe Webhook Testing: https://stripe.com/docs/webhooks/test
- Clerk Webhooks: https://clerk.com/docs/integrations/webhooks
- Next.js Deployment: https://nextjs.org/docs/deployment
- Supabase Production: https://supabase.com/docs/guides/platform/overview
