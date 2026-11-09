// Proxy for ProjectX available contracts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAvailableContracts } from '@/lib/edge/projectx/client.server';

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
    const { live } = body;

    const response = await getAvailableContracts(live ?? false, token);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Available contracts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get available contracts' },
      { status: 500 }
    );
  }
}
