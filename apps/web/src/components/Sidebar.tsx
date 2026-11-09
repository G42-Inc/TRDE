'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  ChartBarIcon,
  CalendarIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  BoltIcon,
  SignalIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useStorage } from '@/contexts/StorageContext';
import { useTheme } from '@/contexts/ThemeContext';

// Primary navigation items with descriptions
const navItems = [
  { href: '/app', label: 'Overview', icon: HomeIcon, description: 'Dashboard & metrics' },
  { href: '/trades/timeline', label: 'Trade Hub', icon: FolderIcon, description: 'Timeline & history' },
  { href: '/performance', label: 'Performance', icon: ChartBarIcon, description: 'Analytics & strategies' },
  { href: '/edge', label: 'EDGE', icon: BoltIcon, description: 'Backtesting & simulation' },
  { href: '/flow', label: 'Flow', icon: SignalIcon, description: 'Coming Soon', disabled: true },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon, description: 'Account & preferences' },
];

// Secondary navigation - icon bar at bottom
const secondaryNavItems = [
  { href: '/journal', label: 'Journal', icon: BookOpenIcon },
  { href: '/review', label: 'Calendar', icon: CalendarIcon },
  { href: '/risk', label: 'Risk', icon: ShieldCheckIcon },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = React.memo(function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { theme: darkLightTheme } = useTheme();
  const { ruleViolations, trades, collections } = useStorage();
  const [unviewedEdgeTradeCount, setUnviewedEdgeTradeCount] = useState(0);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);

  const violationCount = useMemo(() => {
    return ruleViolations.filter(v => !v.reviewed).length;
  }, [ruleViolations]);

  useEffect(() => {
    const updateEdgeCount = () => {
      const edgeCollection = collections.find(c => c.name === 'EDGE');
      const edgeTrades = edgeCollection 
        ? trades.filter(t => 
            t.collections.includes(edgeCollection.id) || t.notes?.startsWith('[EDGE')
          )
        : [];
      
      let viewedEdgeTrades: Set<string> = new Set();
      try {
        const viewedData = typeof window !== 'undefined' ? localStorage.getItem('trde:viewedEdgeTrades') : null;
        viewedEdgeTrades = viewedData ? new Set(JSON.parse(viewedData)) : new Set();
      } catch {
        viewedEdgeTrades = new Set();
      }
      
      const unviewed = edgeTrades.filter(t => !viewedEdgeTrades.has(t.id));
      setUnviewedEdgeTradeCount(unviewed.length);
    };
    
    // Run on data changes + when window regains focus (catches localStorage updates from other tabs)
    updateEdgeCount();
    window.addEventListener('focus', updateEdgeCount);
    return () => window.removeEventListener('focus', updateEdgeCount);
  }, [trades, collections]);

  // ═══════════════════════════════════════════════════════════════════
  // COLLAPSED STATE — slim icon-only sidebar
  // ═══════════════════════════════════════════════════════════════════
  if (collapsed) {
    return (
      <aside
        className="h-screen flex flex-col items-center overflow-hidden glass-surface-strong sidebar-transition"
        style={{
          width: 68,
          borderRadius: 0,
          border: 'none',
          borderRight: '1px solid var(--glass-border, var(--theme-border))',
        }}
      >
        {/* Expand button — liquid glass pill at top */}
        <div className="flex-shrink-0 w-full flex justify-center pt-5 pb-4">
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="sidebar-glass-toggle group"
          >
            <ChevronRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--glass-text, var(--theme-text))' }} />
          </button>
        </div>

        {/* Logo icon */}
        <div className="flex-shrink-0 pb-4">
          <Link href="/app" className="block">
            {darkLightTheme === 'dark' ? (
              <Image
                src="/logos/TRDE_wordmark_white_transparent_300w.png"
                alt="TRDE"
                width={36}
                height={36}
                className="h-7 w-auto opacity-80"
                priority
              />
            ) : (
              <Image
                src="/logos/TRDE_wordmark_black_transparent_300w.png"
                alt="TRDE"
                width={36}
                height={36}
                className="h-7 w-auto opacity-80"
                priority
              />
            )}
          </Link>
        </div>

        {/* New Trade — icon only */}
        <div className="flex-shrink-0 pb-4">
          <Link
            href="/trades/new"
            className="flex items-center justify-center w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: 'var(--glass-bg, linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent) 100%))',
              backdropFilter: 'var(--glass-blur, none)',
              WebkitBackdropFilter: 'var(--glass-blur, none)',
              border: '1px solid var(--glass-border, transparent)',
              borderRadius: 'var(--glass-radius-sm, 10px)',
              boxShadow: 'var(--glass-shadow-subtle, 0 2px 8px rgba(201, 169, 98, 0.2))',
              color: 'var(--glass-text, white)',
            }}
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Primary nav — icons only */}
        <nav className="flex-1 w-full flex flex-col items-center py-2 gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) || pathname === item.href;
            const isEdge = item.href === '/edge';
            const hasNotification = isEdge && unviewedEdgeTradeCount > 0;
            const isDisabled = 'disabled' in item && item.disabled;

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setHoveredNavItem(item.href)}
                  onMouseLeave={() => setHoveredNavItem(null)}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl opacity-40 cursor-not-allowed">
                    <item.icon className="w-5 h-5 theme-text-tertiary" />
                  </div>
                  {hoveredNavItem === item.href && (
                    <div
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap glass-surface pointer-events-none"
                      style={{
                        borderRadius: 'var(--glass-radius-sm, 8px)',
                        color: 'var(--glass-text, var(--theme-text))',
                        animation: 'sidebarTooltipIn 0.15s ease-out',
                        zIndex: 50,
                      }}
                    >
                      {item.label}
                      <span className="ml-1.5 opacity-50">— {item.description}</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={clsx(
                    'relative flex items-center justify-center w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95',
                    isActive
                      ? 'glass-surface'
                      : 'theme-text-secondary hover:theme-bg-tertiary hover:theme-text'
                  )}
                  style={{
                    borderRadius: 'var(--glass-radius-sm, 10px)',
                    ...(isActive ? { background: 'var(--glass-bg-subtle, var(--theme-bg-tertiary))', color: 'var(--glass-text, var(--theme-text))' } : {}),
                  }}
                  onMouseEnter={() => setHoveredNavItem(item.href)}
                  onMouseLeave={() => setHoveredNavItem(null)}
                >
                  <item.icon className="w-5 h-5" />
                  {hasNotification && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-white text-[10px] font-bold rounded-full"
                      style={{ background: 'var(--theme-primary)' }}
                    >
                      {unviewedEdgeTradeCount > 9 ? '9+' : unviewedEdgeTradeCount}
                    </span>
                  )}
                </Link>
                {/* Floating glass tooltip on hover */}
                {hoveredNavItem === item.href && (
                  <div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap glass-surface pointer-events-none"
                    style={{
                      borderRadius: 'var(--glass-radius-sm, 8px)',
                      color: 'var(--glass-text, var(--theme-text))',
                      animation: 'sidebarTooltipIn 0.15s ease-out',
                      zIndex: 50,
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Secondary nav — icons with tooltips */}
        <div className="flex-shrink-0 w-full py-3 flex flex-col items-center gap-1.5" style={{ borderTop: '1px solid var(--glass-border-subtle, var(--theme-border))' }}>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isRisk = item.href === '/risk';
            const hasViolations = isRisk && violationCount > 0;

            return (
              <div key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={clsx(
                    'relative flex items-center justify-center w-10 h-10 transition-all duration-200 hover:scale-110 active:scale-95',
                    isActive
                      ? 'glass-surface'
                      : 'theme-text-tertiary hover:theme-bg-tertiary hover:theme-text',
                    hasViolations && 'text-red-500'
                  )}
                  style={{
                    borderRadius: 'var(--glass-radius-sm, 10px)',
                    ...(isActive ? { background: 'var(--glass-bg-subtle, var(--theme-bg-tertiary))' } : {}),
                  }}
                  onMouseEnter={() => setHoveredIcon(item.href)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <item.icon className="w-5 h-5" />
                  {hasViolations && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {violationCount > 9 ? '9+' : violationCount}
                    </span>
                  )}
                </Link>
                {hoveredIcon === item.href && (
                  <div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap glass-surface pointer-events-none"
                    style={{
                      borderRadius: 'var(--glass-radius-sm, 8px)',
                      color: 'var(--glass-text, var(--theme-text))',
                      animation: 'sidebarTooltipIn 0.15s ease-out',
                      zIndex: 50,
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <style jsx>{`
          @keyframes sidebarTooltipIn {
            from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
            to { opacity: 1; transform: translateY(-50%) translateX(0); }
          }
        `}</style>
      </aside>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPANDED STATE — full sidebar
  // ═══════════════════════════════════════════════════════════════════
  return (
    <aside className="w-64 h-screen flex flex-col overflow-hidden glass-surface-strong sidebar-transition" style={{ borderRadius: 0, border: 'none', borderRight: '1px solid var(--glass-border, var(--theme-border))' }}>
      {/* ═══════════════════════════════════════════════════════════════════
          FIXED HEADER: Logo, Tagline, New Trade Button
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0">
        {/* Collapse button — liquid glass icon, top-right */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="sidebar-glass-toggle group"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" style={{ color: 'var(--glass-text, var(--theme-text))' }} />
          </button>
        </div>

        {/* Logo & Tagline */}
        <div className="px-6 pt-2 pb-4">
          <Link href="/app" className="block group">
            <div className="flex justify-center mb-4">
              {darkLightTheme === 'dark' ? (
                <Image
                  src="/logos/TRDE_wordmark_white_transparent_300w.png"
                  alt="TRDE"
                  width={140}
                  height={40}
                  className="h-12 w-auto transition-all duration-300 group-hover:scale-105"
                  priority
                  style={{ 
                    filter: 'drop-shadow(0 4px 12px rgba(201, 169, 98, 0.2))',
                  }}
                />
              ) : (
                <Image
                  src="/logos/TRDE_wordmark_black_transparent_300w.png"
                  alt="TRDE"
                  width={140}
                  height={40}
                  className="h-12 w-auto transition-all duration-300 group-hover:scale-105"
                  priority
                  style={{ 
                    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
                  }}
                />
              )}
            </div>
            <p 
              className="text-center theme-text-secondary font-medium"
              style={{ 
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
                lineHeight: 1.5,
              }}
            >
              Track your trades.<br />Find your Edge.
            </p>
          </Link>
        </div>
        
        {/* New Trade Button */}
        <div className="px-5 pb-6">
          <Link
            href="/trades/new"
            className="group relative w-full flex items-center justify-center gap-2.5 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              padding: '14px 20px',
              background: 'var(--glass-bg, linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent) 100%))',
              backdropFilter: 'var(--glass-blur, none)',
              WebkitBackdropFilter: 'var(--glass-blur, none)',
              border: '1px solid var(--glass-border, transparent)',
              borderRadius: 'var(--glass-radius-md, 12px)',
              boxShadow: 'var(--glass-shadow, 0 4px 16px rgba(201, 169, 98, 0.3))',
              color: 'var(--glass-text, white)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              letterSpacing: '0.02em',
            }}
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              }}
            />
            <PlusIcon className="h-5 w-5 relative z-10" />
            <span className="relative z-10">New Trade</span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PRIMARY NAVIGATION
          ═══════════════════════════════════════════════════════════════════ */}
      <nav className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) || pathname === item.href;
            const isEdge = item.href === '/edge';
            const hasNotification = isEdge && unviewedEdgeTradeCount > 0;
            const isDisabled = 'disabled' in item && item.disabled;
            
            // Render disabled items as non-clickable div
            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl opacity-50 cursor-not-allowed"
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="w-5 h-5 theme-text-tertiary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold theme-text-tertiary" style={{ fontSize: '0.9375rem', lineHeight: 1.3 }}>
                      {item.label}
                    </span>
                    <span 
                      className="text-amber-500 font-medium"
                      style={{ fontSize: '0.75rem', lineHeight: 1.3 }}
                    >
                      {item.description}
                    </span>
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-4 px-4 py-3.5 transition-all duration-200',
                  isActive
                    ? 'glass-surface'
                    : 'theme-text-secondary hover:theme-bg-tertiary hover:theme-text'
                )}
                style={{
                  borderRadius: 'var(--glass-radius-md, 12px)',
                  ...(isActive ? { background: 'var(--glass-bg-subtle, var(--theme-bg-tertiary))', color: 'var(--glass-text, var(--theme-text))' } : {}),
                }}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                  {hasNotification && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-white text-[10px] font-bold rounded-full"
                      style={{ background: 'var(--theme-primary)' }}
                    >
                      {unviewedEdgeTradeCount > 9 ? '9+' : unviewedEdgeTradeCount}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold" style={{ fontSize: '0.9375rem', lineHeight: 1.3 }}>
                    {item.label}
                  </span>
                  <span 
                    className="theme-text-tertiary"
                    style={{ fontSize: '0.75rem', lineHeight: 1.3 }}
                  >
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          SECONDARY NAVIGATION - Icon Bar with Tooltips
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 px-4 py-4" style={{ borderTop: '1px solid var(--glass-border-subtle, var(--theme-border))' }}>
        <div className="flex items-center justify-around">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isRisk = item.href === '/risk';
            const hasViolations = isRisk && violationCount > 0;
            
            return (
              <div key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={clsx(
                    'relative flex items-center justify-center w-10 h-10 transition-all duration-200',
                    isActive
                      ? 'glass-surface'
                      : 'theme-text-tertiary hover:theme-bg-tertiary hover:theme-text',
                    hasViolations && 'text-red-500'
                  )}
                  style={{ borderRadius: 'var(--glass-radius-sm, 12px)', ...(isActive ? { background: 'var(--glass-bg-subtle, var(--theme-bg-tertiary))' } : {}) }}
                  onMouseEnter={() => setHoveredIcon(item.href)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <item.icon className="w-5 h-5" />
                  {hasViolations && (
                    <span 
                      className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full"
                    >
                      {violationCount > 9 ? '9+' : violationCount}
                    </span>
                  )}
                </Link>
                
                {/* Tooltip */}
                {hoveredIcon === item.href && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap glass-surface"
                    style={{
                      borderRadius: 'var(--glass-radius-sm, 8px)',
                      color: 'var(--glass-text, var(--theme-text))',
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                  >
                    {item.label}
                    {/* Tooltip arrow */}
                    <div 
                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid var(--theme-bg-secondary)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </aside>
  );
});
