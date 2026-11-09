'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error
    console.error('Auth redirect error:', error);
    
    // Redirect to sign-in after a short delay
    const timer = setTimeout(() => {
      router.push('/sign-in');
    }, 2000);

    return () => clearTimeout(timer);
  }, [error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
        <p className="text-gray-600 mb-4">Redirecting to sign in...</p>
        <button
          onClick={() => router.push('/sign-in')}
          className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}
