# Stripe Webhook Debugging Guide

## Issue: Payment Succeeded But Entitlement Not Created

### Root Cause Analysis

1. **Webhook Secret Not Configured**
   - `STRIPE_WEBHOOK_SECRET` is missing from `.env.local`
   - Webhook endpoint returns 500 error immediately
   - Stripe webhooks never get processed
   - Entitlements are never created

2. **Missing `created_at` in Upsert**
   - `handleCheckoutCompleted` doesn't set `created_at` field
   - While schema has DEFAULT NOW(), explicit setting is safer for upserts

3. **No Error Logging for Failed Entitlement Creation**
   - Errors are logged but not visible in production
   - No notification system for failed webhooks

### Fixes Applied

1. ✅ Added `created_at` field to entitlement upsert in `handleCheckoutCompleted`
2. ✅ Enhanced error logging in webhook handlers
3. ✅ Added validation checks before entitlement creation
4. ✅ Improved error messages for debugging

### Steps to Verify Webhook is Working

1. **Configure Webhook Secret**
   ```bash
   # Get webhook signing secret from Stripe Dashboard:
   # Developers → Webhooks → Your webhook endpoint → Signing secret
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

2. **Verify Webhook Endpoint**
   - Endpoint: `https://your-domain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

3. **Check Webhook Events in Stripe Dashboard**
   - Developers → Webhooks → View recent events
   - Look for successful 200 responses
   - Check for any error responses

4. **Verify Entitlement Created**
   ```sql
   SELECT * FROM entitlements WHERE user_id = 'user_xxx' ORDER BY created_at DESC LIMIT 1;
   ```

### Manual Fix for Already-Paid User

If a user already paid but doesn't have an entitlement:

1. Find their Stripe customer ID:
   ```sql
   SELECT * FROM stripe_customers WHERE user_id = 'user_xxx';
   ```

2. Get their subscription from Stripe Dashboard or API

3. Create entitlement manually:
   ```sql
   INSERT INTO entitlements (user_id, plan, status, current_period_end, source, notes, created_at, updated_at)
   VALUES (
     'user_xxx',
     'basic', -- or 'edge' or 'pro' based on their plan
     'active',
     '2025-02-09T00:00:00Z', -- Set based on subscription period_end
     'stripe',
     'Manually created - payment received but webhook failed',
     NOW(),
     NOW()
   )
   ON CONFLICT (user_id) DO UPDATE
   SET plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW();
   ```
