# Stripe Integration Documentation

This document outlines the complete Stripe integration for subscription billing in TRDE.

## Overview

The Stripe integration handles:
- Subscription checkout from the pricing page
- Customer creation and management (linked to Clerk users)
- Webhook event processing for subscription lifecycle
- Customer portal for subscription management
- Idempotent webhook processing
- Comprehensive error handling

## Architecture

### Components

1. **Customer Management** (`lib/stripe/customer.ts`)
   - Creates and retrieves Stripe customers
   - Maintains one-to-one mapping between Clerk users and Stripe customers
   - Stores mapping in Supabase `stripe_customers` table

2. **Price Management** (`lib/stripe/prices.ts`)
   - Maps plan tiers to Stripe price IDs
   - Validates price configuration
   - Provides reverse lookup (price ID → plan tier)

3. **Checkout Route** (`app/api/billing/checkout/route.ts`)
   - Creates Stripe Checkout sessions
   - Links to existing or creates new Stripe customer
   - Handles existing subscription detection

4. **Webhook Handler** (`app/api/billing/webhook/route.ts`)
   - Processes Stripe webhook events
   - Implements idempotency via event tracking
   - Updates entitlements in Supabase

5. **Customer Portal** (`app/api/billing/portal/route.ts`)
   - Creates Stripe Customer Portal sessions
   - Allows users to manage subscriptions, update payment methods, view invoices

6. **Subscription API** (`app/api/billing/subscription/route.ts`)
   - Gets current user's subscription information
   - Used by settings page to display subscription status

7. **Success Page** (`app/app/checkout-success/page.tsx`)
   - Displays success message after checkout
   - Verifies session completion

## Database Schema

### `stripe_customers` Table
```sql
CREATE TABLE stripe_customers (
  user_id TEXT PRIMARY KEY,              -- Clerk user ID
  stripe_customer_id TEXT NOT NULL UNIQUE, -- Stripe customer ID
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `stripe_webhook_events` Table
```sql
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,  -- Stripe event ID for idempotency
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Environment Variables

Required environment variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...              # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret

# Stripe Price IDs (from Stripe Dashboard → Products)
STRIPE_PRICE_ID_BASIC=price_...            # Basic plan price ID
STRIPE_PRICE_ID_EDGE=price_...             # Edge plan price ID
STRIPE_PRICE_ID_PRO=price_...              # Pro plan price ID
```

## Setup Instructions

### 1. Stripe Dashboard Setup

1. **Create Products and Prices**
   - Go to Stripe Dashboard → Products
   - Create three products:
     - "TRDE Basic" ($9.99/month)
     - "TRDE Edge" ($14.99/month)
     - "TRDE Pro" ($19.99/month)
   - For each product, create a recurring monthly price
   - Copy the Price IDs (starts with `price_`)

2. **Set Price IDs in Environment**
   ```bash
   STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_EDGE=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
   ```

3. **Configure Webhook Endpoint**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/billing/webhook`
   - Select events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 2. Database Setup

Run the SQL schema updates to create required tables:

```sql
-- Run the schema updates from supabase/schema.sql
-- This creates stripe_customers and stripe_webhook_events tables
```

### 3. Deploy and Test

1. Deploy your application with environment variables set
2. Test checkout flow from pricing page
3. Verify webhook events are received and processed
4. Test customer portal access from settings page

## Workflow

### Checkout Flow

1. User clicks "Get Started" on pricing page
2. Frontend calls `POST /api/billing/checkout` with plan tier
3. Backend:
   - Validates user authentication
   - Gets or creates Stripe customer
   - Creates Stripe Checkout session
   - Returns checkout URL
4. User redirects to Stripe Checkout
5. User completes payment
6. Stripe redirects to success URL: `/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`
7. Dashboard redirects to `/app/checkout-success` page
8. Stripe sends `checkout.session.completed` webhook
9. Webhook handler creates/updates entitlement in database

### Subscription Management Flow

1. User navigates to Settings → Data & Export tab
2. Settings page displays subscription status
3. User clicks "Manage Subscription"
4. Frontend calls `POST /api/billing/portal`
5. Backend creates Stripe Customer Portal session
6. User redirects to Stripe Customer Portal
7. User can:
   - Update payment method
   - Change subscription plan
   - Update billing information
   - View invoice history
   - Cancel subscription
8. Stripe sends webhook events for any changes
9. Webhook handler updates entitlements accordingly

## Webhook Events Handled

### `checkout.session.completed`
- **When**: User completes checkout
- **Action**: Creates or activates entitlement
- **Idempotency**: Uses event ID tracking

### `customer.subscription.created` / `customer.subscription.updated`
- **When**: Subscription is created or updated (plan change, status change)
- **Action**: Updates entitlement plan, status, and period end
- **Idempotency**: Uses event ID tracking

### `customer.subscription.deleted`
- **When**: Subscription is canceled
- **Action**: Marks entitlement as canceled
- **Idempotency**: Uses event ID tracking

### `invoice.payment_succeeded`
- **When**: Subscription payment succeeds
- **Action**: Ensures entitlement is active and updates period end
- **Purpose**: Keeps entitlements in sync even if other webhooks are delayed

### `invoice.payment_failed`
- **When**: Subscription payment fails
- **Action**: Marks entitlement as past_due
- **Purpose**: Allows grace period handling

## Error Handling

### Checkout Errors
- Invalid plan: Returns 400 with error message
- Missing price ID: Returns 500 (configuration error)
- Customer creation fails: Returns 500 with user-friendly message
- Existing subscription: Returns 400 suggesting portal usage

### Webhook Errors
- Invalid signature: Returns 400 (rejects webhook)
- Missing metadata: Logs error, returns 200 (prevents retry)
- Database errors: Logs error, stores in webhook_events table
- Returns 200 to prevent Stripe retries (manual retry queue can be added)

### Idempotency
- All webhook events are tracked by Stripe event ID
- Duplicate events are skipped
- Failed events can be retried manually

## Security Considerations

1. **Webhook Signature Verification**
   - All webhooks verify Stripe signature
   - Invalid signatures are rejected

2. **User Authentication**
   - All API routes require authentication via Clerk
   - User IDs are validated before operations

3. **Database Access**
   - Service role key used for all database operations
   - RLS policies restrict access appropriately

4. **Customer Linking**
   - Clerk user ID stored in Stripe customer metadata
   - Supabase mapping ensures one-to-one relationship
   - Prevents account linking issues

## Best Practices Implemented

1. **Idempotent Operations**
   - Webhook events tracked by ID
   - Prevents duplicate processing

2. **Error Resilience**
   - Graceful error handling at all levels
   - User-friendly error messages
   - Comprehensive logging

3. **Customer Management**
   - One-to-one Clerk-to-Stripe mapping
   - Automatic customer creation
   - Handles deleted customers

4. **Plan Mapping**
   - Price IDs stored in environment variables
   - Reverse lookup for webhooks
   - Validation on startup

5. **Status Synchronization**
   - Multiple webhook events keep status in sync
   - Payment events update entitlements
   - Graceful handling of delayed webhooks

## Testing

### Local Testing with Stripe CLI

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/billing/webhook`
4. Use test mode keys in `.env.local`
5. Test checkout flow with test cards

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Manual Testing Checklist

- [ ] Checkout flow works for all plans
- [ ] Webhook events are received and processed
- [ ] Entitlements are created/updated correctly
- [ ] Customer portal opens successfully
- [ ] Plan changes update entitlements
- [ ] Cancellations mark entitlements as canceled
- [ ] Payment failures mark as past_due
- [ ] Idempotency prevents duplicate processing

## Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check webhook endpoint URL is correct
   - Verify webhook secret matches
   - Check Stripe Dashboard for delivery logs

2. **Entitlement not created**
   - Check webhook event logs in database
   - Verify event processing in Supabase logs
   - Check for errors in webhook handler

3. **Customer portal not opening**
   - Verify Stripe customer exists for user
   - Check customer portal is enabled in Stripe Dashboard
   - Verify API key has correct permissions

4. **Price ID errors**
   - Verify price IDs in environment variables
   - Ensure prices exist in Stripe Dashboard
   - Check price IDs start with `price_`

## Future Enhancements

1. **Retry Queue**
   - Add queue system for failed webhook processing
   - Automatic retries with exponential backoff

2. **Email Notifications**
   - Send emails on subscription events
   - Payment reminders for past_due

3. **Usage Metering**
   - Track feature usage
   - Usage-based billing for additional features

4. **Coupons and Promotions**
   - Support for promotional codes
   - Referral discounts

5. **Subscription Analytics**
   - Track subscription metrics
   - Churn analysis
   - Revenue reporting
