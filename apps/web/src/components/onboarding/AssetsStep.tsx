'use client';

import { motion } from 'framer-motion';

interface AssetsStepProps {
  selected: string[];
  onToggle: (asset: string) => void;
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

const ASSET_OPTIONS = [
  {
    value: 'futures',
    title: 'Futures',
    description: 'ES, NQ, CL, and other contracts',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    value: 'options',
    title: 'Options',
    description: 'Equity options, SPY, QQQ',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'stocks',
    title: 'Stocks',
    description: 'Equities and ETFs',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'crypto',
    title: 'Crypto',
    description: 'Bitcoin, Ethereum, and digital assets',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

export function AssetsStep({ selected, onToggle, onNext, onBack }: AssetsStepProps) {
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
        What markets do you trade?
      </motion.h1>
      
      <motion.p
        className="mb-8 max-w-sm"
        style={{ color: '#64748b', fontSize: 15 }}
        variants={itemVariants}
      >
        Select all that apply.
      </motion.p>

      {/* Options Grid */}
      <motion.div className="grid grid-cols-2 gap-3 w-full max-w-md mb-8" variants={containerVariants}>
        {ASSET_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className="relative flex flex-col items-center p-5 text-center transition-all duration-300"
              style={isSelected ? glass.cardSelected : glass.card}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Checkmark */}
              {isSelected && (
                <motion.div
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: '#C9A962' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              {/* Icon */}
              <div
                className="w-14 h-14 flex items-center justify-center mb-3 transition-colors duration-300"
                style={isSelected ? { ...glass.iconBox, color: '#B89851' } : { ...glass.iconBoxMuted, color: '#94a3b8' }}
              >
                {option.icon}
              </div>

              {/* Text */}
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#1e293b' }}>{option.title}</h3>
              <p className="text-xs leading-tight" style={{ color: '#94a3b8' }}>{option.description}</p>
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
