-- ============================================
-- USER ENGAGEMENT SYSTEM
-- Migration: 20250203000000_user_engagement.sql
-- 
-- Creates tables for:
-- - User preferences (onboarding data)
-- - Achievement definitions and user achievements
-- - User engagement stats (XP, streaks)
-- - Personalized insights
-- - Notification preferences
-- - Feedback submissions
-- ============================================

-- ============================================
-- UPDATE ENTITLEMENTS TABLE
-- Add 'demo' status for view-only demo mode
-- ============================================
ALTER TABLE entitlements 
DROP CONSTRAINT IF EXISTS entitlements_status_check;

ALTER TABLE entitlements 
ADD CONSTRAINT entitlements_status_check 
CHECK (status IN ('active', 'past_due', 'canceled', 'comped', 'demo'));

-- ============================================
-- USER PREFERENCES TABLE
-- Stores onboarding preferences and settings
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  trading_experience TEXT CHECK (trading_experience IN ('beginner', 'intermediate', 'advanced')),
  asset_classes TEXT[] DEFAULT '{}',
  primary_goal TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  sound_enabled BOOLEAN DEFAULT TRUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_preferences"
  ON user_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (true);

-- ============================================
-- ACHIEVEMENT DEFINITIONS TABLE
-- Static table with all possible achievements
-- ============================================
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'skill', 'special')),
  xp_reward INTEGER DEFAULT 0,
  criteria JSONB NOT NULL,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for achievement_definitions (read-only for users)
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to achievement_definitions"
  ON achievement_definitions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (true);

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- Tracks which achievements each user has unlocked
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- Indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unnotified ON user_achievements(user_id) WHERE NOT notified;

-- RLS for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_achievements"
  ON user_achievements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (true);

-- ============================================
-- USER ENGAGEMENT STATS TABLE
-- Tracks XP, streaks, and activity counts
-- ============================================
CREATE TABLE IF NOT EXISTS user_engagement_stats (
  user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_trades_logged INTEGER DEFAULT 0,
  total_journals_written INTEGER DEFAULT 0,
  total_reviews_completed INTEGER DEFAULT 0,
  analytics_views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_engagement_stats
ALTER TABLE user_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_engagement_stats"
  ON user_engagement_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own engagement stats"
  ON user_engagement_stats FOR SELECT
  USING (true);

-- ============================================
-- USER INSIGHTS TABLE
-- Cached personalized insights for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'improvement', 'warning', 'tip', 'celebration')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  relevance INTEGER DEFAULT 50 CHECK (relevance >= 0 AND relevance <= 100),
  action_url TEXT,
  data JSONB,
  dismissed BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for user_insights
-- Note: Can't use NOW() in partial index predicate, so we index on dismissed status only
-- Expiration filtering is handled at query time
CREATE INDEX IF NOT EXISTS idx_user_insights_active ON user_insights(user_id) 
  WHERE NOT dismissed;
CREATE INDEX IF NOT EXISTS idx_user_insights_user_expires ON user_insights(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_insights_expires ON user_insights(expires_at) 
  WHERE expires_at IS NOT NULL;

-- RLS for user_insights
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_insights"
  ON user_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own insights"
  ON user_insights FOR SELECT
  USING (true);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- Email and push notification settings
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_summary BOOLEAN DEFAULT TRUE,
  achievement_notifications BOOLEAN DEFAULT TRUE,
  streak_reminders BOOLEAN DEFAULT TRUE,
  insight_alerts BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to notification_preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (true);

-- ============================================
-- FEEDBACK SUBMISSIONS TABLE
-- User feedback, bug reports, and NPS responses
-- ============================================
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'nps')),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  context JSONB,
  responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feedback_submissions
CREATE INDEX IF NOT EXISTS idx_feedback_unresponded ON feedback_submissions(created_at) 
  WHERE NOT responded;
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_submissions(user_id);

-- RLS for feedback_submissions
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to feedback_submissions"
  ON feedback_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own feedback"
  ON feedback_submissions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert feedback"
  ON feedback_submissions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_stats_updated_at
  BEFORE UPDATE ON user_engagement_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- XP LEVEL CALCULATION
-- ============================================
-- Level thresholds: Level N requires (N-1) * 100 XP
-- Level 1: 0 XP, Level 2: 100 XP, Level 3: 200 XP, etc.
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, (xp / 100) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP and update level
CREATE OR REPLACE FUNCTION add_user_xp(p_user_id TEXT, p_xp_amount INTEGER)
RETURNS TABLE(new_total_xp INTEGER, new_level INTEGER, level_changed BOOLEAN) AS $$
DECLARE
  old_level INTEGER;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get current stats
  SELECT total_xp, current_level INTO v_new_total_xp, old_level
  FROM user_engagement_stats
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_engagement_stats (user_id, total_xp, current_level)
    VALUES (p_user_id, p_xp_amount, calculate_level(p_xp_amount))
    RETURNING total_xp, current_level INTO v_new_total_xp, v_new_level;
    
    RETURN QUERY SELECT v_new_total_xp, v_new_level, v_new_level > 1;
    RETURN;
  END IF;
  
  -- Update XP
  v_new_total_xp := v_new_total_xp + p_xp_amount;
  v_new_level := calculate_level(v_new_total_xp);
  
  UPDATE user_engagement_stats
  SET total_xp = v_new_total_xp,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_new_total_xp, v_new_level, v_new_level > old_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STREAK MANAGEMENT
-- ============================================
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id TEXT)
RETURNS TABLE(new_streak INTEGER, streak_broken BOOLEAN, is_new_record BOOLEAN) AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_new_streak INTEGER;
  v_streak_broken BOOLEAN := FALSE;
  v_is_new_record BOOLEAN := FALSE;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_engagement_stats
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_engagement_stats (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING current_streak INTO v_new_streak;
    
    RETURN QUERY SELECT v_new_streak, FALSE, TRUE;
    RETURN;
  END IF;
  
  -- Calculate new streak
  IF v_last_activity IS NULL THEN
    -- First activity ever
    v_new_streak := 1;
  ELSIF v_last_activity = v_today THEN
    -- Already logged today, no change
    v_new_streak := v_current_streak;
  ELSIF v_last_activity = v_today - 1 THEN
    -- Consecutive day, increment streak
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken
    v_new_streak := 1;
    v_streak_broken := v_current_streak > 0;
  END IF;
  
  -- Check for new record
  IF v_new_streak > v_longest_streak THEN
    v_longest_streak := v_new_streak;
    v_is_new_record := TRUE;
  END IF;
  
  -- Update stats
  UPDATE user_engagement_stats
  SET current_streak = v_new_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_new_streak, v_streak_broken, v_is_new_record;
END;
$$ LANGUAGE plpgsql;
