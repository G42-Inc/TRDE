-- Canonical TRDE bootstrap for a NEW, EMPTY, dedicated Supabase public schema.
-- Reviewed against the current web API on 2026-11-08 (America/New_York).
-- Replaces the overlapping historical schema/fix scripts; do not chain those scripts.
-- Clerk is verified in the Worker; all database access is server-only service_role.
-- No users, credentials, admin grants, entitlements or personal records are seeded.
-- Apply as one migration named trde_server_only_baseline. Never use on a populated DB.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'TRDE bootstrap requires an empty public schema';
  END IF;
END $$;
SET search_path = public, pg_catalog;


CREATE TABLE public.profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.entitlements (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'edge', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'comped', 'demo')),
  current_period_end TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('stripe', 'manual')),
  override_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  override_expires_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stripe_customers (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('connected', 'expired', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE public.trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  trade_date TEXT NOT NULL,
  entry_time BIGINT NOT NULL,
  exit_time BIGINT NOT NULL,
  direction TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  fees_usd DECIMAL(10, 2) NOT NULL,
  planned_risk_usd DECIMAL(10, 2) NOT NULL,
  result_usd DECIMAL(10, 2) NOT NULL,
  result_r DECIMAL(10, 4) NOT NULL,
  outcome TEXT NOT NULL,
  grade TEXT NOT NULL,
  strategy_id TEXT,
  strategy_version_id TEXT,
  session TEXT,
  market_regime TEXT,
  market_hours_tag TEXT,
  setup_tags JSONB DEFAULT '[]',
  news_tags JSONB DEFAULT '[]',
  mistakes JSONB DEFAULT '[]',
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  review_flag BOOLEAN NOT NULL DEFAULT FALSE,
  collections JSONB DEFAULT '[]',

  instrument_root TEXT,
  entry_price DECIMAL(10, 2),
  exit_price DECIMAL(10, 2),
  tick_size DECIMAL(10, 4),
  tick_value_usd DECIMAL(10, 2),
  points_pnl DECIMAL(10, 4),
  ticks_pnl DECIMAL(10, 4),
  rth_eth TEXT,

  underlying TEXT,
  expiration TEXT,
  dte INTEGER,
  strike DECIMAL(10, 2),
  option_type TEXT,
  entry_premium DECIMAL(10, 2),
  exit_premium DECIMAL(10, 2),
  net_premium_pnl_usd DECIMAL(10, 2),
  contract_multiplier INTEGER,

  discipline_flags JSONB DEFAULT '{}',

  management_style TEXT,

  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trade_ids JSONB DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.daily_biases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  bias TEXT NOT NULL CHECK (bias IN ('bullish', 'bearish', 'neutral')),
  reason TEXT,
  confidence INTEGER DEFAULT 50,
  confirmed BOOLEAN,
  confirmation_notes TEXT,
  confirmed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, date)
);

CREATE TABLE public.quick_journals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  mood_label TEXT,
  mood_intensity INTEGER,
  short_note TEXT,
  stress_level INTEGER,
  sleep_quality INTEGER,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.trade_journals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,

  pre_thesis TEXT,
  pre_invalidation TEXT,
  pre_confidence INTEGER,
  pre_mood_label TEXT,
  pre_mood_intensity INTEGER,
  pre_checklist_stop_planned BOOLEAN,
  pre_checklist_size_within_rules BOOLEAN,
  pre_checklist_entry_matches_strategy BOOLEAN,
  pre_checklist_news_checked BOOLEAN,

  post_what_went_well TEXT,
  post_what_to_improve TEXT,
  post_execution_notes TEXT,
  post_emotion_label TEXT,
  post_emotion_intensity INTEGER,
  post_rule_break_explanation TEXT,
  post_attachments JSONB DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
  ,pre_trade JSONB,
  post_trade JSONB
);

CREATE TABLE public.weekly_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  summary TEXT,
  wins JSONB DEFAULT '[]',
  losses JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  next_week_plan TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, week_start, week_end)
);

CREATE TABLE public.risk_rules (
  user_id TEXT PRIMARY KEY,
  daily_loss_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_trades_per_day INTEGER NOT NULL DEFAULT 0,
  max_contracts_per_trade INTEGER NOT NULL DEFAULT 0,
  stop_after_consecutive_losses INTEGER,
  stop_after_down_r DECIMAL(10, 4),
  require_planned_risk BOOLEAN NOT NULL DEFAULT FALSE,
  require_stop_defined BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.saved_filters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('VIDEO', 'NEWS', 'EDUCATION', 'REVIEW', 'PLANNING', 'OTHER')),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at BIGINT,
  due_date TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.rule_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  violated_rules JSONB NOT NULL DEFAULT '[]',
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  review_notes TEXT,
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.dashboard_metrics (
  user_id TEXT PRIMARY KEY,
  metric_ids JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.public_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_md TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upvotes INT NOT NULL DEFAULT 0,
  downvotes INT NOT NULL DEFAULT 0,
  wilson_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  trending_score DOUBLE PRECISION NOT NULL DEFAULT 0
  ,trade_count INT NOT NULL DEFAULT 0,
  total_pnl_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_pnl_r DOUBLE PRECISION NOT NULL DEFAULT 0,
  win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  expectancy DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
  stats_updated_at TIMESTAMPTZ
);

CREATE TABLE public.strategy_votes (
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (strategy_id, user_id)
);

CREATE TABLE public.user_strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.user_strategy_versions (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES user_strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.user_preferences (
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
  ,primary_goals TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE public.achievement_definitions (
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

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE public.user_engagement_stats (
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

CREATE TABLE public.user_insights (
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

CREATE TABLE public.notification_preferences (
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

CREATE TABLE public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'nps')),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  context JSONB,
  responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.flow_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_widget UNIQUE (user_id, widget_type, symbol)
);

CREATE TABLE public.flow_widget_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.flow_widget_refreshes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  widget_key TEXT NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_refresh_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT unique_user_widget_refresh UNIQUE (user_id, widget_key)
);

CREATE TABLE public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, provider)
);

CREATE TABLE public.webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id TEXT NOT NULL,
  webhook_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);

CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);

CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date);

CREATE INDEX IF NOT EXISTS idx_api_connections_user_id ON api_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_user_id);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_biases_user_id ON daily_biases(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_biases_date ON daily_biases(date);

CREATE INDEX IF NOT EXISTS idx_quick_journals_user_id ON quick_journals(user_id);

CREATE INDEX IF NOT EXISTS idx_quick_journals_timestamp ON quick_journals(timestamp);

CREATE INDEX IF NOT EXISTS idx_trade_journals_user_id ON trade_journals(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_journals_trade_id ON trade_journals(trade_id);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_rule_violations_user_id ON rule_violations(user_id);

CREATE INDEX IF NOT EXISTS idx_rule_violations_trade_id ON rule_violations(trade_id);

CREATE INDEX IF NOT EXISTS idx_rule_violations_reviewed ON rule_violations(user_id, reviewed);

CREATE INDEX IF NOT EXISTS idx_strategies_author_id ON strategies(author_id);

CREATE INDEX IF NOT EXISTS idx_strategies_is_public ON strategies(is_public);

CREATE INDEX IF NOT EXISTS idx_strategies_wilson_score ON strategies(wilson_score DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_strategies_trending_score ON strategies(trending_score DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON strategies(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_strategies_tags ON strategies USING GIN(tags) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_strategy_votes_user_id ON strategy_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id ON user_strategies(user_id);

CREATE INDEX IF NOT EXISTS idx_user_strategy_versions_user_id ON user_strategy_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_strategy_versions_strategy_id ON user_strategy_versions(strategy_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_unnotified ON user_achievements(user_id) WHERE NOT notified;

CREATE INDEX IF NOT EXISTS idx_user_insights_active ON user_insights(user_id)
  WHERE NOT dismissed;

CREATE INDEX IF NOT EXISTS idx_user_insights_user_expires ON user_insights(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_insights_expires ON user_insights(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_unresponded ON feedback_submissions(created_at)
  WHERE NOT responded;

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_flow_widgets_user_id ON flow_widgets(user_id);

CREATE INDEX IF NOT EXISTS idx_flow_widget_cache_expires ON flow_widget_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_flow_widget_refreshes_user ON flow_widget_refreshes(user_id);

CREATE INDEX IF NOT EXISTS idx_flow_widget_refreshes_next_refresh ON flow_widget_refreshes(next_refresh_at);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status ON webhook_retry_queue(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_webhook_type ON webhook_retry_queue(webhook_type);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_event_id ON webhook_retry_queue(webhook_event_id);

CREATE INDEX IF NOT EXISTS idx_strategies_stats ON strategies(total_pnl_r DESC, win_rate DESC) WHERE is_public = true;

CREATE INDEX idx_trades_user_created ON public.trades(user_id, created_at DESC);

CREATE INDEX idx_user_achievements_achievement ON public.user_achievements(achievement_id);

CREATE FUNCTION public.prevent_owner_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Record ownership cannot be reassigned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.calculate_wilson_score(upvotes INT, downvotes INT) RETURNS DOUBLE PRECISION AS $$
DECLARE
  n INT;
  phat DOUBLE PRECISION;
  z DOUBLE PRECISION := 1.96;
  numerator DOUBLE PRECISION;
  denominator DOUBLE PRECISION;
BEGIN
  n := upvotes + downvotes;
  IF n = 0 THEN RETURN 0; END IF;
  phat := upvotes::DOUBLE PRECISION / n;
  numerator := phat + (z * z) / (2 * n) - z * SQRT((phat * (1 - phat) + z * z / (4 * n)) / n);
  denominator := 1 + (z * z) / n;
  RETURN numerator / denominator;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

CREATE FUNCTION public.calculate_trending_score(upvotes INT, downvotes INT, created_at TIMESTAMPTZ) RETURNS DOUBLE PRECISION AS $$
DECLARE
  net_votes INT;
  hours_since_created DOUBLE PRECISION;
BEGIN
  net_votes := upvotes - downvotes;
  hours_since_created := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
  IF hours_since_created < 0 THEN hours_since_created := 0; END IF;
  RETURN net_votes::DOUBLE PRECISION / POWER(hours_since_created + 2, 1.5);
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.update_strategy_vote_counts() RETURNS TRIGGER AS $$
DECLARE
  strategy_row strategies%ROWTYPE;
  new_upvotes INT;
  new_downvotes INT;
  new_wilson_score DOUBLE PRECISION;
  new_trending_score DOUBLE PRECISION;
BEGIN
  SELECT * INTO strategy_row FROM strategies WHERE id = COALESCE(NEW.strategy_id, OLD.strategy_id);
  SELECT COUNT(*) FILTER (WHERE value = 1), COUNT(*) FILTER (WHERE value = -1) INTO new_upvotes, new_downvotes FROM strategy_votes WHERE strategy_id = strategy_row.id;
  new_wilson_score := calculate_wilson_score(new_upvotes, new_downvotes);
  new_trending_score := calculate_trending_score(new_upvotes, new_downvotes, strategy_row.created_at);
  UPDATE strategies SET upvotes = new_upvotes, downvotes = new_downvotes, wilson_score = new_wilson_score, trending_score = new_trending_score, updated_at = NOW() WHERE id = strategy_row.id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.update_author_verification() RETURNS TRIGGER AS $$
DECLARE
  author_id_to_check TEXT;
  has_100_upvote_strategy BOOLEAN;
BEGIN
  author_id_to_check := COALESCE(NEW.author_id, OLD.author_id);
  SELECT EXISTS(SELECT 1 FROM strategies WHERE author_id = author_id_to_check AND is_public = true AND upvotes >= 100) INTO has_100_upvote_strategy;
  INSERT INTO public_profiles (user_id, username, is_verified, verified_at) VALUES (author_id_to_check, COALESCE((SELECT username FROM public_profiles WHERE user_id = author_id_to_check), 'user_' || SUBSTRING(author_id_to_check, 1, 8)), has_100_upvote_strategy, CASE WHEN has_100_upvote_strategy AND NOT COALESCE((SELECT is_verified FROM public_profiles WHERE user_id = author_id_to_check), FALSE) THEN NOW() ELSE NULL END) ON CONFLICT (user_id) DO UPDATE SET is_verified = has_100_upvote_strategy, verified_at = CASE WHEN has_100_upvote_strategy AND public_profiles.is_verified = FALSE THEN NOW() ELSE public_profiles.verified_at END, updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.get_most_popular_creators(limit_count INT DEFAULT 10) RETURNS TABLE (user_id TEXT, username TEXT, is_verified BOOLEAN, strategy_count BIGINT, total_upvotes BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT pp.user_id, pp.username, pp.is_verified, COUNT(s.id)::BIGINT AS strategy_count, SUM(s.upvotes)::BIGINT AS total_upvotes FROM public_profiles pp INNER JOIN strategies s ON pp.user_id = s.author_id WHERE pp.is_verified = true AND s.is_public = true AND s.upvotes >= 100 GROUP BY pp.user_id, pp.username, pp.is_verified HAVING COUNT(s.id) >= 3 ORDER BY total_upvotes DESC, strategy_count DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, pg_temp;

CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, (xp / 100) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

CREATE FUNCTION public.add_user_xp(p_user_id TEXT, p_xp_amount INTEGER)
RETURNS TABLE(new_total_xp INTEGER, new_level INTEGER, level_changed BOOLEAN) AS $$
DECLARE
  old_level INTEGER;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN

  SELECT total_xp, current_level INTO v_new_total_xp, old_level
  FROM user_engagement_stats
  WHERE user_id = p_user_id;


  IF NOT FOUND THEN
    INSERT INTO user_engagement_stats (user_id, total_xp, current_level)
    VALUES (p_user_id, p_xp_amount, calculate_level(p_xp_amount))
    RETURNING total_xp, current_level INTO v_new_total_xp, v_new_level;

    RETURN QUERY SELECT v_new_total_xp, v_new_level, v_new_level > 1;
    RETURN;
  END IF;


  v_new_total_xp := v_new_total_xp + p_xp_amount;
  v_new_level := calculate_level(v_new_total_xp);

  UPDATE user_engagement_stats
  SET total_xp = v_new_total_xp,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_new_total_xp, v_new_level, v_new_level > old_level;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.update_user_streak(p_user_id TEXT)
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

  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_engagement_stats
  WHERE user_id = p_user_id;


  IF NOT FOUND THEN
    INSERT INTO user_engagement_stats (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING current_streak INTO v_new_streak;

    RETURN QUERY SELECT v_new_streak, FALSE, TRUE;
    RETURN;
  END IF;


  IF v_last_activity IS NULL THEN

    v_new_streak := 1;
  ELSIF v_last_activity = v_today THEN

    v_new_streak := v_current_streak;
  ELSIF v_last_activity = v_today - 1 THEN

    v_new_streak := v_current_streak + 1;
  ELSE

    v_new_streak := 1;
    v_streak_broken := v_current_streak > 0;
  END IF;


  IF v_new_streak > v_longest_streak THEN
    v_longest_streak := v_new_streak;
    v_is_new_record := TRUE;
  END IF;


  UPDATE user_engagement_stats
  SET current_streak = v_new_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_new_streak, v_streak_broken, v_is_new_record;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.update_flow_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.clean_expired_flow_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM flow_widget_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE FUNCTION public.calculate_next_retry_at(retry_count INTEGER)
RETURNS TIMESTAMPTZ AS $$
BEGIN

  CASE retry_count
    WHEN 0 THEN RETURN NOW() + INTERVAL '1 minute';
    WHEN 1 THEN RETURN NOW() + INTERVAL '5 minutes';
    WHEN 2 THEN RETURN NOW() + INTERVAL '15 minutes';
    WHEN 3 THEN RETURN NOW() + INTERVAL '1 hour';
    WHEN 4 THEN RETURN NOW() + INTERVAL '6 hours';
    ELSE RETURN NOW() + INTERVAL '24 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_connections_updated_at BEFORE UPDATE ON api_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER strategy_votes_update_counts AFTER INSERT OR UPDATE OR DELETE ON strategy_votes FOR EACH ROW EXECUTE FUNCTION update_strategy_vote_counts();

CREATE TRIGGER strategies_update_verification AFTER INSERT OR UPDATE OF upvotes ON strategies FOR EACH ROW WHEN (NEW.is_public = true) EXECUTE FUNCTION update_author_verification();

CREATE TRIGGER strategies_update_updated_at BEFORE UPDATE ON strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER strategy_votes_update_updated_at BEFORE UPDATE ON strategy_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER public_profiles_update_updated_at BEFORE UPDATE ON public_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER flow_widgets_update_updated_at
  BEFORE UPDATE ON flow_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_flow_widgets_updated_at();

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_retry_queue_updated_at BEFORE UPDATE ON webhook_retry_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE VIEW public.public_strategy_cards WITH (security_invoker = true) AS
SELECT
  s.id,
  s.title,
  s.summary,
  s.tags,
  s.created_at,
  s.upvotes,
  s.downvotes,
  s.wilson_score,
  s.trending_score,

  s.wilson_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_wilson_score,
  s.trending_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_trending_score,

  COALESCE(pp.username, 'user_' || SUBSTRING(s.author_id, 1, 8)) AS author_username,
  COALESCE(pp.is_verified, FALSE) AS author_is_verified,

  COALESCE(s.trade_count, 0) AS trade_count,
  COALESCE(s.total_pnl_usd, 0) AS total_pnl_usd,
  COALESCE(s.total_pnl_r, 0) AS total_pnl_r,
  COALESCE(s.win_rate, 0) AS win_rate,
  COALESCE(s.expectancy, 0) AS expectancy,
  COALESCE(s.profit_factor, 0) AS profit_factor
FROM strategies s
LEFT JOIN public_profiles pp ON s.author_id = pp.user_id
WHERE s.is_public = true;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.entitlements FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.entitlements TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.stripe_customers FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.stripe_customers FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.stripe_customers TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.stripe_customers FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;

ALTER TABLE public.api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.api_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.api_connections FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.api_connections TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.api_connections FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.trades FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.trades FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.trades TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.collections FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.collections FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.collections TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.daily_biases ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.daily_biases FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.daily_biases FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.daily_biases TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.daily_biases FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.quick_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.quick_journals FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.quick_journals FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.quick_journals TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.quick_journals FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.trade_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.trade_journals FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.trade_journals FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.trade_journals TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.trade_journals FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.weekly_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.weekly_reviews FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.weekly_reviews TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.weekly_reviews FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.risk_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.risk_rules FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.risk_rules TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.risk_rules FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.saved_filters FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.saved_filters FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.saved_filters TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.saved_filters FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.todos FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.todos FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.todos TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.rule_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.rule_violations FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.rule_violations FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.rule_violations TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.rule_violations FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.dashboard_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.dashboard_metrics FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.dashboard_metrics TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.dashboard_metrics FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.audit_log FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.audit_log TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.public_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.public_profiles TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.public_profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.strategies FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.strategies FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.strategies TO service_role;

ALTER TABLE public.strategy_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.strategy_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.strategy_votes FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.strategy_votes TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.strategy_votes FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_strategies FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_strategies FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_strategies TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_strategies FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_strategy_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_strategy_versions FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_strategy_versions TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_strategy_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_preferences FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_preferences TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.achievement_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.achievement_definitions FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.achievement_definitions TO service_role;

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_achievements FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_achievements FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_achievements TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_engagement_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_engagement_stats FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_engagement_stats TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_engagement_stats FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_insights FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_insights TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_insights FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.notification_preferences FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.notification_preferences TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.feedback_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.feedback_submissions FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.feedback_submissions TO service_role;



ALTER TABLE public.flow_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.flow_widgets FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.flow_widgets FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.flow_widgets TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.flow_widgets FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.flow_widget_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.flow_widget_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.flow_widget_cache FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.flow_widget_cache TO service_role;

ALTER TABLE public.flow_widget_refreshes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.flow_widget_refreshes FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.flow_widget_refreshes FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.flow_widget_refreshes TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.flow_widget_refreshes FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.user_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_api_keys FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_api_keys TO service_role;

CREATE TRIGGER prevent_owner_change BEFORE UPDATE ON public.user_api_keys FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_only ON public.webhook_retry_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.webhook_retry_queue FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.webhook_retry_queue TO service_role;

REVOKE ALL ON TABLE public.public_strategy_cards FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.public_strategy_cards TO service_role;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;
-- Secure future objects created by migration owner too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;





















INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('first_trade', 'First Blood', 'Log your first trade and begin your journey', 'target', 'milestone', 10, '{"type": "trade_count", "threshold": 1}', 'common', 1),
('ten_trades', 'Getting Started', 'Log 10 trades to build your data foundation', 'chart-bar', 'milestone', 25, '{"type": "trade_count", "threshold": 10}', 'common', 2),
('twenty_five_trades', 'Quarter Century', 'Log 25 trades - patterns are emerging', 'trending-up', 'milestone', 40, '{"type": "trade_count", "threshold": 25}', 'common', 3),
('fifty_trades', 'Committed Trader', 'Log 50 trades - you are serious about improvement', 'fire', 'milestone', 75, '{"type": "trade_count", "threshold": 50}', 'rare', 4),
('hundred_trades', 'Centurion', 'Log 100 trades - a true milestone', 'trophy', 'milestone', 150, '{"type": "trade_count", "threshold": 100}', 'rare', 5),
('two_fifty_trades', 'Dedicated', 'Log 250 trades - commitment personified', 'medal', 'milestone', 250, '{"type": "trade_count", "threshold": 250}', 'epic', 6),
('five_hundred_trades', 'Trading Veteran', 'Log 500 trades - you have seen it all', 'star', 'milestone', 400, '{"type": "trade_count", "threshold": 500}', 'epic', 7),
('thousand_trades', 'Trading Legend', 'Log 1000 trades - legendary status achieved', 'crown', 'milestone', 750, '{"type": "trade_count", "threshold": 1000}', 'legendary', 8);





INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('streak_3', 'Consistent', 'Maintain a 3-day activity streak', 'flame', 'streak', 15, '{"type": "streak", "threshold": 3}', 'common', 20),
('streak_5', 'Momentum', 'Maintain a 5-day activity streak', 'flame', 'streak', 25, '{"type": "streak", "threshold": 5}', 'common', 21),
('streak_7', 'Dedicated Week', 'Maintain a 7-day activity streak', 'flame', 'streak', 50, '{"type": "streak", "threshold": 7}', 'rare', 22),
('streak_14', 'Two Week Warrior', 'Maintain a 14-day activity streak', 'flame', 'streak', 100, '{"type": "streak", "threshold": 14}', 'rare', 23),
('streak_21', 'Habit Formed', 'Maintain a 21-day activity streak - it is now a habit', 'flame', 'streak', 150, '{"type": "streak", "threshold": 21}', 'epic', 24),
('streak_30', 'Iron Will', 'Maintain a 30-day activity streak', 'flame', 'streak', 200, '{"type": "streak", "threshold": 30}', 'epic', 25),
('streak_60', 'Unstoppable', 'Maintain a 60-day activity streak', 'flame', 'streak', 400, '{"type": "streak", "threshold": 60}', 'legendary', 26),
('streak_100', 'Centurion Streak', 'Maintain a 100-day activity streak', 'flame', 'streak', 750, '{"type": "streak", "threshold": 100}', 'legendary', 27);





INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('first_strategy', 'Strategist', 'Create your first trading strategy', 'lightbulb', 'skill', 20, '{"type": "strategy_count", "threshold": 1}', 'common', 40),
('five_strategies', 'Strategy Builder', 'Create 5 different strategies', 'puzzle', 'skill', 75, '{"type": "strategy_count", "threshold": 5}', 'rare', 41),
('first_journal', 'Reflective', 'Write your first journal entry', 'book-open', 'skill', 15, '{"type": "journal_count", "threshold": 1}', 'common', 42),
('ten_journals', 'Thoughtful Trader', 'Write 10 journal entries', 'book-open', 'skill', 50, '{"type": "journal_count", "threshold": 10}', 'rare', 43),
('fifty_journals', 'Journal Master', 'Write 50 journal entries', 'book-open', 'skill', 150, '{"type": "journal_count", "threshold": 50}', 'epic', 44),
('analyst', 'Data Analyst', 'View analytics 10 times', 'chart-pie', 'skill', 20, '{"type": "analytics_views", "threshold": 10}', 'common', 45),
('deep_analyst', 'Deep Diver', 'View analytics 50 times', 'magnifying-glass', 'skill', 75, '{"type": "analytics_views", "threshold": 50}', 'rare', 46),
('analytics_master', 'Analytics Master', 'View analytics 200 times', 'sparkles', 'skill', 200, '{"type": "analytics_views", "threshold": 200}', 'epic', 47),
('first_review', 'First Review', 'Complete your first weekly review', 'clipboard-check', 'skill', 25, '{"type": "review_count", "threshold": 1}', 'common', 48),
('monthly_reviewer', 'Monthly Reviewer', 'Complete 4 weekly reviews', 'clipboard-check', 'skill', 75, '{"type": "review_count", "threshold": 4}', 'rare', 49),
('quarterly_reviewer', 'Quarterly Reviewer', 'Complete 12 weekly reviews', 'clipboard-check', 'skill', 175, '{"type": "review_count", "threshold": 12}', 'epic', 50),
('risk_manager', 'Risk Manager', 'Set up your risk rules', 'shield-check', 'skill', 30, '{"type": "risk_rules_set", "threshold": 1}', 'common', 51),
('collection_creator', 'Organizer', 'Create your first trade collection', 'folder', 'skill', 20, '{"type": "collection_count", "threshold": 1}', 'common', 52),
('filter_saver', 'Efficiency Expert', 'Save your first filter preset', 'bookmark', 'skill', 15, '{"type": "saved_filter_count", "threshold": 1}', 'common', 53);





INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('night_owl', 'Night Owl', 'Log a trade after midnight (local time)', 'moon', 'special', 15, '{"type": "time_based", "condition": "after_midnight"}', 'common', 60),
('early_bird', 'Early Bird', 'Log a trade before 6am (local time)', 'sun', 'special', 15, '{"type": "time_based", "condition": "before_6am"}', 'common', 61),
('weekend_warrior', 'Weekend Warrior', 'Log activity on both Saturday and Sunday', 'calendar', 'special', 25, '{"type": "weekend_activity"}', 'common', 62),
('perfectionist', 'Perfectionist', 'Log 5 A-grade trades in a row', 'sparkles', 'special', 100, '{"type": "grade_streak", "grade": "A", "threshold": 5}', 'rare', 63),
('comeback_kid', 'Comeback Kid', 'Have a winning trade after 3 losses', 'arrow-trending-up', 'special', 50, '{"type": "comeback", "losses_before": 3}', 'rare', 64),
('diverse_trader', 'Diverse Trader', 'Trade 5 different instruments', 'squares-2x2', 'special', 40, '{"type": "instrument_diversity", "threshold": 5}', 'rare', 65),
('ten_instruments', 'Market Explorer', 'Trade 10 different instruments', 'globe', 'special', 100, '{"type": "instrument_diversity", "threshold": 10}', 'epic', 66),
('winning_week', 'Green Week', 'Have a profitable trading week', 'banknotes', 'special', 50, '{"type": "profitable_week"}', 'common', 67),
('winning_month', 'Green Month', 'Have a profitable trading month', 'banknotes', 'special', 150, '{"type": "profitable_month"}', 'rare', 68),
('win_streak_5', 'Hot Streak', 'Win 5 trades in a row', 'fire', 'special', 75, '{"type": "win_streak", "threshold": 5}', 'rare', 69),
('win_streak_10', 'On Fire', 'Win 10 trades in a row', 'fire', 'special', 200, '{"type": "win_streak", "threshold": 10}', 'epic', 70),
('disciplined_exit', 'Disciplined Exit', 'Exit a trade at your planned target 10 times', 'target', 'special', 75, '{"type": "planned_exit", "threshold": 10}', 'rare', 71),
('risk_reward_master', 'Risk-Reward Master', 'Achieve 3:1 or better R:R on 10 trades', 'scale', 'special', 100, '{"type": "risk_reward", "ratio": 3, "threshold": 10}', 'epic', 72),
('first_day', 'Day One', 'Complete your first day using TRDE', 'rocket', 'special', 10, '{"type": "first_day"}', 'common', 73),
('one_week', 'One Week Strong', 'Use TRDE for one week', 'calendar', 'special', 25, '{"type": "days_active", "threshold": 7}', 'common', 74),
('one_month', 'Monthly Member', 'Use TRDE for one month', 'calendar', 'special', 75, '{"type": "days_active", "threshold": 30}', 'rare', 75);




DO $$
DECLARE
  achievement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO achievement_count FROM achievement_definitions;
  RAISE NOTICE 'Seeded % achievement definitions', achievement_count;
END $$;
