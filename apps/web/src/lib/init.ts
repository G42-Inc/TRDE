/**
 * Data Initialization
 * 
 * NOTE: Seed data has been permanently removed from the web app.
 * The app now starts with empty data and relies on:
 * - Manual trade entry
 * - Cloud sync (Supabase)
 * - ProjectX/EDGE imports
 */

export function initializeData() {
  if (typeof window === 'undefined') return;
  
  console.log('[TRDE] Initialization complete. App starts with empty state.');
  console.log('[TRDE] Data sources: Manual entry, Cloud sync, or ProjectX import.');
  
  // No seed data - app starts empty
}

/**
 * Reset all local data
 * Clears localStorage and reloads the page to start fresh
 */
export function resetData() {
  if (typeof window === 'undefined') return;
  
  console.log('[TRDE] Resetting all local data...');
  
  // Clear all TRDE data from localStorage (both trde_ and trde: prefixes)
  const keys = Object.keys(localStorage);
  const removedKeys: string[] = [];
  
  keys.forEach((key) => {
    // Clear all TRDE and EDGE related keys (various prefixes used throughout the app)
    if (key.startsWith('trde_') || key.startsWith('trde:') || key.startsWith('trde-') || 
        key.startsWith('edge_') || key.startsWith('edge:')) {
      localStorage.removeItem(key);
      removedKeys.push(key);
    }
  });
  
  console.log(`[TRDE] Cleared ${removedKeys.length} keys`);
  
  // Reload page to reflect changes
  window.location.reload();
}

/**
 * Clear all local data without reseeding
 * Useful for production or when you want to start fresh with cloud sync only
 */
export function clearLocalData() {
  if (typeof window === 'undefined') return;
  
  console.log('[TRDE] Clearing all local data...');
  
  const keys = Object.keys(localStorage);
  const removedKeys: string[] = [];
  
  keys.forEach((key) => {
    // Clear all TRDE and EDGE related keys (various prefixes used throughout the app)
    if (key.startsWith('trde_') || key.startsWith('trde:') || key.startsWith('trde-') || 
        key.startsWith('edge_') || key.startsWith('edge:')) {
      localStorage.removeItem(key);
      removedKeys.push(key);
    }
  });
  
  console.log(`[TRDE] Cleared ${removedKeys.length} keys:`, removedKeys);
  
  // Reload page to reflect changes
  window.location.reload();
}
