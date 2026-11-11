/**
 * Clerk Webhook Event Handlers
 * 
 * Handler functions for processing Clerk webhook events.
 * Extracted from route.ts to allow reuse in retry handlers.
 */

import type { WebhookEvent } from '@clerk/nextjs/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function handleUserCreated(
  event: WebhookEvent | { type: string; data: any },
  supabase: SupabaseClient
) {
  if (event.type !== 'user.created') return;

  const user = event.data;
  const userId = user.id;

  if (!userId) {
    throw new Error('Missing user ID in user.created event');
  }

  // Extract email
  let email = '';
  if (user.email_addresses && user.email_addresses.length > 0) {
    const primaryEmail = user.email_addresses.find((e: any) => e.id === user.primary_email_address_id);
    email = primaryEmail?.email_address || user.email_addresses[0]?.email_address || '';
  }

  // Extract display name
  let displayName: string | null = null;
  if (user.first_name && user.last_name) {
    displayName = `${user.first_name} ${user.last_name}`;
  } else if (user.first_name) {
    displayName = user.first_name;
  } else if (user.last_name) {
    displayName = user.last_name;
  } else if (user.username) {
    displayName = user.username;
  }

  // Initialize missing records only. Replayed/out-of-order creation events must
  // not replace a newer profile, paid entitlement, earned XP or user preferences.
  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      email: email || '',
      display_name: displayName,
      first_name: (event.data as any).first_name || null,
      last_name: (event.data as any).last_name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('Error creating profile from Clerk webhook:', error);
    throw error;
  }

  console.log(`Profile created for user ${userId} via Clerk webhook`);

  // Auto-create demo entitlement for new users
  // This gives them immediate view-only access to explore the app
  const { error: entitlementError } = await supabase
    .from('entitlements')
    .upsert({
      user_id: userId,
      plan: 'basic',
      status: 'demo',
      source: 'manual',
      override_enabled: false,
      notes: 'Auto-created demo access on signup',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });

  if (entitlementError) {
    // CRITICAL: Most common cause is database constraint not including 'demo' status
    console.error('CRITICAL: Error creating demo entitlement:', entitlementError.message);
    console.error('Error code:', entitlementError.code);
    console.error('Error details:', entitlementError.details);
    console.error('FIX: Run this SQL in Supabase:');
    console.error('  ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_status_check;');
    console.error('  ALTER TABLE entitlements ADD CONSTRAINT entitlements_status_check CHECK (status IN (\'active\', \'past_due\', \'canceled\', \'comped\', \'demo\'));');
    // Don't throw - profile was created successfully, entitlement is secondary
  } else {
    console.log('Demo entitlement initialization completed');
  }

  // Initialize engagement stats for new user
  const { error: statsError } = await supabase
    .from('user_engagement_stats')
    .upsert({
      user_id: userId,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_trades_logged: 0,
      total_journals_written: 0,
      total_reviews_completed: 0,
      analytics_views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });

  if (statsError) {
    console.error('Error initializing engagement stats:', statsError);
  }

  // Initialize notification preferences with sensible defaults
  const { error: notifError } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      daily_digest: false,
      weekly_summary: true,
      achievement_notifications: true,
      streak_reminders: true,
      insight_alerts: true,
      marketing_emails: false,
      push_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    });

  if (notifError) {
    console.error('Error initializing notification preferences:', notifError);
  }
}

export async function handleUserUpdated(
  event: WebhookEvent | { type: string; data: any },
  supabase: SupabaseClient
) {
  if (event.type !== 'user.updated') return;

  const user = event.data;
  const userId = user.id;

  if (!userId) {
    throw new Error('Missing user ID in user.updated event');
  }

  // Extract email
  let email = '';
  if (user.email_addresses && user.email_addresses.length > 0) {
    const primaryEmail = user.email_addresses.find((e: any) => e.id === user.primary_email_address_id);
    email = primaryEmail?.email_address || user.email_addresses[0]?.email_address || '';
  }

  // Extract display name
  let displayName: string | null = null;
  if (user.first_name && user.last_name) {
    displayName = `${user.first_name} ${user.last_name}`;
  } else if (user.first_name) {
    displayName = user.first_name;
  } else if (user.last_name) {
    displayName = user.last_name;
  } else if (user.username) {
    displayName = user.username;
  }

  // Update profile in Supabase
  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      email: email || '',
      display_name: displayName,
      first_name: (event.data as any).first_name || null,
      last_name: (event.data as any).last_name || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating profile from Clerk webhook:', error);
    throw error;
  }

  console.log(`Profile updated for user ${userId} via Clerk webhook`);
}

export async function handleUserDeleted(
  event: WebhookEvent | { type: string; data: any },
  supabase: SupabaseClient
) {
  if (event.type !== 'user.deleted') return;

  const user = event.data;
  const userId = user?.id;

  if (!userId) {
    throw new Error('Missing user ID in user.deleted event');
  }

  // Mark profile as deleted (soft delete)
  // We don't actually delete the profile to preserve data integrity
  // Instead, we could add a deleted_at column if needed
  // For now, just log the deletion
  console.log(`User ${userId} deleted - profile preserved for data integrity`);

  // Optional: Add deleted_at column to profiles table and set it here
  // const { error } = await supabase
  //   .from('profiles')
  //   .update({ deleted_at: new Date().toISOString() })
  //   .eq('user_id', userId);
}
