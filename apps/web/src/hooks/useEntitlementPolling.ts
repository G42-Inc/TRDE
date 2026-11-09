'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type EntitlementStep = 'verifying' | 'processing' | 'activating' | 'ready' | 'error';

interface UseEntitlementPollingOptions {
  /** Stripe checkout session ID */
  sessionId: string | null;
  /** Whether to start polling immediately */
  enabled?: boolean;
  /** Initial delay before first poll (ms) */
  initialDelay?: number;
  /** Maximum time to wait (ms) */
  maxWaitTime?: number;
  /** Callback when entitlement is ready */
  onReady?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseEntitlementPollingResult {
  /** Whether entitlement is ready */
  isReady: boolean;
  /** Current step in the process */
  currentStep: EntitlementStep;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  statusMessage: string;
  /** Error message if any */
  error: string | null;
  /** Time elapsed in seconds */
  elapsedTime: number;
  /** Retry the verification */
  retry: () => void;
}

// Progress stages with timing
const PROGRESS_STAGES = [
  { step: 'verifying' as const, message: 'Verifying payment...', duration: 2000, progress: 15 },
  { step: 'processing' as const, message: 'Processing subscription...', duration: 3000, progress: 45 },
  { step: 'activating' as const, message: 'Activating your account...', duration: 5000, progress: 75 },
  { step: 'ready' as const, message: 'All set!', duration: 0, progress: 100 },
];

/**
 * Hook for polling entitlement status with progress feedback
 * 
 * Provides optimistic UI updates while waiting for webhook to process.
 * Uses exponential backoff for polling to reduce server load.
 */
export function useEntitlementPolling({
  sessionId,
  enabled = true,
  initialDelay = 1000,
  maxWaitTime = 60000,
  onReady,
  onError,
}: UseEntitlementPollingOptions): UseEntitlementPollingResult {
  const [isReady, setIsReady] = useState(false);
  const [currentStep, setCurrentStep] = useState<EntitlementStep>('verifying');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Verifying payment...');
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<number>(0);
  const pollCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Calculate poll delay with exponential backoff
  const getPollDelay = useCallback((count: number): number => {
    // Start at 1s, increase: 1, 2, 3, 4, 5, 5, 5... (cap at 5s)
    return Math.min(1000 + count * 1000, 5000);
  }, []);

  // Verify session and poll for entitlement
  const pollEntitlement = useCallback(async () => {
    if (!sessionId || isPollingRef.current) return;
    isPollingRef.current = true;

    const elapsed = Date.now() - startTimeRef.current;
    
    // Check if we've exceeded max wait time
    if (elapsed > maxWaitTime) {
      setError('Subscription activated but access is still being granted. Please refresh the page.');
      setCurrentStep('error');
      isPollingRef.current = false;
      onError?.('Timeout waiting for entitlement');
      return;
    }

    try {
      // First verify the session if this is the first poll
      if (pollCountRef.current === 0) {
        const verifyResponse = await fetch(`/api/billing/verify-session?session_id=${sessionId}`, {
          credentials: 'include',
        });
        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          const errorMsg = verifyData.error || 'Failed to verify session';
          setError(errorMsg);
          setCurrentStep('error');
          isPollingRef.current = false;
          onError?.(errorMsg);
          return;
        }

        setCurrentStep('processing');
        setStatusMessage('Processing subscription...');
      }

      // Check entitlement
      const response = await fetch('/api/auth/check-access?plan=basic', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.hasAccess && data.entitlement && data.entitlement.status !== 'demo') {
        // Success!
        setIsReady(true);
        setCurrentStep('ready');
        setProgress(100);
        setStatusMessage('All set!');
        isPollingRef.current = false;
        onReady?.();
        return;
      }

      // Not ready yet, schedule next poll
      pollCountRef.current++;
      isPollingRef.current = false;
      
      const delay = getPollDelay(pollCountRef.current);
      timeoutRef.current = setTimeout(pollEntitlement, delay);

      // Update step based on time elapsed
      if (elapsed > 8000) {
        setCurrentStep('activating');
        setStatusMessage('Activating your account...');
      } else if (elapsed > 3000) {
        setCurrentStep('processing');
        setStatusMessage('Processing subscription...');
      }
    } catch (err) {
      console.error('Error polling entitlement:', err);
      pollCountRef.current++;
      isPollingRef.current = false;
      
      // Retry unless we've exceeded max attempts
      if (pollCountRef.current < 15) {
        const delay = getPollDelay(pollCountRef.current);
        timeoutRef.current = setTimeout(pollEntitlement, delay);
      } else {
        setError('Unable to verify subscription. Please refresh the page.');
        setCurrentStep('error');
        onError?.('Max retries exceeded');
      }
    }
  }, [sessionId, maxWaitTime, getPollDelay, onReady, onError]);

  // Retry function
  const retry = useCallback(() => {
    setError(null);
    setCurrentStep('verifying');
    setProgress(0);
    pollCountRef.current = 0;
    startTimeRef.current = Date.now();
    pollEntitlement();
  }, [pollEntitlement]);

  // Start polling when enabled
  useEffect(() => {
    if (!enabled || !sessionId) return;

    startTimeRef.current = Date.now();

    // Start with initial delay for optimistic UI
    timeoutRef.current = setTimeout(pollEntitlement, initialDelay);

    // Progress animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedTime(Math.floor(elapsed / 1000));

      // Animate progress based on elapsed time (optimistic)
      if (!isReady) {
        // Smooth progress that slows down as it approaches 90%
        const targetProgress = Math.min(90, (elapsed / maxWaitTime) * 100 + 10);
        setProgress((prev) => {
          const diff = targetProgress - prev;
          return prev + diff * 0.1;
        });
      }
    }, 100);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      isPollingRef.current = false;
    };
  }, [enabled, sessionId, initialDelay, maxWaitTime, pollEntitlement, isReady]);

  return {
    isReady,
    currentStep,
    progress: Math.round(progress),
    statusMessage,
    error,
    elapsedTime,
    retry,
  };
}
