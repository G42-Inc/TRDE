import type { SupabaseClient } from '@supabase/supabase-js';
import type { RiskRules } from '@trde/core';
import { riskRulesToRow } from './records';

/** risk_rules has user_id as its sole primary key; it has no separate row ID. */
export async function saveUserRiskRules(client: SupabaseClient, userId: string, rules: RiskRules, timestamp = Date.now()): Promise<void> {
  if (!userId) throw new Error('An authenticated owner is required.');
  const row = riskRulesToRow(rules, userId, timestamp);
  // DO NOTHING on an existing owner preserves the original creation timestamp,
  // including concurrent first saves. Only the verified session chooses this key.
  const { error: insertError } = await client.from('risk_rules')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: true });
  if (insertError) throw insertError;

  const { user_id, created_at, metadata, ...changes } = row;
  const { data, error } = await client.from('risk_rules')
    .update(changes).eq('user_id', userId).select('user_id');
  if (error) throw error;
  if (data?.length !== 1) throw new Error('Risk rules changed during saving. Please retry.');
}
