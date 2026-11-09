-- Add statistics columns to strategies table
-- These will store cached statistics calculated from the author's trades

ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS trade_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pnl_usd DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pnl_r DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS win_rate DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS expectancy DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_factor DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMPTZ;

-- Create index for stats queries
CREATE INDEX IF NOT EXISTS idx_strategies_stats ON strategies(total_pnl_r DESC, win_rate DESC) WHERE is_public = true;

-- Function to calculate strategy statistics from trades
CREATE OR REPLACE FUNCTION calculate_strategy_stats(strategy_uuid UUID)
RETURNS TABLE (
  trade_count BIGINT,
  total_pnl_usd DOUBLE PRECISION,
  total_pnl_r DOUBLE PRECISION,
  win_rate DOUBLE PRECISION,
  expectancy DOUBLE PRECISION,
  profit_factor DOUBLE PRECISION
) AS $$
DECLARE
  win_count BIGINT;
  loss_count BIGINT;
  gross_profit DOUBLE PRECISION;
  gross_loss DOUBLE PRECISION;
BEGIN
  -- Count trades and calculate basic stats
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(result_usd), 0),
    COALESCE(SUM(result_r), 0),
    COUNT(*) FILTER (WHERE outcome = 'WIN')::BIGINT,
    COUNT(*) FILTER (WHERE outcome = 'LOSS')::BIGINT,
    COALESCE(SUM(result_usd) FILTER (WHERE result_usd > 0), 0),
    COALESCE(ABS(SUM(result_usd) FILTER (WHERE result_usd < 0)), 0)
  INTO 
    trade_count,
    total_pnl_usd,
    total_pnl_r,
    win_count,
    loss_count,
    gross_profit,
    gross_loss
  FROM trades
  WHERE strategy_id = strategy_uuid::TEXT;
  
  -- Calculate win rate
  IF trade_count > 0 THEN
    win_rate := (win_count::DOUBLE PRECISION / trade_count) * 100;
  ELSE
    win_rate := 0;
  END IF;
  
  -- Calculate expectancy (average R per trade)
  IF trade_count > 0 THEN
    expectancy := total_pnl_r / trade_count;
  ELSE
    expectancy := 0;
  END IF;
  
  -- Calculate profit factor
  IF gross_loss > 0 THEN
    profit_factor := gross_profit / gross_loss;
  ELSIF gross_profit > 0 THEN
    profit_factor := 999999.0; -- Infinite (or very large)
  ELSE
    profit_factor := 0;
  END IF;
  
  RETURN QUERY SELECT trade_count, total_pnl_usd, total_pnl_r, win_rate, expectancy, profit_factor;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update strategy statistics for all strategies
CREATE OR REPLACE FUNCTION update_strategy_statistics()
RETURNS void AS $$
DECLARE
  strategy_rec RECORD;
  stats RECORD;
BEGIN
  -- Update stats for all strategies that have trades
  FOR strategy_rec IN 
    SELECT DISTINCT s.id, s.author_id
    FROM strategies s
    INNER JOIN trades t ON t.strategy_id = s.id::TEXT
    WHERE s.is_public = true
  LOOP
    SELECT * INTO stats FROM calculate_strategy_stats(strategy_rec.id);
    
    UPDATE strategies
    SET 
      trade_count = stats.trade_count,
      total_pnl_usd = stats.total_pnl_usd,
      total_pnl_r = stats.total_pnl_r,
      win_rate = stats.win_rate,
      expectancy = stats.expectancy,
      profit_factor = stats.profit_factor,
      stats_updated_at = NOW()
    WHERE id = strategy_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the public_strategy_cards view to include statistics
DROP VIEW IF EXISTS public_strategy_cards;

CREATE OR REPLACE VIEW public_strategy_cards AS
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
  -- Apply verified boost (1.08x multiplier) to scores
  s.wilson_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_wilson_score,
  s.trending_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_trending_score,
  -- Author info (public-safe only)
  COALESCE(pp.username, 'user_' || SUBSTRING(s.author_id, 1, 8)) AS author_username,
  COALESCE(pp.is_verified, FALSE) AS author_is_verified,
  -- Statistics from author's trades
  COALESCE(s.trade_count, 0) AS trade_count,
  COALESCE(s.total_pnl_usd, 0) AS total_pnl_usd,
  COALESCE(s.total_pnl_r, 0) AS total_pnl_r,
  COALESCE(s.win_rate, 0) AS win_rate,
  COALESCE(s.expectancy, 0) AS expectancy,
  COALESCE(s.profit_factor, 0) AS profit_factor
FROM strategies s
LEFT JOIN public_profiles pp ON s.author_id = pp.user_id
WHERE s.is_public = true;
