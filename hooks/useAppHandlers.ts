import { useCallback } from 'react';
import { Project, ProjectDraft } from '../types';
import { VIEW_NAMES } from '../constants/views';

interface UseAppHandlersProps {
  setCurrentView: (view: string) => void;
  setSelectedProject: (project: Project | null) => void;
  setSelectedMemberId: (memberId: string | null) => void;
  setSelectedMonth: (month: 'last' | 'current' | null) => void;
}

export function useAppHandlers({
  setCurrentView,
  setSelectedProject,
  setSelectedMemberId,
  setSelectedMonth,
}: UseAppHandlersProps) {
  
  const handleViewChange = useCallback((view: string) => {
    console.log('App: View changing to:', view);
    setCurrentView(view);
    setSelectedProject(null);
    setSelectedMemberId(null);
    setSelectedMonth(null);
  }, [setCurrentView, setSelectedProject, setSelectedMemberId, setSelectedMonth]);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setCurrentView(VIEW_NAMES.PROJECT_DETAIL);
  }, [setSelectedProject, setCurrentView]);

  const handleMemberProfileView = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setCurrentView(VIEW_NAMES.MEMBER_PROFILE);
  }, [setSelectedMemberId, setCurrentView]);

  const handleCreateProject = useCallback(() => {
    setCurrentView(VIEW_NAMES.PROJECT_CREATION);
  }, [setCurrentView]);

  const handleProjectSubmit = useCallback((projectData: ProjectDraft) => {
    console.log('Project created:', projectData);
    setCurrentView(VIEW_NAMES.PROJECT_REVIEW);
  }, [setCurrentView]);

  const handleProjectUpdate = useCallback((updatedProject: Project) => {
    console.log('Project updated:', updatedProject);
    setSelectedProject(updatedProject);
    // 실제로는 서버에 업데이트 요청을 보내야 함
  }, [setSelectedProject]);

  const handleViewReviews = useCallback(() => {
    setCurrentView(VIEW_NAMES.PROJECT_REVIEW);
  }, [setCurrentView]);

  const handleMonthlyDetailsView = useCallback((month: 'last' | 'current') => {
    setSelectedMonth(month);
    setCurrentView(VIEW_NAMES.MONTHLY_DETAILS);
  }, [setSelectedMonth, setCurrentView]);

  const handleProjectEdit = useCallback(() => {
    // 선택된 프로젝트를 유지하면서 편집 뷰로 이동
    setCurrentView(VIEW_NAMES.PROJECT_EDIT);
  }, [setCurrentView]);

  return {
    handleViewChange,
    handleProjectSelect,
    handleMemberProfileView,
    handleCreateProject,
    handleProjectSubmit,
    handleProjectUpdate,
    handleViewReviews,
    handleMonthlyDetailsView,
    handleProjectEdit,
  };
}