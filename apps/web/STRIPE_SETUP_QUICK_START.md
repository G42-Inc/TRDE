# Stripe Setup Quick Start

## Issue: "Billing service not configured"

This error appears when Stripe environment variables are not set. Follow these steps to configure Stripe:

## Step 1: Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)

## Step 2: Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Create 3 products:
   - **TRDE Basic** - $9.99/month
   - **TRDE Edge** - $14.99/month  
   - **TRDE Pro** - $19.99/month
3. For each product:
   - Set pricing to **Recurring** → **Monthly**
   - Set the price amount
   - Copy the **Price ID** (starts with `price_`)

## Step 3: Set Environment Variables

Add these to your `.env.local` file in `apps/web/`:

```bash
# Stripe API Key (from Step 1)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EDGE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx

# Optional: Webhook Secret (for production)
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Step 4: Restart Development Server

After adding environment variables:
1. Stop your dev server (Ctrl+C)
2. Restart it: `pnpm dev` (or `npm run dev`)

## Step 5: Verify Configuration

1. Go to `/pricing` page
2. Click "Get Started" on any plan
3. You should be redirected to Stripe Checkout (not see "Billing service not configured")

## Test Mode vs Production

- **Test Mode**: Use `sk_test_...` keys (for development)
- **Production**: Use `sk_live_...` keys (for production)

## Troubleshooting

### Still seeing "Billing service not configured"?
- ✅ Check `.env.local` file exists in `apps/web/`
- ✅ Verify all 4 environment variables are set
- ✅ Restart your dev server after adding variables
- ✅ Check variable names match exactly (case-sensitive)

### Price IDs not working?
- ✅ Verify price IDs start with `price_`
- ✅ Check prices are set to "Recurring" → "Monthly"
- ✅ Ensure prices are active (not archived)

### Need help?
See full documentation: `apps/web/STRIPE_INTEGRATION.md`
