export interface Member {
  id: string;
  name: string;
  role: string;
  group: 'planning' | 'design' | 'publishing' | 'management' | 'executive';
  email: string;
  avatar?: string;
  hourlyRate?: number; // 시간당 비용 (원)
}

export interface ProjectAllocation {
  id: string;
  memberId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string; // 실제 철수일 (중도 철수 시)
  utilizationRate: number; // 0-100
  role: string;
  status: 'active' | 'completed' | 'withdrawn'; // 투입 상태
  withdrawalReason?: string; // 철수 사유
}

export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'review' | 'approved' | 'planning' | 'in-progress' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  description: string;
  allocations: ProjectAllocation[];
  createdBy: string;
  reviewers: string[];
  approvedBy?: string;
  approvedAt?: string;
  reviewComments?: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  reviewerId: string;
  comment: string;
  type: 'approval' | 'rejection' | 'request_change';
  createdAt: string;
}

export interface ProjectDraft {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  teamComposition: TeamMemberDraft[];
  estimatedBudget?: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export interface TeamMemberDraft {
  memberId: string;
  role: string;
  startDate: string;
  endDate: string;
  utilizationRate: number;
  isRequired: boolean; // 필수 투입 여부
}

export interface MemberManmonth {
  memberId: string;
  lastMonthActual: number; // 지난달 실제 투입 Manmonth
  thisMonthEstimated: number; // 이번달 예상 투입 Manmonth
  availableManmonth: number; // 투입 안된 가용 Manmonth
  utilizationRate: number; // 현재 가동률 (%)
}

export interface GroupSummary {
  group: 'planning' | 'design' | 'publishing' | 'management' | 'executive';
  totalMembers: number;
  totalLastMonthActual: number;
  totalThisMonthEstimated: number;
  totalAvailableManmonth: number;
  averageUtilization: number;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalMembers: number;
  averageUtilization: number;
  totalLastMonthActual: number;
  totalThisMonthEstimated: number;
  totalAvailableManmonth: number;
  pendingReviews: number;
  draftProjects: number;
}

// 새로 추가되는 가동/비가동률 관련 타입들
export interface UtilizationData {
  lastMonth: {
    activeManmonth: number;
    idleManmonth: number;
    utilizationRate: number; // %
    totalCost: number; // 총 비용 (원)
    idleCost: number; // 유휴 비용 (원)
    totalWorkingDays: number;
  };
  thisMonth: {
    estimatedActiveManmonth: number;
    estimatedIdleManmonth: number;
    estimatedUtilizationRate: number; // %
    estimatedTotalCost: number; // 총 예상 비용 (원)
    estimatedIdleCost: number; // 유휴 예상 비용 (원)
    totalWorkingDays: number;
  };
  comparison: {
    utilizationChange: number; // % 변화
    costSavings: number; // 비용 절감/증가 (원)
    efficiencyImprovement: number; // % 개선
  };
}

export interface GroupUtilization {
  group: 'planning' | 'design' | 'publishing' | 'management' | 'executive';
  lastMonth: {
    activeManmonth: number;
    idleManmonth: number;
    utilizationRate: number;
    totalCost: number;
    idleCost: number;
  };
  thisMonth: {
    estimatedActiveManmonth: number;
    estimatedIdleManmonth: number;
    estimatedUtilizationRate: number;
    estimatedTotalCost: number;
    estimatedIdleCost: number;
  };
  memberCount: number;
  averageHourlyRate: number;
}

// 연간 가동률 관련 새로운 타입들
export interface MonthlyUtilizationTarget {
  month: string; // "2024-01"
  targetUtilization: number; // 월별 목표 가동률 (%)
  actualUtilization: number; // 실제 가동률 (%)
  plannedUtilization: number; // 계획된 가동률 (%)
  deviation: number; // 목표 대비 편차 (%)
  status: 'achieved' | 'warning' | 'critical'; // 달성 상태
}

export interface YearlyUtilizationSummary {
  year: number;
  annualTarget: number; // 연간 목표 가동률 (%)
  currentAverageUtilization: number; // 현재까지 평균 가동률 (%)
  projectedYearEndUtilization: number; // 연말 예상 가동률 (%)
  targetAchievementProbability: number; // 목표 달성 확률 (%)
  totalMembers: number;
  monthlyData: MonthlyUtilizationTarget[];
  groupBreakdown: {
    planning: YearlyGroupUtilization;
    design: YearlyGroupUtilization;
    publishing: YearlyGroupUtilization;
    management: YearlyGroupUtilization;
    executive: YearlyGroupUtilization;
  };
}

export interface YearlyGroupUtilization {
  group: 'planning' | 'design' | 'publishing' | 'management' | 'executive';
  memberCount: number;
  currentAverageUtilization: number;
  projectedYearEndUtilization: number;
  monthlyUtilization: { month: string; utilization: number }[];
  targetAchievementStatus: 'on-track' | 'at-risk' | 'behind';
}

export interface UtilizationInsight {
  type: 'achievement' | 'warning' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  affectedGroups: string[];
  timeframe: string;
}

// 기존 분석 관련 타입들
export interface MonthlyManmonth {
  month: string; // "2024-01"
  planning: number;
  design: number;
  publishing: number;
  management: number;
  executive: number;
  total: number;
}

export interface MemberHistory {
  memberId: string;
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  utilizationRate: number;
  manmonth: number;
  performance: number; // 0-10 성과 점수
  feedback: string;
}

export interface MemberPerformance {
  memberId: string;
  averageUtilization: number;
  totalProjects: number;
  averagePerformance: number;
  totalManmonth: number;
  growthRate: number; // 성장률 (%)
  skillRating: {
    technical: number;
    communication: number;
    leadership: number;
    problemSolving: number;
  };
}

export interface OptimizationRecommendation {
  type: 'rebalance' | 'add_member' | 'reduce_load' | 'skill_gap';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  suggestedActions: string[];
  affectedMembers: string[];
  expectedImprovement: number; // 예상 개선률 (%)
}

// ===== 월별 손익 관리 (P&L) 관련 타입 =====

export interface PLMonthValue {
  target: number;  // 목표
  actual: number;  // 실적
}

export interface PLMonthData {
  month: number; // 1-12
  revenue: PLMonthValue;           // 매출액
  deposits: PLMonthValue;          // 입금액
  purchases: PLMonthValue;         // 매입
  projectLaborInternal: PLMonthValue;  // 프로젝트인건비 (내부)
  projectLaborExternal: PLMonthValue;  // 프로젝트인건비 (외주)
  divisionLaborCommon: PLMonthValue;   // 사업부인건비 (공통)
  divisionLaborProposal: PLMonthValue; // 사업부인건비 (제안)
  idleLaborCost: PLMonthValue;         // 유휴인력비
  directCostProject: PLMonthValue;     // 사업부직접비 (프로젝트)
  directCostCommon: PLMonthValue;      // 사업부직접비 (공통)
  indirectCost: PLMonthValue;          // 간접비
}

export interface PLAnnualTarget {
  revenue: number;
  deposits: number;
  purchases: number;
  projectLaborInternal: number;
  projectLaborExternal: number;
  divisionLaborCommon: number;
  divisionLaborProposal: number;
  idleLaborCost: number;
  directCostProject: number;
  directCostCommon: number;
  indirectCost: number;
}

export interface PLDivision {
  id: string;
  name: string;
  code: string;
}

export interface AnnualPLRecord {
  id: string;
  divisionId: string;
  year: number;
  annualTarget: PLAnnualTarget;
  prevYearCumulative: PLAnnualTarget;
  monthlyData: PLMonthData[];
}

export interface PLSummary {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  grossProfitRate: number;
  indirectCost: number;
  operatingProfit: number;
  operatingProfitRate: number;
}

export interface QuarterlyReport {
  quarter: string; // "2024-Q1"
  totalManmonth: number;
  averageUtilization: number;
  completedProjects: number;
  groupBreakdown: {
    planning: number;
    design: number;
    publishing: number;
    management: number;
    executive: number;
  };
}