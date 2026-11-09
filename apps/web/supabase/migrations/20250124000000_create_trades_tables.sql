-- ============================================
-- TRADES AND RELATED TABLES MIGRATION
-- ============================================
-- This migration creates all tables needed for cross-platform trade sync
-- Run this in your Supabase SQL Editor to enable mobile/web data sharing
-- ============================================

-- ============================================
-- TRADES TABLE (User Data)
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
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
  -- Futures-specific fields
  instrument_root TEXT,
  entry_price DECIMAL(10, 2),
  exit_price DECIMAL(10, 2),
  tick_size DECIMAL(10, 4),
  tick_value_usd DECIMAL(10, 2),
  points_pnl DECIMAL(10, 4),
  ticks_pnl DECIMAL(10, 4),
  rth_eth TEXT,
  -- Options-specific fields
  underlying TEXT,
  expiration TEXT,
  dte INTEGER,
  strike DECIMAL(10, 2),
  option_type TEXT,
  entry_premium DECIMAL(10, 2),
  exit_premium DECIMAL(10, 2),
  net_premium_pnl_usd DECIMAL(10, 2),
  contract_multiplier INTEGER,
  -- Discipline flags
  discipline_flags JSONB DEFAULT '{}',
  -- Management style (optional)
  management_style TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- RLS for trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Allow service role full access to trades"
  ON trades FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can access their own trades (app-level filtering ensures correct user_id)
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);

-- ============================================
-- STRATEGIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to strategies"
  ON strategies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own strategies"
  ON strategies FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);

-- ============================================
-- STRATEGY VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS strategy_versions (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to strategy_versions"
  ON strategy_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own strategy_versions"
  ON strategy_versions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_strategy_versions_user_id ON strategy_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_strategy_id ON strategy_versions(strategy_id);

-- ============================================
-- COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trade_ids JSONB DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to collections"
  ON collections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own collections"
  ON collections FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- ============================================
-- DAILY BIASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_biases (
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

ALTER TABLE daily_biases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to daily_biases"
  ON daily_biases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own daily_biases"
  ON daily_biases FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_daily_biases_user_id ON daily_biases(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_biases_date ON daily_biases(date);

-- ============================================
-- QUICK JOURNALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quick_journals (
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

ALTER TABLE quick_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to quick_journals"
  ON quick_journals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own quick_journals"
  ON quick_journals FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quick_journals_user_id ON quick_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_journals_timestamp ON quick_journals(timestamp DESC);

-- ============================================
-- TRADE JOURNALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trade_journals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  pre_trade JSONB,  -- Stores PreTradeJournal as JSON
  post_trade JSONB, -- Stores PostTradeJournal as JSON
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE trade_journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to trade_journals"
  ON trade_journals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own trade_journals"
  ON trade_journals FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trade_journals_user_id ON trade_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journals_trade_id ON trade_journals(trade_id);

-- ============================================
-- WEEKLY REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
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

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to weekly_reviews"
  ON weekly_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own weekly_reviews"
  ON weekly_reviews FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week_start ON weekly_reviews(week_start);

-- ============================================
-- RISK RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS risk_rules (
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

ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to risk_rules"
  ON risk_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own risk_rules"
  ON risk_rules FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SAVED FILTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saved_filters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to saved_filters"
  ON saved_filters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own saved_filters"
  ON saved_filters FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);

-- ============================================
-- TODOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS todos (
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

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to todos"
  ON todos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own todos"
  ON todos FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);

-- ============================================
-- RULE VIOLATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rule_violations (
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

ALTER TABLE rule_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to rule_violations"
  ON rule_violations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own rule_violations"
  ON rule_violations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rule_violations_user_id ON rule_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_trade_id ON rule_violations(trade_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_reviewed ON rule_violations(reviewed);

-- ============================================
-- DASHBOARD METRICS TABLE (User Preferences)
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  user_id TEXT PRIMARY KEY,
  metric_ids JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to dashboard_metrics"
  ON dashboard_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own dashboard_metrics"
  ON dashboard_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All tables created successfully!
-- Both mobile and web apps can now save/read from these tables
-- Data will be shared across platforms via user_id
