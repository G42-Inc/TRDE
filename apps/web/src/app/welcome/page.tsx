'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { ExperienceStep } from '@/components/onboarding/ExperienceStep';
import { AssetsStep } from '@/components/onboarding/AssetsStep';
import { GoalsStep } from '@/components/onboarding/GoalsStep';
import { PlanStep } from '@/components/onboarding/PlanStep';

/**
 * Welcome/Onboarding Page
 * 
 * Luxury 5-step onboarding flow for new users.
 * Collects preferences and directs to demo or subscription.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    progress,
    preferences,
    nextStep,
    previousStep,
    setTradingExperience,
    toggleAssetClass,
    togglePrimaryGoal,
    isSubmitting,
    submitPreferences,
    skipOnboarding,
    selectedPath,
    setSelectedPath,
  } = useOnboardingFlow();

  // Redirect if not authenticated (with retry logic for session establishment)
  useEffect(() => {
    if (!authLoaded || !userLoaded) return;
    
    if (!isSignedIn && !user) {
      if (retryCount < 3) {
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }
      router.push('/sign-in?redirect_url=/welcome');
    }
  }, [authLoaded, userLoaded, isSignedIn, user, router, retryCount]);

  // Show loading while checking auth
  if (!authLoaded || !userLoaded || (!isSignedIn && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Step transition variants
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  // Render current step content
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      case 'experience':
        return (
          <ExperienceStep
            selected={preferences.tradingExperience}
            onSelect={setTradingExperience}
            onNext={nextStep}
            onBack={previousStep}
          />
        );
      case 'assets':
        return (
          <AssetsStep
            selected={preferences.assetClasses}
            onToggle={toggleAssetClass}
            onNext={nextStep}
            onBack={previousStep}
          />
        );
      case 'goals':
        return (
          <GoalsStep
            selected={preferences.primaryGoals}
            onToggle={togglePrimaryGoal}
            onNext={nextStep}
            onBack={previousStep}
          />
        );
      case 'plan':
        return (
          <PlanStep
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            onComplete={submitPreferences}
            onBack={previousStep}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with progress */}
      <header className="pt-8 pb-6 px-4">
        <OnboardingProgress
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          progress={progress}
        />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={currentStep}
              custom={1}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with skip option */}
      {currentStep !== 'plan' && (
        <footer className="pb-8 text-center">
          <button
            onClick={skipOnboarding}
            disabled={isSubmitting}
            className="text-sm transition-colors disabled:opacity-50"
            style={{ color: '#94a3b8' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#64748b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            Skip for now
          </button>
        </footer>
      )}
    </div>
  );
}
