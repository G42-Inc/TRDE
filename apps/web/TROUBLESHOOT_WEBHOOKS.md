# Troubleshooting: No Webhook Events After Payment

## Quick Debug Steps

### 1. Verify Stripe CLI is Running
In your `stripe listen` terminal, you should see:
```
> Ready! Your webhook signing secret is whsec_...
```

If not running, start it:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 2. Check Payment Status in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/payments
2. Find your test payment
3. **Check the status**:
   - ✅ "Succeeded" (green) = Payment completed
   - ⏳ "Pending" = Still processing (wait 10-30 seconds)
   - ❌ "Failed" = Payment failed

### 3. Test Webhook Forwarding

**Manually trigger a test event** to verify webhooks are working:

In a **new terminal** (keep `stripe listen` running), run:
```bash
stripe trigger checkout.session.completed
```

**Expected Output:**

In `stripe listen` terminal:
```
2025-01-10 14:XX:XX   --> checkout.session.completed [evt_xxxxx]
2025-01-10 14:XX:XX  <-- [200] POST http://localhost:3000/api/billing/webhook
```

In your server logs (Next.js terminal):
```
Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
```

### 4. Verify Webhook Secret

Make sure `.env.local` has the secret from `stripe listen`:

```bash
# Check current secret in .env.local
grep STRIPE_WEBHOOK_SECRET apps/web/.env.local

# Should match the secret from stripe listen output
# If different, update .env.local and restart server
```

### 5. Check Test Mode

- Stripe CLI only forwards **test mode** events
- Make sure you're testing with test cards
- Check Stripe Dashboard → Toggle should show "Test mode"

### 6. Common Issues

#### Issue: Payment shows "Succeeded" but no webhook

**Possible causes:**
- Payment completed in **live mode** but CLI is listening to **test mode**
- Check Stripe Dashboard → Switch to correct mode

#### Issue: Webhook secret mismatch

**Solution:**
1. Copy secret from `stripe listen` output
2. Update `apps/web/.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
3. Restart dev server (Ctrl+C, then `pnpm dev`)

#### Issue: Payment still processing

**Solution:**
- Wait 10-30 seconds after payment
- Refresh Stripe Dashboard → Payments
- Check if status changed to "Succeeded"

## Manual Fix for Missing Entitlement

If payment completed but no entitlement was created:

1. Get subscription details from Stripe Dashboard
2. Use the script: `apps/web/scripts/fix-missing-entitlement.sql`
3. Replace placeholder values with actual data

## Next Steps

1. **Run test trigger**: `stripe trigger checkout.session.completed`
2. **Check both terminals** for output
3. **If test trigger works**: Payment issue (not webhook issue)
4. **If test trigger fails**: Webhook configuration issue
