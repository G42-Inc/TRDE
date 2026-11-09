import type { SupabaseClient } from '@supabase/supabase-js';

export class RecordConflictError extends Error {
  constructor() { super('A record changed or its identifier conflicts. Refresh and retry.'); }
}

export class InvalidRecordError extends Error {}

type OwnedRow = { id: string; user_id: string; [key: string]: unknown };

/**
 * Save client-generated IDs without a service-role upsert's ownership transfer.
 * New records use INSERT (a concurrent/cross-user collision fails); edits always
 * constrain both id and authenticated owner. A preliminary read alone cannot
 * make an id-only upsert safe.
 */
export async function saveOwnedRecords(client: SupabaseClient, table: string, userId: string, rows: OwnedRow[]) {
  if (!rows.length) return;
  if (rows.length > 5000 || rows.some(row => typeof row.id !== 'string' || !row.id || row.id.length > 300 || row.user_id !== userId)) {
    throw new InvalidRecordError('Invalid record identifiers or batch size');
  }
  const ids = rows.map(row => row.id);
  if (new Set(ids).size !== ids.length) throw new InvalidRecordError('Duplicate record identifiers');

  // Bound URL/query size; callers may send a complete local cache.
  const owned = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await client.from(table).select('id').eq('user_id', userId).in('id', ids.slice(offset, offset + 100));
    if (error) throw error;
    for (const row of data ?? []) owned.add(row.id);
  }
  const additions = rows.filter(row => !owned.has(row.id));
  if (additions.length) {
    const { error } = await client.from(table).insert(additions);
    if (error?.code === '23505') throw new RecordConflictError();
    if (error) throw error;
  }
  const edits = rows.filter(row => owned.has(row.id));
  for (let offset = 0; offset < edits.length; offset += 10) {
    await Promise.all(edits.slice(offset, offset + 10).map(async row => {
      // Immutable identity and creation time are never part of an edit.
      const { id, user_id, created_at, ...changes } = row;
      const { data, error } = await client.from(table).update(changes).eq('id', id).eq('user_id', userId).select('id');
      if (error) throw error;
      if (data?.length !== 1) throw new RecordConflictError();
    }));
  }
}

/** Validate foreign references without returning another user's rows. */
export async function requireOwnedReferences(client: SupabaseClient, table: string, userId: string, ids: unknown[]) {
  const unique = [...new Set(ids)];
  if (unique.some(id => typeof id !== 'string' || !id || id.length > 300)) {
    throw new InvalidRecordError('Invalid referenced record');
  }
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100) as string[];
    const { data, error } = await client.from(table).select('id').eq('user_id', userId).in('id', batch);
    if (error) throw error;
    if (data?.length !== batch.length) throw new InvalidRecordError('Referenced record is unavailable');
  }
}
