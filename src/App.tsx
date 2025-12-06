import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { Dashboard } from '../components/Dashboard';
import { Analytics } from '../components/Analytics';
import { YearlyUtilization } from '../components/YearlyUtilization';
import { MemberManagement } from '../components/MemberManagement';
import { MemberProfile } from '../components/MemberProfile';
import { ProjectDetail } from '../components/ProjectDetail';
import { ProjectCreation } from '../components/ProjectCreation';
import { ProjectReview } from '../components/ProjectReview';
import { ProjectManagement } from '../components/ProjectManagement';
import { MonthlyDetailsView } from '../components/MonthlyDetailsView';
import { ScrollToTop } from '../components/ScrollToTop';
import { useMobile } from '../hooks/useMobile';
import { mockProjects } from '../data/mockData';
import { Project, ProjectDraft } from '../types';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<'last' | 'current' | null>(null);
  const isMobile = useMobile();

  // 전역 키보드 단축키 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Home 키를 눌렀을 때 맨 위로 스크롤
      if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // 입력 필드에 포커스가 있지 않을 때만 동작
        const activeElement = document.activeElement;
        const isInputFocused = activeElement instanceof HTMLInputElement || 
                              activeElement instanceof HTMLTextAreaElement ||
                              activeElement?.getAttribute('contenteditable') === 'true';
        
        if (!isInputFocused) {
          e.preventDefault();
          
          // main 요소를 찾아서 스크롤
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          } else {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setSelectedProject(null);
    setSelectedMemberId(null);
    setSelectedMonth(null);
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  };

  const handleMemberProfileView = (memberId: string) => {
    setSelectedMemberId(memberId);
    setCurrentView('member-profile');
  };

  const handleCreateProject = () => {
    setCurrentView('project-creation');
  };

  const handleProjectSubmit = (projectData: ProjectDraft) => {
    // 실제로는 API 호출하여 프로젝트 생성
    console.log('Project created:', projectData);
    setCurrentView('project-review'); // 생성 후 검토 화면으로 이동
  };

  const handleViewReviews = () => {
    setCurrentView('project-review');
  };

  const handleMonthlyDetailsView = (month: 'last' | 'current') => {
    setSelectedMonth(month);
    setCurrentView('monthly-details');
  };

  const renderCurrentView = () => {
    if (selectedProject && currentView === 'project-detail') {
      return (
        <ProjectDetail
          project={selectedProject}
          onBack={() => setCurrentView('projects')}
          onEdit={isMobile ? undefined : () => {
            // 편집 기능은 데스크톱에서만 제공
            alert('프로젝트 편집 기능');
          }}
        />
      );
    }

    if (selectedMemberId && currentView === 'member-profile') {
      return (
        <MemberProfile
          memberId={selectedMemberId}
          onBack={() => setCurrentView('members')}
        />
      );
    }

    if (selectedMonth && currentView === 'monthly-details') {
      return (
        <MonthlyDetailsView
          month={selectedMonth}
          onBack={() => setCurrentView('dashboard')}
        />
      );
    }

    switch (currentView) {
      case 'yearly-utilization':
        return <YearlyUtilization />;
      case 'analytics':
        return <Analytics />;
      case 'members':
        return <MemberManagement onViewMemberProfile={handleMemberProfileView} />;
      case 'projects':
        return (
          <ProjectManagement 
            onCreateProject={handleCreateProject}
            onProjectSelect={handleProjectSelect}
          />
        );
      case 'project-creation':
        return (
          <ProjectCreation
            onBack={() => setCurrentView('projects')}
            onSubmit={handleProjectSubmit}
          />
        );
      case 'project-review':
        return (
          <ProjectReview
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'dashboard':
      default:
        return (
          <Dashboard 
            onCreateProject={handleCreateProject}
            onViewReviews={handleViewReviews}
            onViewMonthlyDetails={handleMonthlyDetailsView}
          />
        );
    }
  };

  // 모바일과 데스크톱에 따른 레이아웃 최적화
  if (isMobile) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background overflow-hidden">
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        
        <main className="flex-1 w-full overflow-auto scroll-smooth ios-safe-top ios-safe-bottom">
          <div className="w-full min-w-0 px-3 py-4">
            {renderCurrentView()}
          </div>
        </main>

        {/* 모바일용 스크롤 투 탑 버튼 */}
        <ScrollToTop />
      </div>
    );
  }

  // 데스크톱 레이아웃
  return (
    <div className="h-screen flex bg-background">
      <Navigation currentView={currentView} onViewChange={handleViewChange} />
      
      <main className="flex-1 overflow-auto scroll-smooth">
        {renderCurrentView()}
      </main>

      {/* 데스크톱용 스크롤 투 탑 버튼 */}
      <ScrollToTop />
    </div>
  );
}