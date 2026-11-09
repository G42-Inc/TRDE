import type { SupabaseClient } from '@supabase/supabase-js';

// Children precede parents. Account, billing, integrations, engagement and public
// community records are deliberately outside this journal-only operation.
export const JOURNAL_TABLES = [
  'trade_journals', 'rule_violations', 'trades', 'user_strategy_versions',
  'user_strategies', 'collections', 'daily_biases', 'quick_journals',
  'saved_filters', 'weekly_reviews', 'todos', 'risk_rules', 'dashboard_metrics',
] as const;

export async function clearUserJournal(client: SupabaseClient, userId: string) {
  if (!userId) throw new Error('An authenticated user is required');
  for (const table of JOURNAL_TABLES) {
    const { error } = await client.from(table).delete().eq('user_id', userId);
    if (error) {
      // Repeating is safe; never claim success or clear the local cache after a
      // partial failure. No table names or backend details escape this boundary.
      throw new Error('Some journal data could not be deleted. Refresh and retry.');
    }
  }
}
