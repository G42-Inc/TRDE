# Webhook Setup Instructions

## Stripe Webhook Configuration

### 1. Configure Webhook Endpoint in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-domain.com/api/billing/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing secret** (starts with `whsec_`)
6. Set as environment variable: `STRIPE_WEBHOOK_SECRET`

### 2. Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe Dashboard
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_EDGE=price_...
STRIPE_PRICE_ID_PRO=price_...
```

### 3. Testing

Use Stripe CLI to forward webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

## Clerk Webhook Configuration

### 1. Configure Webhook Endpoint in Clerk Dashboard

1. Go to Clerk Dashboard → Webhooks
2. Click "Add Endpoint"
3. Set endpoint URL: `https://your-domain.com/api/clerk/webhook`
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

5. Copy the **Signing secret**
6. Set as environment variable: `CLERK_WEBHOOK_SECRET`

### 2. Environment Variables

```bash
CLERK_WEBHOOK_SECRET=whsec_... # From Clerk Dashboard
```

### 3. Testing

Use Clerk CLI to forward webhooks locally:
```bash
clerk webhooks forward
```

---

## Webhook Retry Queue Setup

### 1. Database Migration

Run the webhook retry queue schema:
```bash
psql $DATABASE_URL -f apps/web/supabase/webhook_retry_queue.sql
```

### 2. Cron Job Configuration

Set up a cron job to process retries every 5 minutes:

**Option 1: Vercel Cron Jobs**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/webhooks/retry",
    "schedule": "*/5 * * * *"
  }]
}
```

**Option 2: External Cron Service**
```bash
*/5 * * * * curl -X POST https://your-domain.com/api/webhooks/retry \
  -H "X-API-Key: ${WEBHOOK_RETRY_API_KEY}" \
  -H "Content-Type: application/json"
```

### 3. Environment Variables (Optional)

```bash
WEBHOOK_RETRY_API_KEY=your-secret-api-key # Recommended for production
```

---

## Verification

### Test Stripe Webhook

1. Create a test checkout session
2. Complete payment with test card: `4242 4242 4242 4242`
3. Check Stripe Dashboard → Webhooks → Recent events
4. Verify webhook was received and processed
5. Check Supabase `entitlements` table for new subscription
6. Check `stripe_webhook_events` table for event tracking

### Test Clerk Webhook

1. Create a new user via sign-up
2. Check Clerk Dashboard → Webhooks → Recent events
3. Verify webhook was received and processed
4. Check Supabase `profiles` table for new profile
5. Update user in Clerk Dashboard
6. Verify profile updated in Supabase

### Test Retry Queue

1. Temporarily break webhook processing (e.g., invalid database query)
2. Trigger webhook (should fail and queue)
3. Check `webhook_retry_queue` table for queued webhook
4. Fix the issue
5. Run retry processor: `POST /api/webhooks/retry`
6. Verify webhook processed successfully

---

## Monitoring

### Key Metrics to Monitor

1. **Webhook Success Rate**
   - Check `stripe_webhook_events` table
   - Monitor `error` column for failures

2. **Retry Queue Status**
   - Check `webhook_retry_queue` table
   - Monitor `status` and `retry_count` columns
   - Alert if queue size grows significantly

3. **Profile Sync Status**
   - Check `profiles` table for new users
   - Verify all users have profiles after sign-up

4. **Entitlement Sync Status**
   - Check `entitlements` table after checkout
   - Verify subscriptions are active within 1-2 seconds of payment

---

## Troubleshooting

### Webhook Not Received

1. Check endpoint URL is correct
2. Verify webhook secret is set correctly
3. Check firewall/network allows webhook traffic
4. Verify endpoint is publicly accessible (not localhost)

### Webhook Signature Verification Failed

1. Verify webhook secret matches Dashboard
2. Check if using correct environment (test vs live)
3. Verify request body is not modified (no compression, no parsing)

### Profile Not Created

1. Check Clerk webhook logs
2. Verify `CLERK_WEBHOOK_SECRET` is set
3. Check `profiles` table for errors
4. Verify webhook endpoint is accessible

### Entitlement Not Created

1. Check Stripe webhook logs
2. Verify `STRIPE_WEBHOOK_SECRET` is set
3. Check `entitlements` table for errors
4. Check `stripe_webhook_events` table for failed events
5. Verify retry queue is processing

### Retry Queue Not Processing

1. Verify cron job is running
2. Check `WEBHOOK_RETRY_API_KEY` if configured
3. Check endpoint logs for errors
4. Verify database connection is working
