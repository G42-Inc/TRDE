-- Fix entitlement for user_37zYliC1FnVdUccn5UjEQwjBLKl
-- Run this in your Supabase SQL Editor

-- First, check what's in the database
SELECT 
  'ENTITLEMENTS' as table_name,
  user_id, 
  plan, 
  status, 
  override_enabled, 
  override_expires_at,
  current_period_end
FROM entitlements
ORDER BY updated_at DESC;

SELECT 
  'PROFILES' as table_name,
  user_id,
  email,
  display_name,
  first_name,
  last_name
FROM profiles
ORDER BY updated_at DESC;

-- Check if entitlement exists for this specific user
SELECT * FROM entitlements WHERE user_id = 'user_37zYliC1FnVdUccn5UjEQwjBLKl';

-- Check if profile exists
SELECT * FROM profiles WHERE user_id = 'user_37zYliC1FnVdUccn5UjEQwjBLKl';

-- If no entitlement exists, create one with permanent access
-- Uncomment and run this if no entitlement was found above:
/*
INSERT INTO entitlements (
  user_id,
  plan,
  status,
  override_enabled,
  override_expires_at,
  current_period_end,
  source,
  notes,
  created_at,
  updated_at
) VALUES (
  'user_37zYliC1FnVdUccn5UjEQwjBLKl',
  'pro',
  'comped',
  true,
  NULL, -- No expiration = permanent
  NULL,
  'manual',
  'Permanent access granted via SQL',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  override_enabled = EXCLUDED.override_enabled,
  override_expires_at = EXCLUDED.override_expires_at,
  updated_at = NOW();
*/
