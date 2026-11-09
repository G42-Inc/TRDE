/**
 * Clerk Webhook Retry Handler
 */

import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { handleUserCreated, handleUserUpdated, handleUserDeleted } from '@/lib/webhooks/clerk-handlers';

export async function handleClerkWebhookRetry(webhook: any): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceClient();
    const eventType = webhook.event_type;
    const eventData = webhook.event_data.data || webhook.event_data;

    // Process based on event type
    switch (eventType) {
      case 'user.created': {
        const event = {
          type: 'user.created',
          data: eventData,
        };
        await handleUserCreated(event, supabase);
        return true;
      }

      case 'user.updated': {
        const event = {
          type: 'user.updated',
          data: eventData,
        };
        await handleUserUpdated(event, supabase);
        return true;
      }

      case 'user.deleted': {
        const event = {
          type: 'user.deleted',
          data: eventData,
        };
        await handleUserDeleted(event, supabase);
        return true;
      }

      default:
        console.log(`Unhandled retry event type: ${eventType}`);
        return false;
    }
  } catch (error: any) {
    console.error('Error retrying Clerk webhook:', error);
    return false;
  }
}

// Retry handlers now use the exported functions from the webhook route
