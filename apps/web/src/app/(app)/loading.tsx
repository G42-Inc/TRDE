export default function AppLoading() {
  return <div role="status" aria-live="polite" className="space-y-5 py-2">
    <p className="text-sm theme-text-secondary">Loading your workspace…</p>
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      <div className="h-8 w-48 rounded-lg theme-bg-tertiary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-32 rounded-xl theme-bg-secondary" />)}</div>
      <div className="h-64 rounded-xl theme-bg-secondary" />
    </div>
  </div>;
}
