// Proxy for ProjectX authentication

import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithApiKey } from '@/lib/edge/projectx/client.server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, apiKey } = body;

    console.log('Auth route received:', {
      hasUserName: !!userName,
      userNameLength: userName?.length,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
    });

    if (!userName || !apiKey) {
      return NextResponse.json(
        { error: 'userName and apiKey are required' },
        { status: 400 }
      );
    }

    if (typeof userName !== 'string' || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'userName and apiKey must be strings' },
        { status: 400 }
      );
    }

    const authResponse = await authenticateWithApiKey(userName, apiKey);

    // authenticateWithApiKey throws if errorCode !== 0, so if we get here, it succeeded
    if (!authResponse.token) {
      return NextResponse.json(
        { error: 'No token received from authentication' },
        { status: 401 }
      );
    }

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('projectx_token', authResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      token: authResponse.token,
    });
  } catch (error: any) {
    // Log error server-side (includes full details)
    console.error('=== AUTHENTICATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    console.error('===========================');
    
    // Return sanitized error to client
    const isProduction = process.env.NODE_ENV === 'production';
    const errorResponse: any = {
      error: isProduction ? 'Failed to authenticate' : (error.message || 'Failed to authenticate'),
    };

    // Include details only in development
    if (!isProduction) {
      errorResponse.details = {
        name: error.name,
        message: error.message,
        ...(error.cause && { cause: error.cause }),
      };
      if (error.stack) {
        errorResponse.stack = error.stack;
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
