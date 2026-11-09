# Stripe CLI Quick Start

## Step 1: Install Stripe CLI

### On macOS (Recommended - Using Homebrew):
```bash
brew install stripe/stripe-cli/stripe
```

### If you don't have Homebrew:
1. Install Homebrew: https://brew.sh
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Then install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

### Alternative (Download Binary):
1. Go to: https://github.com/stripe/stripe-cli/releases
2. Download the latest macOS release
3. Extract and move to PATH:
   ```bash
   # Example for Intel Mac
   wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_*_darwin_x86_64.tar.gz
   tar -xvf stripe_*_darwin_x86_64.tar.gz
   sudo mv stripe /usr/local/bin/
   ```

## Step 2: Login to Stripe

```bash
stripe login
```

This opens your browser to authorize the CLI with your Stripe account.

## Step 3: Start Webhook Forwarding

In a **new terminal window**, run:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**IMPORTANT:** Copy the `whsec_xxxxxxxxxxxxx` secret - you'll need it!

## Step 4: Add Webhook Secret to .env.local

1. Open `apps/web/.env.local`
2. Add this line (replace with your actual secret):
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
3. Save the file

## Step 5: Restart Your Dev Server

1. Go back to your terminal running `pnpm dev`
2. Stop it (Ctrl+C)
3. Restart it: `pnpm dev`

## Step 6: Test It

### Option A: Trigger Test Event
In the terminal running `stripe listen`, you can trigger test events:

```bash
# In a new terminal, run:
stripe trigger checkout.session.completed
```

### Option B: Make a Test Payment
1. Go to `http://localhost:3000/pricing`
2. Click "Get Started" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Any future expiry (e.g., `12/25`)
5. Any CVC (e.g., `123`)
6. Complete checkout

## What to Look For

### In Stripe CLI Terminal:
```
2025-01-09 12:34:56   --> checkout.session.completed [evt_xxxxx]
2025-01-09 12:34:57  <-- [200] POST http://localhost:3000/api/billing/webhook
```

### In Your Server Logs:
```
Processing webhook event: { id: 'evt_xxxxx', type: 'checkout.session.completed', ... }
Creating entitlement: { userId: 'user_xxx', plan: 'basic', ... }
Entitlement created/updated successfully
```

## Troubleshooting

### "Command not found: stripe"
- Make sure installation completed
- Try: `which stripe` to verify location
- May need to restart terminal

### "Webhook signature verification failed"
- Copy the secret from `stripe listen` output (starts with `whsec_`)
- Make sure it's in `.env.local` as `STRIPE_WEBHOOK_SECRET`
- Restart dev server after adding

### Nothing happens when testing
- Make sure `stripe listen` is running
- Make sure dev server is running
- Check both terminals for errors

## Stop Webhook Forwarding

Press `Ctrl+C` in the terminal running `stripe listen`

## Next Steps

Once it's working locally:
1. Test the full payment flow
2. Verify entitlements are created in database
3. Set up production webhook in Stripe Dashboard
4. Add production webhook secret to your hosting platform
