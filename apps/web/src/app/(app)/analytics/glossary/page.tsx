'use client';

import { METRIC_EXPLAINERS } from '@trde/core';
import type { MetricExplainer } from '@trde/core';
import Link from 'next/link';

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold theme-text">Analytics Glossary</h1>
        <Link
          href="/analytics"
          className="px-4 py-2 theme-bg-tertiary theme-text rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors font-medium"
        >
          Back to Analytics
        </Link>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <div className="space-y-8">
          {Object.entries(METRIC_EXPLAINERS).map(([key, explainer]) => (
            <div key={key} className="border-b theme-border pb-8 last:border-b-0">
              <h2 className="text-xl font-bold mb-4 theme-text">{explainer.title}</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm theme-text mb-1">Definition</h3>
                  <p className="text-sm theme-text-secondary leading-relaxed">{explainer.definition}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm theme-text mb-1">Why It Matters</h3>
                  <p className="text-sm theme-text-secondary leading-relaxed">{explainer.why}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm theme-text mb-1">Calculation</h3>
                  <p className="text-sm theme-text-secondary leading-relaxed font-mono theme-bg-tertiary px-3 py-2 rounded border theme-border">
                    {explainer.calculation}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm theme-text mb-1">Interpretation</h3>
                  <p className="text-sm theme-text-secondary leading-relaxed">{explainer.interpretation}</p>
                </div>
                {explainer.examples && (
                  <div>
                    <h3 className="font-semibold text-sm theme-text mb-1">Examples</h3>
                    <p className="text-sm theme-text-secondary leading-relaxed">{explainer.examples}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
