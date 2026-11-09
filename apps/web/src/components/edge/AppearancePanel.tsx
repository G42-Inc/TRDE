'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, PaintBrushIcon } from '@heroicons/react/24/outline';
import type { ChartPreferences, ChartThemePreset } from '@/lib/edge/types';
import { saveChartPreferences, loadPresetTheme } from '@/lib/edge/store/prefsStore';
import { TRDE_DARK_PRESET, TRDE_LIGHT_PRESET } from '@/lib/edge/constants';

interface AppearancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: ChartPreferences;
  onPrefsChange: (prefs: ChartPreferences) => void;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AppearancePanel({
  isOpen,
  onClose,
  prefs,
  onPrefsChange,
}: AppearancePanelProps) {
  const [localPrefs, setLocalPrefs] = useState<ChartPreferences>(prefs);
  const [useSameAsBody, setUseSameAsBody] = useState(true);

  // Sync local prefs when prop changes
  useEffect(() => {
    setLocalPrefs(prefs);
  }, [prefs]);

  // Debounce color changes to avoid jank
  const debouncedPrefs = useDebounce(localPrefs, 100);

  useEffect(() => {
    if (debouncedPrefs !== prefs) {
      onPrefsChange(debouncedPrefs);
      saveChartPreferences(debouncedPrefs);
    }
  }, [debouncedPrefs, prefs, onPrefsChange]);

  const handlePresetChange = (preset: ChartThemePreset) => {
    const newPrefs = loadPresetTheme(preset, localPrefs);
    setLocalPrefs(newPrefs);
    onPrefsChange(newPrefs);
    saveChartPreferences(newPrefs);
  };

  const handleColorChange = useCallback(
    (path: string[], value: string) => {
      setLocalPrefs((prev) => {
        const updated = { ...prev, preset: 'CUSTOM' as ChartThemePreset };
        let current: any = updated;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]] = { ...current[path[i]] };
        }
        current[path[path.length - 1]] = value;
        return updated;
      });
    },
    []
  );

  const handleReset = (preset: 'TRDE_DARK' | 'TRDE_LIGHT') => {
    const newPrefs = preset === 'TRDE_DARK' ? TRDE_DARK_PRESET : TRDE_LIGHT_PRESET;
    setLocalPrefs(newPrefs);
    onPrefsChange(newPrefs);
    saveChartPreferences(newPrefs);
  };

  // Auto-update wick/border colors when "use same as body" is enabled
  useEffect(() => {
    if (useSameAsBody) {
      setLocalPrefs((prev) => ({
        ...prev,
        candles: {
          ...prev.candles,
          wickUpColor: prev.candles.upColor,
          wickDownColor: prev.candles.downColor,
          borderUpColor: prev.candles.upColor,
          borderDownColor: prev.candles.downColor,
        },
      }));
    }
  }, [useSameAsBody, localPrefs.candles.upColor, localPrefs.candles.downColor]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-black w-[600px] h-[600px] max-h-[90vh] max-w-[90vw] rounded-lg border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-white dark:bg-black border-b border-black/10 dark:border-white/10 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PaintBrushIcon className="h-5 w-5 text-black dark:text-white" />
              <h2 className="text-lg font-bold text-black dark:text-white">
                Chart Appearance
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">
            Changes apply instantly. Saved locally on this device.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Layout Colors */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Layout
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Background Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.layout.backgroundColor}
                    onChange={(e) =>
                      handleColorChange(['layout', 'backgroundColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.layout.backgroundColor}
                    onChange={(e) =>
                      handleColorChange(['layout', 'backgroundColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Text Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.layout.textColor}
                    onChange={(e) =>
                      handleColorChange(['layout', 'textColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.layout.textColor}
                    onChange={(e) =>
                      handleColorChange(['layout', 'textColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grid Colors */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Grid Lines
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Vertical Lines
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.grid.vertLinesColor}
                    onChange={(e) =>
                      handleColorChange(['grid', 'vertLinesColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.grid.vertLinesColor}
                    onChange={(e) =>
                      handleColorChange(['grid', 'vertLinesColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Horizontal Lines
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.grid.horzLinesColor}
                    onChange={(e) =>
                      handleColorChange(['grid', 'horzLinesColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.grid.horzLinesColor}
                    onChange={(e) =>
                      handleColorChange(['grid', 'horzLinesColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scale Border */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Scale Border
            </label>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                Border Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={localPrefs.scale.borderColor}
                  onChange={(e) =>
                    handleColorChange(['scale', 'borderColor'], e.target.value)
                  }
                  disabled={localPrefs.preset !== 'CUSTOM'}
                  className={`w-12 h-10 rounded border border-black/10 dark:border-white/10 ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                />
                <input
                  type="text"
                  value={localPrefs.scale.borderColor}
                  onChange={(e) =>
                    handleColorChange(['scale', 'borderColor'], e.target.value)
                  }
                  disabled={localPrefs.preset !== 'CUSTOM'}
                  className={`flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Candle Colors */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Candles
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Up Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.candles.upColor}
                    onChange={(e) =>
                      handleColorChange(['candles', 'upColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.candles.upColor}
                    onChange={(e) =>
                      handleColorChange(['candles', 'upColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  Down Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.candles.downColor}
                    onChange={(e) =>
                      handleColorChange(['candles', 'downColor'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.candles.downColor}
                    onChange={(e) =>
                      handleColorChange(['candles', 'downColor'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="useSameAsBody"
                  checked={useSameAsBody}
                  onChange={(e) => setUseSameAsBody(e.target.checked)}
                  className="w-4 h-4 text-accent focus:ring-accent"
                />
                <label
                  htmlFor="useSameAsBody"
                  className="text-xs text-black/60 dark:text-white/60 cursor-pointer"
                >
                  Use same color for wick and border as body
                </label>
              </div>
              {!useSameAsBody && (
                <>
                  <div>
                    <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                      Up Wick Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={localPrefs.candles.wickUpColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'wickUpColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`w-12 h-10 rounded border border-black/10 dark:border-white/10 ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <input
                        type="text"
                        value={localPrefs.candles.wickUpColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'wickUpColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                      Down Wick Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={localPrefs.candles.wickDownColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'wickDownColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`w-12 h-10 rounded border border-black/10 dark:border-white/10 ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <input
                        type="text"
                        value={localPrefs.candles.wickDownColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'wickDownColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                      Up Border Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={localPrefs.candles.borderUpColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'borderUpColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`w-12 h-10 rounded border border-black/10 dark:border-white/10 ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <input
                        type="text"
                        value={localPrefs.candles.borderUpColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'borderUpColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                      Down Border Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={localPrefs.candles.borderDownColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'borderDownColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`w-12 h-10 rounded border border-black/10 dark:border-white/10 ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <input
                        type="text"
                        value={localPrefs.candles.borderDownColor}
                        onChange={(e) =>
                          handleColorChange(['candles', 'borderDownColor'], e.target.value)
                        }
                        disabled={localPrefs.preset !== 'CUSTOM'}
                        className={`flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent ${localPrefs.preset !== 'CUSTOM' ? 'cursor-not-allowed opacity-50' : ''}`}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Indicator Colors */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              Indicators
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  EMA 20 Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.indicators.ema20Color}
                    onChange={(e) =>
                      handleColorChange(['indicators', 'ema20Color'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.indicators.ema20Color}
                    onChange={(e) =>
                      handleColorChange(['indicators', 'ema20Color'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
                  SMA 200 Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localPrefs.indicators.sma200Color}
                    onChange={(e) =>
                      handleColorChange(['indicators', 'sma200Color'], e.target.value)
                    }
                    className="w-12 h-10 rounded border border-black/10 dark:border-white/10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localPrefs.indicators.sma200Color}
                    onChange={(e) =>
                      handleColorChange(['indicators', 'sma200Color'], e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-black/10 dark:border-white/10 rounded-lg bg-white dark:bg-black text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex-shrink-0 p-4 border-t border-black/10 dark:border-white/10">
          <div className="flex space-x-2">
            <button
              onClick={() => handleReset('TRDE_DARK')}
              className="flex-1 px-4 py-2 bg-black/10 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors text-sm"
            >
              Reset to TRDE Dark
            </button>
            <button
              onClick={() => handleReset('TRDE_LIGHT')}
              className="flex-1 px-4 py-2 bg-black/10 dark:bg-white/10 text-black dark:text-white rounded-lg hover:bg-black/20 dark:hover:bg-white/20 font-medium transition-colors text-sm"
            >
              Reset to TRDE Light
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
