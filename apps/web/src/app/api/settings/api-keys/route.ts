/**
 * User API Keys Management
 * Allows users to add/update/delete their own API keys for external data providers
 * 
 * SECURITY: API keys are encrypted at rest using AES-256-GCM
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { encrypt, isEncryptionConfigured } from '@/lib/utils/crypto';
import { ApiKeyCreateSchema, ApiKeyUpdateSchema, ApiProviderEnum, validateBody } from '@/lib/validation/schemas';

interface ApiKeyRecord {
  id: string;
  provider: string;
  is_premium: boolean;
  is_enabled: boolean;
  validation_status: string | null;
  created_at: string;
  updated_at: string;
  // Note: api_key is NOT returned to client for security
}

/**
 * GET - Retrieve user's API key configurations (without exposing actual keys)
 */
export async function GET() {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    
    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, is_premium, is_enabled, validation_status, created_at, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Return keys with masked indicator (has key or not)
    const safeKeys = (keys || []).map(key => ({
      ...key,
      hasKey: true, // Indicates a key exists without exposing it
    }));

    return NextResponse.json({ keys: safeKeys });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Add or update an API key for a provider
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input with Zod schema
    const validation = validateBody(body, ApiKeyCreateSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { provider, apiKey, isPremium } = validation.data;

    // Encrypt the API key before storage
    let encryptedKey: string;
    try {
      if (!isEncryptionConfigured()) {
        console.error('API_KEY_ENCRYPTION_SECRET not configured - cannot store API keys securely');
        return NextResponse.json(
          { error: 'Server encryption not configured' },
          { status: 500 }
        );
      }
      encryptedKey = encrypt(apiKey.trim());
    } catch (encryptError) {
      console.error('Failed to encrypt API key:', encryptError);
      return NextResponse.json(
        { error: 'Failed to encrypt API key' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Upsert the encrypted API key
    const { data, error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: userId,
        provider,
        api_key: encryptedKey,
        is_premium: Boolean(isPremium),
        is_enabled: true,
        validation_status: 'unknown',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })
      .select('id, provider, is_premium, is_enabled, validation_status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error saving API key:', error);
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      key: { ...data, hasKey: true },
      message: `${provider} API key saved successfully`,
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Remove an API key for a provider
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Validate provider with Zod
    const providerValidation = ApiProviderEnum.safeParse(provider);
    if (!providerValidation.success) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported: alphavantage, topstep' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${provider} API key removed`,
    });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH - Toggle API key enabled status or update premium flag
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input with Zod schema
    const validation = validateBody(body, ApiKeyUpdateSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { provider, isEnabled, isPremium } = validation.data;

    const supabase = getSupabaseServiceClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isEnabled === 'boolean') {
      updates.is_enabled = isEnabled;
    }
    if (typeof isPremium === 'boolean') {
      updates.is_premium = isPremium;
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .update(updates)
      .eq('user_id', userId)
      .eq('provider', provider)
      .select('id, provider, is_premium, is_enabled, validation_status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating API key:', error);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      key: { ...data, hasKey: true },
    });
  } catch (error) {
    console.error('API keys PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
