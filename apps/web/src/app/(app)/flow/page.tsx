'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  SignalIcon,
  XMarkIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BoltIcon,
  KeyIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { FlowWidget, FlowWidgetType, WidgetData } from '@/lib/flow/types';

// Chart data type
interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

// Data mode types
type DataMode = 'realtime' | 'historical';

// Historical timeframe presets
type HistoricalTimeframe = 'yesterday' | '1w' | '2w' | '1m' | '3m' | 'custom';

interface TimeframeOption {
  value: HistoricalTimeframe;
  label: string;
  getDate: () => string;
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { 
    value: 'yesterday', 
    label: 'Yesterday',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      // Skip weekends
      if (d.getDay() === 0) d.setDate(d.getDate() - 2); // Sunday -> Friday
      if (d.getDay() === 6) d.setDate(d.getDate() - 1); // Saturday -> Friday
      return d.toISOString().split('T')[0];
    }
  },
  { 
    value: '1w', 
    label: '1 Week Ago',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
  },
  { 
    value: '2w', 
    label: '2 Weeks Ago',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().split('T')[0];
    }
  },
  { 
    value: '1m', 
    label: '1 Month Ago',
    getDate: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
    }
  },
  { 
    value: '3m', 
    label: '3 Months Ago',
    getDate: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().split('T')[0];
    }
  },
  { 
    value: 'custom', 
    label: 'Custom Date',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }
  },
];

// Widget settings per symbol
interface WidgetSettings {
  mode: DataMode;
  historicalDate: string; // YYYY-MM-DD format
  timeframe: HistoricalTimeframe;
}

// Quick-add symbols for Options Flow - most liquid options markets
const OPTIONS_QUICK_SYMBOLS = [
  // Index Options
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF' },
  { symbol: 'SPX', name: 'S&P 500 Index' },
  { symbol: 'IWM', name: 'Russell 2000 ETF' },
  { symbol: 'DIA', name: 'Dow Jones ETF' },
  // High-volume Tech
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'NFLX', name: 'Netflix' },
  // Other high-volume
  { symbol: 'COIN', name: 'Coinbase' },
  { symbol: 'BABA', name: 'Alibaba' },
  { symbol: 'BAC', name: 'Bank of America' },
  { symbol: 'F', name: 'Ford' },
  { symbol: 'PLTR', name: 'Palantir' },
  { symbol: 'SOFI', name: 'SoFi' },
];

// Default Options Flow widgets
const DEFAULT_WIDGETS: Array<{ symbol: string }> = [
  { symbol: 'SPY' },
  { symbol: 'QQQ' },
  { symbol: 'SPX' },
  { symbol: 'AAPL' },
  { symbol: 'TSLA' },
  { symbol: 'NVDA' },
];

// Get yesterday's date for historical default
function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

export default function FlowPage() {
  const [widgets, setWidgets] = useState<FlowWidget[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [widgetSettings, setWidgetSettings] = useState<Record<string, WidgetSettings>>({});
  const [loading, setLoading] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [symbolResults, setSymbolResults] = useState<Array<{ symbol: string; name: string; type: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [addError, setAddError] = useState('');
  const [initializingDefaults, setInitializingDefaults] = useState(false);

  // Get settings for a widget
  const getWidgetSettings = (symbol: string): WidgetSettings => {
    return widgetSettings[symbol] || { 
      mode: 'realtime', 
      historicalDate: getYesterdayDate(),
      timeframe: 'yesterday',
    };
  };

  // Update widget settings
  const updateWidgetSettings = (symbol: string, updates: Partial<WidgetSettings>) => {
    setWidgetSettings(prev => ({
      ...prev,
      [symbol]: { ...getWidgetSettings(symbol), ...updates },
    }));
  };

  // Create default widgets for new users
  const createDefaultWidgets = useCallback(async () => {
    setInitializingDefaults(true);
    const createdWidgets: FlowWidget[] = [];
    
    for (let i = 0; i < DEFAULT_WIDGETS.length; i++) {
      const defaultWidget = DEFAULT_WIDGETS[i];
      try {
        const res = await fetch('/api/flow/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widget_type: 'FLOW_FEED',
            symbol: defaultWidget.symbol,
            position_x: 0,
            position_y: i,
            width: 4,
            height: 2,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.widget) {
            createdWidgets.push(data.widget);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to create default widget ${defaultWidget.symbol}:`, error);
      }
    }
    
    setWidgets(createdWidgets);
    setInitializingDefaults(false);
    return createdWidgets;
  }, []);

  // Fetch user's widget configurations
  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/flow/widgets');
      if (res.ok) {
        const data = await res.json();
        const fetchedWidgets = data.widgets || [];
        const flowWidgets = fetchedWidgets.filter((w: FlowWidget) => w.widget_type === 'FLOW_FEED');
        
        if (flowWidgets.length === 0) {
          const defaultWidgets = await createDefaultWidgets();
          setWidgets(defaultWidgets);
        } else {
          setWidgets(flowWidgets);
        }
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
    } finally {
      setLoading(false);
    }
  }, [createDefaultWidgets]);

  // Fetch widget data with mode support
  const fetchWidgetData = useCallback(async (widget: FlowWidget, forceRefresh = false, settings?: WidgetSettings) => {
    const currentSettings = settings || getWidgetSettings(widget.symbol);
    const widgetKey = `FLOW_FEED:${widget.symbol}:${currentSettings.mode}:${currentSettings.mode === 'historical' ? currentSettings.historicalDate : 'live'}`;
    
    try {
      const res = await fetch('/api/flow/widget-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetType: 'FLOW_FEED',
          symbol: widget.symbol,
          forceRefresh,
          dataMode: currentSettings.mode,
          historicalDate: currentSettings.mode === 'historical' ? currentSettings.historicalDate : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        setCooldowns(prev => ({
          ...prev,
          [widget.symbol]: data.cooldownRemaining || 300,
        }));
      } else if (res.status === 503) {
        // Check if user needs to add API key
        if (data.needsApiKey) {
          setApiConfigured(false);
        }
        return;
      } else {
        setApiConfigured(true);
        // Store data with the mode-specific key
        setWidgetData(prev => ({
          ...prev,
          [`${widget.symbol}:${currentSettings.mode}:${currentSettings.mode === 'historical' ? currentSettings.historicalDate : 'live'}`]: data,
        }));
        
        if (data.nextRefreshAt) {
          const remaining = Math.max(0, Math.ceil(
            (new Date(data.nextRefreshAt).getTime() - Date.now()) / 1000
          ));
          setCooldowns(prev => ({
            ...prev,
            [widget.symbol]: remaining,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch widget data:', error);
    }
  }, [widgetSettings]);

  // Search for symbols
  const searchSymbols = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSymbolResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/flow/symbol-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSymbolResults(data.results || []);
        setShowSymbolDropdown(true);
      }
    } catch (error) {
      console.error('Symbol search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced symbol search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (symbolSearch.length >= 1) {
        searchSymbols(symbolSearch);
      } else {
        setSymbolResults([]);
        setShowSymbolDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [symbolSearch, searchSymbols]);

  // Add a new widget
  const addWidget = async () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    
    if (widgets.some(w => w.symbol === symbol)) {
      setAddError(`${symbol} is already in your flow`);
      return;
    }
    
    setAddError('');
    try {
      const res = await fetch('/api/flow/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_type: 'FLOW_FEED',
          symbol,
          position_x: 0,
          position_y: widgets.length,
          width: 4,
          height: 2,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setWidgets(prev => [...prev, data.widget]);
        setShowAddWidget(false);
        setNewSymbol('');
        setSymbolSearch('');
        setSymbolResults([]);
        fetchWidgetData(data.widget);
      } else {
        setAddError(data.error || 'Failed to add symbol');
      }
    } catch (error: any) {
      console.error('Failed to add widget:', error);
      setAddError(error.message || 'Failed to add symbol');
    }
  };

  // Delete a widget
  const deleteWidget = async (widgetId: string) => {
    try {
      const res = await fetch(`/api/flow/widgets?id=${widgetId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
      }
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  };

  // Load widgets on mount
  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // Fetch data for all widgets when they change (staggered)
  useEffect(() => {
    const widgetsToFetch = widgets.filter(widget => {
      const settings = getWidgetSettings(widget.symbol);
      const dataKey = `${widget.symbol}:${settings.mode}:${settings.mode === 'historical' ? settings.historicalDate : 'live'}`;
      return !widgetData[dataKey];
    });
    
    if (widgetsToFetch.length === 0) return;
    
    let delay = 0;
    const timers: NodeJS.Timeout[] = [];
    
    widgetsToFetch.forEach((widget) => {
      const timer = setTimeout(() => {
        fetchWidgetData(widget);
      }, delay);
      timers.push(timer);
      delay += 500;
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [widgets, widgetData, fetchWidgetData, getWidgetSettings]);

  // Cooldown countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        for (const key in updated) {
          if (updated[key] > 0) {
            updated[key] = Math.max(0, updated[key] - 1);
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle mode change for a widget
  const handleModeChange = (widget: FlowWidget, mode: DataMode) => {
    const currentSettings = getWidgetSettings(widget.symbol);
    // When switching to historical, use the timeframe's date
    if (mode === 'historical') {
      const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === currentSettings.timeframe);
      const historicalDate = timeframeOption?.getDate() || getYesterdayDate();
      updateWidgetSettings(widget.symbol, { mode, historicalDate });
      setTimeout(() => {
        fetchWidgetData(widget, true, { ...currentSettings, mode, historicalDate });
      }, 100);
    } else {
      updateWidgetSettings(widget.symbol, { mode });
      setTimeout(() => {
        fetchWidgetData(widget, true, { ...currentSettings, mode });
      }, 100);
    }
  };

  // Handle timeframe change for historical mode
  const handleTimeframeChange = (widget: FlowWidget, timeframe: HistoricalTimeframe) => {
    const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === timeframe);
    const historicalDate = timeframe === 'custom' 
      ? getWidgetSettings(widget.symbol).historicalDate 
      : (timeframeOption?.getDate() || getYesterdayDate());
    
    updateWidgetSettings(widget.symbol, { timeframe, historicalDate });
    
    // Only fetch if not custom (custom will trigger on date picker change)
    if (timeframe !== 'custom') {
      setTimeout(() => {
        fetchWidgetData(widget, true, { 
          ...getWidgetSettings(widget.symbol), 
          timeframe, 
          historicalDate 
        });
      }, 100);
    }
  };

  // Handle date change for historical mode (custom date)
  const handleDateChange = (widget: FlowWidget, date: string) => {
    updateWidgetSettings(widget.symbol, { historicalDate: date, timeframe: 'custom' });
    // Fetch data with new date
    setTimeout(() => {
      fetchWidgetData(widget, true, { 
        ...getWidgetSettings(widget.symbol), 
        historicalDate: date, 
        timeframe: 'custom' 
      });
    }, 100);
  };

  const router = useRouter();

  if (apiConfigured === false) {
    return (
      <div className="min-h-screen theme-bg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="theme-bg-secondary rounded-2xl p-8 text-center border theme-border">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
              <KeyIcon className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold theme-text mb-3">Connect Your API Key</h1>
            <p className="theme-text-secondary mb-6 max-w-md mx-auto">
              To access market data in the Flow dashboard, you&apos;ll need to add your own AlphaVantage API key.
            </p>
            
            <div className="theme-bg rounded-xl p-5 text-left mb-6 border theme-border">
              <h3 className="font-medium theme-text mb-3">What you&apos;ll get:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 theme-text-secondary">
                  <span className="text-success mt-0.5">✓</span>
                  <span><strong className="theme-text">Free tier:</strong> Stock quotes, technical indicators (25 calls/day)</span>
                </li>
                <li className="flex items-start gap-2 theme-text-secondary">
                  <span className="text-amber-500 mt-0.5">★</span>
                  <span><strong className="theme-text">Premium:</strong> Real-time options flow, Greeks, IV, higher limits</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/settings?tab=api')}
                className="theme-button text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                Go to Settings
              </button>
              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 theme-bg-tertiary rounded-lg font-medium theme-text hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
              >
                Get Free API Key →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold theme-text flex items-center gap-3">
              <SignalIcon className="h-7 w-7" />
              Options Flow
            </h1>
            <p className="theme-text-secondary mt-1">
              Track unusual options activity across your watchlist
            </p>
          </div>
          <button
            onClick={() => setShowAddWidget(true)}
            className="theme-button text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Symbol
          </button>
        </div>

        {/* Loading State */}
        {loading || initializingDefaults ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin theme-text-secondary mb-3" />
            {initializingDefaults && (
              <p className="theme-text-secondary">Setting up your options flow watchlist...</p>
            )}
          </div>
        ) : widgets.length === 0 ? (
          <div className="theme-bg-secondary rounded-2xl p-12 text-center">
            <SignalIcon className="h-16 w-16 mx-auto theme-text-secondary mb-4" />
            <h2 className="text-xl font-semibold theme-text mb-2">No symbols tracked</h2>
            <p className="theme-text-secondary mb-4">
              Add symbols to track their options flow activity.
            </p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="theme-button text-white px-4 py-2 rounded-lg font-medium"
            >
              Add Your First Symbol
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {widgets.map(widget => {
              const settings = getWidgetSettings(widget.symbol);
              const dataKey = `${widget.symbol}:${settings.mode}:${settings.mode === 'historical' ? settings.historicalDate : 'live'}`;
              return (
                <OptionsFlowCard
                  key={widget.id}
                  widget={widget}
                  data={widgetData[dataKey]}
                  settings={settings}
                  cooldown={cooldowns[widget.symbol] || 0}
                  onRefresh={() => fetchWidgetData(widget, true, settings)}
                  onDelete={() => deleteWidget(widget.id)}
                  onModeChange={(mode) => handleModeChange(widget, mode)}
                  onTimeframeChange={(timeframe) => handleTimeframeChange(widget, timeframe)}
                  onDateChange={(date) => handleDateChange(widget, date)}
                />
              );
            })}
          </div>
        )}

        {/* Add Symbol Modal */}
        {showAddWidget && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddWidget(false)}
          >
            <div
              className="theme-bg-secondary rounded-2xl shadow-2xl max-w-lg w-full border theme-border animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b theme-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold theme-text">Add Symbol to Track</h2>
                  <button
                    onClick={() => setShowAddWidget(false)}
                    className="p-2 rounded-lg hover:theme-bg theme-text-secondary hover:theme-text transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Symbol Input with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium theme-text mb-2">Symbol</label>
                  <input
                    type="text"
                    value={symbolSearch || newSymbol}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setSymbolSearch(val);
                      setNewSymbol(val);
                    }}
                    onFocus={() => symbolResults.length > 0 && setShowSymbolDropdown(true)}
                    placeholder="Search for a ticker (e.g., AAPL, SPY)"
                    className="w-full px-3 py-2 theme-bg border theme-border rounded-lg theme-text focus:ring-2 focus:ring-blue-500"
                    maxLength={20}
                    autoFocus
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-9">
                      <ArrowPathIcon className="h-4 w-4 animate-spin theme-text-secondary" />
                    </div>
                  )}
                  
                  {showSymbolDropdown && symbolResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 theme-bg-tertiary border theme-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {symbolResults.map((result, idx) => (
                        <button
                          key={`${result.symbol}-${idx}`}
                          onClick={() => {
                            setNewSymbol(result.symbol);
                            setSymbolSearch(result.symbol);
                            setShowSymbolDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:theme-bg transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium theme-text">{result.symbol}</span>
                            <span className="ml-2 text-sm theme-text-secondary">{result.name}</span>
                          </div>
                          <span className="text-xs theme-text-secondary">{result.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Add Symbols */}
                <div>
                  <label className="block text-sm font-medium theme-text mb-2">Popular Options</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {OPTIONS_QUICK_SYMBOLS.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => {
                          setNewSymbol(s.symbol);
                          setSymbolSearch(s.symbol);
                          setShowSymbolDropdown(false);
                        }}
                        disabled={widgets.some(w => w.symbol === s.symbol)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          widgets.some(w => w.symbol === s.symbol)
                            ? 'opacity-40 cursor-not-allowed theme-border theme-text-secondary'
                            : newSymbol === s.symbol
                              ? 'border-accent bg-accent/20 text-accent'
                              : 'theme-border theme-text-secondary hover:theme-text'
                        }`}
                        title={widgets.some(w => w.symbol === s.symbol) ? 'Already tracking' : s.name}
                      >
                        {s.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                {addError && (
                  <div className="p-3 bg-danger/10 border border-negative/30 rounded-lg text-danger text-sm">
                    {addError}
                  </div>
                )}
              </div>

              <div className="p-6 border-t theme-border flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddWidget(false);
                    setSymbolSearch('');
                    setSymbolResults([]);
                    setAddError('');
                    setNewSymbol('');
                  }}
                  className="px-4 py-2 theme-bg-tertiary rounded-lg theme-text hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  onClick={addWidget}
                  disabled={!newSymbol.trim()}
                  className="px-4 py-2 theme-button text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Symbol
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Options Flow Card Component with expandable charts
function OptionsFlowCard({ 
  widget, 
  data, 
  settings,
  cooldown, 
  onRefresh, 
  onDelete,
  onModeChange,
  onTimeframeChange,
  onDateChange,
}: { 
  widget: FlowWidget;
  data?: WidgetData;
  settings: WidgetSettings;
  cooldown: number;
  onRefresh: () => void;
  onDelete: () => void;
  onModeChange: (mode: DataMode) => void;
  onTimeframeChange: (timeframe: HistoricalTimeframe) => void;
  onDateChange: (date: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartInterval, setChartInterval] = useState<'5min' | '15min' | '60min' | 'daily'>('15min');
  
  const canRefresh = cooldown === 0;
  const feedItems = data?.data?.feedItems || [];

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await fetch('/api/flow/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: widget.symbol,
          interval: chartInterval,
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        setChartData(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setChartLoading(false);
    }
  }, [widget.symbol, chartInterval]);

  // Fetch chart data when expanded
  useEffect(() => {
    if (isExpanded && chartData.length === 0) {
      fetchChartData();
    }
  }, [isExpanded, chartData.length, fetchChartData]);

  // Refetch when interval changes
  useEffect(() => {
    if (isExpanded) {
      fetchChartData();
    }
  }, [isExpanded, chartInterval, fetchChartData]);

  // Calculate price change for display
  const priceChange = chartData.length >= 2 
    ? chartData[chartData.length - 1].price - chartData[0].price 
    : 0;
  const priceChangePercent = chartData.length >= 2 && chartData[0].price > 0
    ? ((priceChange / chartData[0].price) * 100)
    : 0;
  
  return (
    <div className="theme-bg-secondary rounded-xl border theme-border overflow-hidden">
      {/* Card Header - Clickable to expand */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 p-4 border-b theme-border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button className="p-1 -ml-1">
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 theme-text-secondary" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 theme-text-secondary" />
            )}
          </button>
          <span className="text-xl font-bold theme-text">{widget.symbol}</span>
          {chartData.length > 0 && (
            <>
              <span className="text-lg theme-text">${chartData[chartData.length - 1]?.price.toFixed(2)}</span>
              <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </>
          )}
        </div>
        
        {/* Controls - stop propagation to prevent collapse when clicking */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => onModeChange('realtime')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                settings.mode === 'realtime'
                  ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BoltIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Live</span>
            </button>
            <button
              onClick={() => onModeChange('historical')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                settings.mode === 'historical'
                  ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Historical</span>
            </button>
          </div>

          {/* Timeframe & Date Controls for Historical */}
          {settings.mode === 'historical' && (
            <>
              <select
                value={settings.timeframe}
                onChange={(e) => onTimeframeChange(e.target.value as HistoricalTimeframe)}
                className="px-2 py-1.5 text-sm theme-bg border theme-border rounded-lg theme-text cursor-pointer"
              >
                {TIMEFRAME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              
              {settings.timeframe === 'custom' && (
                <input
                  type="date"
                  value={settings.historicalDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-2 py-1.5 text-sm theme-bg border theme-border rounded-lg theme-text"
                />
              )}
            </>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={!canRefresh}
            className={`p-2 rounded-lg transition-colors ${
              canRefresh 
                ? 'hover:theme-bg theme-text-secondary hover:theme-text' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title={canRefresh ? 'Refresh' : `Refresh in ${cooldown}s`}
          >
            <ArrowPathIcon className={`h-5 w-5 ${!canRefresh && 'opacity-50'}`} />
          </button>
          
          {!canRefresh && (
            <span className="text-sm theme-text-secondary flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}
            </span>
          )}
          
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors"
            title="Remove"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expandable Chart Section */}
      {isExpanded && (
        <div className="p-4 border-b theme-border bg-black/5 dark:bg-white/5">
          {/* Chart Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 theme-text-secondary" />
              <span className="text-sm font-medium theme-text">Price Chart</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['5min', '15min', '60min', 'daily'] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setChartInterval(interval)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    chartInterval === interval
                      ? 'bg-white dark:bg-gray-700 theme-text shadow-sm'
                      : 'theme-text-secondary hover:theme-text'
                  }`}
                >
                  {interval === 'daily' ? '1D' : interval.replace('min', 'm')}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartLoading ? (
            <div className="h-48 flex items-center justify-center">
              <ArrowPathIcon className="h-6 w-6 animate-spin theme-text-secondary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm theme-text-secondary">
              No chart data available
            </div>
          ) : (
            <div className="space-y-4">
              {/* Price Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id={`gradient-${widget.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={priceChange >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={priceChange >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        if (chartInterval === 'daily') {
                          return value.slice(5); // MM-DD
                        }
                        return value.slice(11, 16); // HH:MM
                      }}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={priceChange >= 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill={`url(#gradient-${widget.symbol})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Chart */}
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        if (chartInterval === 'daily') {
                          return value.slice(5);
                        }
                        return value.slice(11, 16);
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                    />
                    <Bar dataKey="volume" fill="#3b82f6" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options Flow Table */}
      <div className="p-4">
        {!data ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin theme-text-secondary" />
          </div>
        ) : data.error ? (
          <div className="text-danger text-sm py-4 text-center">{data.error}</div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-8 theme-text-secondary">
            No options flow data available
            {settings.mode === 'historical' && (
              <p className="text-xs mt-2">Try a different date</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left theme-text-secondary border-b theme-border">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Strike</th>
                  <th className="pb-2 font-medium">Exp</th>
                  <th className="pb-2 font-medium text-right">Volume</th>
                  <th className="pb-2 font-medium text-right">OI</th>
                  <th className="pb-2 font-medium text-right">IV</th>
                  <th className="pb-2 font-medium text-right">Premium</th>
                </tr>
              </thead>
              <tbody>
                {feedItems.slice(0, isExpanded ? 20 : 5).map((item, idx) => (
                  <tr key={item.id || idx} className="border-b theme-border last:border-0">
                    <td className="py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        item.optionType === 'CALL' 
                          ? 'bg-positive/20 text-positive' 
                          : 'bg-negative/20 text-negative'
                      }`}>
                        {item.optionType === 'CALL' ? (
                          <ArrowTrendingUpIcon className="h-3 w-3" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-3 w-3" />
                        )}
                        {item.optionType}
                      </span>
                    </td>
                    <td className="py-2 theme-text font-medium">${item.strike.toFixed(2)}</td>
                    <td className="py-2 theme-text-secondary">{item.expiration}</td>
                    <td className="py-2 text-right theme-text font-medium">{item.volume.toLocaleString()}</td>
                    <td className="py-2 text-right theme-text-secondary">{item.openInterest?.toLocaleString() || '—'}</td>
                    <td className="py-2 text-right theme-text-secondary">
                      {item.iv ? `${(item.iv * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 text-right theme-text">
                      {item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {feedItems.length > (isExpanded ? 20 : 5) && (
              <div className="text-center text-sm theme-text-secondary pt-3">
                +{feedItems.length - (isExpanded ? 20 : 5)} more contracts
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning banner */}
      {data?.warning && (
        <div className="mx-4 mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400">
          {data.warning}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-2 flex justify-between text-xs theme-text-secondary">
        <span className="flex items-center gap-2">
          {settings.mode === 'realtime' ? 'Real-time data' : `Historical: ${settings.historicalDate}`}
          {!isExpanded && <span className="text-accent">Click to expand chart</span>}
        </span>
        {data?.cached && <span>Cached</span>}
      </div>
    </div>
  );
}
