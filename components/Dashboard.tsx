import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { useMobile } from '../hooks/useMobile';
import { useDataStore } from '../hooks/useDataStore';
import { formatCurrency } from '../utils/currency';
import { Users, TrendingUp, Calendar, Clock, Plus, AlertCircle, CheckCircle2, DollarSign, Activity, TrendingDown, Zap, Target, ArrowUpRight, ArrowDownRight, MousePointer2, Eye, ChevronDown, ChevronUp } from 'lucide-react';


const groupColors = {
  'executive': {
    bg: 'apple-card',
    border: 'border-amber-200/50',
    text: 'text-amber-900',
    accent: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    light: 'bg-amber-50/80',
    icon: 'text-amber-600'
  },
  'management': {
    bg: 'apple-card',
    border: 'border-orange-200/50',
    text: 'text-orange-900',
    accent: 'bg-gradient-to-r from-orange-400 to-red-500',
    light: 'bg-orange-50/80',
    icon: 'text-orange-600'
  },
  'planning': {
    bg: 'apple-card',
    border: 'border-purple-200/50',
    text: 'text-purple-900',
    accent: 'bg-gradient-to-r from-purple-400 to-indigo-500',
    light: 'bg-purple-50/80',
    icon: 'text-purple-600'
  },
  'design': {
    bg: 'apple-card',
    border: 'border-blue-200/50',
    text: 'text-blue-900',
    accent: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    light: 'bg-blue-50/80',
    icon: 'text-blue-600'
  },
  'publishing': {
    bg: 'apple-card',
    border: 'border-green-200/50',
    text: 'text-green-900',
    accent: 'bg-gradient-to-r from-green-400 to-emerald-500',
    light: 'bg-green-50/80',
    icon: 'text-green-600'
  }
};

const groupLabels = {
  'executive': '본부장',
  'management': '사업관리팀',
  'planning': '기획그룹',
  'design': '디자인그룹',
  'publishing': '퍼블리싱그룹'
};

interface DashboardProps {
  dataStore: ReturnType<typeof useDataStore>;
  onCreateProject?: () => void;
  onViewReviews?: () => void;
  onViewMonthlyDetails?: (month: 'last' | 'current') => void;
}

export function Dashboard({ dataStore, onCreateProject, onViewReviews, onViewMonthlyDetails }: DashboardProps) {
  const isMobile = useMobile();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loadingGroups, setLoadingGroups] = useState<Record<string, boolean>>({});
  
  // 실제 데이터 사용
  const { members, projects, dashboardStats, groupSummary, utilizationData, groupUtilization } = dataStore;
  
  // 데이터 안전성 확인
  const safeGroupSummary = groupSummary || [];
  const safeUtilizationData = utilizationData || {
    lastMonth: { utilizationRate: 0, idleManmonth: 0, totalCost: 0, idleCost: 0, activeManmonth: 0, totalWorkingDays: 22 },
    thisMonth: { estimatedUtilizationRate: 0, estimatedIdleManmonth: 0, estimatedTotalCost: 0, estimatedIdleCost: 0, estimatedActiveManmonth: 0, totalWorkingDays: 22 },
    comparison: { utilizationChange: 0, costSavings: 0, efficiencyImprovement: 0 }
  };
  const safeGroupUtilization = groupUtilization || [];
  
  const getMemberManmonth = (memberId: string) => {
    return dataStore.memberManmonths.find(mm => mm.memberId === memberId);
  };

  // 그룹 확장/축소 토글 함수 개선
  const toggleGroupExpansion = async (groupKey: string) => {
    console.log(`Toggling group expansion for: ${groupKey}`, { 
      currentState: expandedGroups[groupKey] || false,
      allGroups: expandedGroups 
    });
    
    // 로딩 상태 시작
    setLoadingGroups(prev => ({ ...prev, [groupKey]: true }));
    
    // 상태 업데이트
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
    
    // 짧은 지연으로 자연스러운 애니메이션 효과
    setTimeout(() => {
      setLoadingGroups(prev => ({ ...prev, [groupKey]: false }));
    }, 200);
  };

  // 주요 알림 카드들
  const getAlerts = () => {
    const availableDesignMM = safeGroupSummary.find(g => g.group === 'design')?.totalAvailableManmonth || 0;
    
    return [
      {
        type: 'warning',
        title: '검토 대기 프로젝트',
        message: `${dashboardStats.pendingReviews}건의 프로젝트 승인이 필요합니다`,
        action: '바로 검토하기',
        onClick: onViewReviews,
        urgent: true
      },
      {
        type: 'info',
        title: '배치 가능 인력',
        message: `디자인그룹 ${availableDesignMM.toFixed(1)}MM 배치 가능`,
        action: '프로젝트 배정',
        onClick: onCreateProject,
        urgent: false
      }
    ];
  };



  return (
    <div className="min-h-screen">
      <div className={`space-y-6 w-full max-w-none ${isMobile ? 'px-4 py-6' : 'p-12 max-w-7xl mx-auto space-y-12'}`}>
        {/* 헤더 영역 - Apple 스타일 */}
        <div className={`${isMobile ? 'space-y-6' : 'flex items-center justify-between'}`}>
          <div className="space-y-4 w-full min-w-0">
            <div className={`${isMobile ? 'flex flex-col space-y-4' : 'flex items-center gap-6'}`}>
              <div className="w-full min-w-0">
                <h1 className={`font-bold tracking-tight korean-text ${
                  isMobile ? 'text-2xl leading-tight mb-3' : 'text-5xl'
                }`}>
                  팀 운영 현황
                </h1>
                <p className={`text-muted-foreground korean-text ${
                  isMobile ? 'text-base leading-relaxed' : 'text-xl'
                }`}>
                  프로젝트와 인력 배치를 한눈에 관리하세요
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onCreateProject} 
            size={isMobile ? "default" : "lg"} 
            className={`apple-button-primary gap-3 font-medium korean-text ${
              isMobile ? 'w-full px-6 py-4' : 'gap-3 px-8 py-4 text-base'
            }`}
          >
            <Plus className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'}`} />
            프로젝트 생성
          </Button>
        </div>

        {/* 핵심 지표 카드들 - Apple 스타일 */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4 gap-8'}`}>
          <Card className="apple-card border-blue-200/50 hover:scale-105 transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-5' : 'p-8'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col text-center space-y-3' : ''}`}>
                <div className={`space-y-3 ${isMobile ? 'w-full' : 'space-y-4'}`}>
                  <p className={`font-medium text-primary korean-text ${isMobile ? 'text-sm' : 'text-lg'}`}>전체 팀원</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <p className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'}`}>{dashboardStats.totalMembers}</p>
                    <span className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>명</span>
                  </div>
                  <p className={`text-muted-foreground font-medium korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>
                    평균 가동률 {dashboardStats.averageUtilization.toFixed(1)}%
                  </p>
                </div>
                {!isMobile && (
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl apple-shadow-md">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card border-green-200/50 hover:scale-105 transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-5' : 'p-8'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col text-center space-y-3' : ''}`}>
                <div className={`space-y-3 ${isMobile ? 'w-full' : 'space-y-4'}`}>
                  <p className={`font-medium text-primary korean-text ${isMobile ? 'text-sm' : 'text-lg'}`}>이번달 투입량</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <p className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'}`}>{dashboardStats.totalThisMonthEstimated.toFixed(1)}</p>
                    <span className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>MM</span>
                  </div>
                  <div className={`flex items-center gap-1 justify-center ${isMobile ? 'text-xs' : ''}`}>
                    <ArrowUpRight className={`text-green-600 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <p className={`text-green-700 font-medium korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>지난달 대비 +8%</p>
                  </div>
                </div>
                {!isMobile && (
                  <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl apple-shadow-md">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card border-orange-200/50 hover:scale-105 transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-5' : 'p-8'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col text-center space-y-3' : ''}`}>
                <div className={`space-y-3 ${isMobile ? 'w-full' : 'space-y-4'}`}>
                  <p className={`font-medium text-primary korean-text ${isMobile ? 'text-sm' : 'text-lg'}`}>투입 가능 인력</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <p className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'}`}>{dashboardStats.totalAvailableManmonth.toFixed(1)}</p>
                    <span className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>MM</span>
                  </div>
                  <p className={`text-muted-foreground font-medium korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>새 프로젝트 배정 가능</p>
                </div>
                {!isMobile && (
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl apple-shadow-md">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card border-purple-200/50 hover:scale-105 transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-5' : 'p-8'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col text-center space-y-3' : ''}`}>
                <div className={`space-y-3 ${isMobile ? 'w-full' : 'space-y-4'}`}>
                  <p className={`font-medium text-primary korean-text ${isMobile ? 'text-sm' : 'text-lg'}`}>진행중 프로젝트</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <p className={`font-bold ${isMobile ? 'text-2xl' : 'text-4xl'}`}>{dashboardStats.activeProjects}</p>
                    <span className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>개</span>
                  </div>
                  <p className={`text-muted-foreground font-medium korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>전체 {dashboardStats.totalProjects}개 중</p>
                </div>
                {!isMobile && (
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl apple-shadow-md">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 가동률 및 비용 분석 섹션 */}
        <div className="space-y-6">
          <div className={`flex items-center gap-3 ${isMobile ? 'flex-col text-center' : ''}`}>
            <div className={`flex items-center gap-3 ${isMobile ? 'w-full justify-center' : ''}`}>
              <div className="p-2 bg-blue-100 rounded-xl">
                <Activity className={`text-blue-600 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
              </div>
              <h2 className={`font-bold text-gray-900 korean-text ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                인력 가동률 & 비용 현황
              </h2>
            </div>
            {!isMobile && (
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-full font-medium korean-text">
                📊 카드를 클릭하면 상세 분석을 확인할 수 있어요
              </div>
            )}
          </div>
          
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 gap-8'}`}>
            {/* 지난달 실적 - 클릭 가능 */}
            <Card 
              className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden mobile-card-padding"
              onClick={() => onViewMonthlyDetails?.('last')}
            >
              {/* 클릭 인디케이터 */}
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                  <Eye className="h-4 w-4" />
                </div>
              </div>

              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardHeader className={`pb-4 relative ${isMobile ? 'pb-3' : 'pb-6'}`}>
                <CardTitle className={`flex items-center gap-3 font-bold group-hover:text-red-600 transition-colors korean-text ${
                  isMobile ? 'text-lg flex-col items-start space-y-2' : 'text-2xl'
                }`}>
                  <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                    <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                      <TrendingDown className={`text-red-500 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                    </div>
                    <span className={isMobile ? 'text-base' : ''}>지난달 실적 (1월)</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 group-hover:bg-red-100 korean-text">
                    상세보기
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className={`space-y-4 relative ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 gap-6'}`}>
                  <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 group-hover:border-red-200 transition-colors ${
                    isMobile ? 'p-4' : 'p-6'
                  }`}>
                    <div className={`font-semibold text-gray-700 mb-2 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>팀 가동률</div>
                    <div className={`font-bold text-gray-900 mb-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                      {safeUtilizationData.lastMonth.utilizationRate.toFixed(1)}%
                    </div>
                    <Progress value={safeUtilizationData.lastMonth.utilizationRate} className="h-3 mb-2" />
                    <div className={`font-medium text-gray-600 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      목표 대비 {safeUtilizationData.lastMonth.utilizationRate >= 80 ? '달성' : '미달성'}
                    </div>
                  </div>
                  <div className={`bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 group-hover:border-red-300 transition-colors ${
                    isMobile ? 'p-4' : 'p-6'
                  }`}>
                    <div className={`font-semibold text-red-700 mb-2 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>유휴 인력</div>
                    <div className={`font-bold text-red-900 mb-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                      {safeUtilizationData.lastMonth.idleManmonth.toFixed(1)}MM
                    </div>
                    <div className={`font-semibold text-red-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>
                      비가동률 {(100 - safeUtilizationData.lastMonth.utilizationRate).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <Separator className={`${isMobile ? 'my-4' : 'my-6'}`} />
                
                <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                  <div className={`flex justify-between items-center py-2 ${isMobile ? 'py-1' : ''}`}>
                    <span className={`font-semibold text-gray-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>총 인건비</span>
                    <span className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'}`}>{formatCurrency(safeUtilizationData.lastMonth.totalCost)}</span>
                  </div>
                  <div className={`flex justify-between items-center bg-red-50 rounded-xl px-4 group-hover:bg-red-100 transition-colors ${
                    isMobile ? 'py-2 px-3' : 'py-2'
                  }`}>
                    <span className={`font-semibold text-red-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>유휴 비용</span>
                    <span className={`font-bold text-red-800 ${isMobile ? 'text-lg' : 'text-xl'}`}>{formatCurrency(safeUtilizationData.lastMonth.idleCost)}</span>
                  </div>
                  <div className={`flex justify-between items-center py-2 ${isMobile ? 'py-1' : ''}`}>
                    <span className={`font-medium text-gray-600 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>유휴 비용 비율</span>
                    <span className={`font-bold text-red-600 ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {((safeUtilizationData.lastMonth.idleCost / safeUtilizationData.lastMonth.totalCost) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 클릭 힌트 - 모바일에서는 하단에 고정 */}
                {!isMobile && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-red-500 text-white text-xs px-3 py-2 rounded-full font-medium shadow-lg flex items-center gap-2 korean-text">
                      <MousePointer2 className="h-3 w-3" />
                      클릭하여 상세 분석 보기
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 이번달 예상 - 클릭 가능 */}
            <Card 
              className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer group relative overflow-hidden mobile-card-padding"
              onClick={() => onViewMonthlyDetails?.('current')}
            >
              {/* 클릭 인디케이터 */}
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                  <Eye className="h-4 w-4" />
                </div>
              </div>

              {/* 호버 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <CardHeader className={`pb-4 relative ${isMobile ? 'pb-3' : 'pb-6'}`}>
                <CardTitle className={`flex items-center gap-3 font-bold group-hover:text-green-600 transition-colors korean-text ${
                  isMobile ? 'text-lg flex-col items-start space-y-2' : 'text-2xl'
                }`}>
                  <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                    <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                      <TrendingUp className={`text-green-500 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                    </div>
                    <span className={isMobile ? 'text-base' : ''}>이번달 예상 (2월)</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 group-hover:bg-green-100 korean-text">
                    상세보기
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className={`space-y-4 relative ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 gap-6'}`}>
                  <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 group-hover:border-green-200 transition-colors ${
                    isMobile ? 'p-4' : 'p-6'
                  }`}>
                    <div className={`font-semibold text-gray-700 mb-2 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>팀 가동률</div>
                    <div className={`font-bold text-gray-900 mb-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                      {safeUtilizationData.thisMonth.estimatedUtilizationRate.toFixed(1)}%
                    </div>
                    <Progress value={safeUtilizationData.thisMonth.estimatedUtilizationRate} className="h-3 mb-2" />
                    {safeUtilizationData.comparison.utilizationChange > 0 ? (
                      <div className={`flex items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
                        <ArrowUpRight className={`text-green-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        <span className={`font-semibold text-green-600 korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>
                          +{safeUtilizationData.comparison.utilizationChange.toFixed(1)}% 개선
                        </span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
                        <ArrowDownRight className={`text-red-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        <span className={`font-semibold text-red-600 korean-text ${isMobile ? 'text-xs' : 'text-base'}`}>
                          {safeUtilizationData.comparison.utilizationChange.toFixed(1)}% 감소
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 group-hover:border-orange-300 transition-colors ${
                    isMobile ? 'p-4' : 'p-6'
                  }`}>
                    <div className={`font-semibold text-orange-700 mb-2 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>유휴 인력</div>
                    <div className={`font-bold text-orange-900 mb-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                      {safeUtilizationData.thisMonth.estimatedIdleManmonth.toFixed(1)}MM
                    </div>
                    <div className={`font-semibold text-orange-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>
                      비가동률 {(100 - utilizationData.thisMonth.estimatedUtilizationRate).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <Separator className={`${isMobile ? 'my-4' : 'my-6'}`} />
                
                <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                  <div className={`flex justify-between items-center py-2 ${isMobile ? 'py-1' : ''}`}>
                    <span className={`font-semibold text-gray-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>예상 총 인건비</span>
                    <span className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'}`}>{formatCurrency(utilizationData.thisMonth.estimatedTotalCost)}</span>
                  </div>
                  <div className={`flex justify-between items-center bg-orange-50 rounded-xl px-4 group-hover:bg-orange-100 transition-colors ${
                    isMobile ? 'py-2 px-3' : 'py-2'
                  }`}>
                    <span className={`font-semibold text-orange-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>예상 유휴 비용</span>
                    <span className={`font-bold text-orange-800 ${isMobile ? 'text-lg' : 'text-xl'}`}>{formatCurrency(utilizationData.thisMonth.estimatedIdleCost)}</span>
                  </div>
                  {utilizationData.comparison.costSavings !== 0 && (
                    <div className={`flex justify-between items-center bg-gradient-to-r from-blue-50 to-green-50 rounded-xl px-4 ${
                      isMobile ? 'py-2 px-3' : 'py-2'
                    }`}>
                      <span className={`font-semibold text-gray-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>비용 변화</span>
                      <div className={`flex items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
                        {utilizationData.comparison.costSavings > 0 ? (
                          <ArrowDownRight className={`text-green-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        ) : (
                          <ArrowUpRight className={`text-red-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        )}
                        <span className={`font-bold ${utilizationData.comparison.costSavings > 0 ? 'text-green-600' : 'text-red-600'} ${
                          isMobile ? 'text-base' : 'text-xl'
                        }`}>
                          {utilizationData.comparison.costSavings > 0 ? '절감 ' : '증가 '}{formatCurrency(Math.abs(utilizationData.comparison.costSavings))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 클릭 힌트 - 모바일에서는 하단에 고정 */}
                {!isMobile && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-green-500 text-white text-xs px-3 py-2 rounded-full font-medium shadow-lg flex items-center gap-2 korean-text">
                      <MousePointer2 className="h-3 w-3" />
                      클릭하여 상세 분석 보기
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 그룹별 가동률 비교 - Only show groups that have colors defined */}
        <div className="space-y-6">
          <h2 className={`font-bold text-gray-900 korean-text ${isMobile ? 'text-xl' : 'text-3xl'}`}>팀별 인력 현황</h2>
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3 gap-8'}`}>
            {groupUtilization.filter(group => groupColors[group.group]).map((group) => {
              const colors = groupColors[group.group];
              const improvement = group.thisMonth.estimatedUtilizationRate - group.lastMonth.utilizationRate;
              
              return (
                <Card key={group.group} className={`border-0 shadow-xl ${colors.bg} ${colors.border} hover:shadow-2xl transition-all duration-300 mobile-card-padding`}>
                  <CardHeader className={`${isMobile ? 'pb-4' : 'pb-6'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${colors.accent} shadow-lg`} />
                        <CardTitle className={`font-bold ${colors.text} korean-text ${
                          isMobile ? 'text-lg' : 'text-2xl'
                        }`}>
                          {groupLabels[group.group]}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className={`${colors.light} font-semibold px-3 py-1 ${
                        isMobile ? 'text-sm' : 'text-base'
                      }`}>
                        {group.memberCount}명
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
                    {/* 가동률 비교 */}
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 gap-4'}`}>
                      <div className={`bg-white/80 backdrop-blur rounded-2xl border border-white/50 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}>
                        <div className={`font-semibold text-gray-600 mb-2 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>지난달</div>
                        <div className={`font-bold ${colors.text} mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                          {group.lastMonth.utilizationRate.toFixed(1)}%
                        </div>
                        <Progress value={group.lastMonth.utilizationRate} className="h-2" />
                      </div>
                      <div className={`bg-white/80 backdrop-blur rounded-2xl border border-white/50 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}>
                        <div className={`font-semibold text-gray-600 mb-2 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>이번달 예상</div>
                        <div className={`font-bold ${colors.text} mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                          {group.thisMonth.estimatedUtilizationRate.toFixed(1)}%
                        </div>
                        <Progress value={group.thisMonth.estimatedUtilizationRate} className="h-2" />
                        {improvement !== 0 && (
                          <div className={`flex items-center gap-1 mt-2 ${isMobile ? 'gap-0.5' : ''}`}>
                            {improvement > 0 ? (
                              <>
                                <ArrowUpRight className={`text-green-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                                <span className={`font-semibold text-green-600 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>+{improvement.toFixed(1)}%</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className={`text-red-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                                <span className={`font-semibold text-red-600 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>{improvement.toFixed(1)}%</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 유휴 비용 */}
                    <div className={`bg-white/60 backdrop-blur rounded-2xl border border-white/50 ${
                      isMobile ? 'p-4' : 'p-5'
                    }`}>
                      <div className={`flex justify-between items-center mb-3 ${isMobile ? 'mb-2' : 'mb-4'}`}>
                        <span className={`font-semibold text-gray-700 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>유휴 비용 현황</span>
                        <DollarSign className={`text-gray-500 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      </div>
                      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 gap-4'}`}>
                        <div className="text-center">
                          <span className={`font-medium text-gray-600 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>지난달</span>
                          <div className={`font-bold text-red-600 mt-1 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            {formatCurrency(group.lastMonth.idleCost)}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={`font-medium text-gray-600 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>이번달 예상</span>
                          <div className={`font-bold text-orange-600 mt-1 ${isMobile ? 'text-base' : 'text-lg'}`}>
                            {formatCurrency(group.thisMonth.estimatedIdleCost)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 알림 및 액션 카드 */}
        <div className="space-y-6">
          <h2 className={`font-bold text-gray-900 korean-text ${isMobile ? 'text-xl' : 'text-3xl'}`}>주요 알림</h2>
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 gap-8'}`}>
            {getAlerts().map((alert, index) => (
              <Card key={index} className={`border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 mobile-card-padding ${alert.urgent ? 'ring-2 ring-yellow-200' : ''}`}>
                <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
                  <div className={`flex items-start justify-between ${isMobile ? 'flex-col space-y-3' : ''}`}>
                    <div className={`flex items-start gap-4 flex-1 ${isMobile ? 'w-full' : ''}`}>
                      <div className={`rounded-2xl ${alert.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'} ${
                        isMobile ? 'p-2' : 'p-3'
                      }`}>
                        {alert.type === 'warning' ? 
                          <AlertCircle className={`text-yellow-600 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} /> : 
                          <CheckCircle2 className={`text-blue-600 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                        }
                      </div>
                      <div className={`space-y-1 ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                        <h3 className={`font-bold text-gray-900 korean-text ${isMobile ? 'text-base' : 'text-xl'}`}>{alert.title}</h3>
                        <p className={`text-gray-600 leading-relaxed korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>{alert.message}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size={isMobile ? "default" : "lg"} 
                      onClick={alert.onClick} 
                      className={`font-semibold hover:shadow-lg transition-all korean-text mobile-btn-long ${
                        isMobile ? 'w-full px-4 py-2 text-sm ml-0' : 'ml-4 px-6 py-3 text-base'
                      }`}
                    >
                      {alert.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 팀별 구성원 현황 (간소화) - Only show groups with defined colors and labels */}
        <div className="space-y-6">
          <h2 className={`font-bold text-gray-900 korean-text ${isMobile ? 'text-xl' : 'text-3xl'}`}>팀별 구성원 현황</h2>
          <div className="grid gap-6">
            {safeGroupSummary.filter(groupSummaryItem => groupColors[groupSummaryItem.group] && groupLabels[groupSummaryItem.group]).map((groupSummaryItem) => {
              const groupMembers = members.filter(m => m.group === groupSummaryItem.group);
              const colors = groupColors[groupSummaryItem.group];

              return (
                <Card key={groupSummaryItem.group} className={`border-0 shadow-xl ${colors.bg} ${colors.border} hover:shadow-2xl transition-all duration-300 mobile-card-padding`}>
                  <CardHeader className={`${isMobile ? 'pb-4' : 'pb-6'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${colors.accent} shadow-lg`} />
                        <CardTitle className={`font-bold ${colors.text} korean-text ${
                          isMobile ? 'text-lg' : 'text-2xl'
                        }`}>
                          {groupLabels[groupSummaryItem.group]}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className={`${colors.light} font-semibold px-3 py-1 ${
                        isMobile ? 'text-sm' : 'text-base'
                      }`}>
                        {groupSummaryItem.totalMembers}명
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
                    {/* 그룹 통계 */}
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4 gap-4'}`}>
                      <div className={`bg-white/80 backdrop-blur rounded-xl text-center border border-white/50 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}>
                        <div className={`font-medium text-gray-600 mb-1 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>평균 가동률</div>
                        <div className={`font-bold ${colors.text} ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                          {groupSummaryItem.averageUtilization.toFixed(0)}%
                        </div>
                      </div>
                      <div className={`bg-white/80 backdrop-blur rounded-xl text-center border border-white/50 ${
                        isMobile ? 'p-3' : 'p-4'
                      }`}>
                        <div className={`font-medium text-gray-600 mb-1 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>이번달 투입</div>
                        <div className={`font-bold ${colors.text} ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                          {groupSummaryItem.totalThisMonthEstimated.toFixed(1)}MM
                        </div>
                      </div>
                      {!isMobile && (
                        <>
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-white/50">
                            <div className="text-sm font-medium text-gray-600 mb-1 korean-text">지난달 실적</div>
                            <div className={`text-2xl font-bold ${colors.text}`}>
                              {groupSummaryItem.totalLastMonthActual.toFixed(1)}MM
                            </div>
                          </div>
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-white/50">
                            <div className="text-sm font-medium text-gray-600 mb-1 korean-text">투입 가능</div>
                            <div className={`text-2xl font-bold ${colors.text}`}>
                              {groupSummaryItem.totalAvailableManmonth.toFixed(1)}MM
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 주요 팀원 (상위 3명 또는 전체) */}
                    <div className={`space-y-2 ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold text-gray-900 korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>
                          주요 팀원
                        </h4>
                        <span className={`text-gray-500 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          총 {groupMembers.length}명
                        </span>
                      </div>
                      
                      {/* 표시할 구성원 결정 */}
                      {(() => {
                        const isExpanded = expandedGroups[groupSummaryItem.group] || false;
                        const isLoading = loadingGroups[groupSummaryItem.group] || false;
                        const displayLimit = isMobile ? 2 : 3;
                        const membersToShow = isExpanded ? groupMembers : groupMembers.slice(0, displayLimit);
                        const remainingCount = Math.max(0, groupMembers.length - displayLimit);
                        
                        console.log(`Rendering group ${groupSummaryItem.group}:`, {
                          isExpanded,
                          totalMembers: groupMembers.length,
                          displayLimit,
                          showingCount: membersToShow.length,
                          remainingCount,
                          shouldShowButton: groupMembers.length > displayLimit
                        });
                        
                        return (
                          <>
                            {membersToShow.map((member, index) => {
                              const manmonth = getMemberManmonth(member.id);
                              return (
                                <div 
                                  key={member.id} 
                                  className={`flex items-center gap-3 bg-white/60 rounded-xl border border-white/30 shadow-sm transition-all duration-200 hover:bg-white/80 animate-fadeIn ${
                                    isMobile ? 'p-2' : 'p-3'
                                  }`}
                                  style={{
                                    animationDelay: `${index * 50}ms`
                                  }}>
                                  <Avatar className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`}>
                                    <AvatarFallback className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                      {member.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-gray-900 truncate korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>{member.name}</div>
                                    <div className={`text-gray-600 truncate korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>{member.role}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-bold text-gray-900 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                                      {manmonth?.utilizationRate.toFixed(0) || 0}%
                                    </div>
                                    {manmonth?.thisMonthEstimated && (
                                      <div className={`text-gray-500 korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                        {manmonth.thisMonthEstimated.toFixed(1)}MM
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* 더보기/접기 버튼 */}
                            {groupMembers.length > displayLimit && (
                              <Button 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(`Button clicked for group: ${groupSummaryItem.group}, current state: ${isExpanded}`);
                                  toggleGroupExpansion(groupSummaryItem.group);
                                }}
                                className={`w-full hover:bg-white/60 transition-all duration-200 korean-text group border border-white/30 hover:border-white/60 ${
                                  isMobile ? 'text-sm py-2' : 'text-sm py-3'
                                } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                                type="button"
                                disabled={isLoading}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} transition-transform group-hover:scale-110`} />
                                      <span>접기</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} transition-transform group-hover:scale-110`} />
                                      <span>+{remainingCount}명 더 보기</span>
                                    </>
                                  )}
                                </div>
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}