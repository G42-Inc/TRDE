/**
 * Webhook Retry Processor
 * 
 * Processes queued webhook retries.
 * Should be called by a cron job or scheduled task.
 * 
 * Endpoint: POST /api/webhooks/retry
 */

import { hasRetryAuthorization } from '@/lib/auth/policy';
import { NextRequest, NextResponse } from 'next/server';
import { getPendingWebhooks, markWebhookProcessing, markWebhookSucceeded, markWebhookFailed, incrementRetryCount } from '@/lib/webhooks/retry-queue';
import { handleStripeWebhookRetry } from '@/lib/webhooks/stripe-retry';
import { handleClerkWebhookRetry } from '@/lib/webhooks/clerk-retry';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/retry
 * 
 * Processes pending webhook retries
 */
export async function POST(request: NextRequest) {
  if (!hasRetryAuthorization(process.env.WEBHOOK_RETRY_API_KEY, request.headers.get('x-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get pending webhooks (up to 10 at a time)
    const pendingWebhooks = await getPendingWebhooks(10);

    if (pendingWebhooks.length === 0) {
      return NextResponse.json({ 
        processed: 0,
        message: 'No pending webhooks to process' 
      });
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      maxRetries: 0,
    };

    // Process each webhook
    for (const webhook of pendingWebhooks) {
      try {
        // Mark as processing
        await markWebhookProcessing(webhook.id);

        // Process based on webhook type
        let success = false;
        if (webhook.webhook_type === 'stripe') {
          success = await handleStripeWebhookRetry(webhook);
        } else if (webhook.webhook_type === 'clerk') {
          success = await handleClerkWebhookRetry(webhook);
        }

        if (success) {
          await markWebhookSucceeded(webhook.id);
          results.succeeded++;
        } else {
          // Increment retry count and check if max retries reached
          await incrementRetryCount(webhook.id);
          
          const supabase = getSupabaseServiceClient();
          const { data: updatedWebhook } = await supabase
            .from('webhook_retry_queue')
            .select('retry_count, max_retries')
            .eq('id', webhook.id)
            .single();
          
          if (updatedWebhook && updatedWebhook.retry_count >= updatedWebhook.max_retries) {
            await markWebhookFailed(webhook.id, 'Max retries reached');
            results.maxRetries++;
          } else {
            // Reset to pending for retry (next_retry_at already set by incrementRetryCount)
            await supabase
              .from('webhook_retry_queue')
              .update({ status: 'pending' })
              .eq('id', webhook.id);
            results.failed++;
          }
        }

        results.processed++;
      } catch (error: any) {
        console.error(`Error processing webhook ${webhook.id}:`, error);
        
        // Increment retry count and check if max retries reached
        await incrementRetryCount(webhook.id);
        
        const supabase = getSupabaseServiceClient();
        const { data: updatedWebhook } = await supabase
          .from('webhook_retry_queue')
          .select('retry_count, max_retries')
          .eq('id', webhook.id)
          .single();
        
        if (updatedWebhook && updatedWebhook.retry_count >= updatedWebhook.max_retries) {
          await markWebhookFailed(webhook.id, error.message || 'Unknown error');
          results.maxRetries++;
        } else {
          // Reset to pending for retry
          await supabase
            .from('webhook_retry_queue')
            .update({ status: 'pending' })
            .eq('id', webhook.id);
          results.failed++;
        }

        results.processed++;
      }
    }

    return NextResponse.json({
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      maxRetries: results.maxRetries,
    });
  } catch (error: any) {
    console.error('Error processing webhook retries:', error);
    return NextResponse.json(
      { error: 'Failed to process retries', message: error.message },
      { status: 500 }
    );
  }
}
