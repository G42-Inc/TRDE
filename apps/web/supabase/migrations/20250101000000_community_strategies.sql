-- Community Strategies Migration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are publicly readable" ON public_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own public profile" ON public_profiles FOR UPDATE USING (true);
CREATE POLICY "Service role has full access to public_profiles" ON public_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS strategies (
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
);

CREATE INDEX IF NOT EXISTS idx_strategies_author_id ON strategies(author_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_public ON strategies(is_public);
CREATE INDEX IF NOT EXISTS idx_strategies_wilson_score ON strategies(wilson_score DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_strategies_trending_score ON strategies(trending_score DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON strategies(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_strategies_tags ON strategies USING GIN(tags) WHERE is_public = true;

ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public strategies are publicly readable" ON strategies FOR SELECT USING (is_public = true OR author_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can create their own strategies" ON strategies FOR INSERT WITH CHECK (author_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can update their own strategies" ON strategies FOR UPDATE USING (author_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can delete their own strategies" ON strategies FOR DELETE USING (author_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Service role has full access to strategies" ON strategies FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS strategy_votes (
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (strategy_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_strategy_votes_user_id ON strategy_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_votes_strategy_id ON strategy_votes(strategy_id);

ALTER TABLE strategy_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own votes" ON strategy_votes FOR SELECT USING (user_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can insert their own votes" ON strategy_votes FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can update their own votes" ON strategy_votes FOR UPDATE USING (user_id = current_setting('app.current_user_id', TRUE)) WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Users can delete their own votes" ON strategy_votes FOR DELETE USING (user_id = current_setting('app.current_user_id', TRUE));
CREATE POLICY "Service role has full access to strategy_votes" ON strategy_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION calculate_wilson_score(upvotes INT, downvotes INT) RETURNS DOUBLE PRECISION AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_trending_score(upvotes INT, downvotes INT, created_at TIMESTAMPTZ) RETURNS DOUBLE PRECISION AS $$
DECLARE
  net_votes INT;
  hours_since_created DOUBLE PRECISION;
BEGIN
  net_votes := upvotes - downvotes;
  hours_since_created := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
  IF hours_since_created < 0 THEN hours_since_created := 0; END IF;
  RETURN net_votes::DOUBLE PRECISION / POWER(hours_since_created + 2, 1.5);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_strategy_vote_counts() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER strategy_votes_update_counts AFTER INSERT OR UPDATE OR DELETE ON strategy_votes FOR EACH ROW EXECUTE FUNCTION update_strategy_vote_counts();

CREATE OR REPLACE FUNCTION update_author_verification() RETURNS TRIGGER AS $$
DECLARE
  author_id_to_check TEXT;
  has_100_upvote_strategy BOOLEAN;
BEGIN
  author_id_to_check := COALESCE(NEW.author_id, OLD.author_id);
  SELECT EXISTS(SELECT 1 FROM strategies WHERE author_id = author_id_to_check AND is_public = true AND upvotes >= 100) INTO has_100_upvote_strategy;
  INSERT INTO public_profiles (user_id, username, is_verified, verified_at) VALUES (author_id_to_check, COALESCE((SELECT username FROM public_profiles WHERE user_id = author_id_to_check), 'user_' || SUBSTRING(author_id_to_check, 1, 8)), has_100_upvote_strategy, CASE WHEN has_100_upvote_strategy AND NOT COALESCE((SELECT is_verified FROM public_profiles WHERE user_id = author_id_to_check), FALSE) THEN NOW() ELSE NULL END) ON CONFLICT (user_id) DO UPDATE SET is_verified = has_100_upvote_strategy, verified_at = CASE WHEN has_100_upvote_strategy AND public_profiles.is_verified = FALSE THEN NOW() ELSE public_profiles.verified_at END, updated_at = NOW();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER strategies_update_verification AFTER INSERT OR UPDATE OF upvotes ON strategies FOR EACH ROW WHEN (NEW.is_public = true) EXECUTE FUNCTION update_author_verification();

CREATE OR REPLACE VIEW public_strategy_cards AS
SELECT s.id, s.title, s.summary, s.tags, s.created_at, s.upvotes, s.downvotes, s.wilson_score, s.trending_score, s.wilson_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_wilson_score, s.trending_score * CASE WHEN pp.is_verified THEN 1.08 ELSE 1.0 END AS adjusted_trending_score, COALESCE(pp.username, 'user_' || SUBSTRING(s.author_id, 1, 8)) AS author_username, COALESCE(pp.is_verified, FALSE) AS author_is_verified FROM strategies s LEFT JOIN public_profiles pp ON s.author_id = pp.user_id WHERE s.is_public = true;

CREATE OR REPLACE FUNCTION get_most_popular_creators(limit_count INT DEFAULT 10) RETURNS TABLE (user_id TEXT, username TEXT, is_verified BOOLEAN, strategy_count BIGINT, total_upvotes BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT pp.user_id, pp.username, pp.is_verified, COUNT(s.id)::BIGINT AS strategy_count, SUM(s.upvotes)::BIGINT AS total_upvotes FROM public_profiles pp INNER JOIN strategies s ON pp.user_id = s.author_id WHERE pp.is_verified = true AND s.is_public = true AND s.upvotes >= 100 GROUP BY pp.user_id, pp.username, pp.is_verified HAVING COUNT(s.id) >= 3 ORDER BY total_upvotes DESC, strategy_count DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER strategies_update_updated_at BEFORE UPDATE ON strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER strategy_votes_update_updated_at BEFORE UPDATE ON strategy_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER public_profiles_update_updated_at BEFORE UPDATE ON public_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
