-- User API Keys table
-- Stores per-user API keys for external data providers (AlphaVantage, Topstep, etc.)

CREATE TABLE public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'alphavantage', 'topstep', etc.
  api_key TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false, -- User claims they have premium access
  is_enabled BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_status TEXT, -- 'valid', 'invalid', 'unknown'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Each user can only have one key per provider
  UNIQUE (user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own API keys
CREATE POLICY "Users can view their own api_keys" ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api_keys" ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api_keys" ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api_keys" ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_user_api_keys_user_provider ON public.user_api_keys(user_id, provider);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();

-- Comments
COMMENT ON TABLE public.user_api_keys IS 'Stores user API keys for external data providers';
COMMENT ON COLUMN public.user_api_keys.provider IS 'Provider identifier: alphavantage, topstep, polygon, etc.';
COMMENT ON COLUMN public.user_api_keys.is_premium IS 'User self-declares if they have premium access (for AlphaVantage options data)';
COMMENT ON COLUMN public.user_api_keys.validation_status IS 'Result of last API key validation test';
