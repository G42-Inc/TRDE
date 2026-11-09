# Verify Webhooks Are Working

## Quick Test

In a **new terminal** (while `stripe listen` is running), run:

```bash
stripe trigger checkout.session.completed
```

## What to Look For

### ✅ If Working Correctly:

**In `stripe listen` terminal:**
```
2026-01-10 XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
2026-01-10 XX:XX:XX  <-- [200] POST http://localhost:3000/api/billing/webhook
```

**In your server logs (Next.js terminal):**
```
Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
Creating entitlement: { userId: 'user_xxx', plan: 'basic', ... }
Entitlement created/updated successfully
```

### ❌ If Still Not Working:

**If you see `[400]` in stripe listen:**
- Check server logs for error messages
- Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches `stripe listen` output
- Restart server after changing `.env.local`

**If you see errors in server logs:**
- Look for "Webhook signature verification failed"
- Check the error message for clues

## Fix the Already-Paid User

Since you already paid but don't have an entitlement, you need to manually create it:

1. **Get subscription details from Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/subscriptions
   - Find your subscription
   - Note: Subscription ID, Plan/Price ID, Period End date

2. **Run the fix script:**
   - Open: `apps/web/scripts/fix-missing-entitlement.sql`
   - Replace placeholders with actual values
   - Run in Supabase SQL Editor

3. **Or use this quick fix** (replace with your actual values):
   ```sql
   INSERT INTO entitlements (
     user_id,
     plan,
     status,
     current_period_end,
     source,
     notes,
     created_at,
     updated_at
   )
   VALUES (
     'user_384oRva3PdSTso5UjDrBtH36tk2',
     'basic',  -- Change to 'edge' or 'pro' based on what you paid for
     'active',
     '2025-02-10T00:00:00Z',  -- Replace with actual period_end from Stripe
     'stripe',
     'Manually created - payment received but webhook failed',
     NOW(),
     NOW()
   )
   ON CONFLICT (user_id) DO UPDATE
   SET 
     plan = EXCLUDED.plan,
     status = EXCLUDED.status,
     current_period_end = EXCLUDED.current_period_end,
     updated_at = NOW();
   ```

## Next Steps

1. ✅ Test webhook with `stripe trigger checkout.session.completed`
2. ✅ Verify you see `[200]` responses
3. ✅ Manually create entitlement for your existing payment
4. ✅ Test a new payment to verify end-to-end flow
