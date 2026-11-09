# Quick Reference: Mobile App Color Matching

## Color Values

### Mobile App Theme (Source)
From `/apps/mobile/src/design/theme.ts`:

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

### Web App Implementation (Now Matching)
In `tailwind.config.js`:

```javascript
positive: {
  DEFAULT: '#0D9488',  // Teal-600 - main positive color
  light: '#14B8A6',    // Teal-500 - lighter variant
  dark: '#0F766E',     // Teal-700 - darker variant
  bg: 'rgba(13, 148, 136, 0.1)',
  bgStrong: 'rgba(13, 148, 136, 0.2)',
},
negative: {
  DEFAULT: '#E57373',  // Muted coral - main negative color
  light: '#EF9A9A',    // Lighter coral
  dark: '#D32F2F',     // Darker coral
  bg: 'rgba(229, 115, 115, 0.1)',
  bgStrong: 'rgba(229, 115, 115, 0.2)',
}
```

## Usage Examples

### Before (Old Colors)
```tsx
// Charts
stroke="#14b8a6"
fill="#f97316"

// Components
className="text-green-500"
className="text-red-500"
className="bg-green-500/20"
className="bg-red-500/20"
```

### After (Mobile-Matching Colors)
```tsx
// Charts
stroke="#0D9488"
fill="#E57373"

// Components
className="text-positive"
className="text-negative"
className="bg-positive/20"
className="bg-negative/20"
```

## Visual Comparison

### Old Teal vs New Teal
```
Old: #14b8a6 ████████ (brighter, more saturated)
New: #0D9488 ████████ (muted, professional, matches mobile)
```

### Old Coral vs New Coral
```
Old: #f97316 ████████ (orange-coral, bright)
New: #E57373 ████████ (pink-coral, softer, matches mobile)
```

## Where to Use Each Color

### Use `positive` (Teal #0D9488)
✅ Winning trades
✅ Positive P&L
✅ Gains
✅ Win rate >= 50%
✅ Profit factor >= 1
✅ Any upward/positive metric
✅ Bullish bias

### Use `negative` (Coral #E57373)
✅ Losing trades
✅ Negative P&L
✅ Losses
✅ Win rate < 50%
✅ Drawdowns
✅ Any downward/negative metric
✅ Bearish bias

### Use `success` (Same as positive)
✅ Success messages
✅ Connection status
✅ Completed actions
✅ Active/running states

### Use `danger` (Red #ef4444)
⚠️ Error messages
⚠️ Violations
⚠️ Destructive actions
⚠️ Delete buttons
⚠️ Warning states

## Platform Consistency Achieved

| Element | Mobile App | Web App (Before) | Web App (Now) |
|---------|-----------|------------------|---------------|
| Positive Stats | #0D9488 | #14b8a6 | #0D9488 ✅ |
| Negative Stats | #E57373 | #f97316 | #E57373 ✅ |
| Win Rate Chart | Teal-600 | Teal-500 | Teal-600 ✅ |
| P&L Chart | Muted Coral | Orange-Coral | Muted Coral ✅ |
| Success Badge | #0D9488 | green-500 | #0D9488 ✅ |
| Loss Badge | #E57373 | red-500 | #E57373 ✅ |

## Testing Checklist

When testing the new colors, verify:

- [ ] Dashboard equity curve uses teal for positive, coral for negative
- [ ] Analytics charts match mobile app colors
- [ ] Performance page stats use consistent colors
- [ ] EDGE page charts match mobile app
- [ ] Strategy cards show correct win/loss colors
- [ ] Trade tables use teal/coral for outcomes
- [ ] Journal page bias indicators match mobile
- [ ] Risk page violations still show red warnings
- [ ] All themes (light/dark/custom) display colors correctly
- [ ] Mobile responsive view matches desktop

## Developer Notes

### Adding New Stats
When adding new performance metrics, use:
```tsx
<div className={`text-2xl font-bold ${value >= 0 ? 'text-positive' : 'text-negative'}`}>
  {value}
</div>
```

### Adding New Charts
When creating new Recharts components, use:
```tsx
<Line stroke="#0D9488" />  // For positive metrics
<Area fill="#E57373" />     // For negative metrics
```

### Adding New Status Indicators
For UI states (not performance stats):
```tsx
<div className={`${isSuccess ? 'text-success' : 'text-danger'}`}>
  {message}
</div>
```
