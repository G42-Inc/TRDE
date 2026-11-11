// Animation configurations for framer-motion
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

// Page transition variants
export const pageTransition: import('framer-motion').Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: [0.25, 0.46, 0.45, 0.94] 
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { 
      duration: 0.2, 
      ease: [0.25, 0.46, 0.45, 0.94] 
    }
  },
};

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
};

// Button press animation
export const buttonPress = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
};

// Card hover animation
export const cardHover = {
  whileHover: { 
    y: -4,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  },
};

// Modal overlay animation
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Modal content animation
export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 25 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.15 }
  },
};

// Skeleton shimmer animation
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// Number counter spring config
export const counterSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 30,
};
