// Proxy for ProjectX contract by ID

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getContractById } from '@/lib/edge/projectx/client.server';

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
    const { contractId, live } = body;

    if (!contractId) {
      return NextResponse.json(
        { error: 'contractId is required' },
        { status: 400 }
      );
    }

    const contract = await getContractById(contractId, live ?? false, token);
    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ contract });
  } catch (error: any) {
    console.error('Contract by ID error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get contract' },
      { status: 500 }
    );
  }
}
