/**
 * Widget Data API Route
 * Fetches normalized widget data from AlphaVantage with caching and cooldown
 * Uses per-user API keys from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { isAlphaVantageConfigured } from '@/lib/env.server';
import { getUserApiKey } from '@/lib/api-keys';
import {
  getGlobalQuote,
  getIntradaySeries,
  getVWAP,
  getATR,
  getRealtimeOptions,
  getHistoricalOptions,
  setRequestApiKey,
  hasApiKey,
} from '@/lib/flow/client.server';
import {
  normalizeGlobalQuote,
  normalizeIntradaySeries,
  normalizeSessionLevels,
  normalizeVolatilityRange,
  normalizeOptionsFlow,
  isErrorResponse,
  getErrorMessage,
  createErrorWidgetData,
} from '@/lib/flow/normalize';
import type {
  FlowWidgetType,
  IntradayInterval,
  WidgetDataRequest,
} from '@/lib/flow/types';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const COOLDOWN_SECONDS = 300; // 5 minutes

// Allowlist of valid widget types
const VALID_WIDGET_TYPES: FlowWidgetType[] = [
  'FUTURES_SNAPSHOT',
  'INDEX_SNAPSHOT',
  'INTRADAY_SERIES',
  'SESSION_LEVELS',
  'VOLATILITY_RANGE',
  'FLOW_FEED',
];

// Allowlist of valid intervals
const VALID_INTERVALS: IntradayInterval[] = ['1min', '5min', '15min', '30min', '60min'];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const userId = await getClerkUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's AlphaVantage API key
    const userApiKey = await getUserApiKey(userId, 'alphavantage');
    
    // Set the API key for this request (user's key or fallback to env)
    setRequestApiKey(userApiKey?.api_key || null);
    
    // Check if any API key is available
    if (!hasApiKey()) {
      return NextResponse.json(
        { 
          error: 'No API key configured',
          needsApiKey: true,
          message: 'Please add your AlphaVantage API key in Settings → API Connections'
        },
        { status: 503 }
      );
    }
    
    // Check if user has premium for options data
    const hasPremium = userApiKey?.is_premium || false;

    // Parse request body
    const body: WidgetDataRequest = await request.json();
    const { 
      widgetType, 
      symbol, 
      forceRefresh = false, 
      interval = '5min', 
      timePeriod = 14,
      dataMode = 'realtime',
      historicalDate,
    } = body;

    // Validate widget type (allowlist)
    if (!widgetType || !VALID_WIDGET_TYPES.includes(widgetType as FlowWidgetType)) {
      return NextResponse.json(
        { error: `Invalid widget type. Allowed: ${VALID_WIDGET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate symbol
    if (!symbol || typeof symbol !== 'string' || symbol.length > 20) {
      return NextResponse.json(
        { error: 'Invalid symbol' },
        { status: 400 }
      );
    }

    // Validate interval if provided
    if (interval && !VALID_INTERVALS.includes(interval as IntradayInterval)) {
      return NextResponse.json(
        { error: `Invalid interval. Allowed: ${VALID_INTERVALS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const cleanSymbol = symbol.toUpperCase().trim();
    
    // Validate dataMode
    const validModes = ['realtime', 'historical'];
    const cleanDataMode = validModes.includes(dataMode) ? dataMode : 'realtime';
    
    // Include mode and date in keys for proper caching
    const modeKey = cleanDataMode === 'historical' && historicalDate 
      ? `${cleanDataMode}:${historicalDate}` 
      : 'realtime';
    const cacheKey = `${widgetType}:${cleanSymbol}:${interval}:${modeKey}`;
    const widgetKey = `${widgetType}:${cleanSymbol}:${modeKey}`;
    const now = new Date();

    // Check cooldown (server-side authoritative)
    if (forceRefresh) {
      const { data: refreshRecord } = await supabase
        .from('flow_widget_refreshes')
        .select('next_refresh_at')
        .eq('user_id', userId)
        .eq('widget_key', widgetKey)
        .single();

      if (refreshRecord && new Date(refreshRecord.next_refresh_at) > now) {
        const remainingSeconds = Math.ceil(
          (new Date(refreshRecord.next_refresh_at).getTime() - now.getTime()) / 1000
        );
        return NextResponse.json(
          {
            error: 'Cooldown active',
            cooldownRemaining: remainingSeconds,
            nextRefreshAt: refreshRecord.next_refresh_at,
          },
          { status: 429 }
        );
      }
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cacheEntry } = await supabase
        .from('flow_widget_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', now.toISOString())
        .single();

      if (cacheEntry) {
        // Return cached data with metadata
        const widgetData = {
          ...cacheEntry.data,
          cached: true,
          cachedAt: cacheEntry.cached_at,
          nextRefreshAt: new Date(now.getTime() + COOLDOWN_SECONDS * 1000).toISOString(),
        };
        return NextResponse.json(widgetData);
      }
    }

    // Fetch fresh data from AlphaVantage
    let widgetData;
    try {
      widgetData = await fetchWidgetData(
        widgetType as FlowWidgetType,
        cleanSymbol,
        interval as IntradayInterval,
        timePeriod,
        cleanDataMode,
        historicalDate
      );
    } catch (error: any) {
      console.error('AlphaVantage fetch error:', error);
      return NextResponse.json(
        createErrorWidgetData(widgetType as FlowWidgetType, cleanSymbol, error.message),
        { status: 502 }
      );
    }

    // Check if AlphaVantage returned an error
    if (widgetData.error) {
      return NextResponse.json(widgetData, { status: 200 });
    }

    // Store in cache
    const expiresAt = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000).toISOString();
    await supabase
      .from('flow_widget_cache')
      .upsert({
        cache_key: cacheKey,
        data: widgetData,
        cached_at: now.toISOString(),
        expires_at: expiresAt,
      }, {
        onConflict: 'cache_key',
      });

    // Update cooldown record
    const nextRefreshAt = new Date(now.getTime() + COOLDOWN_SECONDS * 1000).toISOString();
    await supabase
      .from('flow_widget_refreshes')
      .upsert({
        user_id: userId,
        widget_key: widgetKey,
        refreshed_at: now.toISOString(),
        next_refresh_at: nextRefreshAt,
      }, {
        onConflict: 'user_id,widget_key',
      });

    return NextResponse.json({
      ...widgetData,
      cached: false,
      nextRefreshAt,
    });
  } catch (error: any) {
    console.error('Widget data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch and normalize widget data based on type
 */
async function fetchWidgetData(
  widgetType: FlowWidgetType,
  symbol: string,
  interval: IntradayInterval,
  timePeriod: number,
  dataMode: string = 'realtime',
  historicalDate?: string
) {
  switch (widgetType) {
    case 'FUTURES_SNAPSHOT':
    case 'INDEX_SNAPSHOT': {
      const response = await getGlobalQuote(symbol);
      if (isErrorResponse(response)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(response));
      }
      return normalizeGlobalQuote(response, symbol, widgetType);
    }

    case 'INTRADAY_SERIES': {
      const response = await getIntradaySeries(symbol, interval, 'compact');
      if (isErrorResponse(response)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(response));
      }
      return normalizeIntradaySeries(response, symbol, interval);
    }

    case 'SESSION_LEVELS': {
      // Fetch intraday data and VWAP in parallel
      const [intradayResponse, vwapResponse] = await Promise.all([
        getIntradaySeries(symbol, '1min', 'full'),
        getVWAP(symbol, '15min').catch(() => null), // VWAP is optional
      ]);
      
      if (isErrorResponse(intradayResponse)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(intradayResponse));
      }
      
      return normalizeSessionLevels(intradayResponse, vwapResponse, symbol, '1min');
    }

    case 'VOLATILITY_RANGE': {
      // Need current price and ATR
      const [quoteResponse, atrResponse] = await Promise.all([
        getGlobalQuote(symbol),
        getATR(symbol, 'daily', timePeriod),
      ]);
      
      if (isErrorResponse(quoteResponse)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(quoteResponse));
      }
      if (isErrorResponse(atrResponse)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(atrResponse));
      }
      
      const currentPrice = parseFloat(quoteResponse['Global Quote']?.['05. price']) || 0;
      return normalizeVolatilityRange(atrResponse, currentPrice, symbol);
    }

    case 'FLOW_FEED': {
      // Use historical or realtime based on dataMode
      const response = dataMode === 'historical' && historicalDate
        ? await getHistoricalOptions(symbol, historicalDate)
        : await getRealtimeOptions(symbol);
      
      console.log(`FLOW_FEED response for ${symbol} (${dataMode}):`, JSON.stringify(response).substring(0, 500));
      
      if (isErrorResponse(response)) {
        return createErrorWidgetData(widgetType, symbol, getErrorMessage(response));
      }
      
      const normalizedData = normalizeOptionsFlow(response, symbol);
      // Add mode info to the response
      return {
        ...normalizedData,
        dataMode,
        historicalDate: dataMode === 'historical' ? historicalDate : undefined,
      };
    }

    default:
      return createErrorWidgetData(widgetType, symbol, 'Unknown widget type');
  }
}
