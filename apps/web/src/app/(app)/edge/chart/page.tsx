'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createChart, IChartApi, ISeriesApi, ColorType, Time, UTCTimestamp, LineStyle, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { getTrades } from '@/lib/edge/store/edgeStore';
import { getChartPreferences, saveChartPreferences } from '@/lib/edge/store/prefsStore';
import { getHypotheticalTrades } from '@/lib/edge/store/backtestStore';
import { IndicatorSelector } from '@/components/edge/IndicatorSelector';
import { AppearancePanel } from '@/components/edge/AppearancePanel';
import { SimulationPanel } from '@/components/edge/SimulationPanel';
import { applyChartTheme, applyCandleStyle, applyIndicatorStyles, applyIndicatorColorById } from '@/lib/edge/chart/themeAdapter';
import type { SimSessionState, SimSettings } from '@/lib/edge/chart/sim/types';
import {
  createSimSession,
  placeMarketOrder,
  placeMarketOrderImmediate,
  processFills,
  closePosition,
  resetSimulation,
  updateSimSettings,
} from '@/lib/edge/chart/sim/simulator';
import { saveSimSession, loadSimSessionByContract } from '@/lib/edge/chart/sim/persistence';
import { saveSimTradesToJournal } from '@/lib/edge/chart/sim/export';
import { calculateTotalPnL } from '@/lib/edge/chart/sim/pnl';
import type { PositionOverlay } from '@/lib/edge/chart/overlays/types';
import { createOverlayFromTradeEntry, updateOverlayForTradeExit, priceToYCoordinate, timeToXCoordinate, yCoordinateToPrice, xCoordinateToTime } from '@/lib/edge/chart/overlays/utils';
import { INDICATORS, getIndicatorById } from '@/lib/edge/chart/indicators';
import type { RoundTripTrade, ChartTimeframe, HypotheticalTrade } from '@/lib/edge/types';
import type { Bar } from 'oakscriptjs';
import { timeframeToProjectX } from '@/lib/edge/utils/timeframe';
import { isoToUnixSeconds, unixSecondsToIso } from '@/lib/edge/utils/time';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  PaintBrushIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  ListBulletIcon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

type ViewMode = 'review' | 'replay' | 'backtest';

interface ActiveIndicator {
  id: string;
  series: ISeriesApi<'Line'>[];
  pane?: IChartApi; // For oscillators
  paneContainer?: HTMLElement; // Container element for removal
}

export default function EdgeChartPage() {
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const entryPriceLineRef = useRef<any>(null); // Price line for entry price
  const chartCleanupRef = useRef<(() => void) | null>(null);
  const [contractId, setContractId] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [contractOptions, setContractOptions] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('5m');
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [bars, setBars] = useState<any[]>([]);
  const [barsForIndicators, setBarsForIndicators] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<RoundTripTrade[]>([]);
  const [prefs, setPrefs] = useState(getChartPreferences());
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [simSession, setSimSession] = useState<SimSessionState | null>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null); // Store full contract object for metadata
  const [simPanelPosition, setSimPanelPosition] = useState<'right' | 'bottom'>('right');
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [positionOverlays, setPositionOverlays] = useState<Map<string, any>>(new Map()); // Overlays keyed by fillId or tradeId
  const [draggedOverlay, setDraggedOverlay] = useState<{ id: string; dragStart: { x: number; y: number; topPrice: number; bottomPrice: number; startTime: number; endTime: number } } | null>(null);
  const activeIndicatorsRef = useRef<Map<string, ActiveIndicator>>(new Map());
  const [activeIndicators, setActiveIndicators] = useState<Map<string, ActiveIndicator>>(new Map());
  const [replayState, setReplayState] = useState({
    isPlaying: false,
    currentIndex: 0, // Index in bars array
    timePerCandle: 30, // Seconds per candle (30s = 1x slowest, 0.5s = 8x fastest)
    startDateTime: '', // ISO string for date/time selector
  });
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const allTrades = getTrades();
    setTrades(allTrades);
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) {
      // Container not ready, check again soon
      const timer = setTimeout(() => {
        if (chartContainerRef.current && !chartRef.current) {
          // Trigger re-run by updating a state or force re-render
        }
      }, 300);
      return () => clearTimeout(timer);
    }

    // Clean up existing chart if container changed
    if (chartCleanupRef.current) {
      chartCleanupRef.current();
      chartCleanupRef.current = null;
    }

    // Wait for container to have dimensions
    let retryCount = 0;
    const maxRetries = 10;
    
    const initChart = () => {
      if (!chartContainerRef.current) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initChart, 200);
        }
        return;
      }
      
      const container = chartContainerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // If container has no dimensions, wait a bit and try again
      if ((width === 0 || height === 0) && retryCount < maxRetries) {
        retryCount++;
        setTimeout(initChart, 200);
        return;
      }

      // Don't reinitialize if chart already exists
      if (chartRef.current) {
        // Just resize existing chart
        if (width > 0 && height > 0) {
          chartRef.current.applyOptions({
            width: width,
            height: height,
          });
        }
        return;
      }

      // Use fallback dimensions if still 0
      const finalWidth = width || 800;
      const finalHeight = height || 600;

      const chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: prefs.layout.backgroundColor },
          textColor: prefs.layout.textColor,
        },
        grid: {
          vertLines: { color: prefs.grid.vertLinesColor },
          horzLines: { color: prefs.grid.horzLinesColor },
        },
        rightPriceScale: {
          borderColor: prefs.scale.borderColor,
        },
        timeScale: {
          borderColor: prefs.scale.borderColor,
        },
        width: finalWidth,
        height: finalHeight,
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: prefs.candles.upColor,
        downColor: prefs.candles.downColor,
        borderVisible: false,
        wickUpColor: prefs.candles.wickUpColor,
        wickDownColor: prefs.candles.wickDownColor,
        borderUpColor: prefs.candles.borderUpColor,
        borderDownColor: prefs.candles.borderDownColor,
      }) as ISeriesApi<'Candlestick'>;

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          const width = chartContainerRef.current.clientWidth;
          const height = chartContainerRef.current.clientHeight;
          if (width > 0 && height > 0) {
            chartRef.current.applyOptions({
              width: width,
              height: height,
            });
          }
        }
      };

      window.addEventListener('resize', handleResize);
      
      // Store cleanup function
      chartCleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candlestickSeriesRef.current = null;
        }
      };
    };

    // Small delay to ensure container is mounted and has dimensions
    const timer = setTimeout(initChart, 100);

    return () => {
      clearTimeout(timer);
      if (chartCleanupRef.current) {
        chartCleanupRef.current();
        chartCleanupRef.current = null;
      }
    };
  }, [prefs, simulationEnabled, simPanelPosition]);

  // Reinitialize chart when simulation panel is toggled (container structure changes)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // If chart exists, just resize it
    if (chartRef.current && chartContainerRef.current) {
      const width = chartContainerRef.current.clientWidth;
      const height = chartContainerRef.current.clientHeight;
      if (width > 0 && height > 0) {
        setTimeout(() => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight,
            });
          }
        }, 100);
      }
    } else {
      // Chart doesn't exist yet, trigger initialization
      const timer = setTimeout(() => {
        if (chartContainerRef.current && !chartRef.current) {
          const width = chartContainerRef.current.clientWidth;
          const height = chartContainerRef.current.clientHeight;
          if (width > 0 && height > 0) {
            // Force re-initialization by clearing and re-running
            const initChart = () => {
              if (!chartContainerRef.current || chartRef.current) return;
              // This will be handled by the main chart init effect
            };
            initChart();
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [simulationEnabled, simPanelPosition]);

  // Add ResizeObserver to handle panel resizing
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current && chartContainerRef.current) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chartRef.current.applyOptions({
              width: Math.max(width, 100), // Minimum width
              height: Math.max(height, 100), // Minimum height
            });
          }
        }
      }
    });

    const container = chartContainerRef.current;
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [simulationEnabled, simPanelPosition]);

  // Apply theme changes dynamically
  useEffect(() => {
    if (chartRef.current && prefs) {
      applyChartTheme(chartRef.current, prefs);
    }
  }, [prefs]);

  // Apply candle style changes dynamically
  useEffect(() => {
    if (candlestickSeriesRef.current && prefs) {
      applyCandleStyle(candlestickSeriesRef.current, prefs);
    }
  }, [prefs]);

  // Apply indicator color changes dynamically
  useEffect(() => {
    if (activeIndicatorsRef.current.size > 0 && prefs) {
      const indicatorSeries = new Map<string, ISeriesApi<'Line'>>();
      activeIndicatorsRef.current.forEach((indicator) => {
        indicator.series.forEach((series) => {
          indicatorSeries.set(indicator.id, series);
        });
      });
      applyIndicatorStyles(indicatorSeries, prefs);
      
      // Also apply colors by indicator ID for newly added indicators
      activeIndicatorsRef.current.forEach((indicator) => {
        indicator.series.forEach((series) => {
          applyIndicatorColorById(series, indicator.id, prefs);
        });
      });
    }
  }, [prefs, activeIndicators]);

  // Convert bars to Bar format for indicators
  useEffect(() => {
    if (bars.length > 0) {
      const converted: Bar[] = bars.map((bar) => ({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0,
      }));
      setBarsForIndicators(converted);
    }
  }, [bars]);

  // Calculate and add indicators
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || barsForIndicators.length === 0) return;

    const currentActive = activeIndicatorsRef.current;
    const newActiveIndicators = new Map(currentActive);

    // Remove indicators that are no longer selected
    currentActive.forEach((active, id) => {
      if (!selectedIndicators.includes(id)) {
        if (active.pane) {
          active.pane.remove();
          // Remove the pane container element
          if (active.paneContainer && active.paneContainer.parentElement) {
            active.paneContainer.parentElement.removeChild(active.paneContainer);
          }
        } else {
          active.series.forEach((series) => {
            chartRef.current?.removeSeries(series);
          });
        }
        newActiveIndicators.delete(id);
      }
    });

    // Add new indicators
    selectedIndicators.forEach((indicatorId) => {
      if (newActiveIndicators.has(indicatorId)) return; // Already added

      const indicatorConfig = getIndicatorById(indicatorId);
      if (!indicatorConfig) return;

      try {
        const result = indicatorConfig.calculate(barsForIndicators, indicatorConfig.defaultInputs);
        
        if (indicatorConfig.overlay) {
          // Add to main chart
          const colors = ['#2962FF', '#FF6D00', '#7E57C2', '#26a69a', '#ef5350'];
          const series: ISeriesApi<'Line'>[] = [];
          
          Object.keys(result.plots).forEach((plotKey, idx) => {
            const plotData = result.plots[plotKey as keyof typeof result.plots];
            if (plotData && plotData.length > 0) {
              const lineSeries = chartRef.current!.addSeries(LineSeries, {
                color: colors[idx % colors.length],
                lineWidth: 2,
                lineStyle: idx > 0 ? LineStyle.Dashed : LineStyle.Solid,
              });
              lineSeries.setData(plotData.map((point: any) => ({
                time: point.time,
                value: point.value,
              })));
              series.push(lineSeries);
            }
          });

          newActiveIndicators.set(indicatorId, { id: indicatorId, series });
        } else {
          // Create separate pane for oscillator
          const panesContainer = document.getElementById('indicator-panes') || chartContainerRef.current?.parentElement;
          if (!panesContainer) return;
          
          const paneContainer = document.createElement('div');
          paneContainer.style.width = '100%';
          paneContainer.style.height = '150px';
          paneContainer.style.marginTop = '8px';
          panesContainer.appendChild(paneContainer);

          const paneChart = createChart(paneContainer, {
            layout: {
              background: { type: ColorType.Solid, color: prefs.layout.backgroundColor },
              textColor: prefs.layout.textColor,
            },
            grid: {
              vertLines: { color: prefs.grid.vertLinesColor },
              horzLines: { color: prefs.grid.horzLinesColor },
            },
            rightPriceScale: {
              borderColor: prefs.scale.borderColor,
            },
            timeScale: {
              borderColor: prefs.scale.borderColor,
            },
            width: chartContainerRef.current!.clientWidth,
            height: 150,
          });

          const colors = ['#7E57C2', '#FF6D00', '#26a69a'];
          const series: ISeriesApi<'Line'>[] = [];

          Object.keys(result.plots).forEach((plotKey, idx) => {
            const plotData = result.plots[plotKey as keyof typeof result.plots];
            if (plotData && plotData.length > 0) {
              const lineSeries = paneChart.addSeries(LineSeries, {
                color: colors[idx % colors.length],
                lineWidth: 2,
              });
              lineSeries.setData(plotData.map((point: any) => ({
                time: point.time,
                value: point.value,
              })));
              series.push(lineSeries);
            }
          });

          // Sync time scale with main chart
          chartRef.current!.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) {
              paneChart.timeScale().setVisibleLogicalRange(range);
            }
          });

          newActiveIndicators.set(indicatorId, { id: indicatorId, series, pane: paneChart, paneContainer });
        }
      } catch (error) {
        console.error(`Failed to calculate indicator ${indicatorId}:`, error);
      }
    });

    activeIndicatorsRef.current = newActiveIndicators;
    setActiveIndicators(newActiveIndicators);
  }, [selectedIndicators, barsForIndicators, prefs]);

  // Update chart based on view mode
  const updateChartForViewMode = useCallback((allBars: any[], currentIndex: number) => {
    if (!candlestickSeriesRef.current) return;

    if (viewMode === 'replay') {
      // In replay mode, only show bars up to currentIndex
      const visibleBars = allBars.slice(0, currentIndex + 1);
      candlestickSeriesRef.current.setData(visibleBars);
      // Note: Chart remains fully interactive (pan, zoom, scroll) - we just don't auto-scroll
      // to the latest candle. Users can manually navigate the chart while replay is running.
    } else {
      // In review/backtest mode, show all bars
      candlestickSeriesRef.current.setData(allBars);
    }

    // Add trade markers (only for visible bars in replay mode)
    const visibleBars = viewMode === 'replay' ? allBars.slice(0, currentIndex + 1) : allBars;
    if (visibleBars.length > 0) {
      const lastVisibleTime = visibleBars[visibleBars.length - 1].time;
      const markers = trades
        .filter((t) => t.contractId === contractId)
        .filter((trade) => {
          if (viewMode === 'replay') {
            // Only show trades that have occurred up to current time
            const entryTime = isoToUnixSeconds(trade.entryTime) as UTCTimestamp;
            return entryTime <= lastVisibleTime;
          }
          return true;
        })
        .map((trade) => {
          const entryTime = isoToUnixSeconds(trade.entryTime) as UTCTimestamp;
          const exitTime = isoToUnixSeconds(trade.exitTime) as UTCTimestamp;
          const isWin = trade.outcome === 'WIN';
          const isLoss = trade.outcome === 'LOSS';

          return [
            {
              time: entryTime,
              position: trade.direction === 'LONG' ? 'belowBar' : 'aboveBar',
              color: isWin ? '#26a69a' : isLoss ? '#ef5350' : '#787b86',
              shape: trade.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
              text: `${trade.direction} ${trade.qty}`,
            },
            {
              time: exitTime,
              position: trade.direction === 'LONG' ? 'aboveBar' : 'belowBar',
              color: isWin ? '#26a69a' : isLoss ? '#ef5350' : '#787b86',
              shape: 'circle',
              text: `Exit ${trade.pnlNet >= 0 ? '+' : ''}$${trade.pnlNet.toFixed(2)}`,
            },
          ];
        })
        .flat();

      // Add simulation markers if enabled
      if (simulationEnabled && simSession && simSession.fills.length > 0) {
        const simMarkers = simSession.fills
          .filter((fill) => {
            if (viewMode === 'replay') {
              const fillTime = isoToUnixSeconds(fill.timeUtc) as UTCTimestamp;
              return fillTime <= lastVisibleTime;
            }
            return true;
          })
          .map((fill) => {
            const fillTime = isoToUnixSeconds(fill.timeUtc) as UTCTimestamp;
            return {
              time: fillTime,
              position: fill.side === 'BUY' ? 'belowBar' : 'aboveBar',
              color: fill.side === 'BUY' ? '#4caf50' : '#f44336',
              shape: fill.side === 'BUY' ? 'arrowUp' : 'arrowDown',
              text: `SIM ${fill.side} ${fill.qty}`,
            };
          });
        markers.push(...simMarkers);
      }

      // Set markers on the series (lightweight-charts supports this but TypeScript types may not)
      if (candlestickSeriesRef.current && typeof (candlestickSeriesRef.current as any).setMarkers === 'function') {
        (candlestickSeriesRef.current as any).setMarkers(markers);
      }
    }
  }, [viewMode, trades, contractId, simulationEnabled, simSession]);

  // Replay controls
  const handlePlayPause = () => {
    if (replayState.isPlaying) {
      // Pause
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      setReplayState(prev => ({ ...prev, isPlaying: false }));
    } else {
      // Play
      if (replayState.currentIndex >= bars.length - 1) {
        // Reset to beginning if at end
        setReplayState(prev => ({ ...prev, currentIndex: 0, isPlaying: true }));
      } else {
        setReplayState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleStepForward = () => {
    if (replayState.currentIndex < bars.length - 1) {
      const newIndex = replayState.currentIndex + 1;
      
      // Process simulation fills if enabled
      if (simulationEnabled && simSession && selectedContract && newIndex < bars.length) {
        const nextBar = bars[newIndex];
        const contractMetadata = {
          tickSize: selectedContract.tickSize,
          tickValue: selectedContract.tickValue,
        };
        const updatedSession = processFills(simSession, newIndex, nextBar, contractMetadata);
        
        // Auto-save trades to journal when they close
        if (updatedSession.closedTrades.length > simSession.closedTrades.length) {
          const newlyClosedTrades = updatedSession.closedTrades.slice(simSession.closedTrades.length);
          if (newlyClosedTrades.length > 0) {
            saveSimTradesToJournal(newlyClosedTrades);
            // Store notification count for header to display
            const existingNotifications = localStorage.getItem('trde:edgeTradeNotifications');
            const currentCount = existingNotifications ? parseInt(existingNotifications, 10) : 0;
            localStorage.setItem('trde:edgeTradeNotifications', (currentCount + newlyClosedTrades.length).toString());
          }
        }
        
        setSimSession(updatedSession);
        saveSimSession(updatedSession);
      }
      
      setReplayState(prev => ({ ...prev, currentIndex: newIndex }));
      updateChartForViewMode(bars, newIndex);
    }
  };

  const handleStepBackward = () => {
    if (replayState.currentIndex > 0) {
      const newIndex = replayState.currentIndex - 1;
      setReplayState(prev => ({ ...prev, currentIndex: newIndex }));
      updateChartForViewMode(bars, newIndex);
    }
  };

  // Find bar index for a given timestamp
  const findBarIndexForTime = (targetTime: string): number => {
    if (bars.length === 0) return 0;
    const targetUnix = isoToUnixSeconds(targetTime) as UTCTimestamp;
    
    // Find the first bar that is >= targetTime
    for (let i = 0; i < bars.length; i++) {
      if (bars[i].time >= targetUnix) {
        return Math.max(0, i - 1); // Start from the bar before (or at) the target time
      }
    }
    // If target time is after all bars, return last index
    return bars.length - 1;
  };

  // Get min/max dates from bars for the date picker
  const getBarDateRange = () => {
    if (bars.length === 0) {
      const now = new Date();
      return {
        min: format(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        max: format(now, "yyyy-MM-dd'T'HH:mm"),
      };
    }
    
    // Bars have time as UTCTimestamp, need to convert back
    const firstBarTime = bars[0].time;
    const lastBarTime = bars[bars.length - 1].time;
    
    // Convert UTCTimestamp to Date (assuming it's seconds since epoch)
    const firstDate = new Date((firstBarTime as number) * 1000);
    const lastDate = new Date((lastBarTime as number) * 1000);
    
    return {
      min: format(firstDate, "yyyy-MM-dd'T'HH:mm"),
      max: format(lastDate, "yyyy-MM-dd'T'HH:mm"),
    };
  };

  const handleStartTimeChange = (dateTimeString: string) => {
    if (!dateTimeString || bars.length === 0) return;
    
    const targetIndex = findBarIndexForTime(dateTimeString);
    setReplayState(prev => ({ 
      ...prev, 
      currentIndex: targetIndex, 
      isPlaying: false,
      startDateTime: dateTimeString,
    }));
    
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    updateChartForViewMode(bars, targetIndex);
  };

  const handleTimePerCandleChange = (seconds: number) => {
    setReplayState(prev => ({ ...prev, timePerCandle: seconds }));
  };

  const loadBars = useCallback(async () => {
    if (!contractId) return;

    setLoading(true);
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

      const res = await fetch('/api/edge/projectx/history/bars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          live: false,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          timeframe,
        }),
      });

      const data = await res.json();
      if (data.bars) {
        setBars(data.bars);
        // Reset replay when new bars are loaded
        const dateRange = data.bars.length > 0 ? (() => {
          const firstBarTime = data.bars[0].time;
          const firstDate = new Date((firstBarTime as number) * 1000);
          return format(firstDate, "yyyy-MM-dd'T'HH:mm");
        })() : '';
        setReplayState(prev => ({ 
          ...prev, 
          currentIndex: 0, 
          isPlaying: false,
          startDateTime: dateRange,
        }));
        // Update chart based on view mode
        if (candlestickSeriesRef.current) {
          updateChartForViewMode(data.bars, 0);
        }
      }
    } catch (error) {
      console.error('Failed to load bars:', error);
    } finally {
      setLoading(false);
    }
  }, [contractId, timeframe, updateChartForViewMode]);

  useEffect(() => {
    if (contractId) {
      loadBars();
    }
  }, [contractId, loadBars]);

  // Replay animation effect
  useEffect(() => {
    if (viewMode === 'replay' && replayState.isPlaying && bars.length > 0) {
      // Convert seconds per candle to milliseconds
      const interval = replayState.timePerCandle * 1000;
      const currentBars = bars; // Capture bars in closure

      replayIntervalRef.current = setInterval(() => {
        setReplayState(prev => {
          if (prev.currentIndex >= currentBars.length - 1) {
            // Reached the end, stop playing
            if (replayIntervalRef.current) {
              clearInterval(replayIntervalRef.current);
              replayIntervalRef.current = null;
            }
            return { ...prev, isPlaying: false, currentIndex: currentBars.length - 1 };
          }
          const newIndex = prev.currentIndex + 1;
          
          // Process simulation fills if enabled
          if (simulationEnabled && simSession && selectedContract && newIndex < currentBars.length) {
            const nextBar = currentBars[newIndex];
            const contractMetadata = {
              tickSize: selectedContract.tickSize,
              tickValue: selectedContract.tickValue,
            };
            const updatedSession = processFills(simSession, newIndex, nextBar, contractMetadata);
            
            // Auto-save trades to journal when they close
            if (updatedSession.closedTrades.length > simSession.closedTrades.length) {
              const newlyClosedTrades = updatedSession.closedTrades.slice(simSession.closedTrades.length);
              if (newlyClosedTrades.length > 0) {
                saveSimTradesToJournal(newlyClosedTrades);
                // Store notification count for header to display
                const existingNotifications = localStorage.getItem('trde:edgeTradeNotifications');
                const currentCount = existingNotifications ? parseInt(existingNotifications, 10) : 0;
                localStorage.setItem('trde:edgeTradeNotifications', (currentCount + newlyClosedTrades.length).toString());
              }
            }
            
            setSimSession(updatedSession);
            saveSimSession(updatedSession);
          }
          
          // Update chart synchronously
          if (candlestickSeriesRef.current) {
            updateChartForViewMode(currentBars, newIndex);
          }
          return { ...prev, currentIndex: newIndex };
        });
      }, interval);

      return () => {
        if (replayIntervalRef.current) {
          clearInterval(replayIntervalRef.current);
          replayIntervalRef.current = null;
        }
      };
    } else {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
    }
  }, [viewMode, replayState.isPlaying, replayState.timePerCandle, bars, simulationEnabled, simSession, selectedContract]);

  // Update chart when view mode or replay state changes
  useEffect(() => {
    if (bars.length > 0 && candlestickSeriesRef.current) {
      updateChartForViewMode(bars, replayState.currentIndex);
    }
  }, [viewMode, replayState.currentIndex, trades, contractId, bars, updateChartForViewMode]);

  // Update entry price line when position changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !simSession) {
      // Remove price line if no position
      if (entryPriceLineRef.current) {
        candlestickSeriesRef.current?.removePriceLine(entryPriceLineRef.current);
        entryPriceLineRef.current = null;
      }
      return;
    }

    const position = simSession.position;
    if (position.qty === 0 || position.avgPrice === null) {
      // Remove price line if position is flat
      if (entryPriceLineRef.current) {
        candlestickSeriesRef.current.removePriceLine(entryPriceLineRef.current);
        entryPriceLineRef.current = null;
      }
      return;
    }

    // Create or update price line
    const lineColor = position.qty > 0 ? '#4caf50' : '#f44336'; // Green for long, red for short
    if (entryPriceLineRef.current) {
      // Update existing line
      candlestickSeriesRef.current.removePriceLine(entryPriceLineRef.current);
    }
    entryPriceLineRef.current = candlestickSeriesRef.current.createPriceLine({
      price: position.avgPrice,
      color: lineColor,
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `Entry ${position.qty > 0 ? 'LONG' : 'SHORT'} @ ${position.avgPrice.toFixed(2)}`,
    });
  }, [simSession]);

  const handleSearchContract = async (searchText: string) => {
    if (!searchText) {
      setContractOptions([]);
      return;
    }
    try {
      const res = await fetch('/api/edge/projectx/contracts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchText, live: false }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        console.error('Contract search API error:', errorData);
        setContractOptions([]);
        return;
      }
      
      const data = await res.json();
      
      // Log response for debugging
      console.log('Contract search response:', {
        hasContracts: !!data.contracts,
        contractsLength: data.contracts?.length,
        error: data.error,
        dataKeys: Object.keys(data),
      });
      
      if (data.error) {
        console.error('Contract search error in response:', data.error);
        setContractOptions([]);
        return;
      }
      
      if (data.contracts && data.contracts.length > 0) {
        setContractOptions(data.contracts);
        // Auto-select if only one result
        if (data.contracts.length === 1) {
          const active = data.contracts.find((c: any) => c.activeContract) || data.contracts[0];
          setContractId(active.id);
          setContractSearch(active.name || active.id);
          setContractOptions([]);
          setSelectedContract(active);
          
          // Load or create simulation session if enabled
          if (simulationEnabled) {
            const existing = loadSimSessionByContract(active.id);
            if (existing) {
              setSimSession(existing);
            } else {
              const newSession = createSimSession(
                active.id,
                active.name,
                { slippageTicks: 0, commissionPerContractPerSide: 0 }
              );
              setSimSession(newSession);
              saveSimSession(newSession);
            }
          }
        }
      } else {
        setContractOptions([]);
      }
    } catch (error) {
      console.error('Contract search failed:', error);
      setContractOptions([]);
    }
  };

  const handleSelectContract = (contract: any) => {
    setContractId(contract.id);
    setContractSearch(contract.name || contract.id);
    setContractOptions([]);
    setSelectedContract(contract);
    
    // Load or create simulation session for this contract
    if (simulationEnabled) {
      const existing = loadSimSessionByContract(contract.id);
      if (existing) {
        setSimSession(existing);
      } else {
        const newSession = createSimSession(
          contract.id,
          contract.name,
          { slippageTicks: 0, commissionPerContractPerSide: 0 }
        );
        setSimSession(newSession);
        saveSimSession(newSession);
      }
    }
  };

  // Load default contract on mount if no contract selected
  useEffect(() => {
    if (!contractId && !contractSearch) {
      // Load ES by default
      fetch('/api/edge/projectx/contracts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchText: 'ES', live: false }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.contracts && data.contracts.length > 0) {
            const active = data.contracts.find((c: any) => c.activeContract) || data.contracts[0];
            setContractId(active.id);
            setContractSearch(active.name || active.id);
            setSelectedContract(active);
          }
        })
        .catch((error) => {
          console.error('Failed to load default contract:', error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Initialize simulation session when simulation is enabled and contract is available
  useEffect(() => {
    if (simulationEnabled) {
      if (selectedContract && selectedContract.tickSize && selectedContract.tickValue) {
        // Contract has all required metadata
        const existing = loadSimSessionByContract(selectedContract.id);
        if (existing) {
          setSimSession(existing);
        } else {
          const newSession = createSimSession(
            selectedContract.id,
            selectedContract.name,
            { slippageTicks: 0, commissionPerContractPerSide: 0 }
          );
          setSimSession(newSession);
          saveSimSession(newSession);
        }
      } else if (contractId && !selectedContract) {
        // We have a contractId but no full contract object - fetch it
        fetch(`/api/edge/projectx/contracts/by-id?contractId=${encodeURIComponent(contractId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.contract && data.contract.tickSize && data.contract.tickValue) {
              setSelectedContract(data.contract);
              const existing = loadSimSessionByContract(data.contract.id);
              if (existing) {
                setSimSession(existing);
              } else {
                const newSession = createSimSession(
                  data.contract.id,
                  data.contract.name,
                  { slippageTicks: 0, commissionPerContractPerSide: 0 }
                );
                setSimSession(newSession);
                saveSimSession(newSession);
              }
            }
          })
          .catch((error) => {
            console.error('Failed to fetch contract metadata:', error);
          });
      }
    } else if (!simulationEnabled) {
      setSimSession(null);
    }
  }, [simulationEnabled, selectedContract, contractId]);

  const handleToggleIndicator = (indicatorId: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicatorId)
        ? prev.filter((id) => id !== indicatorId)
        : [...prev, indicatorId]
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden theme-bg">
      <div className="flex-shrink-0 space-y-4 p-6">
        {/* Header with Back Button and Collapse Toggle - Enhanced */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/edge')}
              className="p-3 rounded-xl theme-bg-tertiary hover:opacity-80 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold theme-text tracking-tight">EDGE Chart</h1>
            </div>
          </div>
          <button
            onClick={() => setToolbarCollapsed(!toolbarCollapsed)}
            className="px-5 py-2.5 rounded-xl theme-bg-tertiary hover:opacity-80 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2.5"
            title={toolbarCollapsed ? 'Expand controls' : 'Collapse controls'}
          >
            <span className="text-sm theme-text font-semibold">{toolbarCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
            {toolbarCollapsed ? (
              <ChevronDownIcon className="h-5 w-5 theme-text" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 theme-text" />
            )}
          </button>
        </div>

      {/* Toolbar - Collapsible - Enhanced */}
      {!toolbarCollapsed && (
        <>
      <div className="theme-bg-secondary border theme-border rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
              <input
                type="text"
                value={contractSearch}
                onChange={(e) => {
                  setContractSearch(e.target.value);
                  if (e.target.value.length >= 2) {
                    handleSearchContract(e.target.value);
                  } else {
                    setContractOptions([]);
                  }
                }}
                placeholder="Search contract (e.g., MNQ, ES)"
                className="w-full px-4 py-3 border-2 theme-border rounded-xl theme-bg-tertiary theme-text font-semibold focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
              />
              {contractOptions.length > 0 && (
                <div className="absolute z-10 mt-2 w-full theme-bg-secondary border-2 border-accent rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {contractOptions.map((contract) => (
                    <button
                      key={contract.id}
                      onClick={() => handleSelectContract(contract)}
                      className="w-full text-left px-5 py-3 theme-text hover:theme-bg-tertiary flex items-center justify-between border-b theme-border last:border-0 transition-colors duration-200"
                    >
                      <span className="font-semibold">{contract.name || contract.id}</span>
                      {contract.activeContract && (
                        <span className="text-xs text-accent font-bold px-2 py-1 bg-accent/10 rounded-full">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as ChartTimeframe)}
              className="px-5 py-3 border-2 theme-border rounded-xl theme-bg-tertiary theme-text font-bold focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1D">1D</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('review')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                viewMode === 'review'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'theme-bg-tertiary theme-text'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setViewMode('replay')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                viewMode === 'replay'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'theme-bg-tertiary theme-text'
              }`}
            >
              Replay
            </button>
          </div>
        </div>

        {/* Simulation Toggle - Only show in Replay mode - Enhanced */}
        {viewMode === 'replay' && (
          <div className="theme-bg-secondary border theme-border rounded-2xl p-5 mt-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold theme-text uppercase tracking-wide">
                  TRDE EDGE Backtesting
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={simulationEnabled}
                  onClick={() => {
                    const enabled = !simulationEnabled;
                    setSimulationEnabled(enabled);
                    if (enabled && selectedContract) {
                      const existing = loadSimSessionByContract(selectedContract.id);
                      if (existing) {
                        setSimSession(existing);
                      } else {
                        const newSession = createSimSession(
                          selectedContract.id,
                          selectedContract.name,
                          { slippageTicks: 0, commissionPerContractPerSide: 0 }
                        );
                        setSimSession(newSession);
                        saveSimSession(newSession);
                      }
                    } else {
                      setSimSession(null);
                    }
                  }}
                  className={`
                    relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 theme-ring focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
                    ${simulationEnabled ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'theme-bg-tertiary'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
                      ${simulationEnabled ? 'translate-x-8' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replay Controls - Only show in replay mode - Enhanced */}
        {viewMode === 'replay' && bars.length > 0 && (
          <div className="theme-bg-secondary border theme-border rounded-2xl p-6 mt-4 space-y-5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <label className="text-sm font-bold theme-text uppercase tracking-wide">Start Time:</label>
                  <input
                    type="datetime-local"
                    value={replayState.startDateTime}
                    min={getBarDateRange().min}
                    max={getBarDateRange().max}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="px-4 py-2 border-2 theme-border rounded-xl theme-bg-tertiary theme-text text-sm font-semibold focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="px-4 py-2 theme-bg-tertiary rounded-xl">
                  <span className="text-sm theme-text font-bold">
                    {replayState.currentIndex + 1} / {bars.length} bars
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStepBackward}
                  disabled={replayState.currentIndex === 0}
                  className="p-3 theme-bg-tertiary hover:opacity-80 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Step backward"
                >
                  <BackwardIcon className="h-6 w-6 theme-text" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:scale-110 active:scale-95"
                  title={replayState.isPlaying ? 'Pause' : 'Play'}
                >
                  {replayState.isPlaying ? (
                    <PauseIcon className="h-6 w-6" />
                  ) : (
                    <PlayIcon className="h-6 w-6" />
                  )}
                </button>
                <button
                  onClick={handleStepForward}
                  disabled={replayState.currentIndex >= bars.length - 1}
                  className="p-3 theme-bg-tertiary hover:opacity-80 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Step forward"
                >
                  <ForwardIcon className="h-6 w-6 theme-text" />
                </button>
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-md">
                <span className="text-sm text-black/60 dark:text-white/60 whitespace-nowrap">Chart speed:</span>
                {(() => {
                  const speedOptions = [
                    { seconds: 30, label: '1x' },
                    { seconds: 15, label: '2x' },
                    { seconds: 10, label: '3x' },
                    { seconds: 5, label: '4x' },
                    { seconds: 3, label: '5x' },
                    { seconds: 1, label: '6x' },
                    { seconds: 0.5, label: '7x' },
                    { seconds: 0.25, label: '8x' },
                  ];
                  const currentIndex = speedOptions.findIndex(opt => opt.seconds === replayState.timePerCandle);
                  const sliderValue = currentIndex >= 0 ? currentIndex + 1 : 1;
                  const percent = ((sliderValue - 1) / 7) * 100;
                  const sliderBackground = `linear-gradient(to right, #2563eb 0%, #2563eb ${percent}%, rgba(0,0,0,0.1) ${percent}%, rgba(0,0,0,0.1) 100%)`;
                  const sliderCss = 'input[type="range"]::-webkit-slider-thumb {-webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);} input[type="range"]::-moz-range-thumb {width: 18px; height: 18px; border-radius: 50%; background: #2563eb; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);} input[type="range"]::-ms-thumb {width: 18px; height: 18px; border-radius: 50%; background: #2563eb; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);}';
                  
                  return (
                    <>
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min="1"
                          max="8"
                          step="1"
                          value={sliderValue}
                          onChange={(e) => {
                            const index = parseInt(e.target.value) - 1;
                            handleTimePerCandleChange(speedOptions[index].seconds);
                          }}
                          className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: sliderBackground
                          }}
                        />
                        <style dangerouslySetInnerHTML={{__html: sliderCss}} />
                      </div>
                      <span className="text-sm font-semibold text-black dark:text-white min-w-[3rem] text-center">
                        {speedOptions[sliderValue - 1]?.label || '1x'}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full bg-black/10 dark:bg-white/10 rounded-full h-2">
              <div
                className="theme-button h-2 rounded-full transition-all duration-100"
                style={{ width: `${((replayState.currentIndex + 1) / bars.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        {selectedIndicators.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedIndicators.map((id) => {
              const indicator = getIndicatorById(id);
              return indicator ? (
                <span
                  key={id}
                  className="px-3 py-2 bg-accent-bg dark:bg-accent/20 text-accent-dark dark:text-accent-light text-sm rounded-xl flex items-center gap-2 font-semibold border border-accent-light dark:border-accent-dark hover:bg-accent-light dark:hover:bg-accent/30 transition-colors duration-200"
                >
                  <span>{indicator.name}</span>
                  <button
                    onClick={() => handleToggleIndicator(id)}
                    className="hover:bg-accent-light dark:hover:bg-accent-dark rounded-full px-1.5 py-0.5 transition-all duration-200 hover:scale-110"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      </>
      )}
      </div>

      {/* Chart and Simulation Panel Container - Resizable Panels */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {simulationEnabled ? (
          <Group 
            orientation={simPanelPosition === 'right' ? 'horizontal' : 'vertical'}
            className="h-full w-full"
          >
            {/* Chart Panel */}
            <Panel defaultSize={simPanelPosition === 'right' ? 70 : 65} minSize={30} className="relative flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex-1 min-h-0 relative" style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  key="chart-container" 
                  ref={chartContainerRef} 
                  className="flex-1 min-h-0" 
                  style={{ width: '100%', height: '100%', position: 'relative' }} 
                />
                <div id="indicator-panes" className="w-full" />
              </div>
              
              {/* Chart Top Bar - Settings, Indicators, and P&L Bubbles */}
              <div className="absolute top-4 left-4 z-30 flex items-center gap-1">
                <button
                  onClick={() => setShowAppearancePanel(true)}
                  className="h-8 px-3 rounded-lg bg-transparent border border-black/40 dark:border-white/40 shadow-lg flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                  title="Appearance Settings"
                >
                  <Cog6ToothIcon className="h-4 w-4 text-black dark:text-white" />
                </button>
                <button
                  onClick={() => setShowIndicatorSelector(true)}
                  className="h-8 px-3 rounded-lg bg-transparent border border-black/40 dark:border-white/40 shadow-lg flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 transition-colors relative"
                  title="Indicators"
                >
                  <ListBulletIcon className="h-4 w-4 text-black dark:text-white" />
                  {selectedIndicators.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                      {selectedIndicators.length}
                    </span>
                  )}
                </button>
                
                {/* P&L Bubbles - Always show when simulation is enabled */}
                {simulationEnabled && simSession && bars.length > 0 && replayState.currentIndex < bars.length && selectedContract ? (
                  (() => {
                    // Always calculate P&L - RP&L comes from closed trades, UP&L from current position
                    const currentPrice = bars[replayState.currentIndex].close;
                    const pnl = calculateTotalPnL(
                      simSession.position,
                      currentPrice,
                      simSession.closedTrades,
                      { tickSize: selectedContract.tickSize, tickValue: selectedContract.tickValue }
                    );
                    
                    // Determine if chart background is light or dark
                    const bgIsLight = (() => {
                      const hex = prefs.layout.backgroundColor.replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                      return luminance > 0.5;
                    })();
                    
                    const getBubbleColor = (value: number) => {
                      if (value > 0) return bgIsLight ? 'bg-success/20 border-green-600/60' : 'bg-success/20 border-green-400/60';
                      if (value < 0) return bgIsLight ? 'bg-danger/20 border-red-600/60' : 'bg-danger/20 border-red-400/60';
                      return bgIsLight ? 'bg-white/80 border-black/40' : 'bg-black/40 border-white/40';
                    };
                    
                    const textColor = bgIsLight ? 'text-black' : 'text-white';
                    
                    return (
                      <>
                        <div className={`h-8 px-3 rounded-lg border shadow-lg flex items-center justify-center ${getBubbleColor(pnl.realizedUsd)}`}>
                          <span className={`text-xs font-bold ${textColor}`}>
                            RP&L: <span className={pnl.realizedUsd > 0 ? 'text-green-600' : pnl.realizedUsd < 0 ? 'text-red-400' : textColor}>
                              ${pnl.realizedUsd >= 0 ? '+' : ''}{pnl.realizedUsd.toFixed(2)}
                            </span>
                          </span>
                        </div>
                        <div className={`h-8 px-3 rounded-lg border shadow-lg flex items-center justify-center ${getBubbleColor(pnl.unrealizedUsd)}`}>
                          <span className={`text-xs font-bold ${textColor}`}>
                            UP&L: <span className={pnl.unrealizedUsd > 0 ? 'text-green-600' : pnl.unrealizedUsd < 0 ? 'text-red-400' : textColor}>
                              ${pnl.unrealizedUsd >= 0 ? '+' : ''}{pnl.unrealizedUsd.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </>
                    );
                  })()
                ) : null}
              </div>
              
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
                  Loading chart data...
                </div>
              )}
            </Panel>

            {/* Resize Handle */}
            <Separator className={simPanelPosition === 'right' 
              ? 'w-1 bg-black/10 dark:bg-white/10 hover:bg-accent transition-colors cursor-col-resize' 
              : 'h-1 bg-black/10 dark:bg-white/10 hover:bg-accent transition-colors cursor-row-resize'} />

            {/* Simulation Panel */}
            <Panel defaultSize={simPanelPosition === 'right' ? 30 : 35} minSize={25} className="theme-bg-secondary flex flex-col overflow-hidden">
              <SimulationPanel
                isOpen={true}
                onClose={() => setSimulationEnabled(false)}
                session={simSession}
                currentPrice={
                  bars.length > 0 && replayState.currentIndex < bars.length
                    ? bars[replayState.currentIndex].close
                    : null
                }
                currentReplayIndex={replayState.currentIndex}
                contractMetadata={
                  selectedContract
                    ? { tickSize: selectedContract.tickSize, tickValue: selectedContract.tickValue }
                    : null
                }
                contractName={selectedContract?.name}
                onPlaceOrder={(side, qty, immediate = false) => {
                  if (simSession && selectedContract && bars.length > 0 && replayState.currentIndex < bars.length) {
                    const currentBar = bars[replayState.currentIndex];
                    const contractMetadata = {
                      tickSize: selectedContract.tickSize,
                      tickValue: selectedContract.tickValue,
                    };
                    
                    let updated;
                    if (immediate) {
                      // Fill immediately at current bar (for bid/ask buttons)
                      updated = placeMarketOrderImmediate(
                        simSession,
                        side,
                        qty,
                        replayState.currentIndex,
                        currentBar,
                        contractMetadata
                      );
                    } else {
                      // Queue for next bar (for regular buy/sell buttons)
                      updated = placeMarketOrder(simSession, side, qty, replayState.currentIndex);
                    }
                    
                    setSimSession(updated);
                    saveSimSession(updated);
                    
                    // Update chart markers immediately
                    if (candlestickSeriesRef.current) {
                      updateChartForViewMode(bars, replayState.currentIndex);
                    }
                  }
                }}
                onClosePosition={() => {
                  if (simSession) {
                    const updated = closePosition(simSession, replayState.currentIndex);
                    setSimSession(updated);
                    saveSimSession(updated);
                  }
                }}
                onReset={() => {
                  if (simSession) {
                    const updated = resetSimulation(simSession);
                    setSimSession(updated);
                    saveSimSession(updated);
                  }
                }}
                onUpdateSettings={(settings) => {
                  if (simSession) {
                    const updated = updateSimSettings(simSession, settings);
                    setSimSession(updated);
                    saveSimSession(updated);
                  }
                }}
                onSaveToJournal={() => {
                  if (simSession && simSession.closedTrades.length > 0) {
                    const tradeCount = simSession.closedTrades.length;
                    saveSimTradesToJournal(simSession.closedTrades);
                    // Store notification count for header to display
                    const existingNotifications = localStorage.getItem('trde:edgeTradeNotifications');
                    const currentCount = existingNotifications ? parseInt(existingNotifications, 10) : 0;
                    localStorage.setItem('trde:edgeTradeNotifications', (currentCount + tradeCount).toString());
                    router.push('/trades');
                  }
                }}
                position={simPanelPosition}
                onPositionChange={setSimPanelPosition}
              />
            </Panel>
          </Group>
        ) : (
          /* Chart Only - No Panels */
          <div className="h-full w-full relative flex flex-col">
            <div className="flex-1 min-h-0 relative" style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                key="chart-container" 
                ref={chartContainerRef} 
                className="flex-1 min-h-0" 
                style={{ width: '100%', height: '100%', position: 'relative' }} 
              >
              {/* Chart Top Bar - Settings, Indicators, and P&L Bubbles */}
              <div className="absolute top-4 left-4 z-30 flex items-center gap-1">
                <button
                  onClick={() => setShowAppearancePanel(true)}
                  className="h-8 px-3 rounded-lg bg-transparent border border-black/40 dark:border-white/40 shadow-lg flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                  title="Appearance Settings"
                >
                  <Cog6ToothIcon className="h-4 w-4 text-black dark:text-white" />
                </button>
                <button
                  onClick={() => setShowIndicatorSelector(true)}
                  className="h-8 px-3 rounded-lg bg-transparent border border-black/40 dark:border-white/40 shadow-lg flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 transition-colors relative"
                  title="Indicators"
                >
                  <ListBulletIcon className="h-4 w-4 text-black dark:text-white" />
                  {selectedIndicators.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                      {selectedIndicators.length}
                    </span>
                  )}
                </button>
              </div>
              </div>
              <div id="indicator-panes" className="w-full" />
            </div>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
                Loading chart data...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trades List Sidebar - Hide when simulation is enabled to save space - Enhanced */}
      {!simulationEnabled && (
        <div className="flex-shrink-0 theme-bg-secondary border theme-border rounded-2xl p-6 max-h-48 overflow-y-auto mx-6 mb-6 shadow-md">
        <div className="font-bold mb-4 text-lg theme-text uppercase tracking-wide">Trades ({trades.filter((t) => t.contractId === contractId).length})</div>
        <div className="space-y-2">
          {trades
            .filter((t) => t.contractId === contractId)
            .slice(0, 10)
            .map((trade) => (
              <div
                key={trade.tradeId}
                className="flex items-center justify-between p-3 theme-bg-tertiary hover:opacity-80 rounded-xl transition-all duration-200 hover:scale-[1.01]"
              >
                <span className="font-semibold theme-text">
                  {trade.direction} {trade.qty} @ {trade.avgEntryPrice.toFixed(2)}
                </span>
                <span
                  className={`font-bold ${
                    trade.pnlNet >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  ${trade.pnlNet >= 0 ? '+' : ''}{trade.pnlNet.toFixed(2)}
                </span>
              </div>
            ))}
        </div>
      </div>
      )}

      {/* Indicator Selector Modal */}
      {showIndicatorSelector && (
        <IndicatorSelector
          selectedIndicators={selectedIndicators}
          onToggle={handleToggleIndicator}
          onClose={() => setShowIndicatorSelector(false)}
        />
      )}

      <AppearancePanel
        isOpen={showAppearancePanel}
        onClose={() => setShowAppearancePanel(false)}
        prefs={prefs}
        onPrefsChange={(newPrefs) => {
          setPrefs(newPrefs);
          saveChartPreferences(newPrefs);
        }}
      />
    </div>
  );
}
