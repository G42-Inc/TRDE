// Proxy for ProjectX historical bars with chunking support

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { retrieveBars } from '@/lib/edge/projectx/client.server';
import { calculateChunks } from '@/lib/edge/utils/chunking';
import { timeframeToProjectX } from '@/lib/edge/utils/timeframe';
import { normalizeBars } from '@/lib/edge/projectx/normalize';
import type { ChartTimeframe } from '@/lib/edge/types';

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
    const {
      contractId,
      live,
      startTime,
      endTime,
      timeframe, // e.g., '1m', '5m', '1h', '1D'
    } = body;

    if (!contractId || !startTime || !endTime || !timeframe) {
      return NextResponse.json(
        { error: 'contractId, startTime, endTime, and timeframe are required' },
        { status: 400 }
      );
    }

    const { unit, unitNumber } = timeframeToProjectX(timeframe as ChartTimeframe);
    
    // Calculate chunks if needed
    const chunks = calculateChunks(startTime, endTime, timeframe as ChartTimeframe);
    
    // Fetch all chunks and combine
    const allBars: any[] = [];
    for (const chunk of chunks) {
      const response = await retrieveBars(
        {
          contractId,
          live: live ?? false,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          unit,
          unitNumber,
          limit: chunk.limit,
          includePartialBar: false,
        },
        token
      );

      if (response.bars && response.bars.length > 0) {
        allBars.push(...response.bars);
      }
    }

    // Normalize and sort
    const normalized = normalizeBars(allBars);

    return NextResponse.json({
      bars: normalized,
      success: true,
      count: normalized.length,
    });
  } catch (error: any) {
    console.error('History bars error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve bars' },
      { status: 500 }
    );
  }
}
