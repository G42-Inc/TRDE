# Webhook Root Cause Analysis & Complete Fix

## ROOT CAUSE IDENTIFIED

The issue is **NOT** with the code or Stripe sandbox. The issue is that **Stripe CLI must be running** for webhooks to be delivered in local development. Test mode works fine, but webhooks ONLY come through the CLI tunnel.

## Critical Requirements

### 1. Stripe CLI MUST Be Running
**Root Cause**: Without `stripe listen`, NO webhooks will arrive, regardless of:
- Payment completion
- Webhook secret configuration
- Server running status
- Code correctness

**Fix**: ALWAYS run this before testing:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 2. Webhook Secret Changes on Every CLI Restart
**Root Cause**: Every time you restart `stripe listen`, it generates a NEW webhook secret. If `.env.local` has an old secret, signature verification fails.

**Fix**: 
1. Every time you restart `stripe listen`, copy the NEW secret from output
2. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Restart your Next.js dev server

### 3. Request Body Must Be Raw
**Root Cause**: Next.js might parse the request body, corrupting it for signature verification.

**Fix Applied**: Added explicit `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` to ensure raw body handling.

### 4. Comprehensive Error Logging
**Root Cause**: Silent failures made debugging impossible.

**Fix Applied**: Added detailed error messages and logging at every step.

## Verification Steps

### Step 1: Ensure Stripe CLI is Running
```bash
# Terminal 1: Start CLI
stripe listen --forward-to localhost:3000/api/billing/webhook

# Should see:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 2: Update Webhook Secret
```bash
# Copy secret from Terminal 1 output
# Update .env.local:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Use the NEW secret
```

### Step 3: Restart Dev Server
```bash
# Terminal 2: Restart Next.js server (to load new secret)
# Stop server (Ctrl+C), then:
pnpm dev
```

### Step 4: Test Webhook Delivery
```bash
# Terminal 3: Trigger test event
stripe trigger checkout.session.completed

# Terminal 1 should show:
# 2025-XX-XX XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
# 2025-XX-XX XX:XX:XX  <-- [200] POST http://localhost:3000/api/billing/webhook
```

**If you see `[400]` instead of `[200]`:**
- Webhook secret mismatch - copy NEW secret from Terminal 1
- Update `.env.local`
- Restart dev server

### Step 5: Test Full Payment Flow
1. Go to `http://localhost:3000/pricing`
2. Click "Get Started" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout

**In Terminal 1 (`stripe listen`), you should see:**
```
2025-XX-XX XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
2025-XX-XX XX:XX:XX  <-- [200] POST http://localhost:3000/api/billing/webhook
```

**In Terminal 2 (dev server), you should see:**
```
📨 Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
Creating entitlement: { userId: 'user_xxx', plan: 'basic', ... }
✅ Entitlement created/updated successfully
```

## Common Error Messages & Solutions

### "Missing stripe-signature header"
**Cause**: Stripe CLI not running or request not coming through CLI
**Fix**: 
1. Start `stripe listen`
2. Verify it's forwarding to correct endpoint
3. Ensure payment is in test mode

### "Invalid signature" or `[400]` response
**Cause**: Webhook secret mismatch
**Fix**:
1. Copy NEW secret from `stripe listen` output
2. Update `.env.local`
3. Restart dev server

### "Webhook not configured"
**Cause**: `STRIPE_WEBHOOK_SECRET` missing or empty
**Fix**: Add secret to `.env.local` and restart server

### No events in `stripe listen` terminal
**Cause**: Payment not completing or not using test mode
**Fix**:
1. Verify payment completes in Stripe Dashboard
2. Check you're using test keys (start with `sk_test_`)
3. Verify checkout session was created

## Code Improvements Made

### 1. Enhanced Error Messages
- Clear instructions when webhook secret is missing
- Detailed guidance when signature verification fails
- Helpful hints pointing to Stripe CLI

### 2. Better Logging
- Logs when webhook is received
- Logs when processing starts
- Logs when entitlement is created
- Logs errors with full context

### 3. Request Body Protection
- Explicit runtime configuration
- Error handling for body reading failures
- Clear error messages if body can't be read

### 4. Missing Header Detection
- Checks for `stripe-signature` header
- Provides helpful error message if missing
- Guides user to check Stripe CLI

## Complete Setup Checklist

- [ ] Stripe CLI installed (`stripe --version`)
- [ ] Stripe CLI logged in (`stripe login`)
- [ ] `stripe listen` running in separate terminal
- [ ] Webhook secret copied from `stripe listen` output
- [ ] `STRIPE_WEBHOOK_SECRET` in `.env.local` matches CLI output
- [ ] Dev server restarted after adding/updating secret
- [ ] Test event works (`stripe trigger checkout.session.completed`)
- [ ] Server logs show successful webhook processing
- [ ] Database shows entitlement created after payment

## Why This Happens

Stripe test mode webhooks **require** Stripe CLI for local development because:
1. Localhost isn't accessible from Stripe's servers
2. Stripe CLI creates a secure tunnel to forward webhooks
3. The CLI generates a unique webhook secret for each session
4. Without the CLI, Stripe has no way to deliver webhooks to localhost

**This is NOT a bug** - it's how Stripe designed local webhook testing to work.

## Production Setup

For production, you don't need Stripe CLI:
1. Create webhook endpoint in Stripe Dashboard
2. Use production webhook secret (from Dashboard)
3. Webhooks delivered directly to your server

## Summary

**The root cause was not code or configuration** - it was missing Stripe CLI. The fixes ensure:
1. Clear error messages guide users to start Stripe CLI
2. Better logging helps debug issues
3. Proper request body handling prevents signature failures
4. Comprehensive documentation prevents future confusion

**Action Required**: Start `stripe listen` before testing payments, and update the webhook secret every time you restart it.
