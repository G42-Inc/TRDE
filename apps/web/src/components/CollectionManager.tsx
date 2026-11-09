'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAppData } from '@/hooks/useAppData';

export function CollectionManager() {
  const { collections, trades, saveCollections, isDemo } = useAppData();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCollection(event: FormEvent) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    if (collections.some((collection) => collection.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A collection with that name already exists.');
      return;
    }
    setSaving(true); setError(null);
    try {
      await saveCollections([...collections, {
        id: `collection-${crypto.randomUUID()}`, name: name.trim(), tradeIds: [], createdAt: Date.now(),
      }]);
      setName('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save collection. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <section className="theme-bg-secondary p-4 sm:p-6 rounded-xl border theme-border" aria-labelledby="collections-title">
      <h2 id="collections-title" className="text-lg font-semibold theme-text">Collections</h2>
      <p className="text-sm theme-text-secondary mt-1">Group trades for review. Open a trade to add it to a collection.</p>
      {isDemo ? <p className="mt-3 text-sm theme-text">Demo collections are read-only. <Link href="/pricing" className="text-accent underline">Upgrade to organize your trades</Link>.</p> : (
        <form onSubmit={createCollection} className="flex flex-wrap gap-2 mt-3">
          <label htmlFor="collection-name" className="sr-only">Collection name</label>
          <input id="collection-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required
            placeholder="Collection name" disabled={saving} className="min-w-0 flex-1 theme-bg-tertiary theme-text border theme-border rounded-lg px-3 py-2" />
          <button disabled={saving || !name.trim()} className="px-3 py-2 rounded-lg bg-accent text-white disabled:opacity-50">{saving ? 'Saving…' : 'Create collection'}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-negative">{error}</p>}
      {collections.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{collections.map((collection) => (
        <li key={collection.id} className="theme-bg-tertiary theme-text rounded-lg px-3 py-2 text-sm break-words">
          {collection.name} · {trades.filter((trade) => trade.collections.includes(collection.id)).length} trades
        </li>
      ))}</ul>}
    </section>
  );
}
