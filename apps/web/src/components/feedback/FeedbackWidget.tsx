'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedback } from '@/hooks/useFeedback';
import type { FeedbackType } from '@/lib/engagement/types';
import {
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  BugAntIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

interface FeedbackWidgetProps {
  /** Position of the widget */
  position?: 'bottom-right' | 'bottom-left';
}

const FEEDBACK_TYPES: { 
  id: FeedbackType; 
  label: string; 
  icon: typeof BugAntIcon;
  placeholder: string;
  color: string;
}[] = [
  { 
    id: 'bug', 
    label: 'Report Bug', 
    icon: BugAntIcon,
    placeholder: 'Describe the bug you encountered. What were you trying to do? What happened instead?',
    color: 'text-red-400',
  },
  { 
    id: 'feature', 
    label: 'Feature Request', 
    icon: LightBulbIcon,
    placeholder: 'What feature would you like to see? How would it help your trading?',
    color: 'text-amber-400',
  },
  { 
    id: 'general', 
    label: 'General Feedback', 
    icon: ChatBubbleLeftRightIcon,
    placeholder: 'Share your thoughts, suggestions, or questions...',
    color: 'text-blue-400',
  },
];

/**
 * Floating Feedback Widget
 * 
 * A small button that expands into a feedback form.
 */
export function FeedbackWidget({ position = 'bottom-right' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [content, setContent] = useState('');
  const { submitFeedback, isSubmitting, isSuccess, error, reset } = useFeedback();

  const positionClasses = {
    'bottom-right': 'right-6 bottom-6',
    'bottom-left': 'left-6 bottom-6',
  };

  const handleSubmit = async () => {
    if (!selectedType || !content.trim()) return;

    const result = await submitFeedback({
      type: selectedType,
      content: content.trim(),
    });

    if (result) {
      // Keep success state visible for 2 seconds then close
      setTimeout(() => {
        setIsOpen(false);
        setSelectedType(null);
        setContent('');
        reset();
      }, 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
    setContent('');
    reset();
  };

  const selectedConfig = FEEDBACK_TYPES.find(t => t.id === selectedType);

  return (
    <div className={`fixed ${positionClasses[position]} z-40`}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 sm:w-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">
                {isSuccess ? 'Thank You!' : selectedType ? selectedConfig?.label : 'Send Feedback'}
              </h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-6"
                >
                  <div className="inline-flex p-3 rounded-full bg-green-500/20 mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-white font-medium">Feedback Received</p>
                  <p className="text-sm text-white/40 mt-1">We appreciate your input!</p>
                </motion.div>
              ) : !selectedType ? (
                // Type selection
                <div className="space-y-2">
                  <p className="text-sm text-white/50 mb-3">What would you like to share?</p>
                  {FEEDBACK_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all text-left"
                    >
                      <type.icon className={`w-5 h-5 ${type.color}`} />
                      <span className="text-sm font-medium text-white">{type.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                // Feedback form
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    ← Change type
                  </button>

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={selectedConfig?.placeholder}
                    rows={4}
                    className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10"
                    autoFocus
                  />

                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !content.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-black font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Send Feedback
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white shadow-lg hover:bg-white/15 transition-colors backdrop-blur-sm"
          >
            <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Feedback</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
