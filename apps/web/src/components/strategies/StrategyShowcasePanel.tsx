'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getTopStrategies, 
  getTrendingStrategies, 
  getNewStrategies, 
  getMostPopularCreators,
  type PublicStrategyCard,
  type PopularCreator 
} from '@/lib/actions/strategies.server';
import { StrategyCard } from './StrategyCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type ShowcaseTab = 'top' | 'trending' | 'new' | 'creators';

export function StrategyShowcasePanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('top');
  const [strategies, setStrategies] = useState<PublicStrategyCard[]>([]);
  const [creators, setCreators] = useState<PopularCreator[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShowcaseData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'top') {
        const result = await getTopStrategies(20);
        if (result.success && result.strategies) {
          setStrategies(result.strategies);
        }
      } else if (activeTab === 'trending') {
        const result = await getTrendingStrategies(20);
        if (result.success && result.strategies) {
          setStrategies(result.strategies);
        }
      } else if (activeTab === 'new') {
        const result = await getNewStrategies(20);
        if (result.success && result.strategies) {
          setStrategies(result.strategies);
        }
      } else if (activeTab === 'creators') {
        const result = await getMostPopularCreators(10);
        if (result.success && result.creators) {
          setCreators(result.creators);
        }
      }
    } catch (error) {
      console.error('Error loading showcase data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadShowcaseData();
  }, [loadShowcaseData]);

  return (
    <div className="theme-bg-secondary rounded-xl border theme-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold theme-text">Community Showcase</h2>
        <button
          onClick={() => router.push('/strategies/explore')}
          className="flex items-center gap-1 text-sm theme-text-secondary hover:theme-text transition-colors"
        >
          Explore all
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b theme-border">
        {(['top', 'trending', 'new', 'creators'] as ShowcaseTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent theme-text-secondary hover:theme-text'
            }`}
          >
            {tab === 'top' ? 'Top' : tab === 'trending' ? 'Trending' : tab === 'new' ? 'New' : 'Creators'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="theme-bg p-4 rounded-lg border theme-border">
              <SkeletonLoader width="100%" height="1rem" lines={3} />
            </div>
          ))}
        </div>
      ) : activeTab === 'creators' ? (
        <div className="space-y-3">
          {creators.length === 0 ? (
            <p className="theme-text-secondary text-sm text-center py-8">No popular creators yet.</p>
          ) : (
            creators.map((creator) => (
              <div
                key={creator.user_id}
                className="theme-bg p-4 rounded-lg border theme-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold">
                    {creator.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium theme-text">{creator.username}</span>
                      {creator.is_verified && (
                        <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-semibold rounded border border-accent/30">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs theme-text-secondary">
                      {creator.strategy_count} strategies · {creator.total_upvotes} upvotes
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {strategies.length === 0 ? (
            <p className="theme-text-secondary text-sm text-center py-8">No public strategies yet.</p>
          ) : (
            strategies.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
