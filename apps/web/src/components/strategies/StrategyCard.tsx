'use client';

import { useState, useEffect, useCallback } from 'react';
import { voteOnStrategy, getUserVote, type PublicStrategyCard } from '@/lib/actions/strategies.server';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface StrategyCardProps {
  strategy: PublicStrategyCard;
  onVoteChange?: () => void;
}

export function StrategyCard({ strategy, onVoteChange }: StrategyCardProps) {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [upvotes, setUpvotes] = useState(strategy.upvotes);
  const [downvotes, setDownvotes] = useState(strategy.downvotes);
  const [voting, setVoting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(true);

  const loadUserVote = useCallback(async () => {
    try {
      const result = await getUserVote(strategy.id);
      if (result.success) {
        setUserVote(result.vote || null);
      }
    } catch (error) {
      console.error('Error loading user vote:', error);
    } finally {
      setLoadingVote(false);
    }
  }, [strategy.id]);

  useEffect(() => {
    loadUserVote();
  }, [loadUserVote]);

  const handleVote = async (value: 1 | -1) => {
    if (voting || loadingVote) return;
    setVoting(true);
    try {
      const result = await voteOnStrategy(strategy.id, value);
      if (result.success) {
        setUpvotes(result.upvotes || 0);
        setDownvotes(result.downvotes || 0);
        setUserVote(result.userVote || null);
        if (onVoteChange) {
          onVoteChange();
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="theme-bg p-4 rounded-lg border theme-border hover:border-opacity-60 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold theme-text truncate">{strategy.title}</h3>
            {strategy.author_is_verified && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-semibold rounded border border-accent/30 flex-shrink-0">
                Verified
              </span>
            )}
          </div>
          <p className="text-sm theme-text-secondary line-clamp-2 mb-2">{strategy.summary}</p>
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {strategy.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded border border-accent/20"
                >
                  {tag}
                </span>
              ))}
              {strategy.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs theme-text-secondary">
                  +{strategy.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs theme-text-secondary mb-2">
            <span>by {strategy.author_username}</span>
            <span>·</span>
            <span>{new Date(strategy.created_at).toLocaleDateString()}</span>
          </div>
          {/* Statistics */}
          {(strategy.trade_count > 0) && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t theme-border">
              <div className="text-center">
                <div className="text-xs theme-text-secondary mb-0.5">Trades</div>
                <div className="text-sm font-semibold theme-text">{strategy.trade_count}</div>
              </div>
              <div className="text-center">
                <div className="text-xs theme-text-secondary mb-0.5">Total R</div>
                <div className={`text-sm font-semibold ${strategy.total_pnl_r >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {strategy.total_pnl_r >= 0 ? '+' : ''}{strategy.total_pnl_r.toFixed(1)}R
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs theme-text-secondary mb-0.5">Win Rate</div>
                <div className={`text-sm font-semibold ${strategy.win_rate >= 50 ? 'text-positive' : 'text-warning'}`}>
                  {strategy.win_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleVote(1)}
            disabled={voting || loadingVote}
            className={`p-1 rounded transition-colors ${
              userVote === 1
                ? 'bg-positive/20 text-positive'
                : 'theme-text-secondary hover:bg-success/10 hover:text-success'
            } ${voting || loadingVote ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Upvote"
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium theme-text min-w-[2rem] text-center">
            {upvotes - downvotes}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={voting || loadingVote}
            className={`p-1 rounded transition-colors ${
              userVote === -1
                ? 'bg-negative/20 text-negative'
                : 'theme-text-secondary hover:bg-danger/10 hover:text-danger'
            } ${voting || loadingVote ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Downvote"
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
