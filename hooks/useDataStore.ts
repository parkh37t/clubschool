import { useState, useCallback, useEffect } from 'react';
import { 
  Member, Project, ProjectAllocation, ProjectDraft, TeamMemberDraft, 
  DashboardStats, MemberManmonth, GroupSummary, UtilizationData, GroupUtilization
} from '../types';
import { 
  mockMembers, mockProjects, mockAllocations, mockMemberManmonths, 
  mockStats, calculateUtilizationData, calculateGroupUtilization, getGroupSummary
} from '../data/mockData';

// LocalStorage 키 상수
const STORAGE_KEYS = {
  MEMBERS: 'pm_members',
  PROJECTS: 'pm_projects', 
  ALLOCATIONS: 'pm_allocations',
  MANMONTHS: 'pm_manmonths'
} as const;

// 로컬 스토리지 유틸리티 함수들
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Failed to load ${key} from storage:`, error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to storage:`, error);
  }
};

// 고유 ID 생성 함수
const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`;
};

export function useDataStore() {
  // 기본 데이터 상태
  const [members, setMembers] = useState<Member[]>(() => 
    loadFromStorage(STORAGE_KEYS.MEMBERS, mockMembers)
  );
  const [projects, setProjects] = useState<Project[]>(() => 
    loadFromStorage(STORAGE_KEYS.PROJECTS, mockProjects)
  );
  const [allocations, setAllocations] = useState<ProjectAllocation[]>(() => 
    loadFromStorage(STORAGE_KEYS.ALLOCATIONS, mockAllocations)
  );
  const [memberManmonths, setMemberManmonths] = useState<MemberManmonth[]>(() => 
    loadFromStorage(STORAGE_KEYS.MANMONTHS, mockMemberManmonths)
  );

  // 데이터가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MEMBERS, members);
  }, [members]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALLOCATIONS, allocations);
  }, [allocations]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MANMONTHS, memberManmonths);
  }, [memberManmonths]);

  // 계산된 데이터들
  const getProjectsWithAllocations = useCallback((): Project[] => {
    return projects.map(project => ({
      ...project,
      allocations: allocations.filter(alloc => alloc.projectId === project.id)
    }));
  }, [projects, allocations]);

  const getDashboardStats = useCallback((): DashboardStats => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'in-progress').length;
    const totalMembers = members.length;
    const averageUtilization = memberManmonths.reduce((sum, mm) => sum + mm.utilizationRate, 0) / memberManmonths.length;
    const pendingReviews = projects.filter(p => p.status === 'review').length;
    const draftProjects = projects.filter(p => p.status === 'draft').length;

    return {
      totalProjects,
      activeProjects,
      totalMembers,
      averageUtilization,
      totalLastMonthActual: memberManmonths.reduce((sum, mm) => sum + mm.lastMonthActual, 0),
      totalThisMonthEstimated: memberManmonths.reduce((sum, mm) => sum + mm.thisMonthEstimated, 0),
      totalAvailableManmonth: memberManmonths.reduce((sum, mm) => sum + mm.availableManmonth, 0),
      pendingReviews,
      draftProjects
    };
  }, [projects, members, memberManmonths]);

  const getUtilizationData = useCallback((): UtilizationData => {
    return calculateUtilizationData();
  }, [memberManmonths]);

  const getGroupUtilization = useCallback((): GroupUtilization[] => {
    return calculateGroupUtilization();
  }, [memberManmonths]);

  const getGroupSummaryData = useCallback((): GroupSummary[] => {
    return getGroupSummary();
  }, [memberManmonths]);

  // CRUD 함수들

  // === 멤버 관리 ===
  const addMember = useCallback((memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: generateId(memberData.group.substring(0, 4))
    };

    setMembers(prev => [...prev, newMember]);

    // 새 멤버의 Manmonth 데이터도 추가
    const newManmonth: MemberManmonth = {
      memberId: newMember.id,
      lastMonthActual: 0,
      thisMonthEstimated: 0,
      availableManmonth: 1,
      utilizationRate: 0
    };
    setMemberManmonths(prev => [...prev, newManmonth]);

    return newMember;
  }, []);

  const updateMember = useCallback((memberId: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, ...updates } : member
    ));
  }, []);

  const deleteMember = useCallback((memberId: string) => {
    // 먼저 해당 멤버의 모든 할당을 제거
    setAllocations(prev => prev.filter(alloc => alloc.memberId !== memberId));
    
    // 멤버 제거
    setMembers(prev => prev.filter(member => member.id !== memberId));
    
    // Manmonth 데이터도 제거
    setMemberManmonths(prev => prev.filter(mm => mm.memberId !== memberId));
  }, []);

  // === 프로젝트 관리 ===
  const addProject = useCallback((projectDraft: ProjectDraft) => {
    const newProject: Project = {
      id: generateId('proj'),
      name: projectDraft.name,
      description: projectDraft.description,
      startDate: projectDraft.startDate,
      endDate: projectDraft.endDate,
      status: 'draft',
      allocations: [],
      createdBy: 'current-user', // 실제로는 현재 사용자 ID
      reviewers: ['exec-001'], // 기본 리뷰어
    };

    // 프로젝트 생성
    setProjects(prev => [...prev, newProject]);

    // 팀 구성원 할당 생성
    const newAllocations: ProjectAllocation[] = projectDraft.teamComposition.map(member => ({
      id: generateId('alloc'),
      memberId: member.memberId,
      projectId: newProject.id,
      startDate: member.startDate,
      endDate: member.endDate,
      utilizationRate: member.utilizationRate,
      role: member.role,
      status: 'active'
    }));

    setAllocations(prev => [...prev, ...newAllocations]);

    // 멤버들의 Manmonth 데이터 업데이트
    updateMemberManmonthsForAllocations(newAllocations, 'add');

    return newProject;
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    ));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    // 프로젝트 관련 할당들을 먼저 제거
    const projectAllocations = allocations.filter(alloc => alloc.projectId === projectId);
    updateMemberManmonthsForAllocations(projectAllocations, 'remove');
    
    setAllocations(prev => prev.filter(alloc => alloc.projectId !== projectId));
    setProjects(prev => prev.filter(project => project.id !== projectId));
  }, [allocations]);

  // === 프로젝트 할당 관리 ===
  const addAllocation = useCallback((allocationData: Omit<ProjectAllocation, 'id'>) => {
    const newAllocation: ProjectAllocation = {
      ...allocationData,
      id: generateId('alloc')
    };

    setAllocations(prev => [...prev, newAllocation]);
    updateMemberManmonthsForAllocations([newAllocation], 'add');

    return newAllocation;
  }, []);

  const updateAllocation = useCallback((allocationId: string, updates: Partial<ProjectAllocation>) => {
    setAllocations(prev => prev.map(allocation => {
      if (allocation.id === allocationId) {
        const updated = { ...allocation, ...updates };
        
        // 가동률이 변경된 경우 Manmonth 업데이트
        if (updates.utilizationRate !== undefined || updates.status !== undefined) {
          updateMemberManmonthsForAllocations([allocation], 'remove');
          updateMemberManmonthsForAllocations([updated], 'add');
        }
        
        return updated;
      }
      return allocation;
    }));
  }, []);

  const removeAllocation = useCallback((allocationId: string) => {
    const allocation = allocations.find(alloc => alloc.id === allocationId);
    if (allocation) {
      updateMemberManmonthsForAllocations([allocation], 'remove');
    }
    
    setAllocations(prev => prev.filter(alloc => alloc.id !== allocationId));
  }, [allocations]);

  // === Manmonth 데이터 업데이트 헬퍼 ===
  const updateMemberManmonthsForAllocations = useCallback((
    allocationsToUpdate: ProjectAllocation[], 
    operation: 'add' | 'remove'
  ) => {
    setMemberManmonths(prev => {
      const updated = [...prev];
      
      allocationsToUpdate.forEach(allocation => {
        const memberIndex = updated.findIndex(mm => mm.memberId === allocation.memberId);
        if (memberIndex >= 0) {
          const utilizationChange = (allocation.utilizationRate / 100);
          const multiplier = operation === 'add' ? 1 : -1;
          
          updated[memberIndex] = {
            ...updated[memberIndex],
            thisMonthEstimated: Math.max(0, Math.min(1, 
              updated[memberIndex].thisMonthEstimated + (utilizationChange * multiplier)
            )),
            availableManmonth: Math.max(0, Math.min(1,
              updated[memberIndex].availableManmonth - (utilizationChange * multiplier)
            )),
            utilizationRate: Math.max(0, Math.min(100,
              updated[memberIndex].utilizationRate + (allocation.utilizationRate * multiplier)
            ))
          };
        }
      });
      
      return updated;
    });
  }, []);

  // 직접 Manmonth 업데이트
  const updateMemberManmonth = useCallback((memberId: string, updates: Partial<MemberManmonth>) => {
    setMemberManmonths(prev => prev.map(mm => 
      mm.memberId === memberId ? { ...mm, ...updates } : mm
    ));
  }, []);

  // === 데이터 초기화 및 백업 ===
  const resetToDefaultData = useCallback(() => {
    setMembers(mockMembers);
    setProjects(mockProjects);
    setAllocations(mockAllocations);
    setMemberManmonths(mockMemberManmonths);
  }, []);

  const exportData = useCallback(() => {
    const data = {
      members,
      projects,
      allocations,
      memberManmonths,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-management-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [members, projects, allocations, memberManmonths]);

  const importData = useCallback((data: any) => {
    try {
      if (data.members) setMembers(data.members);
      if (data.projects) setProjects(data.projects);
      if (data.allocations) setAllocations(data.allocations);
      if (data.memberManmonths) setMemberManmonths(data.memberManmonths);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }, []);

  return {
    // 데이터
    members,
    projects: getProjectsWithAllocations(),
    allocations,
    memberManmonths,
    
    // 계산된 데이터
    dashboardStats: getDashboardStats(),
    utilizationData: getUtilizationData(),
    groupUtilization: getGroupUtilization(),
    groupSummary: getGroupSummaryData(),
    
    // CRUD 함수들
    addMember,
    updateMember,
    deleteMember,
    addProject,
    updateProject,
    deleteProject,
    addAllocation,
    updateAllocation,
    removeAllocation,
    updateMemberManmonth,
    
    // 유틸리티 함수들
    resetToDefaultData,
    exportData,
    importData
  };
}