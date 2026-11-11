'use client';

import { motion } from 'framer-motion';
import type { TradingExperience } from '@/lib/engagement/types';

interface ExperienceStepProps {
  selected: TradingExperience | null;
  onSelect: (experience: TradingExperience) => void;
  onNext: () => void;
  onBack: () => void;
}

/* ── Glass tokens ──────────────────────────────────────────────── */
const glass = {
  card: {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
  } as React.CSSProperties,
  cardSelected: {
    background: 'rgba(200, 162, 74, 0.08)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(200, 162, 74, 0.30)',
    boxShadow: '0 4px 24px rgba(200, 162, 74, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
  } as React.CSSProperties,
  primaryBtn: {
    background: 'linear-gradient(135deg, rgba(200,162,74,0.12), rgba(200,162,74,0.05), rgba(255,255,255,0.15))',
    color: '#1e293b',
    border: '1px solid rgba(200,162,74,0.18)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.03)',
    borderRadius: 9999,
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  } as React.CSSProperties,
  primaryBtnDisabled: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: 'none',
    borderRadius: 9999,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  secondaryBtn: {
    background: 'linear-gradient(135deg, rgba(200,162,74,0.08), rgba(255,255,255,0.12), rgba(200,162,74,0.04))',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(200,162,74,0.15)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.03)',
    borderRadius: 14,
    color: '#374151',
  } as React.CSSProperties,
  iconBox: {
    background: 'rgba(200, 162, 74, 0.10)',
    border: '1px solid rgba(200, 162, 74, 0.18)',
    borderRadius: 14,
  } as React.CSSProperties,
  iconBoxMuted: {
    background: 'rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: 14,
  } as React.CSSProperties,
};

const EXPERIENCE_OPTIONS: {
  value: TradingExperience;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'beginner',
    title: 'Beginner',
    description: 'Less than a year of active trading.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'One to three years of active trading.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description: 'Three or more years, or professional background.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

export function ExperienceStep({ selected, onSelect, onNext, onBack }: ExperienceStepProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.h1
        className="text-2xl sm:text-3xl font-semibold mb-2"
        style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
        variants={itemVariants}
      >
        Your experience level.
      </motion.h1>
      
      <motion.p
        className="mb-8 max-w-sm"
        style={{ color: '#64748b', fontSize: 15 }}
        variants={itemVariants}
      >
        We&apos;ll tailor your dashboard to match.
      </motion.p>

      {/* Options */}
      <motion.div className="grid gap-3 w-full max-w-md mb-8" variants={containerVariants}>
        {EXPERIENCE_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="relative flex items-center gap-4 p-5 text-left transition-all duration-300"
              style={isSelected ? glass.cardSelected : glass.card}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Radio indicator */}
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  border: isSelected ? '2px solid #C9A962' : '2px solid rgba(0,0,0,0.15)',
                  background: isSelected ? '#C9A962' : 'transparent',
                }}
              >
                {isSelected && (
                  <motion.svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    strokeWidth={3}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </div>

              {/* Icon */}
              <div
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center transition-colors duration-300"
                style={isSelected ? { ...glass.iconBox, color: '#B89851' } : { ...glass.iconBoxMuted, color: '#94a3b8' }}
              >
                {option.icon}
              </div>

              {/* Text */}
              <div className="pr-8">
                <h3 className="font-semibold mb-0.5" style={{ color: '#1e293b' }}>{option.title}</h3>
                <p className="text-sm" style={{ color: '#64748b' }}>{option.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <motion.div className="flex gap-3 w-full max-w-md" variants={itemVariants}>
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 font-medium text-sm transition-all duration-300 hover:opacity-80"
          style={glass.secondaryBtn}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 px-6 py-3 font-semibold text-sm transition-all duration-300"
          style={selected ? glass.primaryBtn : glass.primaryBtnDisabled}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
