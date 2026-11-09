# Webhook Debugging Guide

## Issue: Payment Completed But No Webhook Events

If you see:
- Payment completed in Stripe
- No events in `stripe listen` terminal
- No entitlement created

## Check These Things:

### 1. Is Stripe CLI Listening?
- Look at the `stripe listen` terminal
- Should show: `> Ready! Your webhook signing secret is whsec_...`
- If not running, start it: `stripe listen --forward-to localhost:3000/api/billing/webhook`

### 2. Did Payment Actually Complete?
- Go to Stripe Dashboard → Payments
- Find your test payment
- Check status: Should be "Succeeded" (green checkmark)
- If it says "Pending" or "Failed", that's the issue

### 3. Test Mode vs Live Mode
- Stripe CLI forwards **test mode** events only
- Make sure you're testing with test cards (`4242 4242 4242 4242`)
- Check Stripe Dashboard: Should see "Test mode" toggle enabled

### 4. Manually Trigger Test Event
In a new terminal, run:
```bash
stripe trigger checkout.session.completed
```

You should see:
- Event appear in `stripe listen` terminal
- Server logs showing webhook processing
- Entitlement created in database

### 5. Check Server Logs
Look for:
- `Processing webhook event:` - means webhook received
- `Creating entitlement:` - means processing started
- `Entitlement created/updated successfully` - means it worked
- Any error messages

### 6. Check Database
```sql
-- Check if entitlement exists
SELECT * FROM entitlements WHERE user_id = 'user_384oRva3PdSTso5UjDrBtH36tk2';

-- Check webhook events processed
SELECT * FROM stripe_webhook_events ORDER BY processed_at DESC LIMIT 10;
```

## Common Issues:

### "Payment completed" but actually pending
- Test payments can be slow to process
- Wait 10-30 seconds
- Check Stripe Dashboard → Payments → Your payment status

### Webhook secret mismatch
- Make sure `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the one from `stripe listen`
- Restart dev server after changing it

### Test card not working
- Use: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)
