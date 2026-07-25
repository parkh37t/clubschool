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
import { resolveOfficeBackend } from './VirtualOffice/officeBackend';
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
    case VIEW_NAMES.VIRTUAL_OFFICE: {
      // 백엔드(server/ 오케스트레이터) 위치를 런타임에 결정한다(officeBackend 참조):
      //  · ?api=<주소> → 그 백엔드에 연결(예: PC를 터널로 공개 → 공개 사이트에서 실제 실행 라이브 관람)
      //  · localhost(개발) → 같은 오리진(vite 프록시가 server:8787로 전달)
      //  · 지정 없는 정적 배포 → 미연결(내부 데모 + 지시는 다운로드 폴백)
      const backend = resolveOfficeBackend();
      return <VirtualOfficeView stateUrl={backend.stateUrl} instructUrl={backend.instructUrl} />;
    }
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