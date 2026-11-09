# Stripe CLI Setup Guide

## Install Stripe CLI

### macOS (using Homebrew)
```bash
brew install stripe/stripe-cli/stripe
```

### Other Platforms
Download from: https://stripe.com/docs/stripe-cli#install

Or use:
```bash
# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin

# Windows
# Download from GitHub releases page
```

## Login to Stripe

```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Link it to your Stripe account

## Forward Webhooks to Local Server

1. **Start your Next.js dev server** (in one terminal):
   ```bash
   cd apps/web
   pnpm dev
   ```
   Your server should be running on `http://localhost:3000`

2. **In a new terminal, start Stripe webhook forwarding**:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

   You should see output like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
   ```

3. **Copy the webhook signing secret** from the output (starts with `whsec_`)

4. **Add it to `.env.local`**:
   ```bash
   # Open apps/web/.env.local and add:
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Restart your Next.js dev server** (Ctrl+C and restart) to load the new secret

## Test the Webhook

### Option 1: Trigger Test Events
Stripe CLI can trigger test events:

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test subscription update
stripe trigger customer.subscription.updated
```

### Option 2: Make a Real Test Payment
1. Go to your local app: `http://localhost:3000/pricing`
2. Click "Get Started" on a plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future expiry date, any CVC
5. Complete checkout
6. Watch the Stripe CLI terminal - you should see webhook events being forwarded

## Verify It's Working

### In Stripe CLI Terminal:
You should see output like:
```
2025-01-09 12:34:56   --> checkout.session.completed [evt_xxxxx]
2025-01-09 12:34:57  <-- [200] POST http://localhost:3000/api/billing/webhook [evt_xxxxx]
```

### In Your Server Logs:
You should see:
```
Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
Creating entitlement: { userId: 'user_xxx', plan: 'basic', ... }
Entitlement created/updated successfully: { userId: 'user_xxx', ... }
```

### In Database:
```sql
SELECT * FROM entitlements WHERE user_id = 'user_xxx';
```

## Common Issues

### "Command not found: stripe"
- Make sure Stripe CLI is installed
- Try restarting your terminal
- Verify it's in your PATH: `which stripe`

### "Webhook signature verification failed"
- Make sure you copied the webhook secret from the `stripe listen` output
- Ensure `STRIPE_WEBHOOK_SECRET` is in `.env.local`
- Restart your dev server after adding the secret

### "Connection refused" or "Failed to forward"
- Make sure your Next.js server is running on `localhost:3000`
- Check the port matches: `stripe listen --forward-to localhost:3000/api/billing/webhook`
- Verify the webhook route exists: `/api/billing/webhook`

### Events not appearing
- Make sure both terminals are running (server + stripe listen)
- Check that you're testing in test mode (use test cards)
- Verify the webhook endpoint is correct in your Stripe Dashboard (if testing with real webhook)

## Stop Webhook Forwarding

Press `Ctrl+C` in the terminal running `stripe listen`

## Useful Stripe CLI Commands

```bash
# View recent events
stripe events list

# View specific event details
stripe events retrieve evt_xxxxx

# Test different event types
stripe trigger --help

# View logs in real-time
stripe logs tail
```

## Production Webhook Setup

Once ready for production:

1. **Remove Stripe CLI** (only for local testing)
2. **Create webhook endpoint in Stripe Dashboard**:
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://your-production-domain.com/api/billing/webhook`
   - Select all required events
3. **Get production webhook secret** from Dashboard
4. **Add to production environment variables** (not `.env.local`)
