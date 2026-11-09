'use client';

import { RuleViolation } from '@trde/core';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface RiskViolationsWidgetProps {
  violations: RuleViolation[];
}

export function RiskViolationsWidget({ violations }: RiskViolationsWidgetProps) {
  const unreviewedCount = violations.filter((v) => !v.reviewed).length;
  const hasViolations = unreviewedCount > 0;

  return (
    <Link
      href="/risk"
      className="flex flex-col items-center justify-center h-full p-6 cursor-pointer hover:scale-105 transition-transform"
    >
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
          hasViolations
            ? 'bg-danger/10 border-2 border-danger'
            : 'bg-success/10 border-2 border-success'
        }`}
      >
        <ShieldExclamationIcon
          className={`w-12 h-12 ${hasViolations ? 'text-danger' : 'text-success'}`}
        />
      </div>
      <div className="text-center">
        <div
          className={`text-4xl font-bold ${
            hasViolations ? 'text-danger' : 'text-success'
          }`}
        >
          {unreviewedCount}
        </div>
        <div className="text-sm theme-text-secondary mt-1">
          {hasViolations ? 'Risk Violations' : 'All Clear'}
        </div>
      </div>
    </Link>
  );
}
