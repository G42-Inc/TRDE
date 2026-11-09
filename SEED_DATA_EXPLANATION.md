# Seed Data Removal - Complete

## Summary

**Seed data has been permanently removed from the web app.** The app will never generate or use demo/seed data again.

## What Changed

### 1. Removed All Seed Data Generation (`/apps/web/src/lib/init.ts`)

**Before:**
- Generated 300 demo trades in development mode
- Created demo strategies, collections, biases, rules, journals

**After:**
- `initializeData()` now does nothing except log a message
- All imports from `@trde/mock-db` removed
- No data generation code exists

### 2. Updated Reset Function

**Before:**
- Cleared data AND regenerated seed data

**After:**
- Only clears localStorage
- No data regeneration
- App starts completely empty

### 3. Updated UI Labels (Settings Page)

**Before:**
- "Reset Demo Data"
- "Reset and reload demo data"

**After:**
- "Clear Local Data"
- "Clear local data and start fresh"
- Message clarifies cloud data is not affected

### 4. Updated Dev Tools Panel

**Before:**
- Had "Enable Seed Data" and "Disable Seed Data" buttons
- Info mentioned "Seed data only in dev mode"

**After:**
- Only has "Clear Local Data" button
- Info states "No seed data in this app"
- Lists data sources: manual entry, sync, or ProjectX

## Data Sources

The app now relies exclusively on:

1. **Manual Trade Entry** - Users create trades via the UI
2. **Cloud Sync** - Supabase synchronization (mobile ↔ web)
3. **ProjectX/EDGE Import** - Broker data import

## How to Clear Existing Seeded Data

### On Your VPS (Browser Console):

```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('trde_')) localStorage.removeItem(key);
});
location.reload();
```

### Via Settings Page:

1. Go to Settings → Data tab
2. Click "Clear Local Data"
3. Confirm the action

### Via Dev Tools (Development only):

1. Click "DEV" button in bottom-right
2. Click "Clear Local Data"
3. Confirm the action

## Files Modified

1. `/apps/web/src/lib/init.ts` - Removed all seed generation code
2. `/apps/web/src/components/DevTools.tsx` - Removed seed data toggles
3. `/apps/web/src/app/(app)/settings/page.tsx` - Updated labels and messaging
4. `/SEED_DATA_EXPLANATION.md` - Replaced with this file

## Verification

To verify seed data is gone:

1. Clear localStorage
2. Reload the app
3. Check that:
   - No trades appear
   - No strategies appear
   - All metrics show zero
   - Console logs: "App starts with empty state"

## Next Steps

1. Deploy these changes
2. Clear localStorage on your VPS using the browser console command above
3. Your web and mobile apps will now show consistent data from cloud sync only
