'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Root element for intersection (default: viewport) */
  root?: Element | null;
  /** Margin around root */
  rootMargin?: string;
  /** Visibility threshold (0-1) */
  threshold?: number | number[];
  /** Only trigger once */
  triggerOnce?: boolean;
  /** Whether observer is enabled */
  enabled?: boolean;
}

interface UseIntersectionObserverResult {
  /** Ref to attach to target element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether element is currently visible */
  isVisible: boolean;
  /** Whether element has ever been visible */
  hasBeenVisible: boolean;
  /** Intersection entry data */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for intersection observer functionality
 * 
 * Use for lazy loading, infinite scroll, or visibility tracking.
 */
export function useIntersectionObserver({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  triggerOnce = false,
  enabled = true,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    if (triggerOnce && hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsVisible(entry.isIntersecting);
        
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          
          if (triggerOnce) {
            observer.disconnect();
          }
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, hasBeenVisible, enabled]);

  return { ref, isVisible, hasBeenVisible, entry };
}

/**
 * Hook for infinite scroll / load more functionality
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '200px',
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  rootMargin?: string;
}) {
  const { ref, isVisible } = useIntersectionObserver({
    rootMargin,
    enabled: hasMore && !isLoading,
  });

  useEffect(() => {
    if (isVisible && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [isVisible, hasMore, isLoading, onLoadMore]);

  return { ref };
}
