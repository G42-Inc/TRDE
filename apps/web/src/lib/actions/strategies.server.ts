'use server';

import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { headers, cookies } from 'next/headers';

// Public-safe strategy card type (matches view)
export interface PublicStrategyCard {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  created_at: string;
  upvotes: number;
  downvotes: number;
  wilson_score: number;
  trending_score: number;
  adjusted_wilson_score: number;
  adjusted_trending_score: number;
  author_username: string;
  author_is_verified: boolean;
  // Statistics from author's trades
  trade_count: number;
  total_pnl_usd: number;
  total_pnl_r: number;
  win_rate: number;
  expectancy: number;
  profit_factor: number;
}

// Full strategy type (for user's own strategies)
export interface Strategy {
  id: string;
  author_id: string;
  title: string;
  summary: string;
  content_md: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  wilson_score: number;
  trending_score: number;
  // Statistics from author's trades
  trade_count?: number;
  total_pnl_usd?: number;
  total_pnl_r?: number;
  win_rate?: number;
  expectancy?: number;
  profit_factor?: number;
  stats_updated_at?: string;
}

// Popular creator type
export interface PopularCreator {
  user_id: string;
  username: string;
  is_verified: boolean;
  strategy_count: number;
  total_upvotes: number;
}

async function getCurrentUserId(): Promise<string> {
  try {
    // Method 1: Try headers first (set by middleware) - most reliable for server actions
    const headersList = await headers();
    const headerUserId = headersList.get('x-clerk-user-id');
    if (headerUserId) {
      return headerUserId;
    }
  } catch (error) {
    // Headers() might not be available in all contexts
    console.warn('headers() failed in server action:', error);
  }
  
  try {
    // Method 2: Try auth() (preferred method for server actions)
    const { userId } = await auth();
    if (userId) {
      return userId;
    }
  } catch (error) {
    // If auth() fails, try alternative methods
    console.warn('auth() failed in server action, trying alternatives:', error);
  }
  
  try {
    // Method 3: Try currentUser() as fallback
    const user = await currentUser();
    if (user?.id) {
      return user.id;
    }
  } catch (error) {
    console.warn('currentUser() failed:', error);
  }
  
  try {
    // Method 4: Extract from Clerk session cookie (last resort)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('__session');
    
    if (sessionToken?.value) {
      try {
        // Clerk's session token is a JWT - decode it to get userId
        const parts = sessionToken.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.sub || payload.user_id;
          if (userId) {
            return userId;
          }
        }
      } catch (parseError) {
        // JWT parsing failed
        console.warn('Failed to parse session token:', parseError);
      }
    }
  } catch (error) {
    console.warn('Cookie extraction failed:', error);
  }
  
  // If all methods fail, throw error
  throw new Error('Unauthorized: Could not get user ID from Clerk');
}

async function ensurePublicProfile(userId: string, username?: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const defaultUsername = username || `user_${userId.substring(0, 8)}`;
  await supabase.from('public_profiles').upsert({
    user_id: userId,
    username: defaultUsername,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function createStrategy(data: {
  title: string;
  summary: string;
  content_md: string;
  tags?: string[];
  is_public: boolean;
  username?: string;
}): Promise<{ success: boolean; strategyId?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const supabase = getSupabaseServiceClient();
    await ensurePublicProfile(userId, data.username);
    const { data: strategy, error } = await supabase.from('strategies').insert({
      author_id: userId,
      title: data.title.trim(),
      summary: data.summary.trim(),
      content_md: data.content_md.trim(),
      tags: data.tags || [],
      is_public: data.is_public,
    }).select('id').single();
    if (error) {
      console.error('Error creating strategy:', error);
      return { success: false, error: error.message };
    }
    return { success: true, strategyId: strategy.id };
  } catch (error: any) {
    console.error('Error in createStrategy:', error);
    return { success: false, error: error.message || 'Failed to create strategy' };
  }
}

export async function getMyStrategies(): Promise<{ success: boolean; strategies?: Strategy[]; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const supabase = getSupabaseServiceClient();
    const { data: strategies, error } = await supabase.from('strategies').select('*').eq('author_id', userId).order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching my strategies:', error);
      return { success: false, error: error.message };
    }
    return { success: true, strategies: strategies || [] };
  } catch (error: any) {
    console.error('Error in getMyStrategies:', error);
    return { success: false, error: error.message || 'Failed to fetch strategies' };
  }
}

export async function getTopStrategies(limit: number = 20): Promise<{ success: boolean; strategies?: PublicStrategyCard[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: strategies, error } = await supabase.from('public_strategy_cards').select('*').order('adjusted_wilson_score', { ascending: false }).limit(limit);
    if (error) return { success: false, error: error.message };
    return { success: true, strategies: strategies || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch top strategies' };
  }
}

export async function getTrendingStrategies(limit: number = 20): Promise<{ success: boolean; strategies?: PublicStrategyCard[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: strategies, error } = await supabase.from('public_strategy_cards').select('*').order('adjusted_trending_score', { ascending: false }).limit(limit);
    if (error) return { success: false, error: error.message };
    return { success: true, strategies: strategies || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch trending strategies' };
  }
}

export async function getNewStrategies(limit: number = 20): Promise<{ success: boolean; strategies?: PublicStrategyCard[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: strategies, error } = await supabase.from('public_strategy_cards').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return { success: false, error: error.message };
    return { success: true, strategies: strategies || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch new strategies' };
  }
}

export async function getMostPopularCreators(limit: number = 10): Promise<{ success: boolean; creators?: PopularCreator[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: creators, error } = await supabase.rpc('get_most_popular_creators', { limit_count: limit });
    if (error) return { success: false, error: error.message };
    return { success: true, creators: creators || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch popular creators' };
  }
}

export async function searchPublicStrategies(params: {
  query?: string;
  tags?: string[];
  sort?: 'top' | 'trending' | 'new';
  limit?: number;
}): Promise<{ success: boolean; strategies?: PublicStrategyCard[]; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    let query = supabase.from('public_strategy_cards').select('*');
    if (params.query) {
      const searchTerm = params.query.toLowerCase();
      query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
    }
    if (params.tags && params.tags.length > 0) {
      query = query.contains('tags', params.tags);
    }
    const sortField = params.sort === 'trending' ? 'adjusted_trending_score' : params.sort === 'new' ? 'created_at' : 'adjusted_wilson_score';
    query = query.order(sortField, { ascending: false });
    const limit = params.limit || 50;
    query = query.limit(limit);
    const { data: strategies, error } = await query;
    if (error) return { success: false, error: error.message };
    let filtered = strategies || [];
    if (params.query) {
      const searchTerm = params.query.toLowerCase();
      filtered = filtered.filter(s => s.title.toLowerCase().includes(searchTerm) || s.summary.toLowerCase().includes(searchTerm) || s.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)));
    }
    return { success: true, strategies: filtered };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to search strategies' };
  }
}

export async function voteOnStrategy(strategyId: string, value: 1 | -1): Promise<{ success: boolean; upvotes?: number; downvotes?: number; wilson_score?: number; userVote?: 1 | -1 | null; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const supabase = getSupabaseServiceClient();
    const { data: existingVote } = await supabase.from('strategy_votes').select('value').eq('strategy_id', strategyId).eq('user_id', userId).single();
    let userVote: 1 | -1 | null = null;
    if (existingVote && existingVote.value === value) {
      const { error } = await supabase.from('strategy_votes').delete().eq('strategy_id', strategyId).eq('user_id', userId);
      if (error) return { success: false, error: error.message };
      userVote = null;
    } else {
      const { error } = await supabase.from('strategy_votes').upsert({ strategy_id: strategyId, user_id: userId, value, updated_at: new Date().toISOString() }, { onConflict: 'strategy_id,user_id' });
      if (error) return { success: false, error: error.message };
      userVote = value;
    }
    const { data: strategy } = await supabase.from('strategies').select('upvotes, downvotes, wilson_score').eq('id', strategyId).single();
    if (!strategy) return { success: false, error: 'Strategy not found' };
    return { success: true, upvotes: strategy.upvotes, downvotes: strategy.downvotes, wilson_score: strategy.wilson_score, userVote };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to vote' };
  }
}

export async function getUserVote(strategyId: string): Promise<{ success: boolean; vote?: 1 | -1 | null; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    const supabase = getSupabaseServiceClient();
    const { data: vote } = await supabase.from('strategy_votes').select('value').eq('strategy_id', strategyId).eq('user_id', userId).single();
    return { success: true, vote: vote?.value || null };
  } catch (error: any) {
    return { success: true, vote: null };
  }
}

/**
 * Update statistics for a strategy based on author's trades
 * This should be called when trades are saved/updated/deleted or periodically
 */
export async function updateStrategyStatistics(strategyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Get the strategy to find author
    const { data: strategy } = await supabase
      .from('strategies')
      .select('author_id')
      .eq('id', strategyId)
      .single();
    
    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }
    
    // Get all trades for this strategy by this author
    const { data: trades } = await supabase
      .from('trades')
      .select('result_usd, result_r, outcome')
      .eq('strategy_id', strategyId)
      .eq('user_id', strategy.author_id);
    
    if (!trades || trades.length === 0) {
      // No trades - set stats to 0
      await supabase
        .from('strategies')
        .update({
          trade_count: 0,
          total_pnl_usd: 0,
          total_pnl_r: 0,
          win_rate: 0,
          expectancy: 0,
          profit_factor: 0,
          stats_updated_at: new Date().toISOString(),
        })
        .eq('id', strategyId);
      return { success: true };
    }
    
    // Calculate statistics
    const tradeCount = trades.length;
    const totalPnLUsd = trades.reduce((sum, t) => sum + (parseFloat(t.result_usd) || 0), 0);
    const totalPnLR = trades.reduce((sum, t) => sum + (parseFloat(t.result_r) || 0), 0);
    const wins = trades.filter(t => t.outcome === 'WIN').length;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;
    const expectancy = tradeCount > 0 ? totalPnLR / tradeCount : 0;
    
    const grossProfit = trades
      .filter(t => parseFloat(t.result_usd) > 0)
      .reduce((sum, t) => sum + parseFloat(t.result_usd), 0);
    const grossLoss = Math.abs(trades
      .filter(t => parseFloat(t.result_usd) < 0)
      .reduce((sum, t) => sum + parseFloat(t.result_usd), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999999 : 0);
    
    // Update strategy with calculated stats
    const { error } = await supabase
      .from('strategies')
      .update({
        trade_count: tradeCount,
        total_pnl_usd: totalPnLUsd,
        total_pnl_r: totalPnLR,
        win_rate: winRate,
        expectancy: expectancy,
        profit_factor: profitFactor,
        stats_updated_at: new Date().toISOString(),
      })
      .eq('id', strategyId);
    
    if (error) {
      console.error('Error updating strategy statistics:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateStrategyStatistics:', error);
    return { success: false, error: error.message || 'Failed to update statistics' };
  }
}
