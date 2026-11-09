# Stripe Webhook Setup Guide

## ⚠️ CRITICAL: Webhooks Must Be Configured

Without webhooks configured, **entitlements will NOT be created** after successful payments. Users will pay but won't get access.

## Step-by-Step Setup

### 1. Create Webhook Endpoint

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   - **Production**: `https://your-domain.com/api/billing/webhook`
   - **Local Testing**: Use Stripe CLI (see below) or ngrok

### 2. Select Events

In the "Select events to listen to" section, choose these events:

**Required Events:**
- ✅ `checkout.session.completed` - Creates entitlements after payment
- ✅ `customer.subscription.created` - Creates entitlements for new subscriptions
- ✅ `customer.subscription.updated` - Updates entitlements when plan changes
- ✅ `customer.subscription.deleted` - Cancels entitlements when subscription ends
- ✅ `invoice.payment_succeeded` - Updates entitlement period_end after payment
- ✅ `invoice.payment_failed` - Marks entitlement as past_due on payment failure

**Quick Select:**
- Click "Select events" → Search for each event above → Click to select

### 3. Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_`)

### 4. Add to Environment Variables

Add to `apps/web/.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

### 5. Restart Dev Server

After adding the secret, restart your Next.js dev server:

```bash
# Stop server (Ctrl+C)
# Then restart
pnpm dev
```

## Testing Webhooks Locally

### Option 1: Stripe CLI (Recommended)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
4. Copy the webhook signing secret from the CLI output (starts with `whsec_`)
5. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Option 2: ngrok

1. Install ngrok: https://ngrok.com
2. Start your Next.js server: `pnpm dev`
3. Expose it: `ngrok http 3000`
4. Use the ngrok URL in Stripe webhook endpoint: `https://xxxxx.ngrok.io/api/billing/webhook`
5. Get signing secret from Stripe Dashboard

## Verification

### Check Webhook is Working

1. **In Stripe Dashboard:**
   - Go to Developers → Webhooks → Your endpoint
   - Check "Recent events" - should show successful deliveries (green checkmarks)
   - Click on an event to see request/response details

2. **In Your Logs:**
   - Look for: `"Processing webhook event:"`
   - Look for: `"Entitlement created/updated successfully:"`
   - No errors should appear

3. **In Database:**
   ```sql
   -- Check if entitlement was created for a test user
   SELECT * FROM entitlements WHERE user_id = 'user_xxx' ORDER BY created_at DESC;
   
   -- Check webhook events were processed
   SELECT * FROM stripe_webhook_events ORDER BY processed_at DESC LIMIT 10;
   ```

## Troubleshooting

### Webhook Returns 500 Error

- ✅ Check `STRIPE_WEBHOOK_SECRET` is set correctly
- ✅ Verify webhook endpoint URL is correct
- ✅ Check server logs for error messages
- ✅ Verify webhook secret matches the one in Stripe Dashboard

### Webhook Returns 400 "Invalid signature"

- ✅ Ensure you're using the correct signing secret from the webhook endpoint
- ✅ Check that the webhook secret in `.env.local` matches Stripe Dashboard
- ✅ Restart dev server after changing webhook secret

### Entitlements Not Created

- ✅ Check webhook events in Stripe Dashboard - are they being sent?
- ✅ Check server logs for errors during entitlement creation
- ✅ Verify database connection is working
- ✅ Check `stripe_webhook_events` table for processed events

### Manual Fix for Missing Entitlements

If a user already paid but doesn't have an entitlement, use:
- `apps/web/scripts/fix-missing-entitlement.sql`

## Important Notes

1. **Never commit `.env.local`** - it contains secrets
2. **Use different webhook secrets** for development vs production
3. **Test webhooks** before going live
4. **Monitor webhook failures** in Stripe Dashboard regularly
5. **Webhooks are critical** - without them, payments won't grant access

## Production Checklist

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] All required events selected
- [ ] Webhook signing secret added to production environment variables
- [ ] Webhook endpoint URL points to production domain
- [ ] Tested with a real payment (in test mode first)
- [ ] Verified entitlement was created after payment
- [ ] Monitoring webhook success rate in Stripe Dashboard
