'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calculateAllMetrics, calculateWinRate, calculateExpectancy, calculateTotalPnLR } from '@trde/core';
import type { Strategy as CoreStrategy, StrategyVersion, Trade } from '@trde/core';
import { Outcome } from '@trde/core';
import { createStrategy, getMyStrategies, type Strategy as SupabaseStrategy } from '@/lib/actions/strategies.server';
import { StrategyShowcasePanel } from '@/components/strategies/StrategyShowcasePanel';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useUser } from '@clerk/nextjs';

export default function StrategiesPage() {
  const { user } = useUser();
  const { 
    strategies: localStrategies, 
    trades, 
    saveStrategies, 
    isLoading 
  } = useAppData();
  const versions: any[] = []; // Versions not yet supported in demo
  const saveVersions = async (_versions: any[]) => {}; // Noop for demo
  // Supabase strategies (new community system)
  const [supabaseStrategies, setSupabaseStrategies] = useState<SupabaseStrategy[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showNewStrategyModal, setShowNewStrategyModal] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [selectedStrategyType, setSelectedStrategyType] = useState<'local' | 'supabase' | null>(null);
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [newStrategyForm, setNewStrategyForm] = useState({
    name: '',
    summary: '',
    description: '',
    isPublic: false,
  });
  const [newVersionForm, setNewVersionForm] = useState({
    definition: '',
    triggers: '',
  });

  const loadSupabaseStrategies = useCallback(async () => {
    // Load Supabase strategies
    if (user) {
      try {
        setLoadingStrategies(true);
        const result = await getMyStrategies();
        if (result.success && result.strategies) {
          setSupabaseStrategies(result.strategies);
        }
      } catch (error) {
        console.error('Error loading Supabase strategies:', error);
      } finally {
        setLoadingStrategies(false);
      }
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      loadSupabaseStrategies();
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [loadSupabaseStrategies]);

  const handleCreateStrategy = async () => {
    if (!newStrategyForm.name.trim()) return;

    // If creating a public strategy, use Supabase
    if (newStrategyForm.isPublic) {
      const result = await createStrategy({
        title: newStrategyForm.name.trim(),
        summary: newStrategyForm.summary.trim() || newStrategyForm.name.trim(),
        content_md: newStrategyForm.description.trim() || '',
        tags: [],
        is_public: true,
        username: user?.username || undefined,
      });
      
      if (result.success) {
        await loadSupabaseStrategies();
        setShowNewStrategyModal(false);
        setNewStrategyForm({ name: '', summary: '', description: '', isPublic: false });
      } else {
        alert(`Failed to create strategy: ${result.error}`);
      }
    } else {
      // Private strategy - use local storage (legacy) or Supabase with is_public=false
      // For now, using Supabase for all strategies
      const result = await createStrategy({
        title: newStrategyForm.name.trim(),
        summary: newStrategyForm.summary.trim() || newStrategyForm.name.trim(),
        content_md: newStrategyForm.description.trim() || '',
        tags: [],
        is_public: false,
        username: user?.username || undefined,
      });
      
      if (result.success) {
        await loadSupabaseStrategies();
        setShowNewStrategyModal(false);
        setNewStrategyForm({ name: '', summary: '', description: '', isPublic: false });
      } else {
        // Fallback to local storage if Supabase fails
        const newStrategy: CoreStrategy = {
          id: `strategy-${Date.now()}`,
          name: newStrategyForm.name.trim(),
          description: newStrategyForm.description.trim() || undefined,
          createdAt: Date.now(),
        };
        const updated = [...localStrategies, newStrategy];
        await saveStrategies(updated);
        setShowNewStrategyModal(false);
        setNewStrategyForm({ name: '', summary: '', description: '', isPublic: false });
      }
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedStrategyId || !newVersionForm.definition.trim()) return;

    const strategyVersions = versions.filter((v) => v.strategyId === selectedStrategyId);
    const nextVersion = `v${strategyVersions.length + 1}`;

    const newVersion: StrategyVersion = {
      id: `version-${Date.now()}`,
      strategyId: selectedStrategyId,
      version: nextVersion,
      definition: newVersionForm.definition.trim(),
      triggers: newVersionForm.triggers.trim() || undefined,
      createdAt: Date.now(),
    };

    const updated = [...versions, newVersion];
    await saveVersions(updated);
    setShowCreateVersionModal(false);
    setNewVersionForm({ definition: '', triggers: '' });
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonLoader width="150px" height="2rem" className="mb-2" />
            <SkeletonLoader width="300px" height="1rem" />
          </div>
          <SkeletonLoader width="120px" height="2.5rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="theme-bg-secondary p-6 rounded-xl border theme-border">
              <SkeletonLoader width="60%" height="1.5rem" className="mb-3" />
              <SkeletonLoader width="100%" height="1rem" className="mb-2" />
              <SkeletonLoader width="80%" height="1rem" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate metrics for local storage strategies
  const localStrategyMetrics = localStrategies.map((strategy) => {
    const strategyTrades = trades.filter((t) => t.strategyId === strategy.id);
    const strategyVersions = versions.filter((v) => v.strategyId === strategy.id);
    const totalR = calculateTotalPnLR(strategyTrades);
    const winRate = calculateWinRate(strategyTrades);
    const expectancy = calculateExpectancy(strategyTrades);
    const metrics = calculateAllMetrics(strategyTrades);
    
    return {
      strategy,
      type: 'local' as const,
      versions: strategyVersions,
      trades: strategyTrades,
      totalR,
      winRate,
      expectancy,
      metrics,
    };
  }).sort((a, b) => b.totalR - a.totalR);

  // Combine strategies for display
  const allStrategies = [
    ...localStrategyMetrics,
    ...supabaseStrategies.map((strategy) => ({
      strategy: {
        id: strategy.id,
        name: strategy.title,
        description: strategy.summary,
        createdAt: new Date(strategy.created_at).getTime(),
      } as CoreStrategy,
      type: 'supabase' as const,
      isPublic: strategy.is_public,
      upvotes: strategy.upvotes,
      downvotes: strategy.downvotes,
      versions: [] as StrategyVersion[],
      trades: [] as Trade[],
      // Use stats from database, fallback to 0 if not available
      totalR: strategy.total_pnl_r ?? 0,
      winRate: strategy.win_rate ?? 0,
      expectancy: strategy.expectancy ?? 0,
      trade_count: strategy.trade_count ?? 0,
      total_pnl_r: strategy.total_pnl_r ?? 0,
      total_pnl_usd: strategy.total_pnl_usd ?? 0,
      profit_factor: strategy.profit_factor ?? 0,
      metrics: {
        totalPnLUsd: strategy.total_pnl_usd ?? 0,
        totalPnLR: strategy.total_pnl_r ?? 0,
        winRate: strategy.win_rate ?? 0,
        expectancy: strategy.expectancy ?? 0,
        profitFactor: strategy.profit_factor ?? 0,
        avgWinR: 0,
        avgLossR: 0,
        maxDrawdownUsd: 0,
        maxDrawdownR: 0,
      },
    })),
  ];

  const selectedStrategy = selectedStrategyId && selectedStrategyType
    ? allStrategies.find((s) => s.strategy.id === selectedStrategyId && s.type === selectedStrategyType)
    : null;

  return (
    <div className="lg:grid grid-cols-3 gap-8 animate-fade-in">
      {/* Left Column: My Strategies */}
      <div className="col-span-2 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <svg className="h-7 w-7 theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold theme-text tracking-tight">My Strategies</h1>
              <p className="theme-text-secondary mt-1">Analyze and refine your trading playbooks</p>
            </div>
          </div>
          <button 
            onClick={() => setShowNewStrategyModal(true)}
            className="px-6 py-3 rounded-xl font-bold theme-text transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            + New Strategy
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allStrategies.map((strategyData, index) => {
            const { strategy, type, versions: strategyVersions, trades: strategyTrades, totalR, winRate, expectancy } = strategyData;
            const isPublic = type === 'supabase' ? strategyData.isPublic : false;
            const upvotes = type === 'supabase' ? strategyData.upvotes : 0;
            const downvotes = type === 'supabase' ? strategyData.downvotes : 0;
            const winRateColor = winRate >= 50 ? 'from-green-400 to-emerald-500' : 'from-orange-400 to-amber-500';
            const isPublicBadge = type === 'supabase' && isPublic;
            
            return (
              <div 
                key={`${type}-${strategy.id}`}
                onClick={() => {
                  // Open modal for all strategies
                  setSelectedStrategyId(strategy.id);
                  setSelectedStrategyType(type);
                }}
                className="theme-bg-secondary p-7 rounded-2xl border theme-border transition-all duration-300 hover:border-opacity-40 group relative overflow-hidden animate-slide-in-up cursor-pointer hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms`, boxShadow: 'var(--shadow-sm)' }}
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.06] transition-all duration-500 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold theme-text mb-2">{strategy.name}</h2>
                      {isPublicBadge && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent text-xs font-bold rounded-full border border-accent/30">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Public
                        </span>
                      )}
                    </div>
                    {type === 'local' && (
                      <span className={`px-4 py-2 rounded-xl text-base font-bold shadow-md ${
                        totalR >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                      }`}>
                        {totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R
                      </span>
                    )}
                    {type === 'supabase' && (
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-4 py-2 rounded-xl text-sm font-bold bg-accent/20 text-accent border border-accent/30">
                          {upvotes - downvotes} votes
                        </span>
                      </div>
                    )}
                  </div>

                  {type === 'local' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between text-sm py-3 px-4 theme-bg-tertiary rounded-xl">
                        <span className="theme-text-secondary font-medium">{strategyVersions.length} {strategyVersions.length === 1 ? 'Version' : 'Versions'}</span>
                        <svg className="w-4 h-4 theme-text-secondary group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold theme-text-secondary uppercase tracking-wide">Win Rate</span>
                          <span className="text-sm font-bold theme-text">{winRate.toFixed(1)}%</span>
                        </div>
                        <div className="relative w-full h-3 theme-bg-tertiary rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${winRateColor} transition-all duration-700 shadow-md relative overflow-hidden`}
                            style={{ width: `${Math.min(winRate, 100)}%` }}
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 animate-shimmer opacity-40" style={{
                              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                              backgroundSize: '200% 100%',
                            }} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 theme-bg-tertiary rounded-xl">
                          <span className="text-xs theme-text-secondary font-semibold uppercase tracking-wide block mb-1">Trades</span>
                          <span className="text-2xl font-bold theme-text">{strategyTrades.length}</span>
                        </div>
                        <div className="p-4 theme-bg-tertiary rounded-xl">
                          <span className="text-xs theme-text-secondary font-semibold uppercase tracking-wide block mb-1">Expectancy</span>
                          <span className="text-2xl font-bold" style={{ color: expectancy >= 0 ? '#0D9488' : '#E57373' }}>
                            {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {type === 'supabase' && (
                    <div className="space-y-4">
                      {strategy.description && (
                        <p className="text-sm theme-text-secondary leading-relaxed line-clamp-2">{strategy.description}</p>
                      )}
                      {/* Statistics */}
                      {(strategyData.trade_count && strategyData.trade_count > 0) && (
                        <div className="space-y-3 pt-4 border-t theme-border">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 theme-bg-tertiary rounded-xl">
                              <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">Win Rate</div>
                              <div className={`text-lg font-bold ${strategyData.winRate >= 50 ? 'text-positive' : 'text-warning'}`}>
                                {strategyData.winRate.toFixed(1)}%
                              </div>
                            </div>
                            <div className="p-3 theme-bg-tertiary rounded-xl">
                              <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">Trades</div>
                              <div className="text-lg font-bold theme-text">{strategyData.trade_count}</div>
                            </div>
                            <div className="p-3 theme-bg-tertiary rounded-xl">
                              <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">Total R</div>
                              <div className={`text-lg font-bold ${strategyData.totalR >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {strategyData.totalR >= 0 ? '+' : ''}{strategyData.totalR.toFixed(1)}R
                              </div>
                            </div>
                            <div className="p-3 theme-bg-tertiary rounded-xl">
                              <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">Expectancy</div>
                              <div className={`text-lg font-bold ${strategyData.expectancy >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {strategyData.expectancy >= 0 ? '+' : ''}{strategyData.expectancy.toFixed(2)}R
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs theme-text-secondary pt-2 border-t theme-border">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          {upvotes} upvotes
                        </span>
                        <span>·</span>
                        <span>{new Date(strategy.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Hover shadow effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{ boxShadow: 'var(--shadow-lg)' }} />
              </div>
            );
          })}
          
          {allStrategies.length === 0 && !loadingStrategies && (
            <div className="col-span-full text-center py-16 theme-bg-secondary rounded-2xl border theme-border">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="theme-text-secondary text-lg mb-6">No strategies yet. Create your first strategy to get started.</p>
                <button
                  onClick={() => setShowNewStrategyModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Create First Strategy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Community Showcase */}
      <div className="col-span-1">
        <StrategyShowcasePanel />
      </div>

      {/* Create Version Modal - Enhanced */}
      {showCreateVersionModal && selectedStrategyId && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => setShowCreateVersionModal(false)}
        >
          <div
            className="theme-bg-secondary rounded-2xl max-w-2xl w-full border theme-border animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: 'var(--shadow-2xl)' }}
          >
            <div className="p-6 border-b theme-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold theme-text">Create New Version</h2>
                <button
                  onClick={() => setShowCreateVersionModal(false)}
                  className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-danger/10"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                  Definition *
                </label>
                <textarea
                  value={newVersionForm.definition}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, definition: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200"
                  rows={6}
                  placeholder="Define the strategy rules, entry criteria, and management approach..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                  Triggers
                </label>
                <textarea
                  value={newVersionForm.triggers}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, triggers: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200"
                  rows={4}
                  placeholder="Entry triggers, exit conditions, and specific setup requirements..."
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleCreateVersion}
                  disabled={!newVersionForm.definition.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Create Version
                </button>
                <button
                  onClick={() => {
                    setShowCreateVersionModal(false);
                    setNewVersionForm({ definition: '', triggers: '' });
                  }}
                  className="flex-1 px-6 py-3 theme-bg-tertiary theme-text rounded-xl hover:opacity-80 font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Strategy Modal - Enhanced */}
      {showNewStrategyModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => setShowNewStrategyModal(false)}
        >
          <div
            className="theme-bg-secondary rounded-2xl max-w-lg w-full border theme-border animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: 'var(--shadow-2xl)' }}
          >
            <div className="p-6 border-b theme-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold theme-text">New Strategy</h2>
                <button
                  onClick={() => setShowNewStrategyModal(false)}
                  className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-danger/10"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={newStrategyForm.name}
                  onChange={(e) => setNewStrategyForm({ ...newStrategyForm, name: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  placeholder="e.g., ORB Breakout"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                  Summary
                </label>
                <input
                  type="text"
                  value={newStrategyForm.summary}
                  onChange={(e) => setNewStrategyForm({ ...newStrategyForm, summary: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                  placeholder="Brief summary (for public strategies)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold theme-text-secondary mb-2 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={newStrategyForm.description}
                  onChange={(e) => setNewStrategyForm({ ...newStrategyForm, description: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200"
                  rows={3}
                  placeholder="Detailed description of the strategy..."
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div className="text-sm font-semibold theme-text">Make this strategy public</div>
                  <div className="text-xs theme-text-secondary mt-1">
                    Public strategies appear in the community showcase
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStrategyForm.isPublic}
                    onChange={(e) => setNewStrategyForm({ ...newStrategyForm, isPublic: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleCreateStrategy}
                  disabled={!newStrategyForm.name.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Create Strategy
                </button>
                <button
                  onClick={() => setShowNewStrategyModal(false)}
                  className="flex-1 px-6 py-3 theme-bg-tertiary theme-text rounded-xl hover:opacity-80 font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => {
            setSelectedStrategyId(null);
            setSelectedStrategyType(null);
          }}
        >
          <div
            className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 p-6 z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold theme-text">{selectedStrategy.strategy.name}</h2>
                  {selectedStrategy.strategy.description && (
                    <p className="theme-text-secondary text-sm mt-1">{selectedStrategy.strategy.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedStrategyId(null);
                    setSelectedStrategyType(null);
                  }}
                  className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-danger/10"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total P&L', value: `${selectedStrategy.metrics.totalPnLUsd >= 0 ? '+' : ''}$${selectedStrategy.metrics.totalPnLUsd.toFixed(2)}`, sub: `${selectedStrategy.metrics.totalPnLR >= 0 ? '+' : ''}${selectedStrategy.metrics.totalPnLR.toFixed(1)}R`, color: selectedStrategy.metrics.totalPnLUsd >= 0 ? 'text-positive' : 'text-negative' },
                  { label: 'Win Rate', value: `${selectedStrategy.winRate.toFixed(1)}%`, sub: `${selectedStrategy.trades.length} trades`, color: selectedStrategy.winRate >= 50 ? 'text-positive' : 'text-warning' },
                  { label: 'Expectancy', value: `${selectedStrategy.expectancy >= 0 ? '+' : ''}${selectedStrategy.expectancy.toFixed(2)}R`, sub: 'per trade', color: selectedStrategy.expectancy >= 0 ? 'text-positive' : 'text-negative' },
                  { label: 'Profit Factor', value: selectedStrategy.metrics.profitFactor === Infinity ? '∞' : selectedStrategy.metrics.profitFactor.toFixed(2), sub: 'gross P/L', color: selectedStrategy.metrics.profitFactor >= 1 ? 'text-positive' : 'text-negative' },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                    <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                    <div className="text-xs theme-text-tertiary mt-1">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Avg Win', value: `${selectedStrategy.metrics.avgWinR.toFixed(2)}R`, color: 'text-positive' },
                  { label: 'Avg Loss', value: `${selectedStrategy.metrics.avgLossR.toFixed(2)}R`, color: 'text-negative' },
                  { label: 'Max Drawdown', value: `$${selectedStrategy.metrics.maxDrawdownUsd.toFixed(2)}`, color: 'text-negative' },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <div className="text-xs theme-text-secondary font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                    <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Strategy Versions */}
              {selectedStrategy.type === 'local' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold theme-text">Strategy Versions</h3>
                    <button
                      onClick={() => setShowCreateVersionModal(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold theme-text transition-all duration-200 hover:scale-105"
                      style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                    >
                      + Add Version
                    </button>
                  </div>
                  {selectedStrategy.versions.length === 0 ? (
                    <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="theme-text-secondary text-sm">No versions yet. Create the first version to document your strategy rules.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedStrategy.versions.map((version) => (
                        <div key={version.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold theme-text">{version.version}</span>
                            <span className="text-xs theme-text-tertiary">
                              {new Date(version.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {version.definition && (
                            <div className="mb-2">
                              <div className="text-xs font-semibold theme-text-secondary mb-1">Definition</div>
                              <p className="text-sm theme-text whitespace-pre-wrap">{version.definition}</p>
                            </div>
                          )}
                          {version.triggers && (
                            <div>
                              <div className="text-xs font-semibold theme-text-secondary mb-1">Triggers</div>
                              <p className="text-sm theme-text whitespace-pre-wrap">{version.triggers}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Trades */}
              {selectedStrategy.trades.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Recent Trades</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b theme-border">
                          <th className="text-left py-2 px-3 theme-text-secondary font-semibold">Date</th>
                          <th className="text-left py-2 px-3 theme-text-secondary font-semibold">Outcome</th>
                          <th className="text-right py-2 px-3 theme-text-secondary font-semibold">Result (R)</th>
                          <th className="text-right py-2 px-3 theme-text-secondary font-semibold">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStrategy.trades.slice(0, 10).map((trade) => (
                          <tr key={trade.id} className="border-b theme-border hover:theme-bg-tertiary transition-colors">
                            <td className="py-2 px-3 theme-text">{new Date(trade.tradeDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                trade.outcome === Outcome.WIN 
                                  ? 'bg-positive/20 text-positive' 
                                  : 'bg-negative/20 text-negative'
                              }`}>
                                {trade.outcome}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${trade.resultR >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${trade.resultUsd >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedStrategy.trades.length > 10 && (
                      <p className="text-center text-sm theme-text-secondary mt-3">
                        Showing 10 of {selectedStrategy.trades.length} trades
                      </p>
                    )}
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

function StrategyDetailView({
  strategyData,
  onBack,
  onCreateVersion,
}: {
  strategyData: {
    strategy: CoreStrategy;
    versions: StrategyVersion[];
    trades: Trade[];
    totalR: number;
    winRate: number;
    expectancy: number;
    metrics: ReturnType<typeof calculateAllMetrics>;
  };
  onBack: () => void;
  onCreateVersion: () => void;
}) {
  const { strategy, versions, trades, metrics } = strategyData;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-3 rounded-xl hover:bg-theme-bg-tertiary"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold theme-text tracking-tight">{strategy.name}</h1>
            {strategy.description && (
              <p className="theme-text-secondary mt-2 text-base">{strategy.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={onCreateVersion}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-xl"
        >
          + Create v{versions.length + 1}
        </button>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] animate-slide-in-up" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Total PnL</div>
          <div className={`text-3xl font-bold ${metrics.totalPnLUsd >= 0 ? 'text-positive' : 'text-negative'}`}>
            {metrics.totalPnLUsd >= 0 ? '+' : ''}${metrics.totalPnLUsd.toFixed(2)}
          </div>
          <div className="text-sm theme-text-tertiary mt-2 font-medium">
            {metrics.totalPnLR.toFixed(1)}R
          </div>
        </div>
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] animate-slide-in-up" style={{ animationDelay: '50ms', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Win Rate</div>
          <div className={`text-3xl font-bold ${metrics.winRate >= 50 ? 'text-positive' : 'text-warning'}`}>
            {metrics.winRate.toFixed(1)}%
          </div>
          <div className="text-sm theme-text-tertiary mt-2 font-medium">
            {trades.length} trades
          </div>
        </div>
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] animate-slide-in-up" style={{ animationDelay: '100ms', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Expectancy</div>
          <div className={`text-3xl font-bold ${metrics.expectancy >= 0 ? 'text-positive' : 'text-negative'}`}>
            {metrics.expectancy >= 0 ? '+' : ''}{metrics.expectancy.toFixed(2)}R
          </div>
          <div className="text-sm theme-text-tertiary mt-2 font-medium">
            Avg per trade
          </div>
        </div>
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] animate-slide-in-up" style={{ animationDelay: '150ms', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Profit Factor</div>
          <div className={`text-3xl font-bold ${metrics.profitFactor >= 1 ? 'text-positive' : 'text-negative'}`}>
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          </div>
          <div className="text-sm theme-text-tertiary mt-2 font-medium">
            Gross P / Gross L
          </div>
        </div>
      </div>

      {/* Additional Metrics - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Avg Win</div>
          <div className="text-2xl font-bold text-positive">{metrics.avgWinR.toFixed(2)}R</div>
        </div>
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Avg Loss</div>
          <div className="text-2xl font-bold text-negative">{metrics.avgLossR.toFixed(2)}R</div>
        </div>
        <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-sm theme-text-secondary mb-2 font-semibold uppercase tracking-wide">Max Drawdown</div>
          <div className="text-2xl font-bold text-negative">${metrics.maxDrawdownUsd.toFixed(2)}</div>
          <div className="text-sm theme-text-tertiary mt-1 font-medium">
            {metrics.maxDrawdownR.toFixed(1)}R
          </div>
        </div>
      </div>

      {/* Versions - Enhanced */}
      <div className="theme-bg-secondary p-7 rounded-2xl border theme-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-2xl font-bold mb-6 theme-text">Strategy Versions</h2>
        {versions.length === 0 ? (
          <div className="text-center py-12">
            <p className="theme-text-secondary mb-4">No versions yet. Create the first version to get started.</p>
            <button
              onClick={onCreateVersion}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all duration-300 hover:scale-105"
            >
              Create First Version
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div key={version.id} className="theme-bg-tertiary rounded-xl p-5 border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.01] animate-slide-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold theme-text text-lg">{version.version}</h3>
                  <span className="text-xs theme-text-tertiary font-medium px-3 py-1 theme-bg-secondary rounded-full">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {version.description && (
                  <p className="text-sm theme-text-secondary mb-3 leading-relaxed">{version.description}</p>
                )}
                {version.definition && (
                  <div className="mb-3 p-4 theme-bg-secondary rounded-xl border theme-border">
                    <div className="text-xs font-bold theme-text-secondary mb-2 uppercase tracking-wide">Definition</div>
                    <p className="text-sm theme-text whitespace-pre-wrap leading-relaxed">{version.definition}</p>
                  </div>
                )}
                {version.triggers && (
                  <div className="p-4 theme-bg-secondary rounded-xl border theme-border">
                    <div className="text-xs font-bold theme-text-secondary mb-2 uppercase tracking-wide">Triggers</div>
                    <p className="text-sm theme-text whitespace-pre-wrap leading-relaxed">{version.triggers}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
