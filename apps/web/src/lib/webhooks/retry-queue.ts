/**
 * Webhook Retry Queue Management
 * 
 * Handles failed webhook events with exponential backoff retry logic.
 */

import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export interface QueuedWebhook {
  webhookType: 'stripe' | 'clerk';
  eventId: string;
  eventType: string;
  eventData: any;
  error?: string;
}

/**
 * Queue a failed webhook for retry
 */
export async function queueWebhookRetry(webhook: QueuedWebhook): Promise<void> {
  const supabase = getSupabaseServiceClient();

  // Check if already queued
  const { data: existing } = await supabase
    .from('webhook_retry_queue')
    .select('id')
    .eq('webhook_event_id', webhook.eventId)
    .eq('webhook_type', webhook.webhookType)
    .maybeSingle();

  if (existing) {
    // Update retry count and next retry time
    // Get current retry count
    const { data: current } = await supabase
      .from('webhook_retry_queue')
      .select('retry_count')
      .eq('id', existing.id)
      .single();

    if (!current) return;

    const newRetryCount = (current.retry_count || 0) + 1;
    // Calculate next retry time with exponential backoff
    const delays = [60, 300, 900, 3600, 21600]; // 1min, 5min, 15min, 1hr, 6hr
    const delay = delays[Math.min(newRetryCount - 1, delays.length - 1)] * 1000;
    const nextRetryAt = new Date(Date.now() + delay);

    const { error } = await supabase
      .from('webhook_retry_queue')
      .update({
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt.toISOString(),
        last_error: webhook.error,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating webhook retry queue:', error);
    }
    return;
  }

  // Insert new retry entry
  const { error } = await supabase
    .from('webhook_retry_queue')
    .insert({
      webhook_event_id: webhook.eventId,
      webhook_type: webhook.webhookType,
      event_type: webhook.eventType,
      event_data: webhook.eventData,
      retry_count: 0,
      next_retry_at: new Date(Date.now() + 60 * 1000), // 1 minute
      last_error: webhook.error,
      status: 'pending',
    });

  if (error) {
    console.error('Error queueing webhook for retry:', error);
    throw error;
  }
}

/**
 * Get pending webhooks ready for retry
 */
export async function getPendingWebhooks(limit: number = 10): Promise<any[]> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('webhook_retry_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .lt('retry_count', 5) // Max 5 retries
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching pending webhooks:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark webhook as processing
 */
export async function markWebhookProcessing(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  await supabase
    .from('webhook_retry_queue')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Mark webhook as succeeded
 */
export async function markWebhookSucceeded(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  await supabase
    .from('webhook_retry_queue')
    .update({
      status: 'succeeded',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Mark webhook as failed (max retries reached)
 */
export async function markWebhookFailed(id: string, error: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  await supabase
    .from('webhook_retry_queue')
    .update({
      status: 'failed',
      last_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Increment retry count and calculate next retry time
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();

  // Get current retry count
  const { data } = await supabase
    .from('webhook_retry_queue')
    .select('retry_count')
    .eq('id', id)
    .single();

  if (!data) return;

  const newRetryCount = data.retry_count + 1;

  // Calculate next retry time with exponential backoff
  const delays = [60, 300, 900, 3600, 21600]; // 1min, 5min, 15min, 1hr, 6hr
  const delay = delays[Math.min(newRetryCount - 1, delays.length - 1)] * 1000;
  const nextRetryAt = new Date(Date.now() + delay);

  await supabase
    .from('webhook_retry_queue')
    .update({
      retry_count: newRetryCount,
      next_retry_at: nextRetryAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}
