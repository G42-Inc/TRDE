'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UserMenu } from './UserMenu';
import { Session } from '@trde/core';
import { useStorage } from '@/contexts/StorageContext';
import { InboxIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { isPast, parseISO } from 'date-fns';

function getActiveSession(nycHour: number, nycMinute: number): Session | null {
  // All session times are in NYC time (EST/EDT):
  // Asia: 6:00 PM EST to 3:00 AM EST (next day)
  // London: 3:00 AM EST to 11:30 AM EST
  // New York: 9:30 AM EST to 5:00 PM EST
  
  const nycMinutes = nycHour * 60 + nycMinute;
  
  // Check New York session (9:30 AM - 5:00 PM EST)
  const nyOpen = 9 * 60 + 30; // 9:30 AM
  const nyClose = 17 * 60; // 5:00 PM
  if (nycMinutes >= nyOpen && nycMinutes < nyClose) {
    return Session.NEW_YORK;
  }
  
  // Check London session (3:00 AM - 11:30 AM EST)
  const londonOpen = 3 * 60; // 3:00 AM
  const londonClose = 11 * 60 + 30; // 11:30 AM
  if (nycMinutes >= londonOpen && nycMinutes < londonClose) {
    return Session.LONDON;
  }
  
  // Check Asia session (6:00 PM - 3:00 AM EST, wraps around midnight)
  const asiaOpen = 18 * 60; // 6:00 PM
  const asiaClose = 3 * 60; // 3:00 AM next day
  if (nycMinutes >= asiaOpen || nycMinutes < asiaClose) {
    return Session.ASIA;
  }
  
  return null;
}

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export const Header = React.memo(function Header() {
  const router = useRouter();
  const { todos, ruleViolations, trades, collections } = useStorage();
  const [times, setTimes] = useState<{
    nyc: string;
    london: string;
    tokyo: string;
    activeSession: Session | null;
    nextSessionTime: string | null;
    isMarketClosed: boolean;
  }>({
    nyc: '--:--',
    london: '--:--',
    tokyo: '--:--',
    activeSession: null,
    nextSessionTime: null,
    isMarketClosed: false,
  });
  const [showInboxMenu, setShowInboxMenu] = useState(false);

  // Calculate inbox items from storage context
  const inboxItems = useMemo(() => {
    // Count overdue todos
    const overdueTodos = todos.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      isPast(parseISO(todo.dueDate))
    ).length;

    // Count unreviewed rule violations
    const unreviewedViolations = ruleViolations.filter(v => !v.reviewed).length;

    // Count unviewed EDGE trades
    const edgeCollection = collections.find(c => c.name === 'EDGE');
    const edgeTrades = edgeCollection 
      ? trades.filter(t => 
          t.collections.includes(edgeCollection.id) || t.notes?.startsWith('[EDGE')
        )
      : [];
    
    // Get viewed EDGE trade IDs
    let viewedEdgeTrades: Set<string> = new Set();
    try {
      const viewedData = typeof window !== 'undefined' ? localStorage.getItem('trde:viewedEdgeTrades') : null;
      viewedEdgeTrades = viewedData ? new Set(JSON.parse(viewedData)) : new Set();
    } catch {
      viewedEdgeTrades = new Set();
    }
    
    const unviewedEdgeCount = edgeTrades.filter(t => !viewedEdgeTrades.has(t.id)).length;

    return {
      overdueTodos,
      unreviewedViolations,
      edgeTrades: unviewedEdgeCount,
    };
  }, [todos, ruleViolations, trades, collections]);

  const inboxCount = inboxItems.overdueTodos + inboxItems.unreviewedViolations + (inboxItems.edgeTrades > 0 ? 1 : 0);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const nycTime = formatTime(now, 'America/New_York');
      const londonTime = formatTime(now, 'Europe/London');
      const tokyoTime = formatTime(now, 'Asia/Tokyo');
      
      // Get hours and minutes for session detection
      const getHourMinute = (timeStr: string) => {
        const parts = timeStr.split(':');
        let hour = parseInt(parts[0]);
        const minute = parseInt(parts[1].split(' ')[0]);
        const isPM = timeStr.includes('PM');
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        return { hour, minute };
      };
      
      const nyc = getHourMinute(nycTime);
      
      // Get day of week in NYC timezone (0 = Sunday, 6 = Saturday)
      const getDayOfWeek = () => {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          weekday: 'long',
        });
        const dayName = formatter.format(now);
        const dayMap: Record<string, number> = {
          'Sunday': 0,
          'Monday': 1,
          'Tuesday': 2,
          'Wednesday': 3,
          'Thursday': 4,
          'Friday': 5,
          'Saturday': 6,
        };
        return dayMap[dayName] ?? 0;
      };
      
      const dayOfWeek = getDayOfWeek();
      const currentMinutes = nyc.hour * 60 + nyc.minute;
      const nyClose = 17 * 60; // 5:00 PM
      const asiaOpen = 18 * 60; // 6:00 PM
      
      // Market is closed on:
      // - Saturdays (all day)
      // - Sundays until 6PM EST (when Asia opens)
      // - Weekdays between 5PM and 6PM EST (gap between NY close and Asia open)
      const isWeekendClosed = dayOfWeek === 6 || (dayOfWeek === 0 && currentMinutes < asiaOpen);
      const isWeekdayGap = dayOfWeek >= 1 && dayOfWeek <= 5 && currentMinutes >= nyClose && currentMinutes < asiaOpen;
      const isMarketClosed = isWeekendClosed || isWeekdayGap;
      
      // Only check for active session if not weekend closed
      const activeSession = isWeekendClosed ? null : getActiveSession(nyc.hour, nyc.minute);
      
      // Calculate next session opening time (all times in NYC/EST)
      const getNextSessionTime = (): string => {
        try {
          const currentMinutes = nyc.hour * 60 + nyc.minute;
          
          // All session times in NYC time (EST):
          // Asia: 6:00 PM (18:00) to 3:00 AM (03:00) next day
          // London: 3:00 AM (03:00) to 11:30 AM (11:30)
          // New York: 9:30 AM (09:30) to 5:00 PM (17:00)
          
          const asiaOpen = 18 * 60; // 6:00 PM
          const asiaClose = 3 * 60; // 3:00 AM next day
          const londonOpen = 3 * 60; // 3:00 AM
          const londonClose = 11 * 60 + 30; // 11:30 AM
          const nyOpen = 9 * 60 + 30; // 9:30 AM
          const nyClose = 17 * 60; // 5:00 PM
          
          const asiaActive = activeSession === Session.ASIA;
          const londonActive = activeSession === Session.LONDON;
          const nyActive = activeSession === Session.NEW_YORK;
          
          // Calculate minutes until each session opens/closes
          const getMinutesUntil = (
            openMinutes: number,
            closeMinutes: number,
            isActive: boolean,
            wrapsMidnight: boolean = false
          ): number => {
            if (isActive) {
              // Session is active - return time until close
              if (wrapsMidnight) {
                // Asia wraps around midnight (6 PM to 3 AM next day)
                if (currentMinutes >= asiaOpen) {
                  // After 6 PM, close is 3 AM next day
                  return (24 * 60) - currentMinutes + asiaClose;
                } else {
                  // Before 3 AM, close is 3 AM same day
                  return asiaClose - currentMinutes;
                }
              } else {
                return closeMinutes - currentMinutes;
              }
            } else {
              // Session not active - calculate time until it opens
              if (wrapsMidnight) {
                // Asia wraps around midnight
                if (currentMinutes >= asiaClose && currentMinutes < asiaOpen) {
                  // Between 3 AM and 6 PM, next open is 6 PM same day
                  return asiaOpen - currentMinutes;
                } else if (currentMinutes < asiaClose) {
                  // Before 3 AM, we're in the Asia session period, but if not active, next open is 6 PM same day
                  // Actually, if we're before 3 AM and Asia is not active, we're between sessions
                  // Next Asia open is 6 PM same day
                  return asiaOpen - currentMinutes;
                } else {
                  // After 6 PM, next open is 6 PM next day
                  return (24 * 60) - currentMinutes + asiaOpen;
                }
              } else {
                if (currentMinutes < openMinutes) {
                  return openMinutes - currentMinutes;
                } else {
                  // Already passed today's open time, calculate until tomorrow
                  return (24 * 60) - currentMinutes + openMinutes;
                }
              }
            }
          };
          
          const asiaMinutes = getMinutesUntil(asiaOpen, asiaClose, asiaActive, true);
          const londonMinutes = getMinutesUntil(londonOpen, londonClose, londonActive);
          const nyMinutes = getMinutesUntil(nyOpen, nyClose, nyActive);
          
          // Find the next session to open
          let nextMinutes: number;
          
          if (activeSession) {
            // Current session will close
            const currentCloseTime = asiaActive ? asiaMinutes : 
                                    londonActive ? londonMinutes : nyMinutes;
            
            // Get all non-active sessions
            const otherSessions: number[] = [];
            if (!asiaActive) otherSessions.push(asiaMinutes);
            if (!londonActive) otherSessions.push(londonMinutes);
            if (!nyActive) otherSessions.push(nyMinutes);
            
            // Find if any other session opens before current closes
            if (otherSessions.length > 0) {
              const minOther = Math.min(...otherSessions);
              // If another session opens before current closes, use that
              // Otherwise, use time until current closes
              nextMinutes = Math.min(currentCloseTime, minOther);
            } else {
              nextMinutes = currentCloseTime;
            }
          } else {
            // No active session - find the next one to open
            if (isWeekendClosed) {
              // Weekend closed - calculate time until next Monday 9:30 AM (NY open)
              // or if it's Sunday after 6PM, calculate until next Monday 9:30 AM
              if (dayOfWeek === 6) {
                // Saturday - next session is Monday 9:30 AM
                const minutesUntilMidnight = (24 * 60) - currentMinutes;
                const minutesUntilMonday = minutesUntilMidnight + (24 * 60); // Sunday
                nextMinutes = minutesUntilMonday + nyOpen; // Monday 9:30 AM
              } else if (dayOfWeek === 0) {
                // Sunday before 6PM - next session is Asia at 6PM today
                if (currentMinutes < asiaOpen) {
                  nextMinutes = asiaOpen - currentMinutes;
                } else {
                  // Sunday after 6PM - next session is Monday 9:30 AM
                  const minutesUntilMidnight = (24 * 60) - currentMinutes;
                  nextMinutes = minutesUntilMidnight + nyOpen; // Monday 9:30 AM
                }
              } else {
                nextMinutes = Math.min(asiaMinutes, londonMinutes, nyMinutes);
              }
            } else if (isWeekdayGap) {
              // Weekday gap (5PM-6PM) - next session is Asia at 6PM
              nextMinutes = asiaOpen - currentMinutes;
            } else {
              nextMinutes = Math.min(asiaMinutes, londonMinutes, nyMinutes);
            }
          }
          
          const hours = Math.floor(nextMinutes / 60);
          const minutes = nextMinutes % 60;
          
          if (hours > 0) {
            return `${hours}h ${minutes}m`;
          } else if (minutes > 0) {
            return `${minutes}m`;
          } else {
            return 'Opening soon';
          }
        } catch (error) {
          console.error('Error calculating next session time:', error);
          return '--';
        }
      };
      
      setTimes({
        nyc: nycTime,
        london: londonTime,
        tokyo: tokyoTime,
        activeSession,
        nextSessionTime: getNextSessionTime(),
        isMarketClosed,
      });
    };

    updateTimes();
    const interval = setInterval(updateTimes, 15000);
    return () => clearInterval(interval);
  }, []);


  const isActive = (session: Session) => times.activeSession === session;

  return (
    <header className="flex items-center justify-between sticky top-0 z-[100]" style={{
      padding: 'var(--space-lg) var(--space-2xl)',
      background: 'transparent',
      border: 'none',
      color: 'var(--glass-text, var(--theme-text))',
    }}>
      <div className="flex items-center" style={{ gap: 'var(--space-xl)' }}>
        {/* Market Status - Premium indicator */}
        <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
          {times.isMarketClosed ? (
            <div className="relative flex items-center justify-center">
              <span className="status-dot error" />
            </div>
          ) : times.activeSession ? (
            <div className="relative flex items-center justify-center">
              <span className="status-dot success" />
              <span className="absolute inset-0 w-2.5 h-2.5 bg-success rounded-full animate-ping opacity-75"></span>
            </div>
          ) : null}
          <span className="text-body-sm font-semibold theme-text">
            {times.isMarketClosed 
              ? 'MARKET CLOSED' 
              : times.activeSession 
                ? `Market Open (${times.activeSession.replace('_', ' ')})` 
                : 'Market Closed'}
          </span>
        </div>
        
        {/* Market Times - Refined layout */}
        <div className="flex items-center text-caption" style={{ gap: 'var(--space-md)' }}>
          <div className={isActive(Session.ASIA) ? '' : 'theme-text-tertiary'} style={{ fontSize: 'var(--font-size-body-sm)', color: isActive(Session.ASIA) ? 'var(--theme-success)' : undefined }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>TOKYO</div>
            <div style={{ fontSize: 'var(--font-size-caption)' }}>{times.tokyo}</div>
          </div>
          <div className={isActive(Session.LONDON) ? '' : 'theme-text-tertiary'} style={{ fontSize: 'var(--font-size-body-sm)', color: isActive(Session.LONDON) ? 'var(--theme-success)' : undefined }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>LONDON</div>
            <div style={{ fontSize: 'var(--font-size-caption)' }}>{times.london}</div>
          </div>
          <div className={isActive(Session.NEW_YORK) ? '' : 'theme-text-tertiary'} style={{ fontSize: 'var(--font-size-body-sm)', color: isActive(Session.NEW_YORK) ? 'var(--theme-success)' : undefined }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>NYC</div>
            <div style={{ fontSize: 'var(--font-size-caption)' }}>{times.nyc}</div>
          </div>
          <div className="theme-text-secondary" style={{ fontSize: 'var(--font-size-body-sm)', marginLeft: 'var(--space-lg)', paddingLeft: 'var(--space-lg)' }}>
            <div style={{ fontSize: 'var(--font-size-caption)', marginBottom: 'var(--space-xs)' }}>NEXT SESSION:</div>
            <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{times.nextSessionTime || 'Calculating...'}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 'var(--space-lg)' }}>
        {/* User Menu */}
        <UserMenu />
        {/* Inbox Icon - Premium styling */}
        <div className="relative">
          <button
            onClick={() => setShowInboxMenu(!showInboxMenu)}
            className="relative theme-text-secondary hover:theme-text transition-all hover:scale-110 active:scale-95"
            title="Inbox: Overdue todos and rule violations"
            style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', transitionDuration: 'var(--transition-base)' }}
          >
            <InboxIcon className="h-6 w-6" />
            {inboxCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]" style={{ background: 'var(--theme-error)', fontSize: 'var(--font-size-caption)' }}>
                {inboxCount > 9 ? '9+' : inboxCount}
              </span>
            )}
          </button>
          
          {/* Inbox Dropdown Menu - Premium Glass Morphism */}
          {showInboxMenu && (
            <>
              <div
                className="fixed inset-0 z-[90]"
                onClick={() => setShowInboxMenu(false)}
              />
              <div className="absolute right-0 top-full glass-container animate-scale-in z-[100]" style={{ marginTop: 'var(--space-md)', width: '280px' }}>
                <div className="border-b" style={{ padding: 'var(--space-lg)', borderColor: 'var(--theme-border)' }}>
                  <h3 className="theme-text" style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-bold)' }}>Inbox</h3>
                  <p className="theme-text-secondary" style={{ fontSize: 'var(--font-size-caption)', marginTop: 'var(--space-xs)' }}>
                    {inboxCount === 0 
                      ? 'All caught up!' 
                      : `${inboxCount} item${inboxCount !== 1 ? 's' : ''} need attention`}
                  </p>
                </div>
                <div style={{ padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {inboxItems.overdueTodos > 0 && (
                    <button
                      onClick={() => {
                        router.push('/');
                        setShowInboxMenu(false);
                      }}
                      className="w-full text-left hover:theme-bg-tertiary transition-all text-body-sm"
                      style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', transitionDuration: 'var(--transition-fast)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-black dark:text-white font-medium">
                          Overdue To-Dos
                        </span>
                        <span className="bg-danger text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {inboxItems.overdueTodos > 9 ? '9+' : inboxItems.overdueTodos}
                        </span>
                      </div>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                        {inboxItems.overdueTodos} {inboxItems.overdueTodos === 1 ? 'task' : 'tasks'} past due
                      </p>
                    </button>
                  )}
                  {inboxItems.unreviewedViolations > 0 && (
                    <button
                      onClick={() => {
                        router.push('/risk');
                        setShowInboxMenu(false);
                      }}
                      className="w-full text-left hover:theme-bg-tertiary transition-all text-body-sm"
                      style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', transitionDuration: 'var(--transition-fast)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-black dark:text-white font-medium">
                          Rule Violations
                        </span>
                        <span className="bg-danger text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {inboxItems.unreviewedViolations > 9 ? '9+' : inboxItems.unreviewedViolations}
                        </span>
                      </div>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                        {inboxItems.unreviewedViolations} {inboxItems.unreviewedViolations === 1 ? 'violation' : 'violations'} need review
                      </p>
                    </button>
                  )}
                  {inboxItems.edgeTrades > 0 && (
                    <button
                      onClick={() => {
                        router.push('/trades');
                        setShowInboxMenu(false);
                      }}
                      className="w-full text-left hover:theme-bg-tertiary transition-all text-body-sm"
                      style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', transitionDuration: 'var(--transition-fast)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-black dark:text-white font-medium">
                          EDGE Trades
                        </span>
                        <span className="bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {inboxItems.edgeTrades > 9 ? '9+' : inboxItems.edgeTrades}
                        </span>
                      </div>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                        {inboxItems.edgeTrades} unviewed {inboxItems.edgeTrades === 1 ? 'trade' : 'trades'} need review
                      </p>
                    </button>
                  )}
                  {inboxCount === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-black/60 dark:text-white/60">
                      No items requiring attention
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
});
