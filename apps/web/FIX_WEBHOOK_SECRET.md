# Fix Webhook Secret

## Issue
Webhook events are returning 400 errors because the webhook secret in `.env.local` is **truncated/incomplete**.

## Solution

1. **Copy the FULL webhook secret** from your `stripe listen` terminal output:
   ```
   > Ready! Your webhook signing secret is whsec_REPLACE_WITH_YOUR_STRIPE_WEBHOOK_SECRET
   ```

2. **Update `.env.local`** with the complete secret:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_STRIPE_WEBHOOK_SECRET
   ```

3. **Restart your dev server**:
   - Stop: Ctrl+C
   - Restart: `pnpm dev`

4. **Test again**:
   ```bash
   stripe trigger checkout.session.completed
   ```

   Should now show `[200]` instead of `[400]`

## Verify It's Fixed

After updating and restarting, you should see:
- ✅ `[200] POST http://localhost:3000/api/billing/webhook` (instead of `[400]`)
- ✅ Server logs showing: "Processing webhook event:"
- ✅ Server logs showing: "Entitlement created/updated successfully"
