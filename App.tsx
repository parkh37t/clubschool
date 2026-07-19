import { useState, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useDataStore } from './hooks/useDataStore';
import { Project } from './types';
import { VIEW_NAMES } from './constants/views';

// URL 딥링크: ?view=<뷰키>로 접속 시 해당 화면으로 바로 진입(예: ?view=virtual-office).
// 잘못된/없는 값이면 대시보드. 배포(정적 호스팅)에서도 그대로 동작.
function initialView(): string {
  try {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v && (Object.values(VIEW_NAMES) as string[]).includes(v)) return v;
  } catch {
    // URL 파싱 불가 환경 방어 → 기본값
  }
  return VIEW_NAMES.DASHBOARD;
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>(initialView);

  // 현재 뷰를 URL 쿼리에 동기화(공유/북마크 가능). 대시보드는 파라미터 생략.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (currentView === VIEW_NAMES.DASHBOARD) url.searchParams.delete('view');
      else url.searchParams.set('view', currentView);
      window.history.replaceState(null, '', url);
    } catch {
      // history 접근 불가 환경 방어
    }
  }, [currentView]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<'last' | 'current' | null>(null);

  // 데이터 저장소
  const dataStore = useDataStore();

  // 키보드 단축키 지원
  useKeyboardShortcuts();

  // 이벤트 핸들러들
  const {
    handleViewChange,
    handleProjectSelect,
    handleMemberProfileView,
    handleCreateProject,
    handleProjectSubmit,
    handleProjectUpdate,
    handleViewReviews,
    handleMonthlyDetailsView,
    handleProjectEdit,
  } = useAppHandlers({
    setCurrentView,
    setSelectedProject,
    setSelectedMemberId,
    setSelectedMonth,
  });

  return (
    <AppLayout
      currentView={currentView}
      selectedProject={selectedProject}
      selectedMemberId={selectedMemberId}
      selectedMonth={selectedMonth}
      dataStore={dataStore}
      onViewChange={handleViewChange}
      onCreateProject={handleCreateProject}
      onProjectSelect={handleProjectSelect}
      onMemberProfileView={handleMemberProfileView}
      onProjectSubmit={handleProjectSubmit}
      onProjectUpdate={handleProjectUpdate}
      onViewReviews={handleViewReviews}
      onMonthlyDetailsView={handleMonthlyDetailsView}
      onProjectEdit={handleProjectEdit}
    />
  );
}