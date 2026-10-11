import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { useIsMobile } from './ui/use-mobile';
import { BarChart3, Users, FolderOpen, Menu, Settings, TrendingUp, Target, Building2, Sparkles, ChevronDown } from 'lucide-react';
import { AX_AGENT_MENU } from '../constants/axAgentMenu';
import { useAxAgentPage, setAxAgentPage } from '../hooks/useAxAgentPage';

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
  { id: 'ax-planning-agent', label: 'AX 기획 에이전트', icon: Sparkles, badge: 'con-ai' },
  { id: 'virtual-office', label: '가상 사무실', icon: Building2, badge: 'AI 팀' },
];

const AX_AGENT_VIEW = 'ax-planning-agent';

export const Navigation = React.memo(function Navigation({ currentView, onViewChange }: NavigationProps) {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // AX 기획 에이전트 서브 메뉴 — 메뉴를 누르면 아래로 펼쳐지고, 화면을 떠나면 접힌다.
  const agentPage = useAxAgentPage();
  const [agentOpen, setAgentOpen] = useState(currentView === AX_AGENT_VIEW);
  const agentActive = currentView === AX_AGENT_VIEW;
  const handleAgentSub = useCallback((route: string) => {
    setAxAgentPage(route);
    if (currentView !== AX_AGENT_VIEW) onViewChange(AX_AGENT_VIEW);
    if (isMobile) setIsSheetOpen(false);
  }, [currentView, onViewChange, isMobile]);

  const handleNavClick = useCallback((view: string) => {
    console.log('Navigation clicked:', view);
    try {
      // AX 기획 에이전트: 이미 그 화면이면 서브 메뉴만 접고 펴고, 아니면 화면 이동 + 펼침
      if (view === AX_AGENT_VIEW) setAgentOpen((o) => (currentView === AX_AGENT_VIEW ? !o : true));
      else setAgentOpen(false);
      onViewChange(view);
      
      // 모바일에서 메뉴 클릭 시 Sheet 닫기
      if (isMobile) {
        setIsSheetOpen(false);
      }
    } catch (error) {
      console.error('Error in navigation click:', error);
    }
  }, [onViewChange, isMobile, currentView]);

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
              AX 에이전트
            </h2>
            <p className="text-muted-foreground leading-tight mt-1 truncate">
              와일리 컨버전스 · 에이전트 오피스
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
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2" role="navigation" aria-label="메인 네비게이션">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          const isAgent = item.id === AX_AGENT_VIEW;
          const showSub = isAgent && agentOpen;
          return (
            <div key={item.id}>
            <Button
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
              {isAgent && (
                <ChevronDown className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform duration-200 ${showSub ? 'rotate-180' : ''}`} />
              )}
            </Button>

            {/* AX 기획 에이전트 서브 메뉴 — con-ai 사이트의 왼쪽 메뉴를 그대로 */}
            {showSub && (
              <div className="mt-1 ml-4 pl-4 border-l-2 border-[#EFEAF7] space-y-3 py-1 animate-fade-in" role="group" aria-label="AX 기획 에이전트 하위 메뉴">
                {AX_AGENT_MENU.map((group, gi) => (
                  <div key={group.title ?? gi}>
                    {group.title && (
                      <div className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">{group.title}</div>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((sub) => {
                        const subActive = agentActive && agentPage === sub.route;
                        return (
                          <button
                            key={sub.route}
                            type="button"
                            onClick={() => handleAgentSub(sub.route)}
                            aria-current={subActive ? 'page' : undefined}
                            className={`w-full flex items-center gap-2.5 text-left rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                              subActive ? 'bg-[#EFEAF7] text-[#43306B] font-semibold' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {sub.step ? (
                              <span className={`h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                                subActive ? 'bg-[#6A4C9C] text-white' : 'bg-gray-200 text-gray-700'
                              }`}>{sub.step}</span>
                            ) : (
                              <span className={`h-1.5 w-1.5 rounded-full ml-2 mr-1 flex-shrink-0 ${subActive ? 'bg-[#6A4C9C]' : 'bg-gray-400'}`} />
                            )}
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
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
  ), [currentView, isMobile, handleNavClick, agentOpen, agentActive, agentPage, handleAgentSub]);

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
    <div className="w-72 h-screen flex-shrink-0 bg-white border-r border-gray-200 shadow-sm">
      {NavigationContent}
    </div>
  );
});