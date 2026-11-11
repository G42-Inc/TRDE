'use client';

import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';

interface WelcomeStepProps {
  onNext: () => void;
}

/* ── Shared glass tokens (inline for isolation from dashboard) ──── */
const glass = {
  card: {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
  } as React.CSSProperties,
  iconBox: {
    background: 'rgba(200, 162, 74, 0.10)',
    border: '1px solid rgba(200, 162, 74, 0.18)',
    borderRadius: 12,
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
};

const VALUE_PROPS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Precision Tracking',
    description: 'Capture every detail — execution, timing, market context.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Pattern Recognition',
    description: 'Uncover what works. See your best setups and conditions.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Disciplined Growth',
    description: 'Risk rules, journaling, weekly reviews. Stay consistent.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { user } = useUser();
  const firstName = user?.firstName || 'Trader';

  return (
    <motion.div
      className="flex flex-col items-center text-center px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Logo mark — gold glass pill */}
      <motion.div className="mb-8" variants={itemVariants}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(200, 162, 74, 0.15), rgba(200, 162, 74, 0.06))',
            border: '1px solid rgba(200, 162, 74, 0.25)',
            boxShadow: '0 4px 20px rgba(200, 162, 74, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}
        >
          <span className="text-2xl font-semibold" style={{ color: '#B89851' }}>T</span>
        </div>
      </motion.div>

      {/* Greeting */}
      <motion.h1
        className="text-3xl sm:text-4xl font-semibold mb-3"
        style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
        variants={itemVariants}
      >
        Welcome, {firstName}.
      </motion.h1>
      
      <motion.p
        className="text-base sm:text-lg mb-10 max-w-sm"
        style={{ color: '#64748b', lineHeight: 1.6 }}
        variants={itemVariants}
      >
        Your trading journal, designed to sharpen your edge.
      </motion.p>

      {/* Value Props — glass cards */}
      <motion.div
        className="grid gap-3 w-full max-w-md mb-10"
        variants={containerVariants}
      >
        {VALUE_PROPS.map((prop) => (
          <motion.div
            key={prop.title}
            className="flex items-start gap-4 p-4 text-left"
            style={glass.card}
            variants={itemVariants}
          >
            <div
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
              style={{ ...glass.iconBox, color: '#B89851' }}
            >
              {prop.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#1e293b' }}>{prop.title}</h3>
              <p className="text-sm" style={{ color: '#64748b' }}>{prop.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA — liquid glass button */}
      <motion.button
        onClick={onNext}
        className="group relative inline-flex h-[52px] items-center justify-center gap-2 px-10 font-medium text-[15px] tracking-wide overflow-hidden transition-all duration-500 ease-out hover:-translate-y-0.5"
        style={glass.primaryBtn}
        variants={itemVariants}
        whileHover={{ boxShadow: '0 6px 28px rgba(200,162,74,0.25), inset 0 1.5px 0 rgba(255,255,255,0.55)' }}
        whileTap={{ scale: 0.98 }}
      >
        <span>Begin Setup</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 ease-out group-hover:translate-x-1" aria-hidden="true">
          <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </motion.div>
  );
}
