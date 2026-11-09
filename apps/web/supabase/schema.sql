-- TRDE Production Database Schema
-- Run this in Supabase SQL Editor to set up tables and RLS
-- 
-- NOTE: This schema is designed for Clerk authentication (not Supabase Auth)
-- All access control is handled at the application level using service role
-- RLS is enabled but policies are permissive since Clerk user IDs are stored as TEXT

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Since we use Clerk (not Supabase Auth), auth.uid() won't work
-- Service role bypasses RLS, and we handle access control in application code
-- These policies are permissive but RLS is enabled for defense-in-depth
CREATE POLICY "Allow service role full access to profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own profile (if using Supabase Auth in future)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (true); -- Permissive since Clerk handles auth at app level

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (true); -- Permissive since Clerk handles auth at app level

-- ============================================
-- ENTITLEMENTS TABLE (Paywall Source of Truth)
-- ============================================
CREATE TABLE IF NOT EXISTS entitlements (
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

-- RLS for entitlements
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhooks and admin API)
CREATE POLICY "Allow service role full access to entitlements"
  ON entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own entitlement (app-level filtering ensures correct user_id)
-- Note: This is permissive because Clerk handles auth, but we still want to allow
-- users to check their own entitlement status via anon key if needed
CREATE POLICY "Users can view own entitlement"
  ON entitlements FOR SELECT
  TO anon
  USING (true); -- Permissive - app code filters by user_id

-- Explicitly deny write access via anon key
CREATE POLICY "Deny anon key write access to entitlements"
  ON entitlements FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "Deny anon key update access to entitlements"
  ON entitlements FOR UPDATE
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon key delete access to entitlements"
  ON entitlements FOR DELETE
  TO anon
  USING (false);

-- No UPDATE/INSERT policies for authenticated role - only service role can write
-- This ensures entitlements are only modified via webhooks or admin API

-- ============================================
-- STRIPE CUSTOMERS TABLE (Customer Mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT PRIMARY KEY, -- Clerk user ID
  stripe_customer_id TEXT NOT NULL UNIQUE, -- Stripe customer ID
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Allow service role full access to stripe_customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own customer mapping (app-level filtering ensures correct user_id)
CREATE POLICY "Users can view own stripe customer"
  ON stripe_customers FOR SELECT
  USING (true); -- Permissive - app code filters by user_id

-- Deny write access via anon key
CREATE POLICY "Deny anon key write access to stripe_customers"
  ON stripe_customers FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================
-- STRIPE WEBHOOK EVENTS TABLE (Idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id 
  ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at 
  ON stripe_webhook_events(processed_at);

-- RLS for stripe_webhook_events (service role only)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Allow service role full access to stripe_webhook_events"
  ON stripe_webhook_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all access via anon key
CREATE POLICY "Deny anon key access to stripe_webhook_events"
  ON stripe_webhook_events FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================
-- API CONNECTIONS TABLE (Token Vault - Server Only)
-- ============================================
CREATE TABLE IF NOT EXISTS api_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'projectx', etc.
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('connected', 'expired', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS for api_connections - DENY all user access
ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for server-side operations only)
CREATE POLICY "Allow service role full access to api_connections"
  ON api_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny all access via anon key (defense-in-depth)
-- This ensures even if code accidentally uses anon key, tokens are protected
CREATE POLICY "Deny all anon key access to api_connections"
  ON api_connections FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Explicitly deny all access via authenticated role (if Supabase Auth is ever used)
CREATE POLICY "Deny all authenticated role access to api_connections"
  ON api_connections FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Note: Service role key bypasses RLS entirely, so these policies don't affect server operations
-- These policies are for defense-in-depth in case anon key is accidentally used

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
  USING (true); -- Permissive - app code filters by user_id

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (true); -- App code ensures correct user_id

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  USING (true); -- App code ensures correct user_id

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  USING (true); -- App code ensures correct user_id

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

-- RLS for strategies
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

-- RLS for strategy_versions
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

-- RLS for collections
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

-- RLS for daily_biases
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
  stress_level INTEGER, -- 1-10
  sleep_quality INTEGER, -- 1-10
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- RLS for quick_journals
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

-- ============================================
-- TRADE JOURNALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trade_journals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  -- Pre-trade journal fields
  pre_thesis TEXT,
  pre_invalidation TEXT,
  pre_confidence INTEGER,
  pre_mood_label TEXT,
  pre_mood_intensity INTEGER,
  pre_checklist_stop_planned BOOLEAN,
  pre_checklist_size_within_rules BOOLEAN,
  pre_checklist_entry_matches_strategy BOOLEAN,
  pre_checklist_news_checked BOOLEAN,
  -- Post-trade journal fields
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
);

-- RLS for trade_journals
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

-- ============================================
-- WEEKLY REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL, -- YYYY-MM-DD
  week_end TEXT NOT NULL, -- YYYY-MM-DD
  summary TEXT,
  wins JSONB DEFAULT '[]', -- Array of strings
  losses JSONB DEFAULT '[]', -- Array of strings
  improvements JSONB DEFAULT '[]', -- Array of strings
  next_week_plan TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, week_start, week_end)
);

-- RLS for weekly_reviews
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

-- ============================================
-- RISK RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS risk_rules (
  user_id TEXT PRIMARY KEY, -- One risk rules config per user
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

-- RLS for risk_rules
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
  filters JSONB NOT NULL DEFAULT '{}', -- TradeFilters object
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- RLS for saved_filters
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
  due_date TEXT, -- YYYY-MM-DD
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- RLS for todos
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

-- ============================================
-- RULE VIOLATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rule_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  violated_rules JSONB NOT NULL DEFAULT '[]', -- Array of rule names
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  review_notes TEXT,
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- RLS for rule_violations
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

-- ============================================
-- DASHBOARD METRICS TABLE (User Preferences)
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  user_id TEXT PRIMARY KEY,
  metric_ids JSONB NOT NULL DEFAULT '[]', -- Array of metric IDs user wants to display
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- RLS for dashboard_metrics
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
-- AUDIT LOG TABLE (Admin Actions)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for server-side logging only)
CREATE POLICY "Allow service role full access to audit_log"
  ON audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny all access via anon key (defense-in-depth)
CREATE POLICY "Deny all anon key access to audit_log"
  ON audit_log FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Explicitly deny all access via authenticated role
CREATE POLICY "Deny all authenticated role access to audit_log"
  ON audit_log FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Note: Admin access is checked via Clerk metadata, not RLS
-- This table is primarily for server-side logging
-- Only service role can access this table

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_api_connections_user_id ON api_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_strategy_id ON strategy_versions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_user_id ON strategy_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_biases_user_id ON daily_biases(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_biases_date ON daily_biases(date);
CREATE INDEX IF NOT EXISTS idx_quick_journals_user_id ON quick_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_journals_timestamp ON quick_journals(timestamp);
CREATE INDEX IF NOT EXISTS idx_trade_journals_user_id ON trade_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journals_trade_id ON trade_journals(trade_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(user_id, week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_rule_violations_user_id ON rule_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_trade_id ON rule_violations(trade_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_reviewed ON rule_violations(user_id, reviewed);

-- ============================================
-- FUNCTIONS
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_connections_updated_at BEFORE UPDATE ON api_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Other tables use BIGINT timestamps (created_at/updated_at) managed in application code
-- Only tables with TIMESTAMPTZ use the trigger function

-- ============================================
-- WEBHOOK RETRY QUEUE
-- ============================================
-- See webhook_retry_queue.sql for table definition and setup
-- This is included in a separate file for easier management
