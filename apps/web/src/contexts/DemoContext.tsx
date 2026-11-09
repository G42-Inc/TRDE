'use client';

/**
 * Demo Mode Context
 * 
 * Provides demo state and sample data to components throughout the app.
 * Wraps children when user has demo entitlement status.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Trade, Strategy } from '@trde/core';
import { 
  generateSampleTrades, 
  generateSampleStrategies, 
  generateSampleJournals,
  calculateSampleStats,
} from '@/lib/demo/sample-data';
import { DEMO_RESTRICTIONS } from '@/lib/demo/guards';

interface SampleJournal {
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
}

interface SampleStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgR: number;
}

interface UpgradePromptState {
  isOpen: boolean;
  feature: string;
  message: string;
}

interface DemoContextValue {
  // Status
  isDemo: boolean;
  isDemoLoading: boolean;
  
  // Sample data
  sampleTrades: Trade[];
  sampleStrategies: Strategy[];
  sampleJournals: SampleJournal[];
  sampleStats: SampleStats;
  
  // Upgrade prompt
  showUpgradePrompt: (feature: string, customMessage?: string) => void;
  hideUpgradePrompt: () => void;
  upgradePromptState: UpgradePromptState;
  
  // Feature checking
  canUseFeature: (feature: keyof typeof DEMO_RESTRICTIONS) => boolean;
  getFeatureMessage: (feature: keyof typeof DEMO_RESTRICTIONS) => string;
  
  // Session state
  hasSeenDemoBanner: boolean;
  dismissDemoBanner: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

interface DemoProviderProps {
  children: React.ReactNode;
  isDemo: boolean;
}

export function DemoProvider({ children, isDemo }: DemoProviderProps) {
  const [isDemoLoading, setIsDemoLoading] = useState(true);
  const [hasSeenDemoBanner, setHasSeenDemoBanner] = useState(false);
  const [upgradePromptState, setUpgradePromptState] = useState<UpgradePromptState>({
    isOpen: false,
    feature: '',
    message: '',
  });

  // Generate sample data once on mount (memoized)
  const sampleData = useMemo(() => {
    if (!isDemo) {
      return {
        strategies: [],
        trades: [],
        journals: [],
        stats: {
          totalTrades: 0,
          winRate: 0,
          totalPnl: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          avgR: 0,
        },
      };
    }

    const strategies = generateSampleStrategies();
    const trades = generateSampleTrades(strategies);
    const journals = generateSampleJournals();
    const stats = calculateSampleStats(trades);

    return { strategies, trades, journals, stats };
  }, [isDemo]);

  // Check session storage for banner dismissal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('demo-banner-dismissed');
      setHasSeenDemoBanner(dismissed === 'true');
      setIsDemoLoading(false);
    }
  }, []);

  const dismissDemoBanner = useCallback(() => {
    setHasSeenDemoBanner(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demo-banner-dismissed', 'true');
    }
  }, []);

  const showUpgradePrompt = useCallback((feature: string, customMessage?: string) => {
    const restriction = DEMO_RESTRICTIONS[feature];
    const message = customMessage || restriction?.message || 'Upgrade to use this feature';
    
    setUpgradePromptState({
      isOpen: true,
      feature,
      message,
    });
  }, []);

  const hideUpgradePrompt = useCallback(() => {
    setUpgradePromptState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const canUseFeature = useCallback((feature: keyof typeof DEMO_RESTRICTIONS): boolean => {
    if (!isDemo) return true;
    return DEMO_RESTRICTIONS[feature]?.allowed ?? false;
  }, [isDemo]);

  const getFeatureMessage = useCallback((feature: keyof typeof DEMO_RESTRICTIONS): string => {
    return DEMO_RESTRICTIONS[feature]?.message || 'Upgrade to use this feature';
  }, []);

  const value: DemoContextValue = {
    isDemo,
    isDemoLoading,
    sampleTrades: sampleData.trades,
    sampleStrategies: sampleData.strategies,
    sampleJournals: sampleData.journals,
    sampleStats: sampleData.stats,
    showUpgradePrompt,
    hideUpgradePrompt,
    upgradePromptState,
    canUseFeature,
    getFeatureMessage,
    hasSeenDemoBanner,
    dismissDemoBanner,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

/**
 * Hook to access demo context
 * Returns null values if not in demo mode (safe to use anywhere)
 */
export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  
  // Return safe defaults if context is not available
  if (!context) {
    return {
      isDemo: false,
      isDemoLoading: false,
      sampleTrades: [],
      sampleStrategies: [],
      sampleJournals: [],
      sampleStats: {
        totalTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        avgR: 0,
      },
      showUpgradePrompt: () => {},
      hideUpgradePrompt: () => {},
      upgradePromptState: { isOpen: false, feature: '', message: '' },
      canUseFeature: () => true,
      getFeatureMessage: () => '',
      hasSeenDemoBanner: true,
      dismissDemoBanner: () => {},
    };
  }

  return context;
}

/**
 * Hook to check a specific demo feature
 * Provides a simple way to guard UI elements
 */
export function useDemoFeature(feature: keyof typeof DEMO_RESTRICTIONS): {
  allowed: boolean;
  message: string;
  triggerUpgrade: () => void;
} {
  const demo = useDemo();
  
  const triggerUpgrade = useCallback(() => {
    if (!demo.canUseFeature(feature)) {
      demo.showUpgradePrompt(feature);
    }
  }, [demo, feature]);

  return {
    allowed: demo.canUseFeature(feature),
    message: demo.getFeatureMessage(feature),
    triggerUpgrade,
  };
}
