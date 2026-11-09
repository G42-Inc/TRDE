# Webhook Troubleshooting - Root Cause Analysis

## CRITICAL ISSUE IDENTIFIED

When using Stripe in test mode with Stripe CLI, webhooks are ONLY delivered through the CLI tunnel (`stripe listen`). If the CLI isn't running or forwarding correctly, NO webhooks will arrive.

## Root Causes

### 1. Stripe CLI Must Be Running
**Problem**: If `stripe listen` is not running, webhooks will NEVER arrive, even if:
- Webhook secret is correct
- Endpoint URL is correct
- Server is running
- Payment completes successfully

**Solution**: ALWAYS run `stripe listen` before testing payments:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 2. Test Mode vs Live Mode Mismatch
**Problem**: If checkout session is created with live keys but webhook secret is from test mode (or vice versa), webhooks won't match.

**Solution**: Ensure all Stripe keys/secrets are from the same mode (test or live).

### 3. Webhook Secret Mismatch
**Problem**: Webhook secret from `stripe listen` changes every time you restart it. If `.env.local` has an old secret, verification fails.

**Solution**: Every time you restart `stripe listen`, update `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart your server.

### 4. Request Body Already Consumed
**Problem**: Next.js middleware or other code may consume the request body before the webhook handler reads it, causing signature verification to fail.

**Solution**: Ensure middleware doesn't read the request body for webhook routes.

## Verification Steps

### Step 1: Check Stripe CLI is Running
```bash
# In terminal, should see:
stripe listen --forward-to localhost:3000/api/billing/webhook
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 2: Verify Webhook Secret
```bash
# Check .env.local has the SAME secret shown by stripe listen
cat apps/web/.env.local | grep STRIPE_WEBHOOK_SECRET
```

### Step 3: Test with Trigger Command
```bash
# In a NEW terminal (keep stripe listen running):
stripe trigger checkout.session.completed
```

**Expected output in `stripe listen` terminal:**
```
2025-01-XX XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
2025-01-XX XX:XX:XX  <-- [200] POST http://localhost:3000/api/billing/webhook
```

If you see `[400]` instead of `[200]`, the webhook secret is wrong.

### Step 4: Check Server Logs
When webhook arrives, you should see:
```
Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
Creating entitlement: { userId: 'user_xxx', plan: 'basic', ... }
✅ Entitlement created/updated successfully
```

## Common Error Patterns

### Error: `[400] POST http://localhost:3000/api/billing/webhook`
**Cause**: Signature verification failed
**Fix**: 
1. Copy NEW secret from `stripe listen` output
2. Update `.env.local`
3. Restart dev server

### Error: No events in `stripe listen` terminal
**Cause**: Stripe CLI not forwarding or payment not completing
**Fix**:
1. Restart `stripe listen`
2. Check checkout session completes in Stripe Dashboard
3. Verify you're using test mode keys

### Error: "Missing stripe-signature header"
**Cause**: Request not coming through Stripe CLI or middleware stripping headers
**Fix**: Check middleware allows `/api/billing/webhook` as public route

### Error: "Webhook not configured"
**Cause**: `STRIPE_WEBHOOK_SECRET` missing or empty in `.env.local`
**Fix**: Add secret to `.env.local` and restart server

## Complete Setup Checklist

- [ ] Stripe CLI installed (`stripe --version`)
- [ ] Stripe CLI logged in (`stripe login`)
- [ ] `stripe listen` running with correct endpoint
- [ ] Webhook secret copied from `stripe listen` output
- [ ] Webhook secret in `.env.local` as `STRIPE_WEBHOOK_SECRET`
- [ ] Dev server restarted after adding secret
- [ ] Test event triggers successfully (`stripe trigger checkout.session.completed`)
- [ ] Server logs show webhook processing
- [ ] Database shows entitlement created

## Debugging Commands

```bash
# Check if Stripe CLI is running
ps aux | grep "stripe listen"

# Check webhook secret format
grep STRIPE_WEBHOOK_SECRET apps/web/.env.local

# Check server is accessible
curl http://localhost:3000/api/billing/webhook -X POST -v

# Trigger test event
stripe trigger checkout.session.completed

# View Stripe events
stripe events list --limit 5
```

## Production vs Development

**Development (Local)**:
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/billing/webhook`
- Webhook secret from CLI output
- Test mode keys

**Production**:
- Webhook endpoint in Stripe Dashboard: `https://yourdomain.com/api/billing/webhook`
- Webhook secret from Dashboard (starts with `whsec_`)
- Live mode keys (or test mode if still testing)
