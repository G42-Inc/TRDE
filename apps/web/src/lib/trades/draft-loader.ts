/** One owned snapshot per editor session. Cleanup rejects late account/route loads. */
export function loadTradeDraft<T extends { id: string }>(
  read: () => Promise<T[]>,
  tradeId: string,
  onLoaded: (trade: T) => void,
  onError: (message: string) => void,
): () => void {
  let active = true;
  void read().then((trades) => {
    if (!active) return;
    const trade = trades.find((candidate) => candidate.id === tradeId);
    if (!trade) throw new Error('Trade not found in this account.');
    onLoaded(trade);
  }).catch((error: unknown) => {
    if (active) onError(error instanceof Error ? error.message : 'Unable to load this trade. Please try again.');
  });
  return () => { active = false; };
}
