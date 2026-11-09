'use client';

import { motion } from 'framer-motion';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

const STEP_LABELS = ['Welcome', 'Experience', 'Markets', 'Goals', 'Plan'];

export function OnboardingProgress({ currentStep, totalSteps, progress }: OnboardingProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress track — glass pill */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.06)',
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #C9A962, #D4B896)',
            boxShadow: '0 0 8px rgba(200, 162, 74, 0.3)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-between mt-5">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="flex flex-col items-center">
            {/* Dot */}
            <motion.div
              className="rounded-full transition-colors duration-300"
              style={{
                width: 8,
                height: 8,
                background: index <= currentStep 
                  ? '#C9A962' 
                  : 'rgba(0, 0, 0, 0.12)',
                boxShadow: index <= currentStep 
                  ? '0 0 6px rgba(200, 162, 74, 0.35)' 
                  : 'none',
              }}
              initial={false}
              animate={{
                scale: index === currentStep ? 1.3 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
            
            {/* Label */}
            <span 
              className="hidden sm:block mt-2.5 text-xs font-medium tracking-wide transition-colors duration-300"
              style={{
                color: index <= currentStep ? '#1e293b' : '#94a3b8',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Step counter for mobile */}
      <div className="sm:hidden text-center mt-3">
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>
    </div>
  );
}
