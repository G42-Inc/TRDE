import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/clerk';
import { requireEntitlement } from '@/lib/entitlements/check.server';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { encrypt } from '@/lib/security/crypto.server';

/**
 * Connect ProjectX broker account
 * POST /api/connections/projectx/connect
 * Body: { accessToken: string, refreshToken?: string, metadata?: object }
 * 
 * Security:
 * - Requires authentication
 * - Requires active entitlement (any tier)
 * - Encrypts tokens before storage
 * - Never returns tokens to client
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    
    // Require at least basic plan
    await requireEntitlement(userId, 'basic');

    const body = await request.json();
    const { accessToken, refreshToken, metadata } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required' },
        { status: 400 }
      );
    }

    // Encrypt tokens
    const accessTokenEncrypted = encrypt(accessToken);
    const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken) : null;

    // Store in Supabase (service role bypasses RLS)
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('api_connections')
      .upsert({
        user_id: userId,
        provider: 'projectx',
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        metadata: metadata || {},
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing connection:', error);
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      );
    }

    // Return success (without tokens)
    return NextResponse.json({
      success: true,
      connection: {
        id: data.id,
        provider: data.provider,
        status: data.status,
        last_sync_at: data.last_sync_at,
        // Never return encrypted tokens
      },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied') || error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Error connecting ProjectX:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}

/**
 * Get connection status (without tokens)
 * GET /api/connections/projectx/connect
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    await requireEntitlement(userId, 'basic');

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('api_connections')
      .select('id, provider, status, last_sync_at, metadata')
      .eq('user_id', userId)
      .eq('provider', 'projectx')
      .single();

    if (error || !data) {
      return NextResponse.json({ connection: null });
    }

    // Return connection info without tokens
    return NextResponse.json({
      connection: {
        id: data.id,
        provider: data.provider,
        status: data.status,
        last_sync_at: data.last_sync_at,
        metadata: data.metadata,
      },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied') || error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Error fetching connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}
