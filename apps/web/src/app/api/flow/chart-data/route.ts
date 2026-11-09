/**
 * Chart Data API Route
 * Fetches price history for chart display
 * Works with free AlphaVantage tier (stock data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getUserApiKey } from '@/lib/api-keys';
import {
  setRequestApiKey,
  hasApiKey,
  getIntradaySeries,
  getGlobalQuote,
} from '@/lib/flow/client.server';
import { isErrorResponse, getErrorMessage } from '@/lib/flow/normalize';

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's API key
    const userApiKey = await getUserApiKey(userId, 'alphavantage');
    setRequestApiKey(userApiKey?.api_key || null);

    if (!hasApiKey()) {
      return NextResponse.json(
        { error: 'No API key configured', data: [] },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { symbol, interval = '15min' } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();

    // Map interval to AlphaVantage format
    let avInterval: '1min' | '5min' | '15min' | '30min' | '60min' = '15min';
    let useDaily = false;
    
    switch (interval) {
      case '5min':
        avInterval = '5min';
        break;
      case '15min':
        avInterval = '15min';
        break;
      case '60min':
        avInterval = '60min';
        break;
      case 'daily':
        useDaily = true;
        break;
      default:
        avInterval = '15min';
    }

    let chartData: ChartDataPoint[] = [];

    if (useDaily) {
      // Use TIME_SERIES_DAILY for daily data
      const url = new URL('https://www.alphavantage.co/query');
      url.searchParams.set('function', 'TIME_SERIES_DAILY');
      url.searchParams.set('symbol', cleanSymbol);
      url.searchParams.set('outputsize', 'compact');
      url.searchParams.set('apikey', userApiKey?.api_key || '');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        return NextResponse.json({
          data: [],
          error: data['Error Message'] || data['Note'],
        });
      }

      const timeSeries = data['Time Series (Daily)'];
      if (timeSeries) {
        chartData = Object.entries(timeSeries)
          .slice(0, 30) // Last 30 days
          .map(([date, values]: [string, any]) => ({
            time: date,
            price: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'], 10),
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
          }))
          .reverse(); // Chronological order
      }
    } else {
      // Use intraday series
      const response = await getIntradaySeries(cleanSymbol, avInterval, 'compact');
      
      if (isErrorResponse(response)) {
        return NextResponse.json({
          data: [],
          error: getErrorMessage(response),
        });
      }

      // Parse intraday response
      const timeSeriesKey = `Time Series (${avInterval})`;
      const timeSeries = response[timeSeriesKey];
      
      if (timeSeries) {
        chartData = Object.entries(timeSeries)
          .slice(0, 100) // Last 100 data points
          .map(([datetime, values]: [string, any]) => ({
            time: datetime,
            price: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'], 10),
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
          }))
          .reverse(); // Chronological order
      }
    }

    return NextResponse.json({
      symbol: cleanSymbol,
      interval,
      data: chartData,
    });
  } catch (error: any) {
    console.error('Chart data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data', data: [] },
      { status: 500 }
    );
  }
}
