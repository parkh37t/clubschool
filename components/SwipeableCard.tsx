import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ReactNode, useState } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  swipeThreshold?: number;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  swipeThreshold = 100,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    const offset = info.offset.x;

    if (offset < -swipeThreshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (offset > swipeThreshold && onSwipeRight) {
      onSwipeRight();
    }

    x.set(0);
  };

  return (
    <motion.div
      className={`${className} touch-none select-none`}
      style={{ x, opacity, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {children}
      {isDragging && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {onSwipeLeft && (
            <motion.div
              className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-semibold"
              style={{ opacity: useTransform(x, [0, -swipeThreshold], [0, 1]) }}
            >
              삭제
            </motion.div>
          )}
          {onSwipeRight && (
            <motion.div
              className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-semibold"
              style={{ opacity: useTransform(x, [0, swipeThreshold], [0, 1]) }}
            >
              확인
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// 스와이프 가능한 리스트 컨테이너
interface SwipeableListProps {
  children: ReactNode;
  className?: string;
}

export function SwipeableList({ children, className = '' }: SwipeableListProps) {
  return (
    <motion.div
      className={`space-y-3 ${className}`}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// 풀 투 리프레시 컴포넌트
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);

  const refreshOpacity = useTransform(y, [0, 80], [0, 1]);
  const refreshRotate = useTransform(y, [0, 80], [0, 180]);

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  };

  return (
    <motion.div className={`relative overflow-hidden ${className}`}>
      {/* 리프레시 인디케이터 */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center h-20"
        style={{ opacity: refreshOpacity }}
      >
        <motion.div
          className="w-8 h-8 border-2 border-primary rounded-full border-t-transparent"
          style={{ rotate: refreshRotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
        />
      </motion.div>

      {/* 컨텐츠 */}
      <motion.div
        style={{ y }}
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
