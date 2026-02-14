import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedLayoutProps {
  children: ReactNode;
  className?: string;
}

// 페이지 전환 애니메이션 variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96],
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
};

// 카드 애니메이션 variants
export const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  }),
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
  },
};

// 리스트 아이템 애니메이션 variants
export const listItemVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

// 페이드 인 애니메이션 variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

// 슬라이드 업 애니메이션 variants
export const slideUpVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
};

// 스케일 애니메이션 variants
export const scaleVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// 페이지 레이아웃 컴포넌트
export function AnimatedPage({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}

// 카드 컴포넌트
export function AnimatedCard({ children, className = '', index = 0 }: AnimatedLayoutProps & { index?: number }) {
  return (
    <motion.div
      className={className}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      variants={cardVariants}
    >
      {children}
    </motion.div>
  );
}

// 리스트 아이템 컴포넌트
export function AnimatedListItem({ children, className = '', index = 0 }: AnimatedLayoutProps & { index?: number }) {
  return (
    <motion.div
      className={className}
      custom={index}
      initial="hidden"
      animate="visible"
      variants={listItemVariants}
    >
      {children}
    </motion.div>
  );
}

// 페이드 인 컴포넌트
export function AnimatedFadeIn({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      {children}
    </motion.div>
  );
}

// 슬라이드 업 컴포넌트
export function AnimatedSlideUp({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
    >
      {children}
    </motion.div>
  );
}

// 스케일 컴포넌트
export function AnimatedScale({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={scaleVariants}
    >
      {children}
    </motion.div>
  );
}

// 스태거 컨테이너
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export function StaggerContainer({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}
