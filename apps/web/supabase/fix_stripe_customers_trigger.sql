-- Fix Missing Trigger for stripe_customers.updated_at
-- Run this after the main schema.sql if stripe_customers table exists

-- Add trigger for stripe_customers.updated_at
-- This ensures updated_at is automatically updated when rows are modified
CREATE TRIGGER update_stripe_customers_updated_at 
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the trigger was created
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'stripe_customers'
AND trigger_name = 'update_stripe_customers_updated_at';
