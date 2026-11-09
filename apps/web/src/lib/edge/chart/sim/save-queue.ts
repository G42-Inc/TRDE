/** Serialize journal saves and retain failed trade snapshots for explicit retry. */
export function createJournalSaveQueue<T extends { id: string }>(options: {
  persist: (trades: T[]) => Promise<number>;
  isCurrentAccount: () => boolean;
  onPending: (pending: boolean) => void;
  onSaved: (count: number, failedCount: number) => void;
  onError: (error: Error) => void;
}) {
  let tail = Promise.resolve();
  let pending = 0;
  const failed = new Map<string, T>();

  function save(trades: T[]): Promise<boolean> {
    if (!trades.length || !options.isCurrentAccount()) return Promise.resolve(false);
    const snapshot = trades.slice();
    pending++;
    options.onPending(true);
    const task = tail.then(async () => {
      if (!options.isCurrentAccount()) return false;
      try {
        const count = await options.persist(snapshot);
        if (!options.isCurrentAccount()) return false;
        for (const trade of snapshot) failed.delete(trade.id);
        options.onSaved(count, failed.size);
        return true;
      } catch (failure) {
        if (options.isCurrentAccount()) {
          for (const trade of snapshot) failed.set(trade.id, trade);
          options.onError(failure instanceof Error ? failure : new Error('Could not save simulated trades.'));
        }
        return false;
      }
    }).finally(() => {
      pending--;
      if (options.isCurrentAccount()) options.onPending(pending > 0);
    });
    tail = task.then(() => {});
    return task;
  }

  return { save, retry: () => save([...failed.values()]) };
}
