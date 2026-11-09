'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchPublicStrategies, type PublicStrategyCard } from '@/lib/actions/strategies.server';
import { StrategyCard } from '@/components/strategies/StrategyCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

type SortOption = 'top' | 'trending' | 'new';

export default function ExploreStrategiesPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<PublicStrategyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState<SortOption>('top');
  const [allTags, setAllTags] = useState<string[]>([]);

  const loadStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const result = await searchPublicStrategies({
        query: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sort: activeSort,
        limit: 50,
      });

      if (result.success && result.strategies) {
        setStrategies(result.strategies);
        
        // Extract unique tags
        const uniqueTags = new Set<string>();
        result.strategies.forEach((s) => {
          s.tags?.forEach((tag) => uniqueTags.add(tag));
        });
        setAllTags(Array.from(uniqueTags).sort());
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSort, searchQuery, selectedTags]);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="theme-text-secondary hover:theme-text transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold theme-text">Explore Strategies</h1>
          <p className="theme-text-secondary mt-1">Discover community strategies from verified traders</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 theme-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strategies by title, summary, or tags..."
            className="w-full pl-10 pr-4 py-3 theme-bg-secondary border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 border-b theme-border">
          {(['top', 'trending', 'new'] as SortOption[]).map((sort) => (
            <button
              key={sort}
              onClick={() => setActiveSort(sort)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeSort === sort
                  ? 'border-accent text-accent'
                  : 'border-transparent theme-text-secondary hover:theme-text'
              }`}
            >
              {sort === 'top' ? 'Top' : sort === 'trending' ? 'Trending' : 'New'}
            </button>
          ))}
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-accent text-white border-accent'
                    : 'theme-bg-secondary theme-text border theme-border hover:border-accent/50'
                }`}
              >
                {tag}
                {selectedTags.includes(tag) && ' ×'}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 text-sm theme-text-secondary hover:theme-text border theme-border rounded-full"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="theme-bg p-4 rounded-lg border theme-border">
              <SkeletonLoader width="100%" height="1rem" lines={3} />
            </div>
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-12 theme-text-secondary">
          <p className="text-lg mb-2">No strategies found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm theme-text-secondary">
            Showing {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'}
          </div>
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
      )}
    </div>
  );
}
