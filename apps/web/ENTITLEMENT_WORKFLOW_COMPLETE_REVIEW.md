# Complete Entitlement Workflow Review

## User Journey: Sign Up → Checkout → Confirmation → Dashboard

### Step 1: User Signs Up
**File**: `apps/web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Flow**:
1. User fills out sign-up form
2. Clerk creates user account
3. Redirects to `/auth-redirect` (or `redirect_url` if provided)
4. **No entitlement created yet** - user needs to subscribe

**Status**: ✅ Working correctly

### Step 2: User Selects Plan & Checks Out
**File**: `apps/web/src/app/pricing/page.tsx`

**Flow**:
1. User clicks "Get Started" on a plan
2. `handleSelectPlan(plan)` is called
3. Makes POST to `/api/billing/checkout` with `{ plan: 'basic' | 'edge' | 'pro' }`
4. Redirects to Stripe Checkout page

**Status**: ✅ Working correctly

### Step 3: Checkout API Creates Session
**File**: `apps/web/src/app/api/billing/checkout/route.ts`

**Flow**:
1. Validates Stripe configuration
2. Gets/creates Stripe customer (links Clerk userId to Stripe customer)
3. Creates checkout session with:
   - `client_reference_id: userId` ✅
   - `metadata.userId: userId` ✅
   - `metadata.plan: planTier` ✅
   - `subscription_data.metadata.userId: userId` ✅
   - `subscription_data.metadata.plan: planTier` ✅
   - `success_url: /app/checkout-success?session_id={CHECKOUT_SESSION_ID}` ✅
4. Returns `checkoutUrl` to redirect user

**Status**: ✅ Working correctly - all metadata properly set

### Step 4: User Completes Payment
**Flow**:
1. User enters payment details on Stripe Checkout
2. Stripe processes payment
3. Stripe redirects to: `/app/checkout-success?session_id=cs_xxxxx`
4. **CRITICAL**: Stripe sends `checkout.session.completed` webhook (async)

**Status**: ✅ Flow is correct

### Step 5: Webhook Creates Entitlement
**File**: `apps/web/src/app/api/billing/webhook/route.ts`

**Flow** (when webhook arrives):
1. Verifies webhook signature
2. Checks idempotency (prevents duplicate processing)
3. Validates event structure
4. Calls `handleWebhookEvent(event, supabase, stripe)`
5. For `checkout.session.completed`:
   - Extracts `userId` from `session.metadata.userId` or `session.client_reference_id`
   - Retrieves subscription from Stripe (with retry logic)
   - Derives plan from subscription price ID or metadata
   - Creates/updates entitlement in database:
     ```sql
     INSERT INTO entitlements (
       user_id, plan, status, current_period_end, 
       source, created_at, updated_at
     ) VALUES (...)
     ON CONFLICT (user_id) DO UPDATE ...
     ```
6. Marks event as processed

**Status**: ⚠️ **CRITICAL ISSUE FOUND** - File is truncated! Missing handler functions.

### Step 6: Checkout Success Page Waits for Entitlement
**File**: `apps/web/src/app/app/checkout-success/page.tsx`

**Flow**:
1. Page loads with `session_id` from URL
2. Verifies session via `/api/billing/verify-session`
3. If verified, starts polling `/api/auth/check-access?plan=basic` every 5 seconds
4. Shows "Setting Up Your Account" screen while waiting
5. When `data.hasAccess && data.entitlement` is true:
   - Sets `hasEntitlement = true`
   - Sets `status = 'success'`
   - Shows "Welcome to TRDE!" with "Go to Dashboard" button
6. If max retries (12 = 1 minute) exceeded:
   - Shows success screen but with refresh option

**Status**: ✅ Working correctly - polls until entitlement appears

### Step 7: User Clicks "Go to Dashboard"
**Flow**:
1. User clicks button → navigates to `/app`
2. `apps/web/src/app/(app)/layout.tsx` wraps with `ProtectedRoute`
3. `ProtectedRoute` calls `checkUserAccess(undefined, 'basic')`
4. `checkUserAccess`:
   - Gets userId from `currentUser()` or cookies
   - Checks if admin (bypasses entitlements)
   - Queries `entitlements` table for user
   - Checks if entitlement is active
   - Checks if plan meets requirement
5. If access granted → renders `AppShell` with dashboard
6. If no access → redirects to `/pricing?locked=true`

**Status**: ✅ Working correctly

## CRITICAL ISSUE IDENTIFIED

### Problem: Webhook Handler File is Truncated
**File**: `apps/web/src/app/api/billing/webhook/route.ts`
**Current State**: Only 200 lines, ends with `// ... existing code ...`
**Missing Functions**:
- `handleWebhookEvent()` - dispatches events to specific handlers
- `validateWebhookEvent()` - validates event structure
- `handleCheckoutCompleted()` - creates entitlement after payment
- `handleSubscriptionUpdate()` - updates entitlement on plan changes
- `handleSubscriptionDeleted()` - cancels entitlement
- `handlePaymentSucceeded()` - updates entitlement period
- `handlePaymentFailed()` - marks entitlement as past_due

**Impact**: Webhooks will fail to process, entitlements will NOT be created!

## Required Fixes

### 1. Restore Complete Webhook Handler File
All handler functions must be restored. Based on the retry handler imports, these functions must exist and be exported.

### 2. Verify Webhook Processing Flow
Ensure:
- `handleCheckoutCompleted` properly extracts userId
- Subscription retrieval has retry logic (already added)
- Plan derivation works from price ID or metadata
- Entitlement upsert includes `created_at` (already added)
- Error handling throws instead of silent returns (already fixed)

### 3. Verify Checkout Success Page Polling
Ensure:
- Polling uses refs to avoid closure issues (already fixed)
- Polling stops when entitlement found (already implemented)
- Error messages are clear (already improved)

### 4. Verify Dashboard Access
Ensure:
- `ProtectedRoute` properly checks entitlements (already correct)
- `checkUserAccess` queries database correctly (already correct)
- Redirects work properly (already correct)

## Workflow Verification Checklist

- [ ] User can sign up ✅
- [ ] User can select plan and start checkout ✅
- [ ] Checkout session created with proper metadata ✅
- [ ] User completes payment on Stripe ✅
- [ ] Stripe redirects to checkout-success page ✅
- [ ] **Webhook handler processes checkout.session.completed** ⚠️ **NEEDS FIX**
- [ ] **Entitlement created in database** ⚠️ **DEPENDS ON WEBHOOK**
- [ ] Checkout success page polls for entitlement ✅
- [ ] Checkout success page shows welcome when entitlement found ✅
- [ ] User can click "Go to Dashboard" ✅
- [ ] Dashboard access check passes ✅
- [ ] User sees dashboard ✅

## Next Steps

1. **URGENT**: Restore complete webhook handler file with all functions
2. Test webhook delivery with Stripe CLI
3. Verify entitlement creation in database
4. Test full flow end-to-end
