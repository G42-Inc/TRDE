# EDGE Documentation

EDGE is a broker-linked, read-only analytics and chart review workspace for TRDE. It connects to TopstepX/ProjectX API to pull historical trades, executions, and market data for analysis and review.

## Features

### 1. ProjectX Connection
- Connect to ProjectX API using JWT token
- Configure account ID (required for trade sync)
- Toggle between sim and live modes
- Token is stored server-side only (httpOnly cookie)

### 2. Trade Sync & Normalization
- Sync historical executions/trades from ProjectX over a chosen date range
- Automatically group executions into round-trip trades
- Categorize trades by outcome: Win/Loss/Breakeven (based on net P&L)
- Persist synced data locally (localStorage)

### 3. Chart Review Workstation
- Professional candlestick charts using Lightweight Charts
- Real-time contract switching (search and select)
- Timeframe switching (1m, 5m, 15m, 1h, 4h, 1D)
- Chart customization (colors, theme, grid)
- Indicators: EMA 20, SMA 200 (with placeholders for VWAP, RSI, MACD, ATR)
- Overlay broker-synced trades on chart (entry/exit markers)
- Click trade from list or marker to focus/highlight

### 4. Replay Viewer Mode
- Historical replay that hides future candles (no peeking)
- Trades appear as replay time reaches them
- Controls: play/pause, step, speed, jump-to-time
- Optional toggle: "Hide future trades" (only show trades with entryTime <= replay time)

### 5. Manual Backtest Mode
- Create "Hypothetical Trades" as annotations
- Set entry and exit points on chart
- Tag strategy/setup and add notes
- Compute hypothetical P&L using prices (net of assumed fees/slippage)
- Distinct marker style for hypothetical trades
- Stats for hypothetical trades (win rate, PF, expectancy)

### 6. Performance Dashboard
- Overview cards and charts computed from broker-synced trades:
  - Total trades (round trips)
  - Win rate
  - Net P&L
  - Avg win / Avg loss
  - Profit factor
  - Max drawdown
  - Fees total
  - Best day / Worst day
  - Contract leaderboard
  - Day-of-week performance
  - Time-of-day distribution
- Info buttons with metric explainers

## API Endpoints Used (Read-Only)

EDGE uses the following ProjectX API endpoints (all read-only):

### Contracts
- `POST /api/Contract/search` - Search for contracts
- `POST /api/Contract/searchById` - Get contract by ID
- `POST /api/Contract/available` - Get available contracts

### Historical Data
- `POST /api/History/retrieveBars` - Retrieve historical bars
  - Max 20,000 bars per request
  - Automatically chunked for larger date ranges

### Trades/Executions
- `POST /api/Trade/search` - Search for trades/executions
  - Requires accountId, startTimestamp, optional endTimestamp

### Optional (Context Only)
- `POST /api/Order/search` - Search orders (read-only)
- `POST /api/Order/searchOpen` - Get open orders (read-only)
- `POST /api/Position/searchOpen` - Get open positions (read-only)

## Security

- **No browser-side API calls**: All ProjectX API calls are proxied through Next.js route handlers
- **Server-side token storage**: ProjectX JWT token is stored in httpOnly cookie (never exposed to client)
- **Read-only only**: EDGE does not place, cancel, or modify orders
- **Local data storage**: Synced bars and trades are stored in localStorage (safe, read-only data)

## How to Connect

1. Navigate to `/edge`
2. Enter your ProjectX JWT token
3. Enter your Account ID (required for trade sync)
4. Select sim or live mode
5. Click "Connect"

## How to Sync Trades

1. Ensure you're connected to ProjectX
2. Set a date range (start and end dates)
3. Click "Sync Trades"
4. EDGE will:
   - Fetch all executions from ProjectX for the date range
   - Normalize executions into internal format
   - Group executions into round-trip trades
   - Calculate P&L, fees, and outcomes
   - Store locally for analysis

## Trade Grouping Logic

EDGE groups executions into round-trip trades using the following algorithm:

1. Sort executions by timestamp (ascending)
2. Track net position as executions are processed
3. When net position returns to 0, close a trade
4. Calculate:
   - Weighted average entry price
   - Weighted average exit price
   - Direction (LONG if net position was positive, SHORT if negative)
   - Total fees
   - Gross P&L (from API or estimated from price difference)
   - Net P&L (gross P&L - fees)
   - Outcome (WIN if net P&L > $0.01, LOSS if < -$0.01, BREAKEVEN otherwise)

## Chart Workstation

### Contract Selection
- Use the search box to find contracts (e.g., "MNQ", "ES")
- Active contracts are prioritized in results
- Selected contract is used for chart and trade filtering

### Timeframes
- 1m, 5m, 15m, 1h, 4h, 1D
- Automatically handles 20k bar limit with chunking

### Indicators
- **EMA 20**: 20-period Exponential Moving Average (implemented)
- **SMA 200**: 200-period Simple Moving Average (implemented)
- **Placeholders**: VWAP, RSI, MACD, ATR (coming soon)

### Trade Markers
- Entry markers: Arrow up (LONG) or arrow down (SHORT) at entry price
- Exit markers: Circle at exit price
- Color coding: Green (win), Red (loss), Gray (breakeven)

## Replay Mode

Replay mode allows you to review historical data without seeing future information:

- Only bars up to the replay cursor are shown
- Trades appear as replay time reaches their entry time
- Controls: play/pause, step forward, speed adjustment, jump to time
- Optional: Hide future trades (only show trades with entryTime <= replayTime)

## Manual Backtest Mode

Create hypothetical trades to test strategies:

1. Switch to "Backtest" mode
2. Click "Add Hypothetical Trade"
3. Select Long/Short
4. Click chart to set entry point (time + price)
5. Click chart to set exit point (time + price)
6. Add optional tags, strategy, and notes
7. Hypothetical P&L is computed using contract tickValue/tickSize
8. View backtest stats (win rate, profit factor, expectancy)

## Limitations

### Contract Roll Handling
- EDGE does not automatically handle contract rolls
- If you trade multiple contract months, they appear as separate contracts
- Manual grouping may be needed for analysis across contract months

### P&L Estimation
- If ProjectX API provides `profitAndLoss` field, it's used directly
- Otherwise, P&L is estimated from price difference × tickValue × qty
- Estimation may not account for all fees or adjustments

### Data Persistence
- All data is stored in browser localStorage
- Clearing browser data will remove synced trades and bars
- Re-sync required after clearing data

## Troubleshooting

### "Not connected to ProjectX" error
- Ensure you've connected via `/edge` page
- Check that token is valid and not expired
- Verify account ID is set if syncing trades

### No trades appear after sync
- Check date range (ensure it includes trading activity)
- Verify account ID is correct
- Check browser console for errors

### Chart not loading
- Ensure contract ID is valid
- Check that date range has available data
- Verify ProjectX connection is active

## Future Enhancements

- Additional indicators (VWAP, RSI, MACD, ATR)
- Contract roll detection and handling
- Advanced replay controls
- Export backtest results
- Multi-contract analysis
- Performance attribution by strategy/setup
