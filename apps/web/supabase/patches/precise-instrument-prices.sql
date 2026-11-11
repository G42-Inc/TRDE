-- Preserve sub-cent prices and tick sizes for FX, energy, rates and options.
ALTER TABLE public.trades
  ALTER COLUMN entry_price TYPE NUMERIC(20, 8),
  ALTER COLUMN exit_price TYPE NUMERIC(20, 8),
  ALTER COLUMN tick_size TYPE NUMERIC(20, 8),
  ALTER COLUMN tick_value_usd TYPE NUMERIC(20, 8),
  ALTER COLUMN points_pnl TYPE NUMERIC(20, 8),
  ALTER COLUMN ticks_pnl TYPE NUMERIC(20, 8),
  ALTER COLUMN strike TYPE NUMERIC(20, 8),
  ALTER COLUMN entry_premium TYPE NUMERIC(20, 8),
  ALTER COLUMN exit_premium TYPE NUMERIC(20, 8);
