// Proxy for ProjectX trade search

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchTrades } from '@/lib/edge/projectx/client.server';

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('projectx_token');
  return tokenCookie?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getTokenFromCookie();
    if (!token) {
      console.error('Trade search: No token found in cookies');
      return NextResponse.json(
        { error: 'Not connected to ProjectX' },
        { status: 401 }
      );
    }
    
    console.log('Trade search: Token found, length:', token.length);

    const body = await request.json();
    let { accountId, startTimestamp, endTimestamp } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    if (!startTimestamp) {
      return NextResponse.json(
        { error: 'startTimestamp is required' },
        { status: 400 }
      );
    }

    // The API expects a numeric accountId based on documentation examples (203, 704, etc.)
    // But user accounts might be in format like "50KTC-V2-402242-12047550"
    // We need to extract the actual numeric account ID
    let finalAccountId: number | string = accountId;
    
    if (typeof accountId === 'string') {
      // Try multiple strategies to extract the numeric account ID:
      
      // Strategy 1: Extract last numeric segment (e.g., "12047550" from "50KTC-V2-402242-12047550")
      const parts = accountId.split('-');
      const lastPart = parts[parts.length - 1];
      const numericLastPart = parseInt(lastPart, 10);
      
      if (!isNaN(numericLastPart) && lastPart.length >= 4) {
        // Use the last numeric segment if it's substantial
        finalAccountId = numericLastPart;
        console.log(`Extracted accountId from last segment: ${numericLastPart} from "${accountId}"`);
      } else {
        // Strategy 2: Try second-to-last segment (e.g., "402242" from "50KTC-V2-402242-12047550")
        if (parts.length >= 2) {
          const secondLastPart = parts[parts.length - 2];
          const numericSecondLast = parseInt(secondLastPart, 10);
          if (!isNaN(numericSecondLast) && secondLastPart.length >= 4) {
            finalAccountId = numericSecondLast;
            console.log(`Extracted accountId from second-to-last segment: ${numericSecondLast} from "${accountId}"`);
          }
        }
        
        // Strategy 3: Direct numeric conversion
        if (finalAccountId === accountId) {
          const directNum = parseInt(accountId, 10);
          if (!isNaN(directNum)) {
            finalAccountId = directNum;
            console.log(`Converted accountId directly to number: ${directNum}`);
          } else {
            // Strategy 4: Keep as string if no numeric conversion works
            console.warn(`Could not extract numeric accountId from "${accountId}", sending as string`);
          }
        }
      }
    }

    console.log('Trade search request:', {
      originalAccountId: accountId,
      accountId: finalAccountId,
      startTimestamp,
      endTimestamp,
      hasToken: !!token,
      tokenLength: token?.length,
    });

    const response = await searchTrades(
      {
        accountId: finalAccountId, // Use numeric version
        startTimestamp,
        endTimestamp,
      },
      token
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Trade search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search trades' },
      { status: 500 }
    );
  }
}
