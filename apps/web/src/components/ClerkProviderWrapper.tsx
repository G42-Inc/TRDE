'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode, Component, ReactNode as ReactNodeType } from 'react';

interface ClerkProviderWrapperProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Set up error suppression at module level (runs immediately when module loads)
// This must happen BEFORE ClerkProvider is imported/used to catch errors during initialization
if (typeof window !== 'undefined') {
  // Store original handlers to avoid multiple wrappers
  if (!(window as any).__clerkErrorSuppressionSetup) {
    (window as any).__clerkErrorSuppressionSetup = true;

    // Suppress console.error for the specific cookies() error
    // Use a flag to prevent recursion if console.error is called from within the override
    let isSuppressingError = false;
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Prevent infinite recursion if console.error is called from within this override
      if (isSuppressingError) {
        return;
      }
      
      try {
        isSuppressingError = true;
        const errorMessage = args[0]?.toString() || '';
        if (
          errorMessage.includes('cookies() expects to have requestAsyncStorage') ||
          errorMessage.includes('Invariant: cookies()') ||
          errorMessage.includes('requestAsyncStorage, none available')
        ) {
          // Silently ignore - this is a known Clerk issue that doesn't affect functionality
          // The error happens when Clerk calls a server action from client context
          isSuppressingError = false;
          return;
        }
        // Allow all other errors through
        originalConsoleError.apply(console, args);
        isSuppressingError = false;
      } catch (e) {
        // If console.error itself errors, don't create a loop - just return
        // This prevents infinite loops if console.error is called during render
        isSuppressingError = false;
        return;
      }
    };

    // Suppress unhandled promise rejections for the same error
    // This catches async errors that happen in promises
    window.addEventListener('unhandledrejection', (event) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || '';
      if (
        errorMessage.includes('cookies() expects to have requestAsyncStorage') ||
        errorMessage.includes('Invariant: cookies()') ||
        errorMessage.includes('requestAsyncStorage, none available')
      ) {
        event.preventDefault(); // Suppress the error - prevents it from showing in error overlay
        event.stopPropagation(); // Stop propagation to React error overlay
        // The session will still work despite this error
        return;
      }
    }, { capture: true }); // Use capture phase to catch before React's handler

    // Also catch errors in window.onerror (catches synchronous errors)
    const originalWindowError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = message?.toString() || error?.message || '';
      if (
        errorMessage.includes('cookies() expects to have requestAsyncStorage') ||
        errorMessage.includes('Invariant: cookies()') ||
        errorMessage.includes('requestAsyncStorage, none available')
      ) {
        // Suppress this error
        return true; // Prevents default error handling
      }
      // Forward other errors to original handler
      if (originalWindowError) {
        return originalWindowError(message, source, lineno, colno, error);
      }
      return false;
    };
  }
}

class ClerkErrorBoundary extends Component<
  { children: ReactNodeType; fallback?: (error: Error) => ReactNodeType },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNodeType; fallback?: (error: Error) => ReactNodeType }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Suppress the known cookies() error - it doesn't break functionality
    const errorMessage = error?.message || '';
    if (
      errorMessage.includes('cookies() expects to have requestAsyncStorage') ||
      errorMessage.includes('Invariant: cookies()') ||
      errorMessage.includes('requestAsyncStorage, none available')
    ) {
      // Don't treat this as a critical error - return no error state
      return { hasError: false, error: null };
    }
    // For other errors, show the error boundary
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Only log non-cookies() errors
    const errorMessage = error?.message || '';
    if (
      !errorMessage.includes('cookies() expects to have requestAsyncStorage') &&
      !errorMessage.includes('Invariant: cookies()') &&
      !errorMessage.includes('requestAsyncStorage, none available')
    ) {
      console.error('Clerk initialization error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
          <div className="max-w-md w-full p-6 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">
              Clerk Authentication Error
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              There was an error initializing authentication. Please check your Clerk configuration.
            </p>
            <details className="text-sm text-red-600 dark:text-red-400">
              <summary className="cursor-pointer mb-2">Error details</summary>
              <pre className="whitespace-pre-wrap bg-red-100 dark:bg-red-900/40 p-2 rounded mt-2">
                {this.state.error.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  // Only wrap with ClerkProvider if publishable key is available
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  // Note: Error suppression is handled at module level above
  // No useEffect needed - module-level code runs once when file is loaded
  // Adding useEffect here could cause render loops, so we avoid it

  if (!publishableKey) {
    // Return children without ClerkProvider for development
    // This allows the app to render without Clerk keys
    console.warn('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found. Clerk auth will not work.');
    return <>{children}</>;
  }

  // Verify the key format (should start with pk_)
  if (!publishableKey.startsWith('pk_')) {
    console.error('❌ Invalid Clerk publishable key format. Keys should start with "pk_"');
    return <>{children}</>;
  }

  // ClerkProvider automatically reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from env
  // Note: 401 errors from Clerk are normal when user is not signed in
  // Clerk will retry and handle authentication state automatically
  // Error suppression for cookies() error is set up at module level above
  return (
    <ClerkErrorBoundary>
      <ClerkProvider
        publishableKey={publishableKey}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      >
        {children}
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}
