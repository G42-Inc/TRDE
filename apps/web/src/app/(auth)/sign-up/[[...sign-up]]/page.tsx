'use client';

import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Clerk components must be dynamically rendered
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/auth-redirect';
  const [isDark, setIsDark] = useState(false);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black p-4">
      <SignUp 
        appearance={{
          baseTheme: undefined,
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
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
