# Color Replacement Strategy - Teal/Coral Update

## Color Mapping

### From (Green/Red) → To (Teal/Coral)

**Hex Colors:**
- `#22c55e` (green-500) → `#14b8a6` (teal)
- `#16a34a` (green-600) → `#14b8a6` (teal)
- `#15803d` (green-700) → `#0d9488` (teal-dark)
- `#10b981` (emerald-500) → `#14b8a6` (teal)
- `#ef4444` (red-500) → `#f97316` (coral)
- `#dc2626` (red-600) → `#f97316` (coral)
- `#b91c1c` (red-700) → `#ea580c` (coral-dark)

**Tailwind Classes:**
- `text-green-500` → `text-teal-500` or inline style with `#14b8a6`
- `text-green-600` → inline style with `#14b8a6`
- `text-green-700` → inline style with `#14b8a6`
- `bg-green-500` → `bg-teal-500` or inline style
- `border-green-500` → `border-teal-500` or inline style
- `text-red-500` → `text-coral` or inline style with `#f97316`
- `text-red-600` → inline style with `#f97316`
- `text-red-700` → inline style with `#f97316`
- `bg-red-500` → inline style
- `border-red-500` → inline style

## Files to Update (Priority Order)

### HIGH PRIORITY - Stats & Graphs
1. ✅ `/app/(app)/performance/page.tsx` - DONE
2. ✅ `/app/(app)/analytics/page.tsx` - DONE
3. ✅ `/app/edge/page.tsx` - DONE
4. ✅ `/app/(app)/app/page.tsx` - DONE
5. `/app/(app)/strategies/page.tsx` - IN PROGRESS
6. `/components/widgets/*.tsx` - IN PROGRESS
7. `/app/(app)/flow/page.tsx`
8. `/app/edge/trades/page.tsx`
9. `/app/(app)/risk/page.tsx`
10. `/app/(app)/trades/[id]/page.tsx`

### MEDIUM PRIORITY - Theme System
- `/lib/themes.ts` - Theme definitions (success/error colors)
- `/app/layout.tsx` - Theme initialization
- `/app/(auth)/layout.tsx` - Auth theme

### LOW PRIORITY - UI Elements (Keep Red for Errors/Warnings)
- Error states (keep red)
- Delete buttons (keep red)
- Warning indicators (keep red for violations)
- Connection status (green for connected - can stay or change to teal)

## Exceptions (Keep Original Colors)

### Keep RED for:
- Error messages and alerts
- Delete/Remove buttons
- Violation warnings (actual rule violations)
- Danger actions

### Keep GREEN for:
- Success messages (non-statistical)
- Connection status indicators
- Completed checkmarks

## Implementation Notes

For stats/graphs that show positive/negative performance:
- Replace ALL green → teal (`#14b8a6`)
- Replace ALL red → coral (`#f97316`)

For UI states (errors, warnings, success):
- Evaluate case-by-case
- Keep red for destructive actions
- Keep green for success states (non-statistical)
