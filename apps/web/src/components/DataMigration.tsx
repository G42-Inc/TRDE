'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Data Migration Component
 * 
 * Helps users migrate their localStorage data to Supabase database.
 * Should be shown once when user first signs in after database migration.
 */
export function DataMigration() {
  const { user } = useUser();
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  // Check if user has localStorage data
  const hasLocalStorageData = () => {
    if (typeof window === 'undefined') return false;
    
    const keys = [
      'trde_trades',
      'trde_strategies',
      'trde_versions',
      'trde_collections',
      'trde_daily_biases',
      'trde_quick_journals',
    ];
    
    return keys.some(key => {
      const data = localStorage.getItem(key);
      return data && data !== '[]' && data !== 'null';
    });
  };

  const handleMigrate = async () => {
    if (typeof window === 'undefined' || !user) return;
    
    setMigrating(true);
    setError(null);
    setMigrationStatus('idle');

    try {
      // Collect all localStorage data
      const data: Record<string, any> = {};
      
      const storageKeys = {
        trades: 'trde_trades',
        strategies: 'trde_strategies',
        versions: 'trde_versions',
        collections: 'trde_collections',
        dailyBiases: 'trde_daily_biases',
        quickJournals: 'trde_quick_journals',
      };

      for (const [key, storageKey] of Object.entries(storageKeys)) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            data[key] = JSON.parse(stored);
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Send to migration endpoint
      const response = await fetch('/api/data/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Migration failed');
      }

      setResults(result.results || {});
      setMigrationStatus(result.success ? 'success' : 'error');

      // If successful, optionally clear localStorage (user can do this manually)
      if (result.success) {
        // Don't auto-clear - let user do it manually after verifying
        console.log('Migration successful. You can now clear localStorage if desired.');
      }
    } catch (err: any) {
      setError(err.message || 'Migration failed');
      setMigrationStatus('error');
    } finally {
      setMigrating(false);
    }
  };

  if (!hasLocalStorageData()) {
    return null; // No data to migrate
  }

  return (
    <div className="bg-accent-bg dark:bg-accent/20 border border-accent-light dark:border-accent-dark rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-accent-dark dark:text-accent-light mb-2">
            Migrate Your Data to Cloud Storage
          </h3>
          <p className="text-sm text-accent-dark dark:text-accent-light mb-4">
            We found data in your browser&apos;s local storage. Migrate it to your secure cloud account
            to access it from any device and ensure it&apos;s backed up.
          </p>

          {migrationStatus === 'success' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="font-medium">Migration completed successfully!</span>
              </div>
              <div className="text-sm text-accent space-y-1">
                {Object.entries(results).map(([key, result]: [string, any]) => (
                  <div key={key}>
                    {result.success ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {key}: {result.count} items migrated
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {key}: {result.error || 'Failed'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {migrationStatus === 'error' && error && (
            <div className="mb-4 flex items-center gap-2 text-red-700 dark:text-red-300">
              <XCircleIcon className="h-5 w-5" />
              <span className="text-sm">Error: {error}</span>
            </div>
          )}

          <button
            onClick={handleMigrate}
            disabled={migrating || migrationStatus === 'success'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {migrating ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : migrationStatus === 'success' ? (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                Migration Complete
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4" />
                Start Migration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
