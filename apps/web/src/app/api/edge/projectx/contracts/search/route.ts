// Proxy for ProjectX contract search

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchContracts } from '@/lib/edge/projectx/client.server';

// Override getProjectXToken to read from cookie
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
    const { searchText, live } = body;

    if (!searchText) {
      return NextResponse.json(
        { error: 'searchText is required' },
        { status: 400 }
      );
    }

    const response = await searchContracts(searchText, live ?? false, token);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Contract search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search contracts' },
      { status: 500 }
    );
  }
}
