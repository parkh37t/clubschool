import React from 'react';
import { Dashboard } from './Dashboard';
import { Analytics } from './Analytics';
import { YearlyUtilization } from './YearlyUtilization';
import { MemberManagement } from './MemberManagement';
import { MemberProfile } from './MemberProfile';
import { ProjectDetail } from './ProjectDetail';
import { ProjectCreation } from './ProjectCreation';
import { ProjectEdit } from './ProjectEdit';
import { ProjectReview } from './ProjectReview';
import { ProjectManagement } from './ProjectManagement';
import { MonthlyDetailsView } from './MonthlyDetailsView';
import { VirtualOfficeView } from './VirtualOffice/VirtualOfficeView';
import { Project, ProjectDraft } from '../types';
import { VIEW_NAMES } from '../constants/views';
import { useDataStore } from '../hooks/useDataStore';

interface ViewRendererProps {
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

export function ViewRenderer({
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
}: ViewRendererProps) {
  // 특별한 뷰들 먼저 처리
  if (selectedProject && currentView === VIEW_NAMES.PROJECT_DETAIL) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => onViewChange(VIEW_NAMES.PROJECTS)}
        onEdit={onProjectEdit}
      />
    );
  }

  if (selectedProject && currentView === VIEW_NAMES.PROJECT_EDIT) {
    return (
      <ProjectEdit
        project={selectedProject}
        dataStore={dataStore}
        onBack={() => onViewChange(VIEW_NAMES.PROJECT_DETAIL)}
        onSave={(updatedProject) => {
          dataStore.updateProject(updatedProject.id, updatedProject);
          onProjectUpdate(updatedProject);
          onViewChange(VIEW_NAMES.PROJECT_DETAIL);
        }}
      />
    );
  }

  if (selectedMemberId && currentView === VIEW_NAMES.MEMBER_PROFILE) {
    return (
      <MemberProfile
        memberId={selectedMemberId}
        dataStore={dataStore}
        onBack={() => onViewChange(VIEW_NAMES.MEMBERS)}
      />
    );
  }

  if (selectedMonth && currentView === VIEW_NAMES.MONTHLY_DETAILS) {
    return (
      <MonthlyDetailsView
        month={selectedMonth}
        dataStore={dataStore}
        onBack={() => onViewChange(VIEW_NAMES.DASHBOARD)}
      />
    );
  }

  // 기본 뷰들
  switch (currentView) {
    case VIEW_NAMES.YEARLY_UTILIZATION:
      return <YearlyUtilization dataStore={dataStore} />;
    case VIEW_NAMES.ANALYTICS:
      return <Analytics dataStore={dataStore} />;
    case VIEW_NAMES.MEMBERS:
      return <MemberManagement dataStore={dataStore} onViewMemberProfile={onMemberProfileView} />;
    case VIEW_NAMES.PROJECTS:
      return (
        <ProjectManagement 
          dataStore={dataStore}
          onCreateProject={onCreateProject}
          onProjectSelect={onProjectSelect}
        />
      );
    case VIEW_NAMES.PROJECT_CREATION:
      return (
        <ProjectCreation
          onBack={() => onViewChange(VIEW_NAMES.PROJECTS)}
          onSubmit={(projectData) => {
            dataStore.addProject(projectData);
            onProjectSubmit(projectData);
          }}
        />
      );
    case VIEW_NAMES.PROJECT_REVIEW:
      return (
        <ProjectReview
          dataStore={dataStore}
          onBack={() => onViewChange(VIEW_NAMES.DASHBOARD)}
        />
      );
    case VIEW_NAMES.VIRTUAL_OFFICE:
      // 오케스트레이터 연동(server/): /office-state.json 폴링으로 실제 상태 반영(없으면 404→자체 데모),
      // 지시 콘솔은 /api/instruct 로 POST → 백엔드가 12 에이전트를 게이트 파이프라인으로 실행.
      // dev에선 vite.config.ts 프록시가 두 경로를 server(8787)로 넘긴다(같은 오리진).
      return <VirtualOfficeView stateUrl="/office-state.json" instructUrl="/api/instruct" />;
    case VIEW_NAMES.DASHBOARD:
    default:
      return (
        <Dashboard 
          dataStore={dataStore}
          onCreateProject={onCreateProject}
          onViewReviews={onViewReviews}
          onViewMonthlyDetails={onMonthlyDetailsView}
        />
      );
  }
}