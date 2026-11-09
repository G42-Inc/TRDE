'use client';

import { useState, useEffect } from 'react';
import { clearLocalData } from '@/lib/init';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

/**
 * Developer Tools Panel
 * Only visible in development mode
 * Provides quick access to data management functions
 */
export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const [trdeKeyCount, setTrdeKeyCount] = useState(0);

  useEffect(() => {
    // Check if we're in development mode
    setIsDev(process.env.NODE_ENV === 'development');

    // Calculate localStorage usage
    const updateStats = () => {
      let totalSize = 0;
      let trdeKeys = 0;
      
      Object.keys(localStorage).forEach(key => {
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
        if (key.startsWith('trde_')) {
          trdeKeys++;
        }
      });
      
      setLocalStorageSize(Math.round(totalSize / 1024)); // KB
      setTrdeKeyCount(trdeKeys);
    };

    updateStats();
    
    // Update stats every 5 seconds when panel is open
    const interval = isOpen ? setInterval(updateStats, 5000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  // Don't render in production
  if (!isDev) return null;

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg font-mono text-xs font-bold transition-all"
        >
          DEV
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-4 right-4 z-[9999] w-80 theme-bg-secondary border-2 border-purple-500 rounded-xl shadow-2xl overflow-hidden"
          style={{ fontFamily: 'monospace' }}
        >
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-bold">DEV TOOLS</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 rounded p-1 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Stats */}
            <div className="theme-bg-tertiary rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">localStorage:</span>
                <span className="theme-text font-bold">{localStorageSize} KB</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">TRDE keys:</span>
                <span className="theme-text font-bold">{trdeKeyCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="theme-text-secondary">Mode:</span>
                <span className="text-purple-500 font-bold">DEVELOPMENT</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="text-xs theme-text-secondary font-bold uppercase tracking-wide mb-2">
                Data Management
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Clear all local data? This will reload the page.\n\nCloud data will not be affected.')) {
                    clearLocalData();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg text-xs font-bold transition-all border border-danger/20"
              >
                <TrashIcon className="h-4 w-4" />
                Clear Local Data
              </button>
            </div>

            {/* Info */}
            <div className="text-xs theme-text-secondary p-3 theme-bg-tertiary rounded-lg">
              <div className="font-bold text-purple-500 mb-1">Info</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Local data persists in browser</li>
                <li>Cloud sync via Supabase</li>
                <li>No seed data in this app</li>
                <li>Data from: manual entry, sync, or ProjectX</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
