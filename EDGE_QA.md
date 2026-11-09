# EDGE QA Testing Steps

This document provides step-by-step manual testing procedures for the EDGE feature module.

## Prerequisites

1. Install dependencies: `pnpm install`
2. Run web app: `pnpm dev:web` (runs on http://localhost:3000)
3. Have a valid ProjectX JWT token and Account ID ready

## Test 1: Connect to ProjectX

1. Navigate to `/edge`
2. Verify the "ProjectX Connection" card is visible
3. Enter a valid JWT token in the "Token" field
4. Enter an Account ID (e.g., 203)
5. Toggle "Live mode" if needed (default: unchecked = sim)
6. Click "Connect"
7. **Expected**: Status changes to "Connected" with green indicator
8. **Expected**: Account ID and mode are displayed
9. **Expected**: Token field is cleared (not stored in UI)

## Test 2: Sync Trades

1. Ensure you're connected to ProjectX (from Test 1)
2. Set date range:
   - Start Date: 30 days ago
   - End Date: Today
3. Click "Sync Trades"
4. **Expected**: Button shows "Syncing..." during operation
5. **Expected**: After completion, alert shows "Synced X executions into Y round-trip trades"
6. **Expected**: "Last synced" time updates
7. **Expected**: Execution and trade counts are displayed
8. Navigate to `/edge/trades`
9. **Expected**: Trades table shows synced round-trip trades

## Test 3: Verify Trade Grouping

1. After syncing trades (from Test 2), navigate to `/edge/trades`
2. **Expected**: Each row represents a complete round-trip trade
3. **Expected**: Trades have:
   - Entry time and exit time
   - Direction (LONG or SHORT)
   - Entry price and exit price (weighted averages)
   - Duration
   - Fees total
   - Net P&L
   - Outcome (WIN, LOSS, or BREAKEVEN)
4. Click on a trade row to expand
5. **Expected**: Underlying executions are shown with:
   - Timestamp
   - Side (BUY/SELL)
   - Size
   - Price
   - Fees
   - P&L (if available)
6. **Expected**: Executions are sorted chronologically
7. **Expected**: Net position logic: entries build position, exits close position

## Test 4: Open Chart and Load Bars

1. Navigate to `/edge/chart`
2. In the contract search box, type "MNQ" and press Enter
3. **Expected**: Contract is selected (check console or UI feedback)
4. **Expected**: Chart loads with candlestick data
5. **Expected**: Loading indicator appears during data fetch
6. Change timeframe to "1h"
7. **Expected**: Chart reloads with hourly bars
8. **Expected**: Bars are properly formatted (OHLC + volume)

## Test 5: View Trade Markers on Chart

1. Ensure you have synced trades (from Test 2)
2. On chart page, select a contract that has trades
3. **Expected**: Trade markers appear on chart:
   - Entry markers: Arrow up (LONG) or arrow down (SHORT) at entry price
   - Exit markers: Circle at exit price
4. **Expected**: Markers are color-coded:
   - Green for wins
   - Red for losses
   - Gray for breakeven
5. **Expected**: Marker text shows direction, quantity, and P&L
6. Check trades list sidebar
7. **Expected**: Trades for selected contract are listed
8. **Expected**: Clicking a trade focuses/highlights it on chart

## Test 6: Replay Mode Hides Future Candles

1. Navigate to `/edge/chart`
2. Load a contract with historical data
3. Switch to "Replay" mode
4. **Expected**: Replay controls appear (play/pause, step, speed)
5. **Expected**: Chart shows only bars up to replay cursor
6. **Expected**: Future candles are hidden
7. Click play
8. **Expected**: Replay cursor advances through time
9. **Expected**: Trades appear as replay time reaches their entry time
10. Toggle "Hide future trades"
11. **Expected**: Only trades with entryTime <= replayTime are shown

## Test 7: Backtest Mode Creates Hypothetical Trades

1. Navigate to `/edge/chart`
2. Switch to "Backtest" mode
3. **Expected**: Backtest controls appear
4. Click "Add Hypothetical Trade"
5. Select "Long" or "Short"
6. Click on chart to set entry point
7. **Expected**: Entry marker appears
8. Click on chart to set exit point
9. **Expected**: Exit marker appears (distinct style from real trades)
10. **Expected**: Hypothetical trade is created with computed P&L
11. Add optional tags, strategy, and notes
12. **Expected**: Trade is saved to localStorage
13. View backtest stats
14. **Expected**: Stats show win rate, profit factor, expectancy for hypothetical trades only

## Test 8: Performance Dashboard Metrics

1. Navigate to `/edge` (overview page)
2. Ensure you have synced trades (from Test 2)
3. **Expected**: Performance dashboard shows:
   - Total Trades
   - Win Rate (%)
   - Net P&L ($)
   - Profit Factor
   - Avg Win ($)
   - Avg Loss ($)
   - Max Drawdown ($)
   - Total Fees ($)
4. Hover over info (ⓘ) icon on any metric
5. **Expected**: Tooltip appears with metric explanation
6. **Expected**: Metrics are calculated correctly from synced trades

## Test 9: Trade Filters

1. Navigate to `/edge/trades`
2. Set outcome filter to "Win"
3. **Expected**: Only winning trades are shown
4. Set outcome filter to "Loss"
5. **Expected**: Only losing trades are shown
6. Enter contract name in "Contract" filter
7. **Expected**: Only trades for that contract are shown
8. Enter search text
9. **Expected**: Trades matching search are shown
10. Clear all filters
11. **Expected**: All trades are shown

## Test 10: Chart Customization

1. Navigate to `/edge/chart`
2. Click "Appearance" or settings button
3. **Expected**: Appearance panel opens
4. Change theme (Light/Dark)
5. **Expected**: Chart theme updates
6. Toggle grid on/off
7. **Expected**: Grid lines appear/disappear
8. Change candle colors
9. **Expected**: Candle colors update
10. Change background color
11. **Expected**: Chart background updates
12. Click "Save as default"
13. **Expected**: Preferences are saved
14. Refresh page
15. **Expected**: Preferences persist

## Test 11: Indicators

1. Navigate to `/edge/chart`
2. Load a contract with data
3. Toggle "EMA 20"
4. **Expected**: EMA 20 line appears on chart
5. Toggle "SMA 200"
6. **Expected**: SMA 200 line appears on chart
7. Toggle both off
8. **Expected**: Indicator lines disappear
9. Check placeholder indicators (VWAP, RSI, MACD, ATR)
10. **Expected**: They show "coming soon" tooltip when hovered

## Test 12: Contract Search

1. Navigate to `/edge/chart`
2. Type "ES" in contract search and press Enter
3. **Expected**: Contract search API is called
4. **Expected**: Results show matching contracts
5. **Expected**: Active contracts are prioritized
6. Select a contract
7. **Expected**: Contract ID is set
8. **Expected**: Chart loads data for selected contract

## Test 13: Timeframe Switching

1. Navigate to `/edge/chart`
2. Load a contract
3. Change timeframe from "5m" to "1h"
4. **Expected**: Chart reloads with hourly bars
5. **Expected**: Bars are properly aggregated
6. Change to "1D"
7. **Expected**: Daily bars are loaded
8. **Expected**: Chart scales appropriately

## Test 14: Data Persistence

1. Sync trades (from Test 2)
2. Navigate away from EDGE pages
3. Return to `/edge`
4. **Expected**: Synced data is still present
5. **Expected**: Metrics are calculated from persisted data
6. Clear browser localStorage
7. **Expected**: All EDGE data is cleared
8. Re-sync required

## Test 15: Error Handling

1. Navigate to `/edge`
2. Try to connect with invalid token
3. **Expected**: Error message appears
4. Try to sync without account ID
5. **Expected**: Alert: "Please set accountId before syncing"
6. Try to load chart without contract
7. **Expected**: No data loads (graceful handling)
8. Try invalid date range
9. **Expected**: Error message or empty results

## Edge Cases

### Large Date Ranges
- Test syncing 90+ days of trades
- **Expected**: API calls are chunked if needed
- **Expected**: All trades are synced successfully

### Multiple Contracts
- Sync trades across multiple contracts
- **Expected**: All contracts appear in filters
- **Expected**: Chart shows trades for selected contract only

### No Trades in Date Range
- Sync a date range with no trading activity
- **Expected**: "No trades found" message
- **Expected**: No errors, graceful handling

### Contract Not Found
- Search for non-existent contract
- **Expected**: No results or error message
- **Expected**: No crashes

## Notes

- All ProjectX API calls are proxied through Next.js routes (no direct browser calls)
- Token is stored server-side only (httpOnly cookie)
- All trading actions are read-only (no order placement/modification)
- Data is stored in localStorage (cleared on browser data clear)
