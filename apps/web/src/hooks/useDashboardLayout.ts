'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WidgetSize } from '@/components/DashboardWidget';

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: WidgetSize;
  visible: boolean;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
  order: string[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: 'equity-curve', type: 'equity-curve', title: 'Equity Curve', size: '2x2', visible: true },
    { id: 'metrics-grid', type: 'metrics-grid', title: 'Key Metrics', size: '2x1', visible: true },
    { id: 'recent-trades', type: 'recent-trades', title: 'Recent Trades', size: '2x1', visible: true },
    { id: 'win-rate', type: 'win-rate', title: 'Win Rate', size: '1x1', visible: true },
    { id: 'pnl-summary', type: 'pnl-summary', title: 'P&L Summary', size: '1x1', visible: true },
    { id: 'strategy-leaderboard', type: 'strategy-leaderboard', title: 'Top Strategies', size: '1x2', visible: true },
    { id: 'risk-violations', type: 'risk-violations', title: 'Risk Status', size: '1x1', visible: true },
    { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', size: '2x1', visible: false },
  ],
  order: [
    'equity-curve',
    'metrics-grid',
    'recent-trades',
    'win-rate',
    'pnl-summary',
    'strategy-leaderboard',
    'risk-violations',
  ],
};

const STORAGE_KEY = 'trde:dashboard-layout';

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [mounted, setMounted] = useState(false);

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardLayout;
        setLayout(parsed);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
    setMounted(true);
  }, []);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      } catch (error) {
        console.error('Failed to save dashboard layout:', error);
      }
    }
  }, [layout, mounted]);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setLayout((prev) => ({
      ...prev,
      order: newOrder,
    }));
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setLayout((prev) => {
      const widgets = prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      );
      
      const widget = widgets.find((w) => w.id === widgetId);
      let order = prev.order;
      
      if (widget?.visible && !prev.order.includes(widgetId)) {
        // Add to order if now visible
        order = [...prev.order, widgetId];
      } else if (!widget?.visible) {
        // Remove from order if now hidden
        order = prev.order.filter((id) => id !== widgetId);
      }
      
      return { widgets, order };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
    }
  }, []);

  const visibleWidgets = layout.widgets.filter((w) => w.visible);
  const orderedVisibleWidgets = layout.order
    .map((id) => layout.widgets.find((w) => w.id === id && w.visible))
    .filter((w): w is WidgetConfig => w !== undefined);

  return {
    layout,
    visibleWidgets,
    orderedVisibleWidgets,
    reorderWidgets,
    toggleWidgetVisibility,
    resetLayout,
    mounted,
  };
}
