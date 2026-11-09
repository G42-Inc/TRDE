'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({ 
  icon, 
  title, 
  message, 
  className = '',
  action,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      {icon && (
        <div className="text-6xl mb-4 opacity-60">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">
        {title}
      </h3>
      <p className="text-sm text-black/60 dark:text-white/60 text-center max-w-md mb-4">
        {message}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
