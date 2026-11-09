import { NextRequest, NextResponse } from 'next/server';
import { getClerkUserId } from '@/lib/auth/clerk';
import { getSupabaseServiceClient } from '@/lib/db/supabase.server';
import type { FeedbackSubmission, FeedbackInput } from '@/lib/engagement/types';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { apiLogger } from '@/lib/utils/logger';

/**
 * GET /api/feedback
 * Get user's feedback history (for "your requests" feature)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getClerkUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = checkRateLimit(
      `feedback:${userId}`,
      RATE_LIMITS.feedback.maxRequests,
      RATE_LIMITS.feedback.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      apiLogger.error('Error fetching feedback', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Transform to camelCase
    const submissions: FeedbackSubmission[] = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      feedbackType: row.feedback_type,
      content: row.content,
      rating: row.rating,
      context: row.context,
      responded: row.responded,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ submissions });
  } catch (error: any) {
    apiLogger.error('Unexpected error in GET /api/feedback', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback
 * Submit new feedback
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP for anonymous feedback
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimit = checkRateLimit(
      `feedback:${ip}`,
      RATE_LIMITS.feedback.maxRequests,
      RATE_LIMITS.feedback.windowMs
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    // Allow unauthenticated feedback (anonymous feedback)
    const userId = await getClerkUserId().catch(() => null);

    let body: FeedbackInput;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.feedbackType) {
      return NextResponse.json(
        { error: 'Feedback type is required' },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback content is required' },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes = ['bug', 'feature', 'general', 'nps'];
    if (!validTypes.includes(body.feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate rating for NPS
    if (body.feedbackType === 'nps') {
      if (body.rating === undefined || body.rating < 1 || body.rating > 10) {
        return NextResponse.json(
          { error: 'NPS rating must be between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Sanitize content (basic - remove potential XSS)
    const sanitizedContent = body.content
      .trim()
      .slice(0, 5000) // Max 5000 chars
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert({
        user_id: userId,
        feedback_type: body.feedbackType,
        content: sanitizedContent,
        rating: body.rating,
        context: body.context || null,
        responded: false,
      })
      .select()
      .single();

    if (error) {
      apiLogger.error('Error saving feedback', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Transform response
    const submission: FeedbackSubmission = {
      id: data.id,
      userId: data.user_id,
      feedbackType: data.feedback_type,
      content: data.content,
      rating: data.rating,
      context: data.context,
      responded: data.responded,
      createdAt: data.created_at,
    };

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error: any) {
    apiLogger.error('Unexpected error in POST /api/feedback', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
