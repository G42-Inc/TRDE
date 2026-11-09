-- Migration: Convert primary_goal to primary_goals array
-- This allows users to select multiple goals during onboarding

-- Add new array column
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS primary_goals TEXT[] DEFAULT '{}';

-- Migrate existing data from primary_goal to primary_goals
UPDATE user_preferences 
SET primary_goals = ARRAY[primary_goal]
WHERE primary_goal IS NOT NULL AND (primary_goals IS NULL OR primary_goals = '{}');

-- Keep primary_goal column for backward compatibility
-- It will be deprecated but won't break existing code
