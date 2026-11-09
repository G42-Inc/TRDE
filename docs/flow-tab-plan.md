# Flow Tab Integration Plan

**Status**: Implementation Complete  
**Date**: January 17, 2026

## Architecture Discovery

### 1. Routing System
- **Framework**: Next.js 14 App Router (not Pages Router)
- **Route Groups**: Uses route groups `(app)`, `(auth)`, `(public)` for organization
- **Route Location**: `apps/web/src/app/(app)/` for authenticated app routes
- **Example Routes**: `/app`, `/trades`, `/analytics`, `/journal`, `/strategies`, `/review`, `/risk`, `/edge`, `/settings`

### 2. Navigation Component
- **Location**: `apps/web/src/components/Sidebar.tsx`
- **Structure**: `navItems` array with `{ href, label, icon }` objects
- **Icons**: Uses `@heroicons/react/24/outline`
- **Active State**: Uses `usePathname()` to highlight current route
- **Addition Point**: Add new Flow tab entry to `navItems` array around line 22-32

### 3. Authentication System
- **Provider**: Clerk (`@clerk/nextjs` v5.0.0)
- **Middleware**: `apps/web/middleware.ts` - handles auth routing
- **Server Auth**: Uses `auth()` from `@clerk/nextjs/server` in API routes
- **User ID**: Retrieved via `getClerkUserId()` helper in API routes
- **Protected Routes**: Layout-level protection via `ProtectedRoute` component with plan requirements

### 4. Database Layer
- **Provider**: Supabase (PostgreSQL)
- **Client**: `apps/web/src/lib/db/supabase.server.ts`
  - `getSupabaseServiceClient()` - for server-side operations (bypasses RLS)
  - `getSupabaseClient()` - for user-scoped operations (respects RLS)
- **Migrations**: SQL files in `apps/web/supabase/migrations/`
- **Pattern**: Tables defined in SQL migrations with RLS policies
- **No ORM**: Direct Supabase client usage (no Prisma/Drizzle)

### 5. UI System
- **CSS Framework**: Tailwind CSS with custom theme system
- **Theme Classes**: Custom `theme-*` classes (e.g., `theme-bg`, `theme-text`, `theme-border`)
- **Components**: Reusable components in `apps/web/src/components/`
- **Charts**: 
  - `lightweight-charts` for advanced charts (used in EDGE chart page)
  - `recharts` for simpler charts (used in analytics)
- **Icons**: `@heroicons/react` for iconography

### 6. API Route Patterns
- **Location**: `apps/web/src/app/api/`
- **Structure**: Route handlers using `GET`, `POST`, `PUT`, `DELETE` functions
- **Response**: `NextResponse.json()` for JSON responses
- **Error Handling**: Try-catch with `NextResponse.json({ error }, { status })`
- **Auth**: Server-side auth check using `getClerkUserId()` or `auth()`
- **Environment Variables**: Read from `process.env` (server-side only)
- **Validation**: Environment vars validated in `apps/web/src/lib/env.server.ts`

### 7. Existing Market Data / News Modules
- **None Found**: No existing news or market data widgets/modules
- **Charts**: Only chart usage is in EDGE page (`lightweight-charts`) and Analytics (`recharts`)
- **Data Sources**: Currently no external market data APIs integrated

## Integration Plan

### Phase 1: Route & Navigation Setup

#### 1.1 Flow Page Route
- **Location**: `apps/web/src/app/(app)/flow/page.tsx`
- **Structure**: Client component with two sub-tabs: "Dashboard" and "Flow Feed"
- **Layout**: Uses `(app)/layout.tsx` (already provides Sidebar + auth protection)

#### 1.2 Sidebar Navigation
- **File**: `apps/web/src/components/Sidebar.tsx`
- **Change**: Add Flow tab to `navItems` array:
  ```typescript
  import { ChartBarIcon, ... } from '@heroicons/react/24/outline';
  // Use WaveIcon or similar for Flow - check available icons
  const navItems = [
    // ... existing items ...
    { href: '/flow', label: 'Flow', icon: WaveIcon }, // or appropriate icon
  ];
  ```
- **Position**: Add after `/analytics` or `/edge`, before `/settings`

#### 1.3 Sub-tab Navigation (Flow Page)
- **Pattern**: Tabs component within Flow page (similar to other pages)
- **State**: `useState<'dashboard' | 'feed'>` for active sub-tab
- **UI**: Tab buttons or links to switch between "Dashboard" and "Flow Feed" views

### Phase 2: Database Schema

#### 2.1 Flow Widget Configurations Table
- **Table Name**: `flow_widgets`
- **Schema**:
  ```sql
  CREATE TABLE flow_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_type TEXT NOT NULL, -- FUTURES_SNAPSHOT, INDEX_SNAPSHOT, etc.
    symbol TEXT NOT NULL, -- e.g., "ES", "NQ", "SPY"
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1, -- grid units (1-4)
    height INTEGER NOT NULL DEFAULT 1, -- grid units (1-4)
    config JSONB DEFAULT '{}'::jsonb, -- widget-specific config
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_widget UNIQUE (user_id, widget_type, symbol)
  );
  
  CREATE INDEX idx_flow_widgets_user_id ON flow_widgets(user_id);
  ```

#### 2.2 Flow Widget Cache Table
- **Table Name**: `flow_widget_cache`
- **Schema**:
  ```sql
  CREATE TABLE flow_widget_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_type TEXT NOT NULL,
    symbol TEXT NOT NULL,
    data JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT unique_widget_cache UNIQUE (widget_type, symbol)
  );
  
  CREATE INDEX idx_flow_widget_cache_expires ON flow_widget_cache(expires_at);
  -- Cleanup expired cache via scheduled job or on read
  ```

#### 2.3 Flow Widget Refresh Cooldown Table
- **Table Name**: `flow_widget_refreshes`
- **Schema**:
  ```sql
  CREATE TABLE flow_widget_refreshes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    widget_type TEXT NOT NULL,
    symbol TEXT NOT NULL,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_refresh_at TIMESTAMPTZ NOT NULL, -- refreshed_at + 300s
    CONSTRAINT unique_user_widget_refresh UNIQUE (user_id, widget_type, symbol)
  );
  
  CREATE INDEX idx_flow_widget_refreshes_user ON flow_widget_refreshes(user_id);
  CREATE INDEX idx_flow_widget_refreshes_next_refresh ON flow_widget_refreshes(next_refresh_at);
  ```

#### 2.4 Flow Feed Items Table (Placeholder)
- **Table Name**: `flow_feed_items`
- **Schema** (to be refined based on AlphaVantage docs):
  ```sql
  CREATE TABLE flow_feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT, -- optional: if feed item is symbol-specific
    feed_type TEXT NOT NULL, -- PLACEHOLDER for now
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  
  CREATE INDEX idx_flow_feed_items_user ON flow_feed_items(user_id);
  CREATE INDEX idx_flow_feed_items_timestamp ON flow_feed_items(timestamp DESC);
  ```

#### 2.5 RLS Policies
- **flow_widgets**: Users can only read/write their own widgets
- **flow_widget_cache**: Public read, service role write (shared across users)
- **flow_widget_refreshes**: Users can only read/write their own refresh records
- **flow_feed_items**: Users can only read/write their own feed items

### Phase 3: API Routes

#### 3.1 AlphaVantage Proxy Routes (Server-Side Only)
- **Location**: `apps/web/src/app/api/flow/alphavantage/[...path]/route.ts`
- **Purpose**: Proxy all AlphaVantage requests (never expose key client-side)
- **Environment Variable**: `ALPHA_VANTAGE_API_KEY` (server-only)
- **Pattern**: Dynamic catch-all route to forward requests to AlphaVantage
- **Implementation**: 
  - Extract path/query params from request
  - Append `apikey` from `process.env.ALPHA_VANTAGE_API_KEY`
  - Forward to `https://www.alphavantage.co/query?...`
  - Return response with caching headers

#### 3.2 Widget Data Route
- **Route**: `GET /api/flow/widgets/data`
- **Purpose**: Get widget data with cache + cooldown enforcement
- **Query Params**:
  - `widgetType`: Widget type (from allowlist)
  - `symbol`: Symbol (e.g., "ES", "NQ")
  - `forceRefresh`: Optional boolean to bypass cache
- **Logic**:
  1. Check cache (`flow_widget_cache`) - if valid, return cached data
  2. Check cooldown (`flow_widget_refreshes`) - if within 300s, return cached data
  3. If refresh allowed:
     - Call AlphaVantage proxy route
     - Normalize response to widget format
     - Store in cache (expires in 300s)
     - Update refresh cooldown record
     - Return data
  4. Return error if widget type not in allowlist

#### 3.3 Widget Configuration Routes
- **Route**: `GET /api/flow/widgets` - List user's widgets
- **Route**: `POST /api/flow/widgets` - Create new widget
- **Route**: `PUT /api/flow/widgets/[id]` - Update widget (position, config)
- **Route**: `DELETE /api/flow/widgets/[id]` - Delete widget
- **Auth**: All require authenticated user (via `getClerkUserId()`)

#### 3.4 Flow Feed Route
- **Route**: `GET /api/flow/feed`
- **Purpose**: Get flow feed items (placeholder until AlphaVantage docs)
- **Query Params**: `limit`, `offset`, `symbol` (optional)
- **Implementation**: Returns placeholder data until docs confirm endpoints

### Phase 4: Widget Type Allowlist

#### Internal Widget Types (NOT AlphaVantage endpoints)
- **FUTURES_SNAPSHOT**: Price, change, % for futures (e.g., ES, NQ, YM)
- **INDEX_SNAPSHOT**: Price, change, % for indices (e.g., SPX, NDX, DJX)
- **INTRADAY_SERIES**: Sparkline chart data for intraday price movement
- **SESSION_LEVELS**: High/Low/Open/VWAP derived from intraday data + VWAP indicator
- **VOLATILITY_RANGE**: ATR-based volatility metrics
- **FLOW_FEED**: Options flow data from REALTIME_OPTIONS or HISTORICAL_OPTIONS

#### Widget Type → AlphaVantage Endpoint Mapping (PREMIUM KEY AVAILABLE)

**FUTURES_SNAPSHOT / INDEX_SNAPSHOT**
- **Primary Endpoint**: `GLOBAL_QUOTE` (`function=GLOBAL_QUOTE&symbol={symbol}`)
  - Returns: `Global Quote` object with `05. price`, `09. change`, `10. change percent`
- **Fallback Endpoint**: `TIME_SERIES_INTRADAY` latest bar (if GLOBAL_QUOTE unavailable)
  - Extract latest timestamp OHLCV for price, derive change from previous close
- **Note**: Verify futures/indices symbol format (e.g., `/ES`, `NQ`, `SPX`) - docs show equity examples but mention 100,000+ symbols

**INTRADAY_SERIES**
- **Endpoint**: `TIME_SERIES_INTRADAY` (`function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=5min&outputsize=compact`)
  - Returns: `Time Series (5min)` object with timestamped OHLCV data
  - Extract: `close` prices for last 100 bars to generate sparkline
  - Normalize: Convert timestamp strings to Unix timestamps for chart library
- **Premium**: Realtime/15-min delayed data available (market hours)

**SESSION_LEVELS**
- **Endpoint 1**: `TIME_SERIES_INTRADAY` (`function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=1min&outputsize=full`)
  - Extract: Session High (max of `high`), Session Low (min of `low`), Session Open (first `open`)
  - Date Range: Filter by current trading day (9:30 AM - 4:00 PM ET for US markets)
- **Endpoint 2**: `VWAP` indicator (`function=VWAP&symbol={symbol}&interval=1min`)
  - Returns: `Technical Analysis: VWAP` with VWAP values per timestamp
  - Extract: Latest VWAP value for current session
- **Note**: VWAP is premium endpoint (available with premium key)

**VOLATILITY_RANGE**
- **Primary Endpoint**: `ATR` (`function=ATR&symbol={symbol}&interval=daily&time_period=14&series_type=close`)
  - Returns: `Technical Analysis: ATR` with ATR values
  - Extract: Latest ATR value, calculate range as `[currentPrice - ATR, currentPrice + ATR]`
- **Alternative**: `TRANGE` for true range (without averaging), or `NATR` for normalized ATR

**FLOW_FEED**
- **Primary Endpoint**: `REALTIME_OPTIONS` (`function=REALTIME_OPTIONS&symbol={symbol}&require_greeks=true`)
  - Returns: Full option chain sorted by expiration, then strike
  - Extract: Large/unusual volume transactions, call/put flow, open interest changes
  - Filter: Optionally filter by expiration date, strike range, volume thresholds
- **Alternative Endpoint**: `HISTORICAL_OPTIONS` (`function=HISTORICAL_OPTIONS&symbol={symbol}&date={YYYY-MM-DD}`)
  - Returns: Historical option chain for specific date
  - Use Case: Backfill or historical analysis
- **Supplement**: `NEWS_SENTIMENT` (`function=NEWS_SENTIMENT&tickers={symbol}`)
  - Returns: Market news articles with sentiment scores
  - Use Case: Contextual feed items alongside options flow

### Phase 5: Caching Strategy

#### Server-Side Caching
- **Storage**: Supabase `flow_widget_cache` table (shared across users)
- **TTL**: 300 seconds (5 minutes)
- **Key**: `{widgetType}:{symbol}`
- **Cleanup**: Expired cache can be cleaned via scheduled job or on-read check

#### Client-Side Cooldown UX
- **Display**: Countdown timer showing time until next refresh allowed
- **Storage**: Read from API response `next_refresh_at` timestamp
- **Update**: Client calculates remaining seconds and updates UI
- **Button State**: Disable refresh button when cooldown active

### Phase 6: Data Normalization

#### Widget Response Format
```typescript
interface WidgetData {
  widgetType: string;
  symbol: string;
  data: {
    // FUTURES_SNAPSHOT / INDEX_SNAPSHOT
    price?: number;
    change?: number;
    changePercent?: number;
    lastUpdate?: string; // ISO timestamp
    
    // INTRADAY_SERIES
    sparkline?: Array<{ time: number; price: number }>;
    
    // SESSION_LEVELS
    sessionHigh?: number;
    sessionLow?: number;
    sessionOpen?: number;
    vwap?: number;
    
    // VOLATILITY_RANGE
    volatility?: number; // ATR value
    range?: { low: number; high: number }; // currentPrice ± ATR
    
    // FLOW_FEED
    feedItems?: Array<{
      id: string;
      timestamp: string;
      symbol: string;
      expiration: string;
      strike: number;
      optionType: 'CALL' | 'PUT';
      volume: number;
      openInterest?: number;
      bid?: number;
      ask?: number;
      lastPrice?: number;
      delta?: number;
      gamma?: number;
      theta?: number;
      vega?: number;
      iv?: number;
    }>;
  };
  cached: boolean;
  cachedAt?: string;
  nextRefreshAt: string; // ISO timestamp
}
```

#### Normalization Layer
- **Location**: `apps/web/src/lib/flow/normalize.ts`
- **Purpose**: Convert AlphaVantage responses to `WidgetData` format
- **Per Widget Type**: Separate normalization function per widget type

**Normalization Functions:**

1. **`normalizeGlobalQuote(response, symbol)`** - For FUTURES_SNAPSHOT / INDEX_SNAPSHOT
   - Input: `{ "Global Quote": { "05. price": "150.25", "09. change": "1.50", "10. change percent": "1.01%" } }`
   - Extract: price (parse float), change (parse float), changePercent (parse float, strip %), lastUpdate (from response metadata)

2. **`normalizeIntradaySeries(response, symbol)`** - For INTRADAY_SERIES
   - Input: `{ "Time Series (5min)": { "2024-01-15 16:00:00": { "4. close": "150.25" }, ... } }`
   - Extract: Sort timestamps, convert to Unix timestamps, extract close prices
   - Output: Array of `{ time: number, price: number }` for sparkline

3. **`normalizeSessionLevels(intradayResponse, vwapResponse, symbol)`** - For SESSION_LEVELS
   - Input 1: `TIME_SERIES_INTRADAY` response (filter by current trading day)
   - Input 2: `VWAP` response `{ "Technical Analysis: VWAP": { "2024-01-15 16:00:00": { "VWAP": "150.10" } } }`
   - Extract: sessionHigh (max of `high`), sessionLow (min of `low`), sessionOpen (first `open`), vwap (latest VWAP value)

4. **`normalizeVolatilityRange(atrResponse, currentPrice, symbol)`** - For VOLATILITY_RANGE
   - Input: `{ "Technical Analysis: ATR": { "2024-01-15": { "ATR": "2.50" } } }`
   - Extract: Latest ATR value, calculate range as `[currentPrice - ATR, currentPrice + ATR]`

5. **`normalizeOptionsFlow(response, symbol)`** - For FLOW_FEED
   - Input: `REALTIME_OPTIONS` response with nested option chain structure
   - Extract: Option contracts, filter by volume/interest thresholds, map to feed items
   - Note: AlphaVantage options response structure needs verification (docs don't show full example JSON)

**Error Handling:**
- Check for `Note` or `Error Message` keys in AlphaVantage responses (rate limit messages)
- Validate response structure before normalization
- Return normalized error format: `{ error: string, code?: string }`
- Log raw responses for debugging (server-side only)

### Phase 7: UI Components (Placeholder Plan)

#### 7.1 Flow Page Component
- **Location**: `apps/web/src/app/(app)/flow/page.tsx`
- **Structure**: 
  - Tab navigation (Dashboard / Flow Feed)
  - Conditional render based on active tab
  - "Documentation Pending" placeholder if AlphaVantage not configured

#### 7.2 Dashboard Tab
- **Widget Grid**: Drag-and-drop or fixed grid layout for widgets
- **Add Widget**: Button/modal to add new widgets (type + symbol selection)
- **Widget Cards**: Reusable widget card component
- **Refresh UI**: Per-widget refresh button with cooldown countdown

#### 7.3 Flow Feed Tab
- **Feed List**: Scrollable list of feed items
- **Filters**: Optional symbol filter
- **Pagination**: Load more / infinite scroll

#### 7.4 Widget Components (Per Type)
- **Location**: `apps/web/src/components/flow/`
- **Components**:
  - `FuturesSnapshotWidget.tsx`
  - `IndexSnapshotWidget.tsx`
  - `IntradaySeriesWidget.tsx` (uses sparkline chart)
  - `SessionLevelsWidget.tsx`
  - `VolatilityRangeWidget.tsx`
  - `FlowFeedWidget.tsx`

### Phase 8: Environment Variables

#### Required Environment Variables
- **`ALPHA_VANTAGE_API_KEY`**: AlphaVantage API key (server-only, never exposed client-side)
- **Add to**: `apps/web/src/lib/env.server.ts` for validation
- **Usage**: Only read in server-side API routes

### Phase 9: Documentation Pending Placeholder

#### UI Message
- **Condition**: Show if `ALPHA_VANTAGE_API_KEY` not configured or AlphaVantage docs not reviewed
- **Message**: "Flow is being configured — upload provider docs to enable data"
- **Location**: Center of Flow page (both tabs) if no data/config available

## Implementation Checklist (Premium API Key Available)

- [x] Review AlphaVantage API documentation
- [x] Map widget types to AlphaVantage endpoints (premium endpoints available)
- [ ] **VERIFY**: Test futures/indices symbol format (e.g., `/ES`, `NQ`, `SPX`) - docs show equity examples
- [ ] **VERIFY**: Test REALTIME_OPTIONS response structure (docs don't show full JSON example)
- [ ] Create database migrations for all tables
- [ ] Implement RLS policies
- [ ] Create AlphaVantage proxy route (with API key protection)
- [ ] Implement widget data route (cache + cooldown)
- [ ] Implement widget config CRUD routes
- [ ] Implement normalization layer (with verified response structures)
- [ ] Create Flow page with sub-tabs
- [ ] Add Flow tab to Sidebar navigation
- [ ] Create widget components
- [ ] Implement dashboard grid layout
- [ ] Implement refresh cooldown UI
- [ ] Create Flow Feed tab (REALTIME_OPTIONS integration)
- [ ] Add environment variable validation (`ALPHA_VANTAGE_API_KEY`)
- [ ] Test cache expiration (300s TTL)
- [ ] Test cooldown enforcement (server + client, 300s)
- [ ] Test premium endpoint access (VWAP, REALTIME_OPTIONS)
- [ ] Test symbol validation (futures/indices format)
- [ ] Manual testing checklist

## Security Considerations

1. **API Key**: Never expose `ALPHA_VANTAGE_API_KEY` client-side
2. **Widget Type Validation**: Server-side allowlist check (never accept arbitrary types)
3. **User Isolation**: RLS ensures users can only access their own widgets/configs
4. **Cache Sharing**: Widget cache is shared (symbol-based), but user configs are isolated
5. **Rate Limiting**: Cooldown prevents excessive API calls (300s per widget)

## Notes

- No existing market data/news modules to reuse
- Chart libraries already available (`lightweight-charts`, `recharts`)
- Supabase is already configured and used throughout app
- Clerk auth system is already integrated
- Environment variable pattern established in `env.server.ts`
- **Premium API Key Available**: VWAP, REALTIME_OPTIONS, HISTORICAL_OPTIONS, and realtime intraday data are accessible
- **Symbol Verification Needed**: Test actual futures/indices symbols (e.g., `/ES`, `NQ`, `SPX`) - AlphaVantage docs show equity examples but claim 100,000+ symbols
- **Options Response Structure**: REALTIME_OPTIONS response format needs verification (docs show endpoint but not full JSON example)
