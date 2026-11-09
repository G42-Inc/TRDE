'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { Trade, DailyBias, DailyQuickJournal, Strategy, Collection } from '@trde/core';
import { AssetClass } from '@trde/core';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, startOfDay, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { CollectionManager } from '@/components/CollectionManager';
import { capitalizeFirst } from '@/lib/utils/formatEnum';

interface DayData {
  date: Date;
  pnl: number;
  tradeCount: number;
  trades: Trade[];
  bias: DailyBias | null;
  journals: DailyQuickJournal[];
  strategies: Set<string>;
}

export default function ReviewPage() {
  const router = useRouter();
  const {
    trades,
    dailyBiases: biases,
    quickJournals: journals,
    strategies,
    collections,
    isLoading
  } = useAppData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showEdgeTrades, setShowEdgeTrades] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Helper to check if a trade is an EDGE trade
  const isEdgeTrade = (trade: Trade): boolean => {
    const edgeCollection = collections.find((c) => c.name === 'EDGE');
    return (edgeCollection && trade.collections.includes(edgeCollection.id)) ||
           Boolean(trade.notes?.startsWith('[EDGE') || trade.id.startsWith('edge-') || trade.notes?.startsWith('Imported from EDGE'));
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="200px" height="2rem" />
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
          <SkeletonLoader width="100%" height="400px" />
        </div>
      </div>
    );
  }

  // Calculate data for each day in the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  // Get first day of week for the month (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = monthStart.getDay();

  // Create calendar days array (including days from previous/next month to fill the grid)
  const calendarDays: (Date | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add all days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  // Fill remaining cells to complete the grid (6 rows × 7 days = 42 cells)
  while (calendarDays.length < 42) {
    calendarDays.push(null);
  }

  const getDayData = (date: Date | null): DayData | null => {
    if (!date) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    // Filter trades based on toggle: show only EDGE trades or only real trades
    let dayTrades = trades.filter(t => {
      if (t.tradeDate !== dateStr) return false;
      const isEdge = isEdgeTrade(t);
      return showEdgeTrades ? isEdge : !isEdge;
    });

    const dayBias = biases.find(b => b.date === dateStr) || null;
    const dayJournals = journals.filter(j => {
      const journalDate = format(new Date(j.timestamp), 'yyyy-MM-dd');
      return journalDate === dateStr;
    });

    const dayPnL = dayTrades.reduce((sum, t) => sum + t.resultUsd, 0);
    const strategySet = new Set(dayTrades.map(t => t.strategyId).filter(Boolean));

    return {
      date,
      pnl: dayPnL,
      tradeCount: dayTrades.length,
      trades: dayTrades,
      bias: dayBias,
      journals: dayJournals,
      strategies: strategySet,
    };
  };

  const dayData = getDayData(selectedDay);

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDay(date);
  };

  const handleAddTrade = (date: Date) => {
    // Navigate to new trade page with pre-filled date
    const formattedDate = format(date, 'yyyy-MM-dd');
    router.push(`/trades/new?date=${formattedDate}`);
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Color scheme: red/green for real trades, blue/orange for EDGE trades
  const getColorClasses = (pnl: number, isPositive: boolean, tradeCount: number, date: Date | null) => {
    // Don't apply background color for days with no trades, 0 profit, or future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureDate = date && date > today;

    if (tradeCount === 0 || pnl === 0 || isFutureDate) {
      return {
        bg: 'bg-transparent',
        text: 'theme-text-secondary',
      };
    }

    if (showEdgeTrades) {
      // Blue/orange for EDGE trades
      return {
        bg: isPositive ? 'bg-accent/10' : 'bg-orange-500/10',
        text: isPositive ? 'text-accent' : 'text-orange-500',
      };
    } else {
      // Red/green for real trades
      return {
        bg: isPositive ? 'bg-success/10' : 'bg-danger/10',
        text: isPositive ? 'text-positive' : 'text-negative',
      };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <CalendarIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold theme-text tracking-tight">Review Calendar</h1>
            <p className="theme-text-secondary mt-1">Track your trading performance day by day</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 theme-bg-tertiary rounded-xl border theme-border">
            <span className={`text-sm font-semibold transition-colors ${showEdgeTrades ? 'theme-text-secondary' : 'theme-text'}`}>
              Real Trades
            </span>
            <button
              type="button"
              role="switch"
              aria-label="Show EDGE trades"
              aria-checked={showEdgeTrades}
              onClick={() => setShowEdgeTrades(!showEdgeTrades)}
              className={`
                relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 theme-ring focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black
                ${showEdgeTrades ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'theme-bg-tertiary'}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
                  ${showEdgeTrades ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
            <span className={`text-sm font-semibold transition-colors ${showEdgeTrades ? 'theme-text' : 'theme-text-secondary'}`}>
              EDGE Trades
            </span>
          </div>
        </div>
      </div>

      <CollectionManager />

      {/* Calendar - Enhanced */}
      <div className="theme-bg-secondary p-2 sm:p-8 rounded-2xl border theme-border animate-slide-in-up" style={{ boxShadow: 'var(--shadow-md)' }}>
        {/* Month Navigation - Enhanced */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={previousMonth}
            aria-label="Previous month"
            className="p-3 rounded-xl theme-bg-tertiary hover:opacity-80 transition-all duration-200 hover:scale-105 active:scale-95 theme-text"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h2 className="text-xl sm:text-3xl font-bold theme-text tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-3 rounded-xl theme-bg-tertiary hover:opacity-80 transition-all duration-200 hover:scale-105 active:scale-95 theme-text"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Calendar Grid - Enhanced */}
        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {/* Week day headers - Enhanced */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-bold theme-text-secondary py-3 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}

          {/* Calendar days - Enhanced */}
          {calendarDays.map((date, idx) => {
            const data = getDayData(date);
            const isCurrentMonth = date && isSameMonth(date, currentMonth);
            const isToday = date && isSameDay(date, new Date());
            const colors = data ? getColorClasses(data.pnl, data.pnl > 0, data.tradeCount, date) : { bg: 'bg-transparent', text: 'theme-text-secondary' };

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(date)}
                disabled={!date}
                aria-label={date ? `${format(date, 'MMMM d, yyyy')}: ${data?.tradeCount ?? 0} trades, $${data?.pnl ?? 0}` : undefined}
                className={`
                  group relative min-h-16 sm:aspect-square p-1 sm:p-3 rounded-lg sm:rounded-2xl border transition-all duration-300
                  ${!date ? 'cursor-default invisible' : 'cursor-pointer hover:scale-105 hover:border-opacity-100'}
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${isToday ? 'border-accent ring-4 ring-blue-500/20 shadow-lg' : 'theme-border hover:border-accent/50'}
                  ${colors.bg}
                `}
                style={date ? { boxShadow: isToday ? 'var(--shadow-md)' : 'var(--shadow-sm)' } : {}}
              >
                {date && (
                  <div className="flex flex-col h-full relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-xs sm:text-base font-bold ${isToday ? 'text-accent' : 'theme-text'}`}>
                        {format(date, 'd')}
                      </div>
                    </div>
                    {data && data.tradeCount > 0 ? (
                      <div className="mt-auto">
                        <div className={`text-[10px] sm:text-sm font-bold ${colors.text} mb-0.5`}>
                          {data.pnl > 0 ? '+' : ''}${Math.abs(data.pnl) >= 1000 ? (data.pnl / 1000).toFixed(1) + 'k' : data.pnl.toFixed(0)}
                        </div>
                        <div className="hidden sm:block text-xs theme-text-tertiary font-medium">
                          {data.tradeCount} {data.tradeCount === 1 ? 'trade' : 'trades'}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto opacity-0 group-hover:opacity-50 transition-opacity duration-200">
                        <div className="hidden sm:block text-xs theme-text-tertiary font-medium">No trades</div>
                      </div>
                    )}
                  </div>
                )}
                {/* Gradient overlay on hover */}
                {date && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.06] transition-all duration-300 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal - Enhanced */}
      {selectedDay && dayData && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="theme-bg-secondary rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border theme-border animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: 'var(--shadow-2xl)' }}
          >
            <div className="p-7 border-b theme-border sticky top-0 theme-bg-secondary z-10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-3xl font-bold theme-text tracking-tight">
                    {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                  </h2>
                  <div className="mt-3 flex items-center gap-6">
                    <div className={`text-2xl font-bold ${
                      dayData.pnl > 0
                        ? (showEdgeTrades ? 'text-accent' : 'text-positive')
                        : dayData.pnl < 0
                        ? (showEdgeTrades ? 'text-orange-500' : 'text-negative')
                        : 'theme-text'
                    }`}>
                      {dayData.pnl > 0 ? '+' : ''}${dayData.pnl.toFixed(2)}
                    </div>
                    <div className="px-4 py-2 theme-bg-tertiary rounded-xl">
                      <span className="text-sm theme-text-secondary font-medium">
                        {dayData.tradeCount} {dayData.tradeCount === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAddTrade(selectedDay)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Trade
                  </button>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-3 rounded-xl theme-text-secondary hover:theme-text hover:bg-danger/10 transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-7 space-y-6">
              {/* Daily Bias - Enhanced */}
              {dayData.bias && (
                <div className="theme-bg-tertiary p-5 rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 animate-slide-in-up">
                  <h3 className="font-bold theme-text mb-3 text-lg uppercase tracking-wide">Daily Bias</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide ${
                      dayData.bias.bias === 'bullish'
                        ? (showEdgeTrades
                            ? 'bg-accent/20 text-accent border-2 border-accent/30'
                            : 'bg-positive/20 text-positive border-2 border-positive/30')
                        : dayData.bias.bias === 'bearish'
                        ? (showEdgeTrades
                            ? 'bg-orange-500/20 text-orange-500 border-2 border-orange-500/30'
                            : 'bg-negative/20 text-negative border-2 border-negative/30')
                        : 'theme-bg-tertiary theme-text border-2 theme-border'
                    }`}>
                      {dayData.bias.bias}
                    </span>
                    <span className="px-3 py-1 theme-bg-secondary rounded-lg text-sm theme-text font-semibold">
                      {dayData.bias.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-sm theme-text leading-relaxed">{dayData.bias.reason}</p>
                </div>
              )}

              {/* Quick Journals - Enhanced */}
              {dayData.journals.length > 0 && (
                <div className="animate-slide-in-up" style={{ animationDelay: '50ms' }}>
                  <h3 className="font-bold theme-text mb-4 text-lg uppercase tracking-wide">Quick Journals</h3>
                  <div className="space-y-3">
                    {dayData.journals.map((journal, idx) => (
                      <div key={idx} className="theme-bg-tertiary p-4 rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.01]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs theme-text-secondary font-semibold uppercase tracking-wide">
                            {format(new Date(journal.timestamp), 'h:mm a')}
                          </span>
                          <span className="px-3 py-1 theme-bg-secondary rounded-full text-xs font-bold theme-text uppercase tracking-wide">
                            {capitalizeFirst(journal.moodLabel.replace(/_/g, ' '))}
                          </span>
                        </div>
                        <p className="text-sm theme-text leading-relaxed">{journal.shortNote}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategies Used - Enhanced */}
              {dayData.strategies.size > 0 && (
                <div className="animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                  <h3 className="font-bold theme-text mb-4 text-lg uppercase tracking-wide">Strategies Used</h3>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(dayData.strategies).map((strategyId) => {
                      const strategy = strategies.find(s => s.id === strategyId);
                      return (
                        <span
                          key={strategyId}
                          className="px-4 py-2 bg-accent/10 text-accent rounded-xl text-sm font-bold border-2 border-accent/20 hover:bg-accent/20 hover:scale-105 transition-all duration-200"
                        >
                          {strategy?.name || strategyId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trades - Enhanced */}
              {dayData.trades.length > 0 ? (
                <div className="animate-slide-in-up" style={{ animationDelay: '150ms' }}>
                  <h3 className="font-bold theme-text mb-4 text-lg uppercase tracking-wide">Trades</h3>
                  <div className="space-y-3">
                    {dayData.trades.map((trade, index) => (
                      <Link
                        key={trade.id}
                        href={`/trades/${trade.id}`}
                        className="block p-5 theme-bg-tertiary rounded-xl hover:scale-[1.01] transition-all duration-200 border theme-border hover:border-opacity-80 group animate-slide-in-up"
                        style={{ animationDelay: `${index * 30}ms`, boxShadow: 'var(--shadow-sm)' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold theme-text text-lg">
                                {trade.assetClass === AssetClass.FUTURES ? trade.instrumentRoot : trade.underlying}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                trade.direction === 'LONG'
                                  ? (showEdgeTrades
                                      ? 'bg-accent/20 text-accent border border-accent/30'
                                      : 'bg-positive/20 text-positive border border-positive/30')
                                  : (showEdgeTrades
                                      ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                                      : 'bg-negative/20 text-negative border border-negative/30')
                              }`}>
                                {trade.direction}
                              </span>
                              <span className="text-xs theme-text-secondary font-semibold">
                                {format(new Date(trade.entryTime), 'h:mm a')}
                              </span>
                            </div>
                            <div className="text-sm theme-text-secondary font-medium">
                              Strategy: <span className="theme-text">{strategies.find(s => s.id === trade.strategyId)?.name || trade.strategyId}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              trade.resultUsd >= 0
                                ? (showEdgeTrades ? 'text-accent' : 'text-positive')
                                : (showEdgeTrades ? 'text-orange-500' : 'text-negative')
                            }`}>
                              {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)}
                            </div>
                            <div className="text-sm theme-text-secondary font-semibold">
                              {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 theme-bg-tertiary rounded-2xl border theme-border animate-slide-in-up" style={{ animationDelay: '150ms' }}>
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      <CalendarIcon className="w-10 h-10 text-white" />
                    </div>
                    <p className="theme-text-secondary text-lg mb-6">No trades on this day</p>
                    <button
                      onClick={() => handleAddTrade(selectedDay)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Your First Trade
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
