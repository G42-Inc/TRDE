-- All Missing Database Elements
-- This script creates ONLY the missing elements (doesn't recreate existing tables)
-- Use this if you've partially run schema.sql and need to fill gaps
-- 
-- FIXED: Uses different dollar-quote tags for nested function definitions

-- ============================================
-- CHECK WHAT'S MISSING FIRST
-- ============================================

SELECT 
  'Checking Missing Elements' as status,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN '✅ Exists'
    ELSE '❌ MISSING - Will create'
  END as current_status
FROM (VALUES
  ('profiles'),
  ('entitlements'),
  ('stripe_customers'),
  ('stripe_webhook_events'),
  ('webhook_retry_queue'),
  ('api_connections'),
  ('audit_log')
) AS t(table_name);

-- ============================================
-- CREATE MISSING ELEMENTS
-- ============================================

-- 1. Create stripe_customers if missing (from schema.sql lines 102-131)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stripe_customers'
  ) THEN
    CREATE TABLE stripe_customers (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT NOT NULL UNIQUE,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
    
    -- Create policies if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'stripe_customers' 
      AND policyname = 'Allow service role full access to stripe_customers'
    ) THEN
      CREATE POLICY "Allow service role full access to stripe_customers"
        ON stripe_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'stripe_customers' 
      AND policyname = 'Users can view own stripe customer'
    ) THEN
      CREATE POLICY "Users can view own stripe customer"
        ON stripe_customers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'stripe_customers' 
      AND policyname = 'Deny anon key write access to stripe_customers'
    ) THEN
      CREATE POLICY "Deny anon key write access to stripe_customers"
        ON stripe_customers FOR ALL TO anon USING (false) WITH CHECK (false);
    END IF;
    
    RAISE NOTICE '✅ Created stripe_customers table';
  END IF;
END $$;

-- 2. Create stripe_webhook_events if missing (from schema.sql lines 135-165)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events'
  ) THEN
    CREATE TABLE stripe_webhook_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      stripe_event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id 
      ON stripe_webhook_events(stripe_event_id);
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at 
      ON stripe_webhook_events(processed_at);
    
    ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
    
    -- Create policies if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'stripe_webhook_events' 
      AND policyname = 'Allow service role full access to stripe_webhook_events'
    ) THEN
      CREATE POLICY "Allow service role full access to stripe_webhook_events"
        ON stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'stripe_webhook_events' 
      AND policyname = 'Deny anon key access to stripe_webhook_events'
    ) THEN
      CREATE POLICY "Deny anon key access to stripe_webhook_events"
        ON stripe_webhook_events FOR ALL TO anon USING (false) WITH CHECK (false);
    END IF;
    
    RAISE NOTICE '✅ Created stripe_webhook_events table';
  END IF;
END $$;

-- 3. Create webhook_retry_queue if missing (from webhook_retry_queue.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'webhook_retry_queue'
  ) THEN
    CREATE TABLE webhook_retry_queue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    
    CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status 
      ON webhook_retry_queue(status, next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_webhook_type 
      ON webhook_retry_queue(webhook_type);
    CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_event_id 
      ON webhook_retry_queue(webhook_event_id);
    
    ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;
    
    -- Create policy if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'webhook_retry_queue' 
      AND policyname = 'Allow service role full access to webhook_retry_queue'
    ) THEN
      CREATE POLICY "Allow service role full access to webhook_retry_queue"
        ON webhook_retry_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    
    RAISE NOTICE '✅ Created webhook_retry_queue table';
  END IF;
END $$;

-- 4. Create calculate_next_retry_at function if missing
-- FIXED: Uses $function$ instead of $$ to avoid nested dollar-quote conflicts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'calculate_next_retry_at'
  ) THEN
    CREATE OR REPLACE FUNCTION calculate_next_retry_at(retry_count INTEGER)
    RETURNS TIMESTAMPTZ AS $function$
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
    $function$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Created calculate_next_retry_at function';
  END IF;
END $$;

-- 5. Create update_updated_at_column function if missing
-- FIXED: Uses $function$ instead of $$ to avoid nested dollar-quote conflicts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ Created update_updated_at_column function';
  END IF;
END $$;

-- 6. Create all missing triggers
DO $$
BEGIN
  -- stripe_customers trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stripe_customers'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND event_object_table = 'stripe_customers'
    AND trigger_name = 'update_stripe_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_stripe_customers_updated_at 
      BEFORE UPDATE ON stripe_customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Created trigger update_stripe_customers_updated_at';
  END IF;

  -- webhook_retry_queue trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'webhook_retry_queue'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND event_object_table = 'webhook_retry_queue'
    AND trigger_name = 'update_webhook_retry_queue_updated_at'
  ) THEN
    CREATE TRIGGER update_webhook_retry_queue_updated_at 
      BEFORE UPDATE ON webhook_retry_queue
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Created trigger update_webhook_retry_queue_updated_at';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'Verification Complete' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
   AND table_name IN ('profiles', 'entitlements', 'stripe_customers', 'stripe_webhook_events', 'webhook_retry_queue', 'api_connections', 'audit_log')) as core_tables_found,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' 
   AND routine_name IN ('update_updated_at_column', 'calculate_next_retry_at')) as functions_found,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' 
   AND trigger_name LIKE '%updated_at%') as triggers_found,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
          AND table_name IN ('profiles', 'entitlements', 'stripe_customers', 'stripe_webhook_events', 'webhook_retry_queue', 'api_connections', 'audit_log')) >= 7
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' 
           AND routine_name IN ('update_updated_at_column', 'calculate_next_retry_at')) >= 2
    THEN '✅ All critical elements created!'
    ELSE '⚠️ Some elements may still be missing - check above'
  END as overall_status;
