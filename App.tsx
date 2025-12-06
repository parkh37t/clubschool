import { useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useDataStore } from './hooks/useDataStore';
import { Project } from './types';
import { VIEW_NAMES } from './constants/views';

export default function App() {
  const [currentView, setCurrentView] = useState(VIEW_NAMES.DASHBOARD);
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