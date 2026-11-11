'use client';

import Link from 'next/link';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-lg rounded-2xl border theme-border theme-bg-secondary p-6 sm:p-8">
    <h1 className="text-xl font-semibold theme-text">This page couldn’t load</h1>
    <p className="mt-3 theme-text-secondary">Try loading it again. If the problem continues, return to your overview or contact support.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-accent px-5 py-2 font-medium text-white">Try again</button>
      <Link href="/app" className="min-h-11 rounded-lg border theme-border px-5 py-2 theme-text">Overview</Link>
      <Link href="/support" className="min-h-11 px-3 py-2 theme-text">Support</Link>
    </div>
  </section>;
}
