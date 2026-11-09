# Environment Variables Setup

## Location
The `.env.local` file must be in: `apps/web/.env.local`

## Required Stripe Variables

Add these to your `.env.local` file:

```bash
# Stripe API Key (from Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe Price IDs (from Stripe Dashboard → Products → Click on Price)
STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EDGE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
```

## Important Notes

1. **File Location**: Must be in `apps/web/.env.local` (same directory as `package.json`)
2. **No Quotes**: Don't wrap values in quotes unless they contain spaces
3. **No Spaces**: No spaces around the `=` sign
4. **Restart Required**: Must restart dev server after adding/changing variables

## Verification

After adding variables, verify they're loaded:
1. Restart your dev server (stop and start)
2. Go to `/pricing` page
3. Click "Get Started" on any plan
4. Should redirect to Stripe Checkout (not show "Billing service not configured")

## Troubleshooting

### Still seeing "STRIPE_SECRET_KEY not configured"?
- ✅ Check file is named exactly `.env.local` (with the dot)
- ✅ Check file is in `apps/web/` directory
- ✅ Check variable name is exactly `STRIPE_SECRET_KEY` (case-sensitive)
- ✅ Check no extra spaces or quotes
- ✅ **Restart dev server** after adding variables
- ✅ Clear `.next` cache: `rm -rf apps/web/.next` then restart

### Price IDs not working?
- ✅ Verify price IDs start with `price_`
- ✅ Check all 3 price IDs are set
- ✅ Verify prices are active in Stripe Dashboard
