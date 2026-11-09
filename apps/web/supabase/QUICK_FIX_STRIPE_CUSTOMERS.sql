-- Quick Fix: Create stripe_customers table if missing
-- Run this if you get "relation stripe_customers does not exist" error

-- Check and create extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create stripe_customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT PRIMARY KEY, -- Clerk user ID
  stripe_customer_id TEXT NOT NULL UNIQUE, -- Stripe customer ID
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Service role has full access (create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_customers' 
    AND policyname = 'Allow service role full access to stripe_customers'
  ) THEN
    CREATE POLICY "Allow service role full access to stripe_customers"
      ON stripe_customers FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Users can read their own customer mapping (create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_customers' 
    AND policyname = 'Users can view own stripe customer'
  ) THEN
    CREATE POLICY "Users can view own stripe customer"
      ON stripe_customers FOR SELECT
      USING (true);
  END IF;
END $$;

-- Deny write access via anon key (create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_customers' 
    AND policyname = 'Deny anon key write access to stripe_customers'
  ) THEN
    CREATE POLICY "Deny anon key write access to stripe_customers"
      ON stripe_customers FOR ALL
      TO anon
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- Add trigger for updated_at if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_updated_at_column'
  ) THEN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
    
    -- Create trigger
    CREATE TRIGGER update_stripe_customers_updated_at 
      BEFORE UPDATE ON stripe_customers
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '✅ Created trigger update_stripe_customers_updated_at';
  ELSE
    RAISE NOTICE '⚠️ Function update_updated_at_column does not exist - run schema.sql first to create it';
  END IF;
END $$;

-- Verify table was created
SELECT 
  'Verification' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'stripe_customers'
    ) THEN '✅ stripe_customers table exists'
    ELSE '❌ stripe_customers table still missing'
  END as status;
