-- User Strategies Tables (Personal/Private)
-- Separate from community strategies - these are user's personal strategies that sync to mobile
-- Run this in Supabase SQL Editor

-- ============================================
-- USER STRATEGIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE user_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_strategies"
  ON user_strategies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own user_strategies"
  ON user_strategies FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id ON user_strategies(user_id);

-- ============================================
-- USER STRATEGY VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_strategy_versions (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES user_strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE user_strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to user_strategy_versions"
  ON user_strategy_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own user_strategy_versions"
  ON user_strategy_versions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_strategy_versions_user_id ON user_strategy_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strategy_versions_strategy_id ON user_strategy_versions(strategy_id);
