// ProjectX connection endpoint - stores token server-side

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, accountId, live } = body;

    const cookieStore = await cookies();
    
    // If token is provided, update it. Otherwise, keep existing token.
    if (token) {
      cookieStore.set('projectx_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    } else {
      // Check if token exists, if not, return error
      const existingToken = cookieStore.get('projectx_token');
      if (!existingToken) {
        return NextResponse.json(
          { error: 'Token is required for initial connection' },
          { status: 400 }
        );
      }
    }

    // Store connection metadata in a separate cookie (non-sensitive)
    cookieStore.set('projectx_connection', JSON.stringify({
      accountId: accountId || null,
      live: live ?? false,
      connectedAt: new Date().toISOString(),
    }), {
      httpOnly: false, // Can be read client-side for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      connected: true,
      accountId: accountId || null,
      live: live ?? false,
    });
  } catch (error) {
    console.error('ProjectX connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const connectionCookie = cookieStore.get('projectx_connection');
    
    if (!connectionCookie) {
      return NextResponse.json({
        connected: false,
      });
    }

    const connection = JSON.parse(connectionCookie.value);
    return NextResponse.json({
      connected: true,
      ...connection,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
    });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('projectx_token');
    cookieStore.delete('projectx_connection');
    
    return NextResponse.json({
      success: true,
      connected: false,
    });
  } catch (error) {
    console.error('ProjectX disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
