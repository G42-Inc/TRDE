import { getFuturesTickInfo } from '@/lib/trades/calculations';

interface Props {
  instrumentRoot: string;
  tickSize?: number;
  tickValueUsd?: number;
  onChange: (values: { tickSize?: number; tickValueUsd?: number }) => void;
}

export function FuturesTickFields({ instrumentRoot, tickSize, tickValueUsd, onChange }: Props) {
  const known = getFuturesTickInfo(instrumentRoot);
  if (known) return <p className="text-sm theme-text-secondary">Tick size: {known.tickSize}. Tick value: ${known.tickValueUsd.toFixed(2)} per contract.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm theme-text-secondary">Enter this instrument’s tick specifications to calculate P&amp;L. Notes-only edits keep the saved amounts.</p>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm theme-text-secondary">
          Tick size (price increment)
          <input aria-label="Tick size" type="number" step="any" min="0.00000001" value={tickSize ?? ''}
            onChange={(e) => onChange({ tickSize: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="mt-2 w-full theme-bg-secondary border theme-border theme-text rounded-md px-3 py-2" />
        </label>
        <label className="block text-sm theme-text-secondary">
          Tick value (USD per contract)
          <input aria-label="Tick value" type="number" step="any" min="0.00000001" value={tickValueUsd ?? ''}
            onChange={(e) => onChange({ tickValueUsd: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="mt-2 w-full theme-bg-secondary border theme-border theme-text rounded-md px-3 py-2" />
        </label>
      </div>
    </div>
  );
}
