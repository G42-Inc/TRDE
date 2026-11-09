-- Quick query to check entitlements in the database
-- Run this in your Supabase SQL Editor to see what entitlements exist

-- Check all entitlements
SELECT 
  user_id, 
  plan, 
  status, 
  override_enabled, 
  override_expires_at,
  current_period_end,
  created_at,
  updated_at
FROM entitlements
ORDER BY updated_at DESC
LIMIT 20;

-- Check for a specific user (replace with your Clerk userId)
-- SELECT * FROM entitlements WHERE user_id = 'user_37zYliC1FnVdUccn5UjEQwjBLKl';

-- Check all profiles and their entitlements
SELECT 
  p.user_id,
  p.email,
  p.display_name,
  e.plan,
  e.status,
  e.override_enabled,
  e.override_expires_at
FROM profiles p
LEFT JOIN entitlements e ON p.user_id = e.user_id
ORDER BY e.updated_at DESC NULLS LAST;
