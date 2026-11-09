/**
 * User API Keys Utilities
 * Server-side functions for retrieving user API keys
 */

import { getSupabaseServiceClient } from '@/lib/db/supabase.server';

export type Provider = 'alphavantage' | 'topstep';

export interface UserApiKey {
  id: string;
  provider: Provider;
  api_key: string;
  is_premium: boolean;
  is_enabled: boolean;
  validation_status: string | null;
}

/**
 * Get a user's API key for a specific provider
 * Returns null if not found or disabled
 */
export async function getUserApiKey(
  userId: string,
  provider: Provider
): Promise<UserApiKey | null> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserApiKey;
}

/**
 * Get all enabled API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('is_enabled', true);

  if (error || !data) {
    return [];
  }

  return data as UserApiKey[];
}

/**
 * Check if user has a specific provider configured
 */
export async function hasProviderConfigured(
  userId: string,
  provider: Provider
): Promise<boolean> {
  const key = await getUserApiKey(userId, provider);
  return key !== null;
}

/**
 * Check if user has premium access for a provider
 */
export async function hasProviderPremium(
  userId: string,
  provider: Provider
): Promise<boolean> {
  const key = await getUserApiKey(userId, provider);
  return key?.is_premium ?? false;
}
