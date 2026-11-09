/**
 * Symbol Search API Route
 * Searches for ticker symbols using AlphaVantage SYMBOL_SEARCH endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { isAlphaVantageConfigured } from '@/lib/env.server';
import { searchSymbols } from '@/lib/flow/client.server';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if AlphaVantage is configured
    if (!isAlphaVantageConfigured()) {
      // Return empty results if not configured (allow UI to still work)
      return NextResponse.json({ results: [] });
    }

    // Get search query
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // Search using AlphaVantage
    const response = await searchSymbols(query);

    if (response?.['Error Message'] || response?.['Note']) {
      console.error('AlphaVantage search error:', response);
      return NextResponse.json({ results: [] });
    }

    // Normalize results
    const matches = response?.bestMatches || [];
    const results = matches.slice(0, 10).map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency'],
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Symbol search error:', error);
    return NextResponse.json({ results: [] });
  }
}
