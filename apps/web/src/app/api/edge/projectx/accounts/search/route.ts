// Proxy for ProjectX account search

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchAccounts } from '@/lib/edge/projectx/client.server';

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('projectx_token');
  return tokenCookie?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getTokenFromCookie();
    if (!token) {
      return NextResponse.json(
        { error: 'Not connected to ProjectX' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { onlyActiveAccounts = true } = body;

    console.log('Account search request:', {
      onlyActiveAccounts,
      hasToken: !!token,
      tokenLength: token?.length,
    });

    const response = await searchAccounts(onlyActiveAccounts, token);
    
    // Check if response has error code
    if (response.errorCode !== undefined && response.errorCode !== 0) {
      console.error('Account search API error:', {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });
      return NextResponse.json(
        { 
          error: response.errorMessage || `ProjectX API error code: ${response.errorCode}`,
          errorCode: response.errorCode,
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Account search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search accounts' },
      { status: 500 }
    );
  }
}
