-- Flow Widgets Migration
-- Supports customizable dashboard with AlphaVantage-powered widgets

-- Flow Widget Configurations Table
-- Stores user's dashboard widget layout and preferences
CREATE TABLE IF NOT EXISTS flow_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  widget_type TEXT NOT NULL, -- FUTURES_SNAPSHOT, INDEX_SNAPSHOT, INTRADAY_SERIES, SESSION_LEVELS, VOLATILITY_RANGE, FLOW_FEED
  symbol TEXT NOT NULL, -- e.g., "SPY", "QQQ", "AAPL"
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1, -- grid units (1-4)
  height INTEGER NOT NULL DEFAULT 1, -- grid units (1-4)
  config JSONB DEFAULT '{}'::jsonb, -- widget-specific config (interval, time_period, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_widget UNIQUE (user_id, widget_type, symbol)
);

CREATE INDEX IF NOT EXISTS idx_flow_widgets_user_id ON flow_widgets(user_id);

-- Flow Widget Cache Table
-- Shared cache for AlphaVantage responses (300s TTL)
CREATE TABLE IF NOT EXISTS flow_widget_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- {widgetType}:{symbol}:{interval}
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flow_widget_cache_key ON flow_widget_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_flow_widget_cache_expires ON flow_widget_cache(expires_at);

-- Flow Widget Refresh Cooldown Table
-- Per-user cooldown tracking (300s per widget)
CREATE TABLE IF NOT EXISTS flow_widget_refreshes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  widget_key TEXT NOT NULL, -- {widgetType}:{symbol}
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_refresh_at TIMESTAMPTZ NOT NULL, -- refreshed_at + 300s
  CONSTRAINT unique_user_widget_refresh UNIQUE (user_id, widget_key)
);

CREATE INDEX IF NOT EXISTS idx_flow_widget_refreshes_user ON flow_widget_refreshes(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_widget_refreshes_next_refresh ON flow_widget_refreshes(next_refresh_at);

-- Enable RLS
ALTER TABLE flow_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_widget_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_widget_refreshes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flow_widgets
-- Users can only access their own widgets
DROP POLICY IF EXISTS "Users can view own widgets" ON flow_widgets;
CREATE POLICY "Users can view own widgets" ON flow_widgets
  FOR SELECT USING (true); -- Service role handles user_id filtering

DROP POLICY IF EXISTS "Users can create own widgets" ON flow_widgets;
CREATE POLICY "Users can create own widgets" ON flow_widgets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own widgets" ON flow_widgets;
CREATE POLICY "Users can update own widgets" ON flow_widgets
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own widgets" ON flow_widgets;
CREATE POLICY "Users can delete own widgets" ON flow_widgets
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Service role full access flow_widgets" ON flow_widgets;
CREATE POLICY "Service role full access flow_widgets" ON flow_widgets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for flow_widget_cache
-- Cache is shared across users (read by all, write by service role)
DROP POLICY IF EXISTS "Anyone can read cache" ON flow_widget_cache;
CREATE POLICY "Anyone can read cache" ON flow_widget_cache
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access cache" ON flow_widget_cache;
CREATE POLICY "Service role full access cache" ON flow_widget_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for flow_widget_refreshes
-- Users can only access their own refresh records
DROP POLICY IF EXISTS "Users can view own refreshes" ON flow_widget_refreshes;
CREATE POLICY "Users can view own refreshes" ON flow_widget_refreshes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access refreshes" ON flow_widget_refreshes;
CREATE POLICY "Service role full access refreshes" ON flow_widget_refreshes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flow_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS flow_widgets_update_updated_at ON flow_widgets;
CREATE TRIGGER flow_widgets_update_updated_at
  BEFORE UPDATE ON flow_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_flow_widgets_updated_at();

-- Function to clean expired cache (can be called periodically)
CREATE OR REPLACE FUNCTION clean_expired_flow_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM flow_widget_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
