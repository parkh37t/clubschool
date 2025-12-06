import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ChevronUp, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobile } from '../hooks/useMobile';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const isMobile = useMobile();

  useEffect(() => {
    // main 요소를 찾아서 저장
    const findScrollElement = () => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        scrollElementRef.current = mainElement;
        return mainElement;
      }
      // main 요소가 없으면 body 사용
      return document.body;
    };

    const scrollElement = findScrollElement();

    const toggleVisibility = () => {
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (scrollElement === document.body || scrollElement === document.documentElement) {
        // 전체 페이지 스크롤인 경우
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      } else {
        // 특정 요소 스크롤인 경우
        scrollTop = scrollElement.scrollTop;
        scrollHeight = scrollElement.scrollHeight;
        clientHeight = scrollElement.clientHeight;
      }

      const maxScroll = Math.max(scrollHeight - clientHeight, 1);
      const scrollPercent = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      
      setScrollProgress(scrollPercent);
      setIsVisible(scrollTop > 150); // 150px로 더 빨리 표시
    };

    const throttledToggleVisibility = throttle(toggleVisibility, 16); // 60fps로 업데이트
    
    // 스크롤 이벤트 등록
    if (scrollElement === document.body) {
      window.addEventListener('scroll', throttledToggleVisibility);
    } else {
      scrollElement.addEventListener('scroll', throttledToggleVisibility);
    }

    // 초기 상태 설정
    toggleVisibility();
    
    return () => {
      if (scrollElement === document.body) {
        window.removeEventListener('scroll', throttledToggleVisibility);
      } else {
        scrollElement.removeEventListener('scroll', throttledToggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    const scrollElement = scrollElementRef.current || document.querySelector('main') || document.body;
    
    if (scrollElement === document.body) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      scrollElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // 간단한 throttle 함수
  function throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.3, y: 100 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30,
            mass: 0.7
          }}
          className={`fixed z-50 ${
            isMobile 
              ? 'bottom-20 right-4' // 모바일: 내비게이션 바 위쪽에 위치
              : 'bottom-8 right-8'   // 데스크탑: 기존 위치보다 더 안쪽
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative group">
            {/* 강화된 외부 글로우 */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
            <div className="absolute -inset-2 bg-blue-500/30 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-all duration-500" />

            {/* 메인 버튼 컨테이너 */}
            <div className="relative">
              {/* 진행률 링 - 더 굵고 선명하게 */}
              <svg
                className={`absolute inset-0 transform -rotate-90 ${
                  isMobile ? 'w-14 h-14' : 'w-18 h-18'
                }`}
                viewBox="0 0 72 72"
              >
                {/* 배경 링 */}
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-gray-300/60 dark:text-gray-600/60"
                />
                {/* 진행률 링 */}
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="url(#enhanced-gradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - scrollProgress)}`}
                  className="transition-all duration-300 ease-out drop-shadow-lg"
                  strokeLinecap="round"
                />
                {/* 향상된 그라디언트 */}
                <defs>
                  <linearGradient id="enhanced-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="30%" stopColor="#3B82F6" />
                    <stop offset="60%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* 메인 버튼 - 더 크고 눈에 띄게 */}
              <Button 
                onClick={scrollToTop}
                size="lg"
                className={`relative ${
                  isMobile ? 'w-14 h-14' : 'w-18 h-18'
                } rounded-full bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 border-3 border-white/80 dark:border-gray-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-300 backdrop-blur-xl hover:scale-115 active:scale-95 group shadow-2xl hover:shadow-blue-500/40`}
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 20px rgba(59, 130, 246, 0.15)'
                }}
                aria-label="맨 위로 스크롤"
              >
                {/* 강화된 배경 그라디언트 */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                
                {/* 중앙 포커스 링 */}
                <div className="absolute inset-1 border border-blue-200/50 dark:border-blue-700/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* 아이콘 - 더 크게 */}
                <motion.div
                  animate={isHovered ? { y: -3, scale: 1.1 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative z-10"
                >
                  <ArrowUp 
                    className={`${
                      isMobile ? 'h-6 w-6' : 'h-8 w-8'
                    } transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 drop-shadow-lg filter`} 
                  />
                </motion.div>

                {/* 내부 펄스 - 더 강하게 */}
                <div className="absolute inset-3 bg-blue-400/30 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                
                {/* 맥동하는 외부 링 */}
                <div className="absolute -inset-1 border-2 border-blue-400/30 rounded-full scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-60 transition-all duration-500" />
              </Button>

              {/* 퍼센트 표시 - 더 선명하게 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: isHovered ? 1 : 0, 
                  scale: isHovered ? 1 : 0.5 
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-2 py-1 rounded-full border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
                  <span className={`${
                    isMobile ? 'text-xs' : 'text-sm'
                  } font-bold text-blue-600 dark:text-blue-400`}>
                    {Math.round(scrollProgress * 100)}%
                  </span>
                </div>
              </motion.div>
            </div>

            {/* 향상된 툴팁 - 데스크탑에서만 표시 */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, x: 30, scale: 0.8 }}
                animate={{ 
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : 30,
                  scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="absolute right-full mr-4 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div className="bg-gray-900/98 dark:bg-gray-100/98 text-white dark:text-gray-900 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-gray-200/30 min-w-max">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                      <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                    <div>
                      <div className="font-semibold text-base">맨 위로 이동</div>
                      <div className="text-sm opacity-80">페이지 최상단으로 스크롤</div>
                    </div>
                  </div>
                  {/* 툴팁 화살표 */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900/98 dark:border-l-gray-100/98"></div>
                </div>
              </motion.div>
            )}

            {/* 키보드 힌트 - 데스크탑에서만 */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ 
                  opacity: isHovered ? 1 : 0,
                  y: isHovered ? 0 : 15
                }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="absolute top-full mt-3 left-1/2 -translate-x-1/2 pointer-events-none"
              >
                <div className="bg-gray-800/95 dark:bg-gray-200/95 text-white dark:text-gray-800 px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-md shadow-lg border border-gray-300/20">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-current rounded-full opacity-60" />
                    <span>Home 키</span>
                    <div className="w-1 h-1 bg-current rounded-full opacity-60" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 향상된 리플 효과 */}
            {scrollProgress > 0.75 && (
              <motion.div
                key={Math.floor(scrollProgress * 100)}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 border-3 border-blue-400/60 rounded-full pointer-events-none"
              />
            )}

            {/* 주의 끌기 애니메이션 (90% 이상일 때) */}
            {scrollProgress > 0.9 && (
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="absolute -inset-2 border-2 border-green-400/50 rounded-full pointer-events-none"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}