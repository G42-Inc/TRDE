'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calculateDisciplineScore, calculateRiskCreep } from '@trde/core';
import type { Trade, RuleViolation } from '@trde/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { InformationCircleIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { getViolationRuleName } from '@/lib/violations';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AssetClass, Outcome } from '@trde/core';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';

export default function RiskPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { trades, ruleViolations: violations, saveRuleViolations, isLoading } = useAppData();
  const [mounted, setMounted] = useState(false);
  
  // Theme-aware colors
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const tickColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
  const tooltipBg = isDark ? '#000000' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipText = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Use empty array during SSR to prevent hydration mismatch
  const disciplineScore = calculateDisciplineScore(mounted ? trades : []);
  const riskCreep = calculateRiskCreep(mounted ? trades : []);
  
  // Calculate additional risk management stats
  const riskStats = calculateRiskStats(mounted ? trades : []);
  const tradesWithViolations = (mounted ? trades : []).filter(trade => {
    const violation = violations.find(v => v.tradeId === trade.id && !v.reviewed);
    return violation !== undefined;
  });

  if (!mounted) {
    return (
      <div className="space-y-6">
        <SkeletonLoader width="250px" height="2rem" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
              <SkeletonLoader width="150px" height="1.5rem" className="mb-4" />
              <SkeletonLoader width="100%" height="200px" />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
              <SkeletonLoader width="120px" height="1.5rem" className="mb-4" />
              <SkeletonLoader width="100%" height="1rem" className="mb-2" />
              <SkeletonLoader width="80%" height="1rem" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header with Icon */}
      <div className="flex items-center gap-4 pb-2">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
          <ShieldCheckIcon className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold theme-text tracking-tight">Risk Management</h1>
          <p className="text-sm theme-text-secondary mt-1">Monitor discipline, violations, and risk metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-slide-in-up">
          <DisciplineScoreCard 
            disciplineScore={disciplineScore}
            tradesWithViolations={tradesWithViolations}
            violations={violations}
            router={router}
          />
        </div>
        <div className="lg:col-span-1 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
          <ViolationsCounterCard violations={violations} />
        </div>
      </div>

      <div className="animate-slide-in-up" style={{ animationDelay: '200ms' }}>
        <RuleViolationsSection 
          violations={violations} 
          trades={trades} 
          router={router}
          onViolationReviewed={() => {}}
          onSaveViolations={saveRuleViolations}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-slide-in-up" style={{ animationDelay: '300ms' }}>
          <RiskStatsCard stats={riskStats} />
        </div>
        
        <div className="animate-slide-in-up" style={{ animationDelay: '350ms' }}>
          <div className="theme-bg-secondary p-6 rounded-2xl border theme-border h-full hover:border-opacity-50 transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-xl font-semibold mb-6 theme-text">Risk Creep Analysis</h2>
            <ResponsiveContainer key={`risk-creep-${theme}`} width="100%" height={300}>
              <AreaChart data={riskCreep}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={gridColor}
                  strokeOpacity={0.5}
                />
                <XAxis 
                  dataKey="date" 
                  stroke={axisColor}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis 
                  stroke={axisColor}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickFormatter={(value) => `$${Math.round(value)}`}
                  axisLine={{ stroke: gridColor }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '12px',
                    color: tooltipText,
                    padding: '12px',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                  labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: any) => [`$${Math.round(value)}`, 'Avg Risk']}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="avgRisk" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fill="url(#riskGradient)"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleViolationsSection({ violations, trades, router, onViolationReviewed, onSaveViolations }: { violations: RuleViolation[]; trades: Trade[]; router: ReturnType<typeof useRouter>; onViolationReviewed: () => void; onSaveViolations: (violations: RuleViolation[]) => Promise<void> }) {
  const [reviewingViolation, setReviewingViolation] = useState<RuleViolation | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showAllViolations, setShowAllViolations] = useState(false);
  
  const unreviewedViolations = violations.filter(v => !v.reviewed);
  const reviewedViolations = violations.filter(v => v.reviewed).sort((a, b) => (b.reviewedAt || b.createdAt) - (a.reviewedAt || a.createdAt));
  const displayedViolations = showAllViolations ? violations.sort((a, b) => b.createdAt - a.createdAt) : unreviewedViolations;
  
  const handleReview = (violation: RuleViolation) => {
    setReviewingViolation(violation);
    setReviewNotes(violation.reviewNotes || '');
  };
  
  const handleSaveReview = async () => {
    if (!reviewingViolation) return;
    
    const updatedViolations = violations.map(v => 
      v.id === reviewingViolation.id
        ? { ...v, reviewed: true, reviewNotes: reviewNotes.trim(), reviewedAt: Date.now() }
        : v
    );
    
    await onSaveViolations(updatedViolations);
    setReviewingViolation(null);
    setReviewNotes('');
    onViolationReviewed();
  };
  
  const handleUpdateReview = async () => {
    if (!reviewingViolation) return;
    
    const updatedViolations = violations.map(v => 
      v.id === reviewingViolation.id
        ? { ...v, reviewNotes: reviewNotes.trim(), reviewedAt: Date.now() }
        : v
    );
    
    await onSaveViolations(updatedViolations);
    setReviewingViolation(null);
    setReviewNotes('');
    onViolationReviewed();
  };
  
  if (violations.length === 0) {
    return null;
  }
  
  return (
    <>
      <div className={`${showAllViolations ? 'theme-bg-tertiary' : 'bg-red-500/10 dark:bg-red-500/20'} border-2 ${showAllViolations ? 'theme-border' : 'border-red-500/50 dark:border-red-500/50'} p-6 rounded-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold theme-text mb-1">
              Risk Rule Violations
            </h2>
            <p className="text-sm theme-text-secondary">
              {showAllViolations 
                ? `${violations.length} total violation${violations.length !== 1 ? 's' : ''} (${unreviewedViolations.length} pending, ${reviewedViolations.length} reviewed)`
                : `${unreviewedViolations.length} ${unreviewedViolations.length === 1 ? 'violation' : 'violations'} need review`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAllViolations(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !showAllViolations
                  ? 'bg-red-600 text-white'
                  : 'theme-bg-tertiary theme-text hover:theme-bg-tertiary'
              }`}
            >
              Pending ({unreviewedViolations.length})
            </button>
            <button
              onClick={() => setShowAllViolations(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showAllViolations
                  ? 'bg-accent text-white'
                  : 'theme-bg-tertiary theme-text hover:theme-bg-tertiary'
              }`}
            >
              All ({violations.length})
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {displayedViolations.map((violation) => {
            const trade = trades.find(t => t.id === violation.tradeId);
            if (!trade) return null;
            
            const symbol = trade.assetClass === AssetClass.FUTURES
              ? trade.instrumentRoot
              : trade.underlying;
            
            const isLong = trade.direction === 'LONG';
            const entryPrice = trade.assetClass === AssetClass.FUTURES ? trade.entryPrice : trade.strike;
            const exitPrice = trade.assetClass === AssetClass.FUTURES ? trade.exitPrice : undefined;
            const isReviewed = violation.reviewed;
            
            return (
              <div
                key={violation.id}
                className={`p-4 rounded-lg border ${
                  isReviewed
                    ? 'theme-bg-tertiary theme-border'
                    : 'theme-bg-secondary border-red-500/30 dark:border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {/* Trade Header */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="font-semibold theme-text">{symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isLong
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                      }`}>
                        {isLong ? 'LONG' : 'SHORT'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        trade.outcome === Outcome.WIN
                          ? 'bg-positive/20 text-positive border border-positive/30'
                          : trade.outcome === Outcome.LOSS
                          ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                          : 'theme-bg-tertiary theme-text border theme-border'
                      }`}>
                        {trade.outcome}
                      </span>
                      <span className="text-xs theme-text-secondary">
                        {format(new Date(trade.entryTime), 'MM/dd HH:mm')}
                      </span>
                    </div>
                    
                    {/* Trade Overview */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs theme-bg-tertiary p-2 rounded border theme-border">
                      <div>
                        <span className="theme-text-secondary">Entry: </span>
                        <span className="font-medium theme-text">
                          {entryPrice?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      {exitPrice && (
                        <div>
                          <span className="theme-text-secondary">Exit: </span>
                          <span className="font-medium theme-text">
                            {exitPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="theme-text-secondary">Qty: </span>
                        <span className="font-medium theme-text">{trade.quantity}</span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">PnL: </span>
                        <span className={`font-medium ${
                          trade.resultUsd >= 0 ? 'text-positive' : 'text-negative'
                        }`}>
                          {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)} ({trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R)
                        </span>
                      </div>
                    </div>
                    
                    {/* Violated Rules */}
                    <div className="mb-2">
                      <div className="text-xs font-medium theme-text-secondary mb-1.5">Violated Rules:</div>
                      <div className="flex flex-wrap gap-2">
                        {violation.violatedRules.map((rule) => (
                          <span
                            key={rule}
                            className={`px-2 py-1 rounded text-xs font-medium border ${
                              isReviewed
                                ? 'theme-bg-tertiary theme-text-secondary theme-border'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                            }`}
                          >
                            {getViolationRuleName(rule)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Review Notes (if reviewed) */}
                    {isReviewed && violation.reviewNotes && (
                      <div className="mt-3 p-3 bg-accent/10 dark:bg-accent/20 rounded-lg border border-accent/30">
                        <div className="text-xs font-medium text-accent mb-1">
                          Review Notes ({format(new Date(violation.reviewedAt || violation.createdAt), 'MM/dd/yyyy')}):
                        </div>
                        <div className="text-sm theme-text">
                          {violation.reviewNotes}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isReviewed ? (
                    <button
                      onClick={() => handleReview(violation)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors ml-4"
                    >
                      Review
                    </button>
                  ) : (
                    <div className="ml-4 flex flex-col items-end">
                      <span className="px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-medium border border-success/30">
                        Reviewed
                      </span>
                      <button
                        onClick={() => handleReview(violation)}
                        className="mt-2 px-3 py-1 text-xs text-accent hover:text-accent dark:hover:text-accent-light transition-colors"
                      >
                        Edit Review
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/trades/${trade.id}`)}
                  className="text-xs text-accent hover:text-accent dark:hover:text-accent-light"
                >
                  View Full Trade Details →
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {reviewingViolation && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setReviewingViolation(null)}
        >
          <div
            className="theme-bg-secondary p-8 rounded-2xl max-w-2xl w-full border theme-border animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: 'var(--shadow-2xl)' }}
          >
            <div className="flex items-center justify-between mb-6 border-b theme-border pb-5">
              <h3 className="text-2xl font-bold theme-text">Review Rule Violation</h3>
              <button
                onClick={() => setReviewingViolation(null)}
                className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-danger/10"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Trade Overview in Modal */}
              {(() => {
                const trade = trades.find(t => t.id === reviewingViolation.tradeId);
                if (!trade) return null;
                
                const symbol = trade.assetClass === AssetClass.FUTURES
                  ? trade.instrumentRoot
                  : trade.underlying;
                const isLong = trade.direction === 'LONG';
                const entryPrice = trade.assetClass === AssetClass.FUTURES ? trade.entryPrice : trade.strike;
                const exitPrice = trade.assetClass === AssetClass.FUTURES ? trade.exitPrice : undefined;
                
                return (
                  <div className="theme-bg-tertiary p-4 rounded-lg border theme-border">
                    <h4 className="font-semibold mb-3 theme-text text-sm">Trade Overview</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="theme-text-secondary">Symbol: </span>
                        <span className="font-medium theme-text">{symbol}</span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">Direction: </span>
                        <span className={`font-medium ${
                          isLong ? 'text-accent' : 'text-orange-500'
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">Entry: </span>
                        <span className="font-medium theme-text">
                          {entryPrice?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      {exitPrice && (
                        <div>
                          <span className="theme-text-secondary">Exit: </span>
                          <span className="font-medium theme-text">
                            {exitPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="theme-text-secondary">Quantity: </span>
                        <span className="font-medium theme-text">{trade.quantity}</span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">PnL: </span>
                        <span className={`font-medium ${
                          trade.resultUsd >= 0 ? 'text-positive' : 'text-negative'
                        }`}>
                          {trade.resultUsd >= 0 ? '+' : ''}${trade.resultUsd.toFixed(2)} ({trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R)
                        </span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">Date: </span>
                        <span className="font-medium theme-text">
                          {format(new Date(trade.entryTime), 'MM/dd/yyyy HH:mm')}
                        </span>
                      </div>
                      <div>
                        <span className="theme-text-secondary">Outcome: </span>
                        <span className={`font-medium ${
                          trade.outcome === Outcome.WIN ? 'text-positive' :
                          trade.outcome === Outcome.LOSS ? 'text-negative' :
                          'theme-text-secondary'
                        }`}>
                          {trade.outcome}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div>
                <h4 className="font-semibold mb-2 theme-text text-sm">Violated Rules</h4>
                <div className="flex flex-wrap gap-2">
                  {reviewingViolation.violatedRules.map((rule) => (
                    <span
                      key={rule}
                      className="px-3 py-1.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded text-sm font-medium border border-red-500/30"
                    >
                      {getViolationRuleName(rule)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  What happened and how will you improve?
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={5}
                  placeholder="Explain what happened that led to breaking these rules, and describe how you will prevent this in the future..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4 border-t theme-border">
              {reviewingViolation?.reviewed ? (
                <>
                  <button
                    onClick={handleUpdateReview}
                    className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors"
                  >
                    Update Review
                  </button>
                  <button
                    onClick={() => setReviewingViolation(null)}
                    className="flex-1 px-4 py-2.5 theme-bg-tertiary theme-text rounded-lg hover:theme-bg-tertiary font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveReview}
                    disabled={!reviewNotes.trim()}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark as Reviewed
                  </button>
                  <button
                    onClick={() => setReviewingViolation(null)}
                    className="flex-1 px-4 py-2.5 theme-bg-tertiary theme-text rounded-lg hover:theme-bg-tertiary font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ViolationsCounterCard({ violations }: { violations: RuleViolation[] }) {
  const totalViolations = violations.length;
  const reviewedViolations = violations.filter(v => v.reviewed).length;
  const unreviewedViolations = violations.filter(v => !v.reviewed).length;
  
  // Calculate days since last violation
  const getDaysSinceLastViolation = (): number | null => {
    if (violations.length === 0) return null;
    
    const sortedViolations = [...violations].sort((a, b) => b.createdAt - a.createdAt);
    const mostRecentViolation = sortedViolations[0];
    const daysSince = Math.floor((Date.now() - mostRecentViolation.createdAt) / (1000 * 60 * 60 * 24));
    return daysSince;
  };
  
  const daysSince = getDaysSinceLastViolation();
  
  return (
    <div className="theme-bg-secondary p-8 rounded-2xl border theme-border h-full hover:border-opacity-50 transition-all duration-300 group" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <h2 className="text-2xl font-bold mb-6 theme-text">Violations Summary</h2>
      
      <div className="space-y-8">
        {/* Total Violations */}
        <div className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150" />
          <div className="relative">
            <div className="text-6xl font-bold mb-3 bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">
              {totalViolations}
            </div>
            <div className="text-sm font-medium theme-text-secondary mb-3">
              Total violations
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="theme-text-secondary font-medium">
                  {reviewedViolations} reviewed
                </span>
              </div>
              <span className="theme-text-tertiary">•</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${unreviewedViolations > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={unreviewedViolations > 0 ? 'text-red-500 font-semibold' : 'theme-text-secondary font-medium'}>
                  {unreviewedViolations} pending
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Days Since Last Violation */}
        <div className="pt-6 border-t theme-border relative overflow-hidden">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150" />
          <div className="relative">
            <div className="text-6xl font-bold mb-3 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              {daysSince !== null ? daysSince : '—'}
            </div>
            <div className="text-sm font-medium theme-text-secondary">
              {daysSince !== null 
                ? daysSince === 0 
                  ? 'Days since last violation (today)' 
                  : daysSince === 1 
                  ? 'Day since last violation'
                  : 'Days since last violation'
                : 'No violations recorded'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisciplineScoreCard({ 
  disciplineScore, 
  tradesWithViolations, 
  violations, 
  router 
}: { 
  disciplineScore: number;
  tradesWithViolations: Trade[];
  violations: RuleViolation[];
  router: ReturnType<typeof useRouter>;
}) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const scoreColor = disciplineScore >= 80 ? 'green' : disciplineScore >= 60 ? 'yellow' : 'red';

  return (
    <>
      <div className="theme-bg-secondary p-8 rounded-2xl border theme-border hover:border-opacity-50 transition-all duration-300 h-full group" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold theme-text mb-1">Discipline Score</h2>
            <p className="text-sm theme-text-secondary">Rule adherence across all trades</p>
          </div>
          <button
            onClick={() => setShowInfoModal(true)}
            className="text-accent hover:text-accent dark:hover:text-accent-light transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-accent/10"
            title="Info"
          >
            <InformationCircleIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Large Score Display */}
        <div className="mb-6">
          <div className={`text-7xl font-bold mb-2 tracking-tight transition-all duration-500 ${
            scoreColor === 'green' 
              ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 bg-clip-text text-transparent' 
              : scoreColor === 'yellow'
              ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 bg-clip-text text-transparent'
          }`}>
            {disciplineScore.toFixed(0)}%
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="mb-6">
          <AnimatedProgressBar 
            value={disciplineScore} 
            height="h-4" 
            color={scoreColor}
            animated={true}
          />
        </div>
        
        {/* Trades with Unreviewed Violations */}
        {tradesWithViolations.length > 0 && (
          <div className="pt-6 border-t theme-border animate-slide-in-up">
            <h3 className="text-sm font-semibold theme-text mb-4 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Trades Needing Review ({tradesWithViolations.length})
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
              {tradesWithViolations.slice(0, 5).map((trade, index) => {
                const violation = violations.find(v => v.tradeId === trade.id && !v.reviewed);
                const symbol = trade.assetClass === AssetClass.FUTURES
                  ? trade.instrumentRoot
                  : trade.underlying;
                
                return (
                  <div
                    key={trade.id}
                    onClick={() => router.push(`/trades/${trade.id}`)}
                    className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-xl border border-red-500/30 cursor-pointer hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold theme-text">{symbol}</span>
                        <span className="text-xs theme-text-secondary">
                          {format(new Date(trade.entryTime), 'MMM dd')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 bg-red-500/20 rounded-full">
                          {violation?.violatedRules.length || 0} rule{violation?.violatedRules.length !== 1 ? 's' : ''}
                        </span>
                        <svg className="w-4 h-4 theme-text-secondary group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
              {tradesWithViolations.length > 5 && (
                <p className="text-xs theme-text-secondary text-center pt-2 font-medium">
                  +{tradesWithViolations.length - 5} more trade{tradesWithViolations.length - 5 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {showInfoModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="theme-bg-secondary p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border theme-border animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: 'var(--shadow-2xl)' }}
          >
            <div className="flex items-center justify-between mb-6 border-b theme-border pb-5">
              <h3 className="text-2xl font-bold theme-text">Discipline Score</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="theme-text-secondary hover:theme-text transition-all duration-200 hover:scale-110 active:scale-95 p-2 rounded-full hover:bg-accent/10"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 theme-text">
              <div>
                <h4 className="font-semibold mb-2 theme-text text-sm">Definition</h4>
                <p className="text-sm theme-text-secondary leading-relaxed">
                  The Discipline Score measures your adherence to risk management rules and trading discipline across all your trades. 
                  It calculates the percentage of discipline checks that you passed, providing a comprehensive view of how well you 
                  follow your trading plan and risk rules.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 theme-text text-sm">Why It Matters</h4>
                <p className="text-sm theme-text-secondary leading-relaxed">
                  Discipline is one of the most critical factors in long-term trading success. A high discipline score indicates 
                  consistent rule-following, which helps protect your capital and ensures you&apos;re trading according to your plan. 
                  Low discipline scores often correlate with emotional trading, rule-breaking, and increased risk exposure.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 theme-text text-sm">Calculation</h4>
                <p className="text-sm theme-text-secondary leading-relaxed font-mono theme-bg-tertiary px-3 py-2 rounded border theme-border">
                  Score = (Total Passed Checks / Total Possible Checks) × 100
                </p>
                <p className="text-sm theme-text-secondary leading-relaxed mt-2">
                  For each trade, 7 discipline checks are evaluated:
                </p>
                <ul className="text-sm theme-text-secondary leading-relaxed mt-2 ml-4 list-disc space-y-1">
                  <li>Respected Daily Loss Limit</li>
                  <li>Respected Max Trades Per Day</li>
                  <li>Respected Max Contracts Per Trade</li>
                  <li>Had Stop Defined</li>
                  <li>Followed Entry Rules</li>
                  <li>Followed Exit Rules</li>
                  <li>Journal Completed</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 theme-text text-sm">Interpretation</h4>
                <p className="text-sm theme-text-secondary leading-relaxed">
                  <strong className="text-success">80-100%:</strong> Excellent discipline. You consistently follow your rules and trading plan.<br/>
                  <strong className="text-yellow-500">60-79%:</strong> Good discipline with room for improvement. Focus on the areas where you&apos;re breaking rules.<br/>
                  <strong className="text-danger">Below 60%:</strong> Needs attention. Review which rules you&apos;re breaking most often and develop strategies to improve adherence.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function calculateRiskStats(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      avgRiskPerTrade: 0,
      maxRiskPerTrade: 0,
      minRiskPerTrade: 0,
      totalRisk: 0,
      avgRiskPerWin: 0,
      avgRiskPerLoss: 0,
      largestLoss: 0,
      largestLossR: 0,
      consecutiveLosses: 0,
      daysWithViolations: 0,
      mostCommonViolation: null as string | null,
    };
  }

  const risks = trades.map(t => t.plannedRiskUsd);
  const wins = trades.filter(t => t.outcome === Outcome.WIN);
  const losses = trades.filter(t => t.outcome === Outcome.LOSS);
  
  // Calculate consecutive losses
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  for (const trade of trades.sort((a, b) => a.entryTime - b.entryTime)) {
    if (trade.outcome === Outcome.LOSS) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  // Find largest loss
  const lossAmounts = losses.map(t => t.resultUsd);
  const lossRs = losses.map(t => t.resultR);
  const largestLoss = lossAmounts.length > 0 ? Math.min(...lossAmounts) : 0;
  const largestLossR = lossRs.length > 0 ? Math.min(...lossRs) : 0;

  // Calculate days with violations (would need violations data, simplified here)
  const uniqueDates = new Set(trades.map(t => t.tradeDate));
  
  return {
    avgRiskPerTrade: risks.reduce((a, b) => a + b, 0) / risks.length,
    maxRiskPerTrade: Math.max(...risks),
    minRiskPerTrade: Math.min(...risks),
    totalRisk: risks.reduce((a, b) => a + b, 0),
    avgRiskPerWin: wins.length > 0 ? wins.reduce((sum, t) => sum + t.plannedRiskUsd, 0) / wins.length : 0,
    avgRiskPerLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + t.plannedRiskUsd, 0) / losses.length : 0,
    largestLoss,
    largestLossR,
    consecutiveLosses: maxConsecutive,
    daysWithViolations: uniqueDates.size, // Simplified - would need actual violation data
    mostCommonViolation: null, // Would need violation analysis
  };
}

function RiskStatsCard({ stats }: { stats: ReturnType<typeof calculateRiskStats> }) {
  return (
    <div className="theme-bg-secondary p-6 rounded-2xl border theme-border hover:border-opacity-50 transition-all duration-300 h-full" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <h2 className="text-xl font-semibold mb-6 theme-text">Risk Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Avg Risk/Trade</div>
          <div className="text-2xl font-bold theme-text">
            ${Math.round(stats.avgRiskPerTrade)}
          </div>
        </div>
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Max Risk/Trade</div>
          <div className="text-2xl font-bold theme-text">
            ${Math.round(stats.maxRiskPerTrade)}
          </div>
        </div>
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Avg Risk/Win</div>
          <div className="text-2xl font-bold theme-text">
            ${Math.round(stats.avgRiskPerWin)}
          </div>
        </div>
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Avg Risk/Loss</div>
          <div className="text-2xl font-bold theme-text">
            ${Math.round(stats.avgRiskPerLoss)}
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs text-red-600 dark:text-red-400 mb-2 font-semibold uppercase tracking-wide">Largest Loss</div>
          <div className="text-2xl font-bold text-red-500">
            ${Math.round(Math.abs(stats.largestLoss))}
          </div>
          <div className="text-sm text-red-500/80 mt-1 font-medium">
            {stats.largestLossR.toFixed(2)}R
          </div>
        </div>
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02]">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Consecutive Losses</div>
          <div className={`text-2xl font-bold ${stats.consecutiveLosses >= 3 ? 'text-red-500' : 'theme-text'}`}>
            {stats.consecutiveLosses}
          </div>
        </div>
        <div className="p-4 theme-bg-tertiary rounded-xl border theme-border hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] col-span-2">
          <div className="text-xs theme-text-secondary mb-2 font-medium uppercase tracking-wide">Total Risk Deployed</div>
          <div className="text-2xl font-bold theme-text">
            ${Math.round(stats.totalRisk).toLocaleString()}
          </div>
          <div className="text-sm theme-text-tertiary mt-2">
            Range: ${Math.round(stats.minRiskPerTrade)} - ${Math.round(stats.maxRiskPerTrade)}
          </div>
        </div>
      </div>
    </div>
  );
}
