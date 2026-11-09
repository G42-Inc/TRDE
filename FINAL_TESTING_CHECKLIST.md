# Final Testing Checklist

## Pre-Testing Setup

### 1. Build Verification
- [ ] Run `pnpm build` - should compile successfully with 0 errors
- [ ] Run `pnpm start` - server should start without errors
- [ ] Check for any console errors on startup

### 2. Environment Check
- [ ] All environment variables are set (verify with `env` command or check `.env.local`)
- [ ] Using test keys (Stripe test mode, Clerk dev keys)
- [ ] Database connection works (Supabase)

---

## Core Functionality Tests

### Authentication Flow
- [ ] **User Signup**: New user can create account
- [ ] **User Login**: Existing user can log in
- [ ] **Session Persistence**: User stays logged in on page refresh
- [ ] **Logout**: User can log out successfully
- [ ] **Protected Routes**: Unauthenticated users redirected to login

### Dashboard
- [ ] Dashboard loads without errors
- [ ] Metric cards display correctly (4 metrics)
- [ ] Recent trades list appears (or empty state if no trades)
- [ ] Navigation works (all links/buttons functional)

### Data Seeding (Development Only)
- [ ] In development: Demo data appears for new users
- [ ] In production mode: New users see empty state (no demo data)
- [ ] Verify `NODE_ENV=production` disables data seeding

---

## Entitlement & Checkout Workflow (CRITICAL)

### Pre-Checkout
- [ ] **Pricing Page**: All three tiers display correctly
- [ ] **Plan Selection**: Can select Basic/EDGE/Pro plans
- [ ] **Checkout Button**: Redirects to Stripe checkout

### Checkout Process
- [ ] **Stripe Checkout**: Checkout page loads (test mode)
- [ ] **Payment**: Can complete test payment (use Stripe test card: `4242 4242 4242 4242`)
- [ ] **Success Redirect**: After payment, redirects to `/app/checkout-success`

### Post-Checkout (CRITICAL)
- [ ] **Checkout Success Page**: Shows "Payment successful" message
- [ ] **Entitlement Polling**: System detects entitlement grant
- [ ] **Welcome Button**: "Welcome to Dashboard" button appears
- [ ] **Dashboard Access**: User can access paid features after checkout
- [ ] **Webhook Processing**: Check Stripe webhook logs (or database) to verify webhook processed

### Subscription Management
- [ ] **Subscription Settings**: User can view subscription in settings
- [ ] **Stripe Portal**: Can access Stripe customer portal (if implemented)
- [ ] **Subscription Status**: Correct subscription tier displayed

---

## Feature Tests

### Trading Journal
- [ ] **Add Trade**: Can create new trade
- [ ] **Edit Trade**: Can edit existing trade
- [ ] **Delete Trade**: Can delete trade
- [ ] **Trade Filters**: Filters work correctly
- [ ] **Trade List**: Trades display in list view

### Analytics
- [ ] **Analytics Page**: Loads without errors
- [ ] **Charts Render**: All charts display correctly
- [ ] **Data Updates**: Charts update when trades are added/edited

### Strategies
- [ ] **Strategy List**: Strategies page loads
- [ ] **Create Strategy**: Can create new strategy
- [ ] **Strategy Cards**: Cards display with hover effects (if implemented)
- [ ] **Edit/Delete**: Can modify strategies

### EDGE Chart (if applicable)
- [ ] **Chart Page**: EDGE chart page loads
- [ ] **Contract Search**: Can search for contracts
- [ ] **Order Placement**: Can place orders (Bid/Ask buttons work correctly)
- [ ] **P&L Display**: P&L bubbles display correctly (if applicable)
- [ ] **Chart Rendering**: Chart renders without errors

### Settings
- [ ] **Settings Page**: Settings page loads
- [ ] **Theme Changes**: Can change theme (if applicable)
- [ ] **Subscription Section**: Subscription info displays

---

## Data Integrity Tests

### Data Persistence
- [ ] **Trades Saved**: New trades persist after page refresh
- [ ] **Data Sync**: Data syncs between browser tabs (if applicable)
- [ ] **Database Sync**: Data syncs to Supabase database (check database)

### Data Migration (if applicable)
- [ ] **Local to Cloud**: Can migrate data from local storage to database
- [ ] **No Data Loss**: All trades/strategies migrate successfully

---

## Error Handling Tests

### Network Errors
- [ ] **Offline Mode**: App handles network errors gracefully
- [ ] **API Errors**: Error messages display appropriately
- [ ] **Timeout Handling**: Long-running requests timeout gracefully

### Validation
- [ ] **Form Validation**: Invalid inputs show error messages
- [ ] **Required Fields**: Required fields are enforced
- [ ] **Type Validation**: Invalid data types are rejected

### Error Boundaries
- [ ] **React Errors**: Error boundaries catch and display errors
- [ ] **No White Screen**: App doesn't crash on errors

---

## Security Tests

### Authentication Security
- [ ] **Token Validation**: Invalid tokens are rejected
- [ ] **Session Expiry**: Expired sessions require re-login
- [ ] **CSRF Protection**: CSRF tokens validated (if applicable)

### Authorization
- [ ] **Route Protection**: Protected routes require authentication
- [ ] **Admin Routes**: Admin routes require admin privileges (if applicable)
- [ ] **Entitlement Checks**: Paid features require valid entitlement

### Data Security
- [ ] **Input Sanitization**: User inputs are sanitized
- [ ] **XSS Prevention**: No XSS vulnerabilities (test with script tags)
- [ ] **SQL Injection**: Database queries are parameterized (check code)

---

## Performance Tests

### Load Times
- [ ] **Initial Load**: Page loads in reasonable time (< 3 seconds)
- [ ] **Route Navigation**: Navigation between pages is fast
- [ ] **Data Loading**: Large datasets load without hanging

### Memory
- [ ] **No Memory Leaks**: Memory usage doesn't grow continuously
- [ ] **Cleanup**: Event listeners/timeouts cleaned up properly

---

## Browser Compatibility

- [ ] **Chrome**: Works in Chrome
- [ ] **Firefox**: Works in Firefox (if applicable)
- [ ] **Safari**: Works in Safari (if applicable)
- [ ] **Mobile Browser**: Works on mobile browsers (if applicable)

---

## Production Readiness Checklist

### Environment
- [ ] **Environment Variables**: All required variables documented
- [ ] **Build Scripts**: Build scripts work correctly
- [ ] **Start Scripts**: Start scripts work correctly

### Documentation
- [ ] **Deployment Guide**: Deployment steps documented
- [ ] **Environment Setup**: Environment variable setup documented
- [ ] **Database Migrations**: Migration steps documented

### Monitoring
- [ ] **Error Logging**: Errors are logged (if applicable)
- [ ] **Health Endpoint**: `/api/health` endpoint works
- [ ] **Webhook Logging**: Webhook events are logged

---

## Critical Path Test (End-to-End)

**Complete User Journey:**
1. [ ] User signs up
2. [ ] User sees empty dashboard (production mode)
3. [ ] User navigates to pricing
4. [ ] User selects plan and checks out
5. [ ] User completes payment (test mode)
6. [ ] User sees checkout success page
7. [ ] Entitlement is granted (verify in database)
8. [ ] User clicks "Welcome to Dashboard"
9. [ ] User can access paid features
10. [ ] User can create/manage trades
11. [ ] User can view analytics
12. [ ] User can manage subscription

---

## Notes

- **Test Mode**: Use Stripe test mode for payment testing
- **Test Cards**: Use `4242 4242 4242 4242` for successful payment
- **Database**: Check Supabase database for data persistence
- **Webhooks**: Verify webhook deliveries in Stripe/Clerk dashboards
- **Console**: Check browser console for errors/warnings
- **Network Tab**: Check network requests for API errors

---

## Common Issues to Watch For

- ❌ **Entitlement not granted after checkout**: Check webhook logs
- ❌ **Data seeding in production**: Verify `NODE_ENV=production`
- ❌ **Webhook failures**: Check webhook secrets and endpoints
- ❌ **Authentication errors**: Verify Clerk keys
- ❌ **Database errors**: Check Supabase connection and credentials
- ❌ **Build errors**: Verify all TypeScript errors are fixed
- ❌ **Missing environment variables**: Check `.env.local` file
