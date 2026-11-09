'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// Clerk components must be dynamically rendered
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/auth-redirect';
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if Clerk publishable key is available
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Clerk publishable key not found');
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    // Check if dark mode is enabled
    const darkMode = document.documentElement.classList.contains('dark');
    setIsDark(darkMode);

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black p-4">
        <div className="max-w-md w-full p-6 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">
            Configuration Error
          </h2>
          <p className="text-red-700 dark:text-red-300">
            Clerk publishable key is missing. Please check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black p-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sign-in...</p>
          </div>
        }
      >
        <SignIn 
          appearance={{
            baseTheme: undefined, // Use Clerk's default theme base
            variables: {
              colorPrimary: isDark ? '#ffffff' : '#000000',
              colorText: isDark ? '#ffffff' : '#000000',
              colorTextSecondary: isDark ? '#b3b3b3' : '#4a4a4a',
              colorBackground: isDark ? '#000000' : '#ffffff',
              colorInputBackground: isDark ? '#1a1a1a' : '#ffffff',
              colorInputText: isDark ? '#ffffff' : '#000000',
              colorShimmer: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '0.5rem',
            },
            elements: {
              rootBox: 'mx-auto w-full max-w-md',
              card: 'bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-lg',
              headerTitle: 'text-black dark:text-white',
              headerSubtitle: 'text-gray-600 dark:text-gray-400',
              socialButtonsBlockButton: 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800',
              socialButtonsBlockButtonText: 'text-black dark:text-white',
              socialButtonsBlockButtonArrow: 'text-black dark:text-white',
              dividerLine: 'bg-gray-300 dark:bg-gray-700',
              dividerText: 'text-gray-600 dark:text-gray-400',
              formFieldLabel: 'text-black dark:text-white',
              formFieldInput: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500',
              formButtonPrimary: 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200',
              formButtonSecondary: 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
              formFieldInputShowPasswordButton: 'text-black dark:text-white',
              formFieldInputShowPasswordIcon: 'text-black dark:text-white',
              formResendCodeLink: 'text-black dark:text-white',
              footerActionLink: 'text-black dark:text-white',
              footerActionText: 'text-gray-600 dark:text-gray-400',
              identityPreviewText: 'text-black dark:text-white',
              identityPreviewEditButton: 'text-black dark:text-white',
              alertText: 'text-black dark:text-white',
              formHeaderTitle: 'text-black dark:text-white',
              formHeaderSubtitle: 'text-gray-600 dark:text-gray-400',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={redirectUrl}
        />
      </Suspense>
    </div>
  );
}
