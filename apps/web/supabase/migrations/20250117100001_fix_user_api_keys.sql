-- Fix user_api_keys table to work with Clerk authentication
-- The original table referenced auth.users which doesn't work with Clerk

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.user_api_keys CASCADE;

-- Recreate without foreign key to auth.users
-- Store Clerk user ID as TEXT instead of UUID
CREATE TABLE public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access" ON public.user_api_keys
  FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX idx_user_api_keys_user_provider ON public.user_api_keys(user_id, provider);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_api_keys_updated_at ON public.user_api_keys;
CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();
