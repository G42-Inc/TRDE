'use client';

import { motion } from 'framer-motion';

interface GoalsStepProps {
  selected: string[];
  onToggle: (goal: string) => void;
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
    borderRadius: 10,
  } as React.CSSProperties,
  iconBoxMuted: {
    background: 'rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: 10,
  } as React.CSSProperties,
};

const GOAL_OPTIONS = [
  {
    value: 'track_performance',
    title: 'Track Performance',
    description: 'Detailed P&L, win rates, and metrics over time.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    value: 'improve_discipline',
    title: 'Improve Discipline',
    description: 'Consistent habits. Trading rules you actually follow.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    value: 'analyze_patterns',
    title: 'Analyze Patterns',
    description: 'Your best setups, times, and conditions — revealed.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    value: 'build_strategies',
    title: 'Build Strategies',
    description: 'Document and refine your trading edge.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    value: 'manage_risk',
    title: 'Manage Risk',
    description: 'Position limits, daily loss caps. Stay in control.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

export function GoalsStep({ selected, onToggle, onNext, onBack }: GoalsStepProps) {
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
        What matters most to you?
      </motion.h1>
      
      <motion.p
        className="mb-8 max-w-sm"
        style={{ color: '#64748b', fontSize: 15 }}
        variants={itemVariants}
      >
        Select your priorities. We&apos;ll surface what&apos;s relevant.
      </motion.p>

      {/* Options */}
      <motion.div className="grid gap-2.5 w-full max-w-md mb-6" variants={containerVariants}>
        {GOAL_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className="relative flex items-center gap-4 p-4 text-left transition-all duration-300"
              style={isSelected ? glass.cardSelected : glass.card}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Checkbox indicator */}
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300"
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
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center transition-colors duration-300"
                style={isSelected ? { ...glass.iconBox, color: '#B89851' } : { ...glass.iconBoxMuted, color: '#94a3b8' }}
              >
                {option.icon}
              </div>

              {/* Text */}
              <div className="pr-8">
                <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#1e293b' }}>{option.title}</h3>
                <p className="text-xs" style={{ color: '#64748b' }}>{option.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selection count */}
      {selected.length > 0 && (
        <motion.p
          className="text-sm font-medium mb-4"
          style={{ color: '#B89851' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {selected.length} goal{selected.length !== 1 ? 's' : ''} selected
        </motion.p>
      )}

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
          disabled={selected.length === 0}
          className="flex-1 px-6 py-3 font-semibold text-sm transition-all duration-300"
          style={selected.length > 0 ? glass.primaryBtn : glass.primaryBtnDisabled}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
