# Admin Account Setup Guide

## Creating an Admin Account

### Step 1: Create a User Account

1. Sign up for a regular account through the app at `/sign-up`
2. Complete the sign-up process
3. Note the user's email address

### Step 2: Set Admin Role in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** section
3. Find the user by email address
4. Click on the user to open their profile
5. Scroll to **Metadata** section
6. In **Public metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```
7. Click **Save**

### Step 3: Verify Admin Access

1. Sign out of the app (if currently signed in)
2. Sign in with the admin account
3. You should be automatically redirected to `/admin` instead of `/app`
4. You should see the Admin Panel with user search functionality

## Admin Panel Features

### User Search
- Search by email address or Clerk user ID
- View current entitlement status for each user

### Grant Access (Comped)
- Select plan tier (Basic, Edge, Pro)
- Set expiration date (or leave empty for permanent)
- Add notes about why access was granted
- Creates entitlement with:
  - `status="comped"`
  - `source="manual"`
  - `override_enabled=true`
  - `override_expires_at` (if set)

### Revoke Access
- Disable override and/or set status to canceled
- All actions are logged to `audit_log` table

### Navigation
- **"Go to Dashboard"** button in top-right to access normal app features
- Admins can use both admin panel and regular app features

## Admin Verification

Admin status is verified **server-side only**:
- Checked via `isAdmin()` function in `lib/auth/clerk.ts`
- Reads `publicMetadata.role === "admin"` from Clerk
- Cannot be spoofed client-side

## Security Notes

- Admin role must be set in Clerk Dashboard (not in app)
- All admin actions are logged to `audit_log` table
- Admin routes are protected by `requireAdmin()` server-side check
- Non-admins accessing `/admin` are redirected to `/app` with error

## Testing Admin Flow

1. **Create admin account** (follow steps above)
2. **Sign in** → Should redirect to `/admin`
3. **Search for user** → Enter email or user ID
4. **Grant access** → Select plan, set expiration, add notes
5. **Verify entitlement** → User should now have access
6. **Go to Dashboard** → Click button to access normal app
7. **Sign out and sign in as regular user** → Should redirect to `/app` or `/pricing`

## Troubleshooting

### "Forbidden: Admin access required"
- Verify `publicMetadata.role === "admin"` in Clerk Dashboard
- Sign out and sign back in to refresh session
- Check browser console for errors

### Not redirecting to `/admin`
- Verify admin role is set correctly in Clerk
- Clear browser cache and cookies
- Check `/auth-redirect` page is working

### Can't find user in search
- User must exist in `profiles` table (created on first sign-in)
- Try searching by exact email address
- Check Supabase `profiles` table for user_id
