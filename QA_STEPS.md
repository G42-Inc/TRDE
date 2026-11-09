# QA Testing Steps

This document provides step-by-step manual testing procedures for the TRDE application.

## Prerequisites
1. Install dependencies: `pnpm install`
2. For web: `pnpm dev:web` (runs on http://localhost:3000)
3. For mobile: `pnpm dev:mobile` (requires Expo Go app or emulator)

## Web App Testing

### 1. Initial Load and Data Seeding
1. Open http://localhost:3000
2. Verify dashboard loads
3. Check that 300 trades are loaded (check browser console or navigate to Trades page)
4. Verify strategies, collections, and saved filters are populated

### 2. Add Trade (Futures)
1. Navigate to `/trades/new`
2. Select "Futures" as asset class
3. Fill in:
   - Trade Date: Today's date
   - Direction: Long
   - Quantity: 2
   - Planned Risk (USD): 200
   - Strategy: Select any strategy
   - Strategy Version: Select version
   - Grade: B
   - Notes: "Test futures trade"
4. Click "Create Trade"
5. Verify redirect to trade detail page
6. Verify trade appears in trades list

### 3. Add Trade (Options)
1. Navigate to `/trades/new`
2. Select "Options" as asset class
3. Fill in form (similar to futures)
4. Create trade
5. Verify options trade appears correctly

### 4. View and Filter Trades
1. Navigate to `/trades`
2. Verify trades table displays
3. Use filters:
   - Select "Futures" in Asset Class filter
   - Select "Win" in Outcome filter
   - Select "A" in Grade filter
4. Verify filtered results update
5. Click on a trade row
6. Verify navigation to trade detail page

### 5. Trade Detail Page
1. Navigate to `/trades/[id]` (any trade ID)
2. Verify all trade details display:
   - Date, instrument, direction, result, grade
   - Strategy, setups, session, regime
   - Mistakes, notes
3. Scroll to Collections section
4. Check/uncheck collections
5. Verify collections update (check localStorage or refresh)

### 6. Saved Filters
1. Navigate to `/trades`
2. Apply some filters (e.g., Grade: A, Outcome: Win)
3. Click "+ Save" in Saved Filters section
4. Enter filter name: "Winning A Trades"
5. Click "Save"
6. Clear filters
7. Click "Winning A Trades" in saved filters
8. Verify filters are restored

### 7. Collections
1. Navigate to `/trades`
2. Click on any trade to view detail
3. In Collections section, check "A+ Setups"
4. Navigate back to trades list
5. Verify trade can be found in collection view (if implemented)

### 8. Flag for Review
1. Navigate to a trade detail page
2. Edit trade to set reviewFlag: true (or add UI button if implemented)
3. Navigate to `/review`
4. Verify trade appears in Review Queue

### 9. Analytics Dashboard
1. Navigate to `/analytics`
2. Verify all metric cards display:
   - Win Rate, Expectancy, Profit Factor, Total P&L, etc.
3. Click info button (ⓘ) on "Win Rate" card
4. Verify modal opens with:
   - Definition
   - Why It Matters
   - Calculation
   - Interpretation
   - Examples
5. Close modal
6. Repeat for other metrics
7. Verify charts display:
   - Rolling Expectancy line chart
   - R Distribution bar chart
   - Day of Week Performance bar chart
   - Strategy Leaderboard list

### 10. Analytics Glossary
1. Navigate to `/analytics/glossary`
2. Verify all metrics are listed with full explanations
3. Scroll through and verify content is complete

### 11. Weekly Review
1. Navigate to `/review`
2. Click "+ New Review"
3. Fill in:
   - Week Start: Last Monday
   - Week End: Last Sunday
   - Summary: "Good week"
   - Add wins: "Good entries", "Stuck to plan"
   - Add losses: "Overtraded Tuesday"
   - Improvements: "Better exit timing"
   - Next Week Plan: "Focus on RTH only"
4. Click "Save Review"
5. Verify review appears in Past Reviews section

### 12. Journal
1. Navigate to `/journal`
2. Click "+ Daily Bias"
3. Fill in:
   - Date: Today
   - Bias: Bullish
   - Reason: "Strong momentum"
   - Confidence: 75%
4. Click "Save"
5. Verify bias appears in list
6. Click "+ Quick Journal"
7. Fill in mood and note
8. Save and verify

### 13. Risk Management
1. Navigate to `/risk`
2. Verify Risk Rules display
3. Verify Discipline Score displays
4. Verify Risk Creep chart displays
5. Click "Edit Rules"
6. Modify Daily Loss Limit to 1500
7. Click "Save"
8. Verify rules update

### 14. Strategies
1. Navigate to `/strategies`
2. Verify all strategies display with versions
3. Verify strategy cards show name and description

### 15. Export CSV
1. Navigate to `/settings`
2. Click "Export Trades to CSV"
3. Verify CSV file downloads
4. Open CSV file
5. Verify all trades are included with correct columns

### 16. Export Weekly Report (Mock)
1. Navigate to `/settings`
2. Click "Export Weekly Report (Mock PDF)"
3. Verify modal opens with report preview
4. Verify report contains:
   - Summary statistics
   - Review notes (if weekly review exists)
   - Trade list
5. Click "Download as Text" (or mock complete message)
6. Verify file/text is provided

### 17. Reset Demo Data
1. Navigate to `/settings`
2. Scroll to "Data Management"
3. Click "Reset Demo Data"
4. Verify confirmation dialog appears
5. Click "Confirm Reset"
6. Verify page reloads
7. Verify 300 trades are reloaded
8. Verify all data is reset

## Mobile App Testing

### 1. Initial Load
1. Start Expo app: `pnpm dev:mobile`
2. Open in Expo Go or emulator
3. Verify app loads
4. Verify data is initialized (check Dashboard shows metrics)

### 2. Dashboard
1. Verify Dashboard tab shows:
   - Total P&L, Win Rate, Expectancy, Discipline Score
   - Recent Trades list
2. Tap "+ New Trade" button
3. Verify navigation (if New Trade screen implemented)

### 3. Trades List
1. Navigate to Trades tab
2. Verify trades list displays
3. Tap on a trade
4. Verify navigation to trade detail (if implemented)

### 4. Analytics
1. Navigate to Analytics tab
2. Verify metric cards display
3. Tap info button (ⓘ) on any metric
4. Verify bottom sheet modal opens
5. Verify explainer content displays:
   - Definition, Why It Matters, Calculation, Interpretation, Examples
6. Swipe down or tap close to dismiss
7. Repeat for multiple metrics

### 5. Analytics Glossary
1. In Analytics tab, tap "Glossary" link
2. Verify Glossary screen opens
3. Scroll through and verify all metrics are listed
4. Verify explanations are complete

### 6. Journal
1. Navigate to Journal tab
2. Verify Daily Bias section displays
3. Verify Quick Journals section displays
4. Verify empty states if no data

### 7. Settings
1. Navigate to Settings tab
2. Verify "Local-only prototype" message displays
3. Tap "Export Trades to CSV"
4. Verify mock export message or file sharing (if implemented)
5. Tap "Reset Demo Data"
6. Verify confirmation alert
7. Confirm reset
8. Verify data reloads

## Cross-Platform Testing

### Data Persistence
1. Add a trade in web app
2. Verify it persists after page refresh
3. (Note: Web and mobile use separate storage, so data won't sync between them)

### Analytics Consistency
1. View analytics in web app
2. Note specific metric values
3. View analytics in mobile app
4. Verify metrics compute the same (if using same seed data)

## Edge Cases to Test

1. **Empty States**
   - Delete all trades (if delete implemented)
   - Verify empty state messages display

2. **Filter Edge Cases**
   - Apply filters that return 0 results
   - Verify "No trades found" message

3. **Large Data Sets**
   - Verify performance with 300 trades
   - Check scrolling performance

4. **Invalid Input**
   - Try to create trade with negative quantity
   - Try to create trade with missing required fields
   - Verify validation messages

5. **Export Edge Cases**
   - Export with 0 trades
   - Export with filters applied (verify all or filtered trades)

## Notes
- Some features may have simplified UIs but core functionality is implemented
- Mobile navigation can be extended with stack navigators for detail screens
- All data is local-only (localStorage/AsyncStorage) - no backend sync
- Mock data is deterministic, so results should be consistent across runs
