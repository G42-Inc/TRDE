'use client';

import { MetricCard } from '@/components/MetricCard';

interface MetricsGridWidgetProps {
  metrics: string[];
  renderMetricCard: (metricId: string) => React.ReactNode;
}

export function MetricsGridWidget({ metrics, renderMetricCard }: MetricsGridWidgetProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.slice(0, 4).map((metricId) => (
        <div key={metricId}>{renderMetricCard(metricId)}</div>
      ))}
    </div>
  );
}
