'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedback } from '@/hooks/useFeedback';
import {
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface NPSSurveyProps {
  /** Whether the survey is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Callback when survey is completed */
  onComplete?: () => void;
  /** Optional trigger context (e.g., after completing a task) */
  context?: string;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Very unlikely',
  2: 'Unlikely',
  3: 'Unlikely',
  4: 'Neutral',
  5: 'Neutral',
  6: 'Neutral',
  7: 'Likely',
  8: 'Likely',
  9: 'Very likely',
  10: 'Extremely likely',
};

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-red-500',
  3: 'bg-red-400',
  4: 'bg-orange-400',
  5: 'bg-orange-400',
  6: 'bg-yellow-400',
  7: 'bg-lime-400',
  8: 'bg-green-400',
  9: 'bg-green-500',
  10: 'bg-emerald-500',
};

const FOLLOWUP_PROMPTS: Record<'detractor' | 'passive' | 'promoter', string> = {
  detractor: "We're sorry to hear that. What could we do better?",
  passive: "Thanks for your feedback. What would make TRDE a 10 for you?",
  promoter: "Thank you! What do you love most about TRDE?",
};

/**
 * NPS Survey Component
 * 
 * Full-screen modal for Net Promoter Score survey.
 */
export function NPSSurvey({ isOpen, onClose, onComplete, context }: NPSSurveyProps) {
  const [step, setStep] = useState<'score' | 'followup' | 'thanks'>('score');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const { submitFeedback, isSubmitting, isSuccess, reset } = useFeedback();

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep('score');
      setScore(null);
      setFeedback('');
      reset();
    }
  }, [isOpen, reset]);

  const getCategory = (s: number): 'detractor' | 'passive' | 'promoter' => {
    if (s <= 6) return 'detractor';
    if (s <= 8) return 'passive';
    return 'promoter';
  };

  const handleScoreSelect = (s: number) => {
    setScore(s);
    setStep('followup');
  };

  const handleSubmit = async () => {
    if (score === null) return;

    const result = await submitFeedback({
      type: 'nps',
      content: feedback || `NPS Score: ${score}`,
      rating: score,
      context: { trigger: context },
    });

    if (result) {
      setStep('thanks');
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 2000);
    }
  };

  const handleSkip = async () => {
    if (score === null) return;

    // Submit just the score
    await submitFeedback({
      type: 'nps',
      content: `NPS Score: ${score} (no additional feedback)`,
      rating: score,
      context: { trigger: context },
    });

    setStep('thanks');
    setTimeout(() => {
      onComplete?.();
      onClose();
    }, 2000);
  };

  const displayScore = hoveredScore ?? score;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto z-50"
          >
            <div 
              className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%)',
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors z-10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  {step === 'score' && (
                    <motion.div
                      key="score"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="text-center"
                    >
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        How likely are you to recommend TRDE?
                      </h2>
                      <p className="text-white/50 text-sm mb-8">
                        To a friend or colleague who trades
                      </p>

                      {/* Score display */}
                      {displayScore && (
                        <div className="mb-6">
                          <span className="text-4xl font-bold text-white">{displayScore}</span>
                          <p className="text-sm text-white/40 mt-1">{SCORE_LABELS[displayScore]}</p>
                        </div>
                      )}

                      {/* Score buttons */}
                      <div className="flex justify-center gap-1 sm:gap-2 mb-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleScoreSelect(s)}
                            onMouseEnter={() => setHoveredScore(s)}
                            onMouseLeave={() => setHoveredScore(null)}
                            className={`w-8 h-10 sm:w-10 sm:h-12 rounded-lg font-semibold text-sm sm:text-base transition-all
                              ${score === s 
                                ? `${SCORE_COLORS[s]} text-black scale-110` 
                                : 'bg-white/10 text-white hover:bg-white/20'
                              }
                            `}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Scale labels */}
                      <div className="flex justify-between text-xs text-white/30 px-1">
                        <span>Not likely</span>
                        <span>Very likely</span>
                      </div>
                    </motion.div>
                  )}

                  {step === 'followup' && score !== null && (
                    <motion.div
                      key="followup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-xl ${SCORE_COLORS[score]} flex items-center justify-center`}>
                          <span className="text-xl font-bold text-black">{score}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">You rated us {score}/10</p>
                          <p className="text-sm text-white/40">{SCORE_LABELS[score]}</p>
                        </div>
                      </div>

                      <p className="text-white mb-4">{FOLLOWUP_PROMPTS[getCategory(score)]}</p>

                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Your feedback helps us improve..."
                        rows={4}
                        className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 mb-4"
                        autoFocus
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={handleSkip}
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          Skip
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-3 rounded-xl bg-accent text-black font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 'thanks' && (
                    <motion.div
                      key="thanks"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                        className="inline-flex p-4 rounded-full bg-green-500/20 mb-4"
                      >
                        <CheckCircleIcon className="w-10 h-10 text-green-400" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                      <p className="text-white/50">Your feedback helps us build a better product.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage NPS survey display timing
 */
export function useNPSSurvey() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Check if we should show NPS (e.g., every 30 days, after certain actions)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lastNPS = localStorage.getItem('trde_last_nps');
    const daysSinceLastNPS = lastNPS 
      ? Math.floor((Date.now() - parseInt(lastNPS)) / (1000 * 60 * 60 * 24))
      : Infinity;

    // Show NPS if it's been more than 30 days
    // You could also trigger based on usage milestones
    if (daysSinceLastNPS >= 30) {
      // Don't show immediately, wait for a natural moment
      setHasShown(false);
    } else {
      setHasShown(true);
    }
  }, []);

  const showSurvey = () => {
    setIsOpen(true);
  };

  const closeSurvey = () => {
    setIsOpen(false);
  };

  const completeSurvey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trde_last_nps', Date.now().toString());
    }
    setHasShown(true);
    setIsOpen(false);
  };

  return {
    isOpen,
    showSurvey,
    closeSurvey,
    completeSurvey,
    shouldShow: !hasShown,
  };
}
