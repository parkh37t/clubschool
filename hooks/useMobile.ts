import { useState, useEffect } from 'react';

export function useMobile() {
  // 초기값을 더 정확하게 설정 (SSR 고려)
  const [isMobile, setIsMobile] = useState(() => {
    // 서버사이드 렌더링 시에는 기본값 사용
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      console.log('Mobile check:', mobile, 'Width:', window.innerWidth); // 디버깅용
      setIsMobile(mobile);
    };
    
    // 초기 체크
    checkDevice();
    
    // 리사이즈 이벤트 리스너 추가
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}