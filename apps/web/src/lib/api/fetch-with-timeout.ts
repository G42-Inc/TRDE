/**
 * Fetch with Timeout Utility
 * 
 * Wrapper around fetch that adds timeout handling for external API calls.
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with timeout
 * 
 * @param url - URL to fetch
 * @param options - Fetch options, including optional timeout (default: 30s)
 * @returns Promise resolving to Response
 * @throws Error if timeout is exceeded or fetch fails
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    
    throw error;
  }
}
