# Color Scheme Update - Mobile App Alignment

## Summary

Updated web app colors to match the mobile app's color scheme for consistency across platforms.

## New Color Scheme (Matching Mobile App)

### Performance/Stat Colors

**Positive/Win/Gain:**
- **Main**: `#0D9488` (Teal-600)
- Light variant: `#14B8A6` (Teal-500)
- Dark variant: `#0F766E` (Teal-700)
- Background: `rgba(13, 148, 136, 0.1)`

**Negative/Loss:**
- **Main**: `#E57373` (Muted Coral/Rose)
- Light variant: `#EF9A9A` (Lighter Coral)
- Dark variant: `#D32F2F` (Darker Coral)
- Background: `rgba(229, 115, 115, 0.1)`

### UI State Colors (Non-Stats)

**Success** (for success messages, not stats):
- Same as positive: `#0D9488`

**Danger/Error** (for errors, warnings):
- Keeps red: `#ef4444`

**Warning**:
- Amber: `#f59e0b`

## Changes Made

### 1. Tailwind Config (`tailwind.config.js`)

Added custom color definitions:
- `positive` - For trading wins/gains
- `negative` - For trading losses
- Updated `success` to match `positive`
- Kept `danger` as red for errors

### 2. Chart Files Updated

Replaced all color hex codes:
- `#14b8a6` → `#0D9488` (old teal → mobile teal)
- `#f97316` → `#E57373` (old coral → mobile coral)

**Files Updated:**
- ✅ `/app/(app)/app/page.tsx` (Dashboard)
- ✅ `/app/(app)/analytics/page.tsx` (Analytics)
- ✅ `/app/(app)/performance/page.tsx` (Performance)
- ✅ `/app/(app)/strategies/page.tsx` (Strategies)
- ✅ `/app/edge/page.tsx` (EDGE)

### 3. Color Usage Guidelines

**Use `positive` color for:**
- Winning trades
- Positive P&L
- Gains
- Win rates >= 50%
- Profit factors >= 1
- Any positive performance metric

**Use `negative` color for:**
- Losing trades
- Negative P&L
- Losses
- Win rates < 50%
- Drawdowns
- Any negative performance metric

**Keep `danger` (red) for:**
- Error messages
- Delete buttons
- Violation warnings
- Destructive actions

## Tailwind Classes Available

```tsx
// Text colors
className="text-positive"       // #0D9488
className="text-positive-light" // #14B8A6
className="text-positive-dark"  // #0F766E
className="text-negative"       // #E57373
className="text-negative-light" // #EF9A9A
className="text-negative-dark"  // #D32F2F

// Background colors
className="bg-positive"
className="bg-negative"

// Border colors
className="border-positive"
className="border-negative"
```

## Benefits

1. **Cross-Platform Consistency** - Web and mobile apps now use identical colors
2. **Semantic Naming** - `positive`/`negative` is clearer than `teal`/`coral`
3. **Maintainability** - Update colors in one place (Tailwind config)
4. **Type Safety** - Tailwind IntelliSense autocompletes custom colors
5. **Professional** - Follows design system best practices

## Next Steps

### Remaining Files to Update (Future)

Files still using old green/red Tailwind classes that should be updated to use the new `positive`/`negative` colors:

**High Priority:**
- Widget components (`components/widgets/*.tsx`)
- Flow page charts
- Risk page stats (keep red for violation warnings)
- Trade detail pages
- Strategy cards

**Medium Priority:**
- Theme system files (for consistency)
- Layout initialization

**Low Priority:**
- UI state indicators (evaluate case-by-case)
- Connection status (can stay green)

### Migration Strategy

For future updates, search and replace:
- `text-green-500` → `text-positive` (in stat contexts)
- `text-red-500` → `text-negative` (in stat contexts)
- Keep `text-red-500` for actual errors/warnings

## Testing

Verify colors appear correctly on:
- [ ] Dashboard page
- [ ] Analytics page
- [ ] Performance page
- [ ] EDGE page
- [ ] Strategies page
- [ ] All chart visualizations
- [ ] Both light and dark themes
- [ ] Mobile responsive views

## Mobile App Reference

Colors sourced from: `/apps/mobile/src/design/theme.ts`

```typescript
semantic: {
  success: '#0D9488',  // Muted teal
  error: '#E57373',    // Muted coral
}

success: {
  light: '#14B8A6',
  main: '#0D9488',
  dark: '#0F766E',
}

error: {
  light: '#EF9A9A',
  main: '#E57373',
  dark: '#D32F2F',
}
```
