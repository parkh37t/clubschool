import { 
  Member, Project, ProjectAllocation, DashboardStats, MemberManmonth, GroupSummary,
  MonthlyManmonth, MemberHistory, MemberPerformance, OptimizationRecommendation, QuarterlyReport,
  UtilizationData, GroupUtilization
} from '../types';

// 56명 규모의 프로젝트 수행본부 구성원 데이터
export const mockMembers: Member[] = [
  // 본부장 (1명)
  {
    id: 'exec-001',
    name: '김본부',
    role: '프로젝트 수행본부장',
    group: 'executive',
    email: 'kim.director@company.com',
    hourlyRate: 120000
  },
  
  // 사업관리팀 (1명)
  {
    id: 'mgmt-001',
    name: '이관리',
    role: '사업관리팀장',
    group: 'management',
    email: 'lee.manager@company.com',
    hourlyRate: 90000
  },

  // 기획그룹 (32명)
  ...Array.from({ length: 32 }, (_, i) => ({
    id: `plan-${String(i + 1).padStart(3, '0')}`,
    name: `기획${i + 1}`,
    role: i < 4 ? '시니어 기획자' : i < 12 ? '기획자' : i < 20 ? '주니어 기획자' : 'UI기획자',
    group: 'planning' as const,
    email: `planner${i + 1}@company.com`,
    hourlyRate: i < 4 ? 85000 : i < 12 ? 70000 : i < 20 ? 55000 : 60000
  })),

  // 디자인그룹 (14명) 
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `design-${String(i + 1).padStart(3, '0')}`,
    name: `디자인${i + 1}`,
    role: i < 2 ? '시니어 UI/UX 디자이너' : i < 6 ? 'UI/UX 디자이너' : i < 10 ? '그래픽 디자이너' : 'UX 리서처',
    group: 'design' as const,
    email: `designer${i + 1}@company.com`,
    hourlyRate: i < 2 ? 90000 : i < 6 ? 75000 : i < 10 ? 65000 : 70000
  })),

  // 퍼블리싱그룹 (8명)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `dev-${String(i + 1).padStart(3, '0')}`,
    name: `개발${i + 1}`,
    role: i < 2 ? '시니어 개발자' : i < 5 ? '프론트엔드 개발자' : '백엔드 개발자',
    group: 'publishing' as const,
    email: `developer${i + 1}@company.com`,
    hourlyRate: i < 2 ? 95000 : i < 5 ? 80000 : 85000
  }))
];

// 프로젝트 할당 데이터 (56명 규모에 맞게 조정)
export const mockAllocations: ProjectAllocation[] = [
  // 대형 프로젝트 1
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `alloc-1-${i + 1}`,
    memberId: mockMembers[2 + i].id, // 기획그룹부터 할당
    projectId: '1',
    startDate: '2024-01-15',
    endDate: '2024-06-15',
    utilizationRate: 70 + Math.floor(Math.random() * 30),
    role: i < 8 ? '기획자' : i < 12 ? 'UI디자이너' : '개발자',
    status: 'active' as const
  })),

  // 중형 프로젝트 2
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `alloc-2-${i + 1}`,
    memberId: mockMembers[22 + i].id,
    projectId: '2',
    startDate: '2024-02-15',
    endDate: '2024-05-15',
    utilizationRate: 60 + Math.floor(Math.random() * 35),
    role: i < 6 ? '기획자' : i < 9 ? 'UI디자이너' : '개발자',
    status: 'active' as const
  })),

  // 소형 프로젝트들
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `alloc-3-${i + 1}`,
    memberId: mockMembers[36 + i].id,
    projectId: '3',
    startDate: '2024-03-01',
    endDate: '2024-04-30',
    utilizationRate: 50 + Math.floor(Math.random() * 40),
    role: i < 4 ? '기획자' : i < 6 ? 'UI디자이너' : '개발자',
    status: 'active' as const
  }))
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: '차세대 모바일 플랫폼 구축',
    status: 'in-progress',
    startDate: '2024-01-15',
    endDate: '2024-06-15',
    description: '차세대 모바일 플랫폼 전면 구축 및 UI/UX 혁신 프로젝트',
    allocations: mockAllocations.filter(a => a.projectId === '1'),
    createdBy: 'exec-001',
    reviewers: ['exec-001', 'mgmt-001']
  },
  {
    id: '2',
    name: '기업용 대시보드 시스템',
    status: 'in-progress',
    startDate: '2024-02-15',
    endDate: '2024-05-15',
    description: '기업용 통합 대시보드 및 분석 시스템 개발',
    allocations: mockAllocations.filter(a => a.projectId === '2'),
    createdBy: 'mgmt-001',
    reviewers: ['exec-001', 'mgmt-001']
  },
  {
    id: '3',
    name: 'AI 챗봇 서비스 런칭',
    status: 'planning',
    startDate: '2024-03-01',
    endDate: '2024-04-30',
    description: 'AI 기반 고객 상담 챗봇 서비스 개발 및 런칭',
    allocations: mockAllocations.filter(a => a.projectId === '3'),
    createdBy: 'mgmt-001',
    reviewers: ['exec-001', 'mgmt-001']
  }
];

// 56명 규모의 Manmonth 데이터 생성
export const mockMemberManmonths: MemberManmonth[] = mockMembers.map((member, index) => {
  // 그룹별로 다른 가동률 패턴 적용
  let baseUtilization = 70;
  if (member.group === 'executive') baseUtilization = 95;
  else if (member.group === 'management') baseUtilization = 85;
  else if (member.group === 'planning') baseUtilization = 71;
  else if (member.group === 'design') baseUtilization = 78;
  else if (member.group === 'publishing') baseUtilization = 76;

  const variation = (Math.random() - 0.5) * 20; // ±10% 변동
  const currentUtilization = Math.max(30, Math.min(100, baseUtilization + variation));
  
  return {
    memberId: member.id,
    lastMonthActual: (currentUtilization - 5 + Math.random() * 10) / 100,
    thisMonthEstimated: currentUtilization / 100,
    availableManmonth: (100 - currentUtilization) / 100,
    utilizationRate: currentUtilization
  };
});

export const mockStats: DashboardStats = {
  totalProjects: 3,
  activeProjects: 2,
  totalMembers: 56,
  averageUtilization: 74.5,
  totalLastMonthActual: mockMemberManmonths.reduce((sum, mm) => sum + mm.lastMonthActual, 0),
  totalThisMonthEstimated: mockMemberManmonths.reduce((sum, mm) => sum + mm.thisMonthEstimated, 0),
  totalAvailableManmonth: mockMemberManmonths.reduce((sum, mm) => sum + mm.availableManmonth, 0),
  pendingReviews: 3,
  draftProjects: 1
};

// 가동률 데이터 계산 함수 (56명 규모)
export const calculateUtilizationData = (): UtilizationData => {
  const workingDaysPerMonth = 22;
  const workingHoursPerDay = 8;
  const totalWorkingHours = workingDaysPerMonth * workingHoursPerDay;

  let lastMonthActive = 0;
  let lastMonthIdle = 0;
  let thisMonthActive = 0;
  let thisMonthIdle = 0;
  let lastMonthCost = 0;
  let thisMonthCost = 0;
  let lastMonthIdleCost = 0;
  let thisMonthIdleCost = 0;

  mockMemberManmonths.forEach((mm) => {
    const member = mockMembers.find(m => m.id === mm.memberId);
    const hourlyRate = member?.hourlyRate || 70000;
    
    // 지난달
    const lastMonthActiveHours = mm.lastMonthActual * totalWorkingHours;
    const lastMonthIdleHours = (1 - mm.lastMonthActual) * totalWorkingHours;
    lastMonthActive += mm.lastMonthActual;
    lastMonthIdle += (1 - mm.lastMonthActual);
    lastMonthCost += totalWorkingHours * hourlyRate;
    lastMonthIdleCost += lastMonthIdleHours * hourlyRate;

    // 이번달
    const thisMonthActiveHours = mm.thisMonthEstimated * totalWorkingHours;
    const thisMonthIdleHours = (1 - mm.thisMonthEstimated) * totalWorkingHours;
    thisMonthActive += mm.thisMonthEstimated;
    thisMonthIdle += (1 - mm.thisMonthEstimated);
    thisMonthCost += totalWorkingHours * hourlyRate;
    thisMonthIdleCost += thisMonthIdleHours * hourlyRate;
  });

  const lastMonthUtilRate = (lastMonthActive / mockMembers.length) * 100;
  const thisMonthUtilRate = (thisMonthActive / mockMembers.length) * 100;

  return {
    lastMonth: {
      activeManmonth: lastMonthActive,
      idleManmonth: lastMonthIdle,
      utilizationRate: lastMonthUtilRate,
      totalCost: lastMonthCost,
      idleCost: lastMonthIdleCost,
      totalWorkingDays: workingDaysPerMonth
    },
    thisMonth: {
      estimatedActiveManmonth: thisMonthActive,
      estimatedIdleManmonth: thisMonthIdle,
      estimatedUtilizationRate: thisMonthUtilRate,
      estimatedTotalCost: thisMonthCost,
      estimatedIdleCost: thisMonthIdleCost,
      totalWorkingDays: workingDaysPerMonth
    },
    comparison: {
      utilizationChange: thisMonthUtilRate - lastMonthUtilRate,
      costSavings: lastMonthIdleCost - thisMonthIdleCost,
      efficiencyImprovement: ((thisMonthUtilRate - lastMonthUtilRate) / lastMonthUtilRate) * 100
    }
  };
};

// 그룹별 가동률 데이터 계산 함수 (56명 규모)
export const calculateGroupUtilization = (): GroupUtilization[] => {
  const groups = ['executive', 'management', 'planning', 'design', 'publishing'] as const;
  const workingHours = 22 * 8;

  return groups.map(group => {
    const groupMembers = mockMembers.filter(m => m.group === group);
    const groupManmonths = mockMemberManmonths.filter(mm => 
      groupMembers.some(gm => gm.id === mm.memberId)
    );

    if (groupManmonths.length === 0) {
      return {
        group,
        lastMonth: { activeManmonth: 0, idleManmonth: 0, utilizationRate: 0, totalCost: 0, idleCost: 0 },
        thisMonth: { estimatedActiveManmonth: 0, estimatedIdleManmonth: 0, estimatedUtilizationRate: 0, estimatedTotalCost: 0, estimatedIdleCost: 0 },
        memberCount: groupMembers.length,
        averageHourlyRate: 0
      };
    }

    const avgHourlyRate = groupMembers.reduce((sum, m) => sum + (m.hourlyRate || 70000), 0) / groupMembers.length;
    
    const lastMonthUtil = groupManmonths.reduce((sum, mm) => sum + (mm.lastMonthActual * 100), 0) / groupManmonths.length;
    const thisMonthUtil = groupManmonths.reduce((sum, mm) => sum + (mm.thisMonthEstimated * 100), 0) / groupManmonths.length;

    const lastMonthActive = groupManmonths.reduce((sum, mm) => sum + mm.lastMonthActual, 0);
    const lastMonthIdle = groupManmonths.reduce((sum, mm) => sum + (1 - mm.lastMonthActual), 0);
    const thisMonthActive = groupManmonths.reduce((sum, mm) => sum + mm.thisMonthEstimated, 0);
    const thisMonthIdle = groupManmonths.reduce((sum, mm) => sum + (1 - mm.thisMonthEstimated), 0);

    const lastMonthTotalCost = groupMembers.length * workingHours * avgHourlyRate;
    const thisMonthTotalCost = groupMembers.length * workingHours * avgHourlyRate;

    return {
      group,
      lastMonth: {
        activeManmonth: lastMonthActive,
        idleManmonth: lastMonthIdle,
        utilizationRate: lastMonthUtil,
        totalCost: lastMonthTotalCost,
        idleCost: lastMonthIdle * workingHours * avgHourlyRate
      },
      thisMonth: {
        estimatedActiveManmonth: thisMonthActive,
        estimatedIdleManmonth: thisMonthIdle,
        estimatedUtilizationRate: thisMonthUtil,
        estimatedTotalCost: thisMonthTotalCost,
        estimatedIdleCost: thisMonthIdle * workingHours * avgHourlyRate
      },
      memberCount: groupMembers.length,
      averageHourlyRate: avgHourlyRate
    };
  });
};

// 월별 Manmonth 추이 데이터 (5개 그룹, 56명 규모)
export const mockMonthlyData: MonthlyManmonth[] = [
  {
    month: '2024-01',
    executive: 1.0,
    management: 0.9,
    planning: 21.8,
    design: 10.2,
    publishing: 5.8,
    total: 39.7
  },
  {
    month: '2024-02',
    executive: 1.0,
    management: 0.9,
    planning: 22.5,
    design: 10.8,
    publishing: 6.1,
    total: 41.3
  },
  {
    month: '2024-03',
    executive: 1.0,
    management: 0.9,
    planning: 23.2,
    design: 11.4,
    publishing: 6.4,
    total: 42.9
  },
  {
    month: '2024-04',
    executive: 1.0,
    management: 0.9,
    planning: 22.9,
    design: 11.1,
    publishing: 6.2,
    total: 42.1
  },
  {
    month: '2024-05',
    executive: 1.0,
    management: 0.9,
    planning: 23.6,
    design: 11.7,
    publishing: 6.5,
    total: 43.7
  },
  {
    month: '2024-06',
    executive: 1.0,
    management: 0.9,
    planning: 24.1,
    design: 12.0,
    publishing: 6.8,
    total: 44.8
  }
];

// 기존 데이터들은 유지하되 규모에 맞게 조정
export const mockQuarterlyData: QuarterlyReport[] = [
  {
    quarter: '2023-Q4',
    totalManmonth: 121.5,
    averageUtilization: 72.8,
    completedProjects: 7,
    groupBreakdown: {
      executive: 3.0,
      management: 2.6,
      planning: 68.2,
      design: 32.4,
      publishing: 15.3
    }
  },
  {
    quarter: '2024-Q1',
    totalManmonth: 125.9,
    averageUtilization: 75.1,
    completedProjects: 6,
    groupBreakdown: {
      executive: 3.0,
      management: 2.7,
      planning: 69.5,
      design: 33.3,
      publishing: 17.4
    }
  },
  {
    quarter: '2024-Q2',
    totalManmonth: 131.4,
    averageUtilization: 78.2,
    completedProjects: 8,
    groupBreakdown: {
      executive: 3.0,
      management: 2.7,
      planning: 70.9,
      design: 35.1,
      publishing: 19.7
    }
  }
];

// 구성원별 히스토리 데이터는 기존 유지
export const mockMemberHistories: MemberHistory[] = [
  {
    memberId: 'plan-001',
    projectId: '1',
    projectName: '차세대 모바일 플랫폼 구축',
    startDate: '2024-01-15',
    endDate: '2024-06-15',
    utilizationRate: 80,
    manmonth: 4.0,
    performance: 8.5,
    feedback: '프로젝트 관리 역량이 뛰어나며 팀 커뮤니케이션이 원활함'
  },
  {
    memberId: 'design-001',
    projectId: '1',
    projectName: '차세대 모바일 플랫폼 구축',
    startDate: '2024-01-20',
    endDate: '2024-06-10',
    utilizationRate: 90,
    manmonth: 4.5,
    performance: 9.2,
    feedback: 'UI/UX 설계가 우수하고 사용자 경험을 깊이 고려함'
  },
  {
    memberId: 'dev-001',
    projectId: '1',
    projectName: '차세대 모바일 플랫폼 구축',
    startDate: '2024-02-01',
    endDate: '2024-06-15',
    utilizationRate: 75,
    manmonth: 3.75,
    performance: 7.8,
    feedback: '기술적 구현 능력이 우수하나 일정 관리 개선 필요'
  }
];

export const mockMemberPerformances: MemberPerformance[] = [
  {
    memberId: 'plan-001',
    averageUtilization: 82.5,
    totalProjects: 8,
    averagePerformance: 8.7,
    totalManmonth: 24.5,
    growthRate: 12.5,
    skillRating: {
      technical: 8.5,
      communication: 9.2,
      leadership: 8.8,
      problemSolving: 8.3
    }
  },
  {
    memberId: 'design-001',
    averageUtilization: 88.0,
    totalProjects: 6,
    averagePerformance: 9.1,
    totalManmonth: 22.8,
    growthRate: 18.3,
    skillRating: {
      technical: 9.0,
      communication: 8.5,
      leadership: 7.2,
      problemSolving: 8.8
    }
  },
  {
    memberId: 'dev-001',
    averageUtilization: 76.2,
    totalProjects: 10,
    averagePerformance: 7.9,
    totalManmonth: 28.5,
    growthRate: 8.7,
    skillRating: {
      technical: 9.2,
      communication: 7.0,
      leadership: 6.8,
      problemSolving: 8.5
    }
  }
];

export const mockOptimizationRecommendations: OptimizationRecommendation[] = [
  {
    type: 'rebalance',
    priority: 'high',
    title: '기획그룹 가동률 개선 필요',
    description: '기획그룹의 평균 가동률이 71%로 목표 대비 부족한 상황입니다.',
    impact: '기획그룹 가동률 15% 향상으로 전체 목표 달성 가능',
    suggestedActions: [
      '기획 업무 프로세스 표준화',
      '기획그룹 역량 강화 교육 실시',
      '타 그룹과의 협업 체계 개선'
    ],
    affectedMembers: Array.from({ length: 32 }, (_, i) => `plan-${String(i + 1).padStart(3, '0')}`),
    expectedImprovement: 15
  },
  {
    type: 'add_member',  
    priority: 'medium',
    title: '디자인그룹 업무 부하 분산',
    description: '디자인그룹의 가동률이 78%로 적정 수준을 유지하고 있습니다.',
    impact: '디자인 품질 향상 및 그룹 만족도 증대',
    suggestedActions: [
      '디자인 시스템 구축으로 효율성 증대', 
      '업무 우선순위 최적화',
      '크로스 트레이닝 실시'
    ],
    affectedMembers: Array.from({ length: 14 }, (_, i) => `design-${String(i + 1).padStart(3, '0')}`),
    expectedImprovement: 12
  },
  {
    type: 'skill_gap',
    priority: 'medium',
    title: '퍼블리싱그룹 효율성 극대화',
    description: '소수 정예 퍼블리싱그룹의 높은 가동률을 통한 최적화가 필요합니다.',
    impact: '퍼블리싱그룹 생산성 25% 향상 예상',
    suggestedActions: [
      '개발 자동화 도구 도입',
      '코드 리뷰 시스템 강화',
      '개발 환경 최적화'
    ],
    affectedMembers: Array.from({ length: 8 }, (_, i) => `dev-${String(i + 1).padStart(3, '0')}`),
    expectedImprovement: 25
  }
];

// 그룹별 요약 계산 함수 (56명 규모)
export const getGroupSummary = (): GroupSummary[] => {
  const groups = ['executive', 'management', 'planning', 'design', 'publishing'] as const;
  
  return groups.map(group => {
    const groupMembers = mockMembers.filter(m => m.group === group);
    const groupManmonths = mockMemberManmonths.filter(mm => 
      groupMembers.some(gm => gm.id === mm.memberId)
    );
    
    return {
      group,
      totalMembers: groupMembers.length,
      totalLastMonthActual: groupManmonths.reduce((sum, mm) => sum + mm.lastMonthActual, 0),
      totalThisMonthEstimated: groupManmonths.reduce((sum, mm) => sum + mm.thisMonthEstimated, 0),
      totalAvailableManmonth: groupManmonths.reduce((sum, mm) => sum + mm.availableManmonth, 0),
      averageUtilization: groupManmonths.length > 0 
        ? groupManmonths.reduce((sum, mm) => sum + mm.utilizationRate, 0) / groupManmonths.length 
        : 0
    };
  });
};