import React from 'react';
import { Navigation } from './Navigation';
import { ScrollToTop } from './ScrollToTop';
import { ViewRenderer } from './ViewRenderer';
import { useIsMobile } from './ui/use-mobile';
import { Project, ProjectDraft } from '../types';
import { useDataStore } from '../hooks/useDataStore';

interface AppLayoutProps {
  currentView: string;
  selectedProject: Project | null;
  selectedMemberId: string | null;
  selectedMonth: 'last' | 'current' | null;
  dataStore: ReturnType<typeof useDataStore>;
  onViewChange: (view: string) => void;
  onCreateProject: () => void;
  onProjectSelect: (project: Project) => void;
  onMemberProfileView: (memberId: string) => void;
  onProjectSubmit: (projectData: ProjectDraft) => void;
  onProjectUpdate: (updatedProject: Project) => void;
  onViewReviews: () => void;
  onMonthlyDetailsView: (month: 'last' | 'current') => void;
  onProjectEdit: () => void;
}

export function AppLayout({
  currentView,
  selectedProject,
  selectedMemberId,
  selectedMonth,
  dataStore,
  onViewChange,
  onCreateProject,
  onProjectSelect,
  onMemberProfileView,
  onProjectSubmit,
  onProjectUpdate,
  onViewReviews,
  onMonthlyDetailsView,
  onProjectEdit,
}: AppLayoutProps) {
  const isMobile = useIsMobile();

  const viewRendererProps = {
    currentView,
    selectedProject,
    selectedMemberId,
    selectedMonth,
    dataStore,
    onViewChange,
    onCreateProject,
    onProjectSelect,
    onMemberProfileView,
    onProjectSubmit,
    onProjectUpdate,
    onViewReviews,
    onMonthlyDetailsView,
    onProjectEdit,
  };

  // 모바일 레이아웃 - Apple 스타일
  if (isMobile) {
    return (
      <div className="min-h-screen w-full flex flex-col overflow-hidden mobile-container">
        <Navigation currentView={currentView} onViewChange={onViewChange} />
        
        <main className="flex-1 w-full overflow-auto scroll-smooth ios-safe-top ios-safe-bottom mobile-container">
          <div className="w-full min-w-0 px-4 py-6 pt-20">
            <ViewRenderer {...viewRendererProps} />
          </div>
        </main>

        <ScrollToTop />
      </div>
    );
  }

  // 데스크톱 레이아웃 - Apple 스타일  
  return (
    <div className="h-screen flex">
      <Navigation currentView={currentView} onViewChange={onViewChange} />
      
      <main className="flex-1 overflow-auto scroll-smooth">
        <ViewRenderer {...viewRendererProps} />
      </main>

      <ScrollToTop />
    </div>
  );
}