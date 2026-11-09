-- ============================================
-- SEED ACHIEVEMENT DEFINITIONS
-- Migration: 20250203000001_seed_achievements.sql
-- 
-- Populates the achievement_definitions table with
-- all available achievements across categories:
-- - Milestone: Trade count achievements
-- - Streak: Consecutive day achievements
-- - Skill: Feature usage achievements
-- - Special: Time-based and pattern achievements
-- ============================================

-- Clear existing achievements (in case of re-run)
DELETE FROM achievement_definitions;

-- ============================================
-- MILESTONE ACHIEVEMENTS
-- Based on total trade count
-- ============================================
INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('first_trade', 'First Blood', 'Log your first trade and begin your journey', 'target', 'milestone', 10, '{"type": "trade_count", "threshold": 1}', 'common', 1),
('ten_trades', 'Getting Started', 'Log 10 trades to build your data foundation', 'chart-bar', 'milestone', 25, '{"type": "trade_count", "threshold": 10}', 'common', 2),
('twenty_five_trades', 'Quarter Century', 'Log 25 trades - patterns are emerging', 'trending-up', 'milestone', 40, '{"type": "trade_count", "threshold": 25}', 'common', 3),
('fifty_trades', 'Committed Trader', 'Log 50 trades - you are serious about improvement', 'fire', 'milestone', 75, '{"type": "trade_count", "threshold": 50}', 'rare', 4),
('hundred_trades', 'Centurion', 'Log 100 trades - a true milestone', 'trophy', 'milestone', 150, '{"type": "trade_count", "threshold": 100}', 'rare', 5),
('two_fifty_trades', 'Dedicated', 'Log 250 trades - commitment personified', 'medal', 'milestone', 250, '{"type": "trade_count", "threshold": 250}', 'epic', 6),
('five_hundred_trades', 'Trading Veteran', 'Log 500 trades - you have seen it all', 'star', 'milestone', 400, '{"type": "trade_count", "threshold": 500}', 'epic', 7),
('thousand_trades', 'Trading Legend', 'Log 1000 trades - legendary status achieved', 'crown', 'milestone', 750, '{"type": "trade_count", "threshold": 1000}', 'legendary', 8);

-- ============================================
-- STREAK ACHIEVEMENTS
-- Based on consecutive days of activity
-- ============================================
INSERT INTO achievement_definitions (id, name, description, icon, category, xp_reward, criteria, rarity, sort_order) VALUES
('streak_3', 'Consistent', 'Maintain a 3-day activity streak', 'flame', 'streak', 15, '{"type": "streak", "threshold": 3}', 'common', 20),
('streak_5', 'Momentum', 'Maintain a 5-day activity streak', 'flame', 'streak', 25, '{"type": "streak", "threshold": 5}', 'common', 21),
('streak_7', 'Dedicated Week', 'Maintain a 7-day activity streak', 'flame', 'streak', 50, '{"type": "streak", "threshold": 7}', 'rare', 22),
('streak_14', 'Two Week Warrior', 'Maintain a 14-day activity streak', 'flame', 'streak', 100, '{"type": "streak", "threshold": 14}', 'rare', 23),
('streak_21', 'Habit Formed', 'Maintain a 21-day activity streak - it is now a habit', 'flame', 'streak', 150, '{"type": "streak", "threshold": 21}', 'epic', 24),
('streak_30', 'Iron Will', 'Maintain a 30-day activity streak', 'flame', 'streak', 200, '{"type": "streak", "threshold": 30}', 'epic', 25),
('streak_60', 'Unstoppable', 'Maintain a 60-day activity streak', 'flame', 'streak', 400, '{"type": "streak", "threshold": 60}', 'legendary', 26),
('streak_100', 'Centurion Streak', 'Maintain a 100-day activity streak', 'flame', 'streak', 750, '{"type": "streak", "threshold": 100}', 'legendary', 27);

-- ============================================
-- SKILL ACHIEVEMENTS
-- Based on feature usage and mastery
-- ============================================
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

-- ============================================
-- SPECIAL ACHIEVEMENTS
-- Based on specific patterns or timing
-- ============================================
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

-- ============================================
-- VERIFY SEEDING
-- ============================================
DO $$
DECLARE
  achievement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO achievement_count FROM achievement_definitions;
  RAISE NOTICE 'Seeded % achievement definitions', achievement_count;
END $$;
