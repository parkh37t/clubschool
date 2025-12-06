import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { useIsMobile } from './ui/use-mobile';
import { BarChart3, Users, FolderOpen, Menu, Settings, TrendingUp, Target } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: '대시보드', icon: BarChart3 },
  { id: 'yearly-utilization', label: '연간 가동률', icon: Target, badge: '목표 90%' },
  { id: 'analytics', label: '데이터 분석', icon: TrendingUp },
  { id: 'members', label: '인력 관리', icon: Users },
  { id: 'projects', label: '프로젝트 관리', icon: FolderOpen },
];

export const Navigation = React.memo(function Navigation({ currentView, onViewChange }: NavigationProps) {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleNavClick = useCallback((view: string) => {
    console.log('Navigation clicked:', view);
    try {
      onViewChange(view);
      
      // 모바일에서 메뉴 클릭 시 Sheet 닫기
      if (isMobile) {
        setIsSheetOpen(false);
      }
    } catch (error) {
      console.error('Error in navigation click:', error);
    }
  }, [onViewChange, isMobile]);

  const handleHamburgerClick = useCallback(() => {
    console.log('Hamburger clicked, current state:', isSheetOpen);
    setIsSheetOpen(prev => !prev);
  }, [isSheetOpen]);

  const NavigationContent = useMemo(() => (
    <div className="flex flex-col h-full">
      {/* 헤더 섹션 - Apple 스타일 */}
      <div className="glass p-4 border-b border-border-light">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold leading-tight truncate">
              그룹 운영 대시보드
            </h2>
            <p className="text-muted-foreground leading-tight mt-1 truncate">
              프로젝트 & 인력 관리 시스템
            </p>
          </div>
        </div>
        
        {/* 배지 섹션 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
            총 56명
          </Badge>
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20 px-3 py-1">
            목표 90%
          </Badge>
        </div>
      </div>
      
      {/* 네비게이션 메뉴 - Apple 스타일 */}
      <nav className="flex-1 p-3 space-y-2" role="navigation" aria-label="메인 네비게이션">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start h-auto py-3 px-4 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'apple-button-primary' 
                  : 'glass-button'
              }`}
              onClick={() => handleNavClick(item.id)}
            >
              <Icon className="h-5 w-5 mr-4 flex-shrink-0" />
              <span className="flex-1 text-left font-medium">
                {item.label}
              </span>
              {item.badge && (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 px-2 py-1 flex-shrink-0 ${
                    isActive 
                      ? 'bg-white/20 text-white border-white/30' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {item.badge}
                </Badge>
              )}
              {item.id === 'yearly-utilization' && !item.badge && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-800 border-green-200 flex-shrink-0">
                  New
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>
      
      {/* 푸터 섹션 */}
      <div className="p-2.5 border-t bg-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gray-200 rounded-md flex-shrink-0">
            <Settings className="h-3.5 w-3.5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 leading-tight">
              {isMobile ? '모바일 모드' : '데스크톱 모드'}
            </div>
            <div className="text-xs text-gray-500 leading-tight">
              {isMobile ? '터치 최적화 UI' : '관리자 전용 기능'}
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-xs px-2 py-1 flex-shrink-0">
            {isMobile ? 'Mobile' : 'Desktop'}
          </Badge>
        </div>
      </div>
    </div>
  ), [currentView, isMobile, handleNavClick]);

  // 모바일 버전 - Sheet 사용
  if (isMobile) {
    return (
      <>
        {/* 햄버거 메뉴 버튼 */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed top-4 left-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-lg touch-friendly"
          aria-label="메뉴 열기"
          onClick={handleHamburgerClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Sheet 컴포넌트 */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent 
            side="left" 
            className="p-0 w-[280px] max-w-[85vw] z-50"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>네비게이션 메뉴</SheetTitle>
              <SheetDescription>
                프로젝트 관리 시스템의 주요 기능들에 접근할 수 있습니다.
              </SheetDescription>
            </SheetHeader>
            
            {NavigationContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // 데스크톱 버전
  return (
    <div className="w-72 bg-white border-r border-gray-200 shadow-sm">
      {NavigationContent}
    </div>
  );
});