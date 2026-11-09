'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TradingExperience, UserPreferencesInput } from '@/lib/engagement/types';

export type OnboardingStep = 'welcome' | 'experience' | 'assets' | 'goals' | 'plan';

const STEPS: OnboardingStep[] = ['welcome', 'experience', 'assets', 'goals', 'plan'];

export interface OnboardingPreferences {
  tradingExperience: TradingExperience | null;
  assetClasses: string[];
  primaryGoals: string[];
}

interface UseOnboardingFlowReturn {
  // Current state
  currentStep: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number;
  
  // Preferences being collected
  preferences: OnboardingPreferences;
  
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  
  // Preference setters
  setTradingExperience: (exp: TradingExperience) => void;
  setAssetClasses: (classes: string[]) => void;
  toggleAssetClass: (assetClass: string) => void;
  setPrimaryGoals: (goals: string[]) => void;
  togglePrimaryGoal: (goal: string) => void;
  
  // Submission
  isSubmitting: boolean;
  submitPreferences: (path?: 'demo' | 'subscribe') => Promise<void>;
  skipOnboarding: () => Promise<void>;
  
  // Path selection (demo vs subscribe)
  selectedPath: 'demo' | 'subscribe' | null;
  setSelectedPath: (path: 'demo' | 'subscribe') => void;
}

export function useOnboardingFlow(): UseOnboardingFlowReturn {
  const router = useRouter();
  
  // Step management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];
  
  // Preferences being collected
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    tradingExperience: null,
    assetClasses: [],
    primaryGoals: [],
  });
  
  // Path selection
  const [selectedPath, setSelectedPath] = useState<'demo' | 'subscribe' | null>(null);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Computed values
  const totalSteps = STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  
  // Navigation
  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, totalSteps]);
  
  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);
  
  const goToStep = useCallback((step: OnboardingStep) => {
    const index = STEPS.indexOf(step);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  }, []);
  
  // Preference setters
  const setTradingExperience = useCallback((exp: TradingExperience) => {
    setPreferences(prev => ({ ...prev, tradingExperience: exp }));
  }, []);
  
  const setAssetClasses = useCallback((classes: string[]) => {
    setPreferences(prev => ({ ...prev, assetClasses: classes }));
  }, []);
  
  const toggleAssetClass = useCallback((assetClass: string) => {
    setPreferences(prev => {
      const current = prev.assetClasses;
      const updated = current.includes(assetClass)
        ? current.filter(c => c !== assetClass)
        : [...current, assetClass];
      return { ...prev, assetClasses: updated };
    });
  }, []);
  
  const setPrimaryGoals = useCallback((goals: string[]) => {
    setPreferences(prev => ({ ...prev, primaryGoals: goals }));
  }, []);

  const togglePrimaryGoal = useCallback((goal: string) => {
    setPreferences(prev => {
      const current = prev.primaryGoals;
      const updated = current.includes(goal)
        ? current.filter(g => g !== goal)
        : [...current, goal];
      return { ...prev, primaryGoals: updated };
    });
  }, []);
  
  // Submit preferences to API
  const submitPreferences = useCallback(async (pathOverride?: 'demo' | 'subscribe') => {
    setIsSubmitting(true);
    
    // Use the override if provided (handles async state timing)
    const effectivePath = pathOverride || selectedPath;
    
    try {
      const payload: UserPreferencesInput = {
        tradingExperience: preferences.tradingExperience || undefined,
        assetClasses: preferences.assetClasses,
        primaryGoals: preferences.primaryGoals,
        onboardingCompleted: true,
      };
      
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Preferences save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          payload,
        });
        throw new Error(errorData.error || `Failed to save preferences (${response.status})`);
      }
      
      // Navigate based on selected path
      if (effectivePath === 'demo') {
        router.push('/app');
      } else {
        // Subscribe path - stay on page for checkout (handled by PlanStep)
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [preferences, selectedPath, router]);
  
  // Skip onboarding entirely
  const skipOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Mark onboarding as complete without saving preferences
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
        credentials: 'include',
      });
      
      // Go to app (demo mode)
      router.push('/app');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [router]);
  
  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    preferences,
    nextStep,
    previousStep,
    goToStep,
    setTradingExperience,
    setAssetClasses,
    toggleAssetClass,
    setPrimaryGoals,
    togglePrimaryGoal,
    isSubmitting,
    submitPreferences,
    skipOnboarding,
    selectedPath,
    setSelectedPath,
  };
}
