-- Webhook Retry Queue
-- Stores failed webhooks for retry processing

CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_event_id TEXT NOT NULL, -- Stripe or Clerk event ID
  webhook_type TEXT NOT NULL, -- 'stripe' or 'clerk'
  event_type TEXT NOT NULL, -- e.g., 'checkout.session.completed', 'user.created'
  event_data JSONB NOT NULL, -- Full event payload
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'failed', 'succeeded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status ON webhook_retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_webhook_type ON webhook_retry_queue(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_event_id ON webhook_retry_queue(webhook_event_id);

-- Enable RLS
ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Allow service role full access to webhook_retry_queue"
  ON webhook_retry_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_next_retry_at(retry_count INTEGER)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Exponential backoff: 1min, 5min, 15min, 1hour, 6hours
  CASE retry_count
    WHEN 0 THEN RETURN NOW() + INTERVAL '1 minute';
    WHEN 1 THEN RETURN NOW() + INTERVAL '5 minutes';
    WHEN 2 THEN RETURN NOW() + INTERVAL '15 minutes';
    WHEN 3 THEN RETURN NOW() + INTERVAL '1 hour';
    WHEN 4 THEN RETURN NOW() + INTERVAL '6 hours';
    ELSE RETURN NOW() + INTERVAL '24 hours'; -- Max wait
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_webhook_retry_queue_updated_at BEFORE UPDATE ON webhook_retry_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
