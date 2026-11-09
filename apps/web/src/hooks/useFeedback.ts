'use client';

import { useState, useCallback } from 'react';
import type { FeedbackType, FeedbackSubmission } from '@/lib/engagement/types';

interface SubmitFeedbackOptions {
  type: FeedbackType;
  content: string;
  rating?: number;
  context?: Record<string, unknown>;
}

interface UseFeedbackResult {
  /** Submit feedback */
  submitFeedback: (options: SubmitFeedbackOptions) => Promise<FeedbackSubmission | null>;
  /** Loading state */
  isSubmitting: boolean;
  /** Error message */
  error: string | null;
  /** Success state */
  isSuccess: boolean;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for submitting user feedback
 */
export function useFeedback(): UseFeedbackResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setIsSuccess(false);
  }, []);

  const submitFeedback = useCallback(async (
    options: SubmitFeedbackOptions
  ): Promise<FeedbackSubmission | null> => {
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      // Add browser context automatically
      const context = {
        ...options.context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          feedbackType: options.type,
          content: options.content,
          rating: options.rating,
          context,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      const data = await response.json();
      setIsSuccess(true);
      return data.submission;
    } catch (err: any) {
      console.error('[useFeedback] Error:', err);
      setError(err.message || 'Failed to submit feedback');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    submitFeedback,
    isSubmitting,
    error,
    isSuccess,
    reset,
  };
}
