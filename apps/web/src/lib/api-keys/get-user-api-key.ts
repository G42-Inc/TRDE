/**
 * Helper to retrieve and decrypt user API keys for external API calls
 * 
 * SECURITY: Only use this when you need to make an API call with the user's key.
 * Never expose decrypted keys to the client.
 */

import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { decrypt, isEncryptionConfigured } from '@/lib/utils/crypto';

export type ApiProvider = 'alphavantage' | 'topstep';

interface UserApiKey {
  provider: ApiProvider;
  apiKey: string;
  isPremium: boolean;
  isEnabled: boolean;
}

/**
 * Get a user's decrypted API key for a specific provider
 * 
 * @param userId - The Clerk user ID
 * @param provider - The API provider name
 * @returns The decrypted API key info, or null if not found/disabled
 */
export async function getUserApiKey(
  userId: string,
  provider: ApiProvider
): Promise<UserApiKey | null> {
  if (!isEncryptionConfigured()) {
    console.error('API_KEY_ENCRYPTION_SECRET not configured');
    return null;
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('api_key, is_premium, is_enabled')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching ${provider} API key for user:`, error);
    return null;
  }

  if (!data) {
    return null;
  }

  try {
    const decryptedKey = decrypt(data.api_key);
    return {
      provider,
      apiKey: decryptedKey,
      isPremium: data.is_premium,
      isEnabled: data.is_enabled,
    };
  } catch (decryptError) {
    console.error(`Failed to decrypt ${provider} API key:`, decryptError);
    return null;
  }
}

/**
 * Get all of a user's enabled API keys (decrypted)
 * 
 * @param userId - The Clerk user ID
 * @returns Array of decrypted API key info
 */
export async function getAllUserApiKeys(userId: string): Promise<UserApiKey[]> {
  if (!isEncryptionConfigured()) {
    console.error('API_KEY_ENCRYPTION_SECRET not configured');
    return [];
  }

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('provider, api_key, is_premium, is_enabled')
    .eq('user_id', userId)
    .eq('is_enabled', true);

  if (error) {
    console.error('Error fetching API keys for user:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  const decryptedKeys: UserApiKey[] = [];

  for (const record of data) {
    try {
      const decryptedKey = decrypt(record.api_key);
      decryptedKeys.push({
        provider: record.provider as ApiProvider,
        apiKey: decryptedKey,
        isPremium: record.is_premium,
        isEnabled: record.is_enabled,
      });
    } catch (decryptError) {
      console.error(`Failed to decrypt ${record.provider} API key:`, decryptError);
      // Skip this key but continue with others
    }
  }

  return decryptedKeys;
}
