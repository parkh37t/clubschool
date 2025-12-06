import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { mockMembers, mockMemberManmonths, calculateUtilizationData, calculateGroupUtilization } from '../data/mockData';
import { formatCurrency } from '../utils/currency';
import { useIsMobile } from './ui/use-mobile';
import { MobileHeader } from './MobileHeader';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Target, AlertCircle, CheckCircle2, Activity, Clock, Award, Star, UserCheck, ArrowUpRight, ArrowDownRight, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const groupColors = {
  'executive': {
    bg: 'linear-gradient(135deg, var(--chart-5), rgba(255, 45, 146, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-5)',
    light: 'var(--accent)',
    color: 'var(--chart-5)'
  },
  'management': {
    bg: 'linear-gradient(135deg, var(--chart-3), rgba(255, 149, 0, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-3)',
    light: 'var(--accent)',
    color: 'var(--chart-3)'
  },
  'planning': {
    bg: 'linear-gradient(135deg, var(--chart-4), rgba(175, 82, 222, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-4)',
    light: 'var(--accent)',
    color: 'var(--chart-4)'
  },
  'design': {
    bg: 'linear-gradient(135deg, var(--chart-1), rgba(0, 122, 255, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-1)',
    light: 'var(--accent)',
    color: 'var(--chart-1)'
  },
  'publishing': {
    bg: 'linear-gradient(135deg, var(--chart-2), rgba(52, 199, 89, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-2)',
    light: 'var(--accent)',
    color: 'var(--chart-2)'
  }
};

const groupLabels = {
  'executive': '본부장',
  'management': '사업관리팀',
  'planning': '기획팀',
  'design': '디자인팀',
  'publishing': '개발팀'
};

interface MonthlyDetailsViewProps {
  month: 'last' | 'current';
  onBack: () => void;
}

export function MonthlyDetailsView({ month, onBack }: MonthlyDetailsViewProps) {
  const isMobile = useIsMobile();
  const utilizationData = calculateUtilizationData();
  const groupUtilization = calculateGroupUtilization();

  const isLastMonth = month === 'last';
  const monthData = isLastMonth ? utilizationData.lastMonth : utilizationData.thisMonth;
  const monthName = isLastMonth ? '1월 (지난달 실적)' : '2월 (이번달 예상)';
  const dataType = isLastMonth ? '실적' : '예상';



  const getMemberManmonth = (memberId: string) => {
    return mockMemberManmonths.find(mm => mm.memberId === memberId);
  };

  const getPerformanceIcon = (rate: number) => {
    if (rate >= 90) return <Star className="h-4 w-4 text-yellow-500" />;
    if (rate >= 80) return <Award className="h-4 w-4 text-blue-500" />;
    if (rate >= 70) return <UserCheck className="h-4 w-4 text-green-500" />;
    return <Users className="h-4 w-4 text-gray-500" />;
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 85) return 'text-green-600 bg-green-100';
    if (rate >= 70) return 'text-blue-600 bg-blue-100';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // 차트 데이터 준비
  const teamUtilizationData = groupUtilization
    .filter(group => groupColors[group.group])
    .map(group => ({
      name: groupLabels[group.group],
      utilization: isLastMonth ? group.lastMonth.utilizationRate : group.thisMonth.estimatedUtilizationRate,
      members: group.memberCount,
      idleCost: isLastMonth ? group.lastMonth.idleCost : group.thisMonth.estimatedIdleCost,
      color: groupColors[group.group].color
    }));

  const costBreakdownData = groupUtilization
    .filter(group => groupColors[group.group])
    .map(group => ({
      name: groupLabels[group.group],
      activeCost: (isLastMonth ? group.lastMonth.totalCost - group.lastMonth.idleCost : group.thisMonth.estimatedTotalCost - group.thisMonth.estimatedIdleCost),
      idleCost: isLastMonth ? group.lastMonth.idleCost : group.thisMonth.estimatedIdleCost,
      fill: groupColors[group.group].color
    }));

  // 주간 추이 데이터 (시뮬레이션)
  const weeklyTrendData = [
    { week: '1주차', utilization: isLastMonth ? 68.5 : 75.2 },
    { week: '2주차', utilization: isLastMonth ? 71.2 : 78.1 },
    { week: '3주차', utilization: isLastMonth ? 73.8 : 80.5 },
    { week: '4주차', utilization: isLastMonth ? 76.1 : 82.3 }
  ];

  // 상위 성과자 / 개선 필요 팀원
  const sortedMembers = mockMembers
    .map(member => {
      const manmonth = getMemberManmonth(member.id);
      return { ...member, manmonth };
    })
    .filter(member => member.manmonth)
    .sort((a, b) => (b.manmonth?.utilizationRate || 0) - (a.manmonth?.utilizationRate || 0));

  const topPerformers = sortedMembers.slice(0, 5);
  const needsImprovement = sortedMembers.slice(-5).reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* 모바일 헤더 */}
      <MobileHeader 
        title="대시보드로 돌아가기"
        onBack={onBack}
        subtitle={`${monthName} 상세`}
        showLogo={true}
      />

      <div className={`${isMobile ? 'p-4' : 'p-8'} space-y-${isMobile ? '6' : '10'} max-w-7xl mx-auto`}>
        {/* 데스크톱 헤더 */}
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={onBack}
                className="gap-3 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
                대시보드로 돌아가기
              </Button>
              <div className="flex items-center gap-4">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="w-px h-8 bg-gray-300"></div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{monthName} 상세 분석</h1>
                  <p className="text-xl text-gray-600">팀별 가동률과 비용 효��성을 자세히 확인하세요</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모바일 제목 섹션 */}
        {isMobile && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{monthName} 상세 분석</h1>
            <p className="text-gray-600 text-sm">팀별 가동률과 비용 효율성을 확인하세요</p>
          </div>
        )}

        {/* 월별 핵심 지표 */}
        <div className={`grid grid-cols-2 ${isMobile ? '' : 'lg:grid-cols-4'} gap-${isMobile ? '4' : '8'}`}>
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-blue-800`}>평균 가동률</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-blue-900`}>
                      {(isLastMonth ? monthData.utilizationRate : monthData.estimatedUtilizationRate).toFixed(1)}%
                    </p>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-base'} font-medium text-blue-700`}>
                    목표 80% {(isLastMonth ? monthData.utilizationRate : monthData.estimatedUtilizationRate) >= 80 ? '달성' : '미달'}
                  </p>
                </div>
                <div className={`${isMobile ? 'p-2' : 'p-4'} bg-blue-500 rounded-2xl shadow-lg`}>
                  <Activity className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-red-800`}>유휴 인력</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-red-900`}>
                      {(isLastMonth ? monthData.idleManmonth : monthData.estimatedIdleManmonth).toFixed(1)}
                    </p>
                    <span className={`${isMobile ? 'text-sm' : 'text-lg'} text-red-700`}>MM</span>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-base'} font-medium text-red-700`}>
                    비가동률 {(100 - (isLastMonth ? monthData.utilizationRate : monthData.estimatedUtilizationRate)).toFixed(1)}%
                  </p>
                </div>
                <div className={`${isMobile ? 'p-2' : 'p-4'} bg-red-500 rounded-2xl shadow-lg`}>
                  <Clock className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-green-800`}>{dataType} 총 인건비</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold text-green-900`}>
                      {formatCurrency(isLastMonth ? monthData.totalCost : monthData.estimatedTotalCost)}
                    </p>
                  </div>
                  {!isMobile && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="text-base font-medium text-green-700">프로젝트 투입 비용</p>
                    </div>
                  )}
                </div>
                <div className={`${isMobile ? 'p-2' : 'p-4'} bg-green-500 rounded-2xl shadow-lg`}>
                  <DollarSign className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
            <CardContent className={`${isMobile ? 'p-4' : 'p-8'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-orange-800`}>유휴 비용</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold text-orange-900`}>
                      {formatCurrency(isLastMonth ? monthData.idleCost : monthData.estimatedIdleCost)}
                    </p>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-base'} font-medium text-orange-700`}>
                    전체 비용의 {(((isLastMonth ? monthData.idleCost : monthData.estimatedIdleCost) / (isLastMonth ? monthData.totalCost : monthData.estimatedTotalCost)) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className={`${isMobile ? 'p-2' : 'p-4'} bg-orange-500 rounded-2xl shadow-lg`}>
                  <AlertCircle className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 분석 탭 */}
        <Tabs defaultValue="team-analysis" className="space-y-8">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} p-2 ${isMobile ? 'h-12' : 'h-14'} bg-gray-100 rounded-2xl`}>
            <TabsTrigger value="team-analysis" className={`font-semibold ${isMobile ? 'py-2 text-xs' : 'py-3'} rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md`}>
              <Users className="h-4 w-4 mr-2" />
              {isMobile ? '팀별' : '팀별 분석'}
            </TabsTrigger>
            <TabsTrigger value="performance" className={`font-semibold ${isMobile ? 'py-2 text-xs' : 'py-3'} rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md`}>
              <Target className="h-4 w-4 mr-2" />
              {isMobile ? '성과' : '성과 분석'}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="cost-analysis" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <DollarSign className="h-4 w-4 mr-2" />
                  비용 분석
                </TabsTrigger>
                <TabsTrigger value="trends" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  추이 분석
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="team-analysis" className="space-y-8">
            {/* 팀별 가동률 차트 */}
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 flex items-center gap-3`}>
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Users className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-blue-600`} />
                  </div>
                  팀별 가동률 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                  <BarChart data={teamUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: isMobile ? 12 : 14, fontWeight: 500 }}
                      axisLine={{ stroke: '#9ca3af' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: isMobile ? 12 : 14, fontWeight: 500 }}
                      axisLine={{ stroke: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      formatter={(value: any, name: string) => [
                        `${value.toFixed(1)}%`, 
                        '가동률'
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar 
                      dataKey="utilization" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                      name="가동률"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 팀별 상세 현황 */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-${isMobile ? '4' : '8'}`}>
              {groupUtilization.filter(group => groupColors[group.group]).map((group) => {
                const colors = groupColors[group.group];
                const groupData = isLastMonth ? group.lastMonth : group.thisMonth;
                const utilizationRate = isLastMonth ? groupData.utilizationRate : groupData.estimatedUtilizationRate;
                const idleCost = isLastMonth ? groupData.idleCost : groupData.estimatedIdleCost;
                const totalCost = isLastMonth ? groupData.totalCost : groupData.estimatedTotalCost;
                
                return (
                  <Card key={group.group} className={`border-0 shadow-xl ${colors.bg} ${colors.border} hover:shadow-2xl transition-all duration-300`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${colors.accent} shadow-lg`} />
                          <CardTitle className={`${isMobile ? 'text-base' : 'text-xl'} font-bold ${colors.text}`}>
                            {groupLabels[group.group]}
                          </CardTitle>
                        </div>
                        <Badge className={`${colors.light} ${isMobile ? 'text-sm' : 'text-base'} font-semibold px-3 py-1`}>
                          {group.memberCount}명
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className={`space-y-${isMobile ? '4' : '6'}`}>
                      <div className="bg-white/80 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">가동률</span>
                          <span className={`${isMobile ? 'text-base' : 'text-lg'} font-bold px-2 py-1 rounded ${getUtilizationColor(utilizationRate)}`}>
                            {utilizationRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={utilizationRate} className="h-3" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/80 rounded-xl p-4 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">총 비용</div>
                          <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold ${colors.text}`}>
                            {formatCurrency(totalCost)}
                          </div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">유휴 비용</div>
                          <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-red-600`}>
                            {formatCurrency(idleCost)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/60 rounded-xl p-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">비용 효율성</div>
                        <div className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900`}>
                          {((1 - idleCost / totalCost) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-8">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-${isMobile ? '6' : '8'}`}>
              {/* 상위 성과자 */}
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 flex items-center gap-3`}>
                    <div className="p-2 bg-green-100 rounded-xl">
                      <Star className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-green-600`} />
                    </div>
                    상위 성과자 (Top 5)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topPerformers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <Avatar className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`}>
                          <AvatarFallback className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold`}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className={`${isMobile ? 'text-sm' : ''} font-semibold text-gray-900`}>{member.name}</div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>{member.role}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {groupLabels[member.group]}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {getPerformanceIcon(member.manmonth?.utilizationRate || 0)}
                        <div className="text-right">
                          <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-green-700`}>
                            {member.manmonth?.utilizationRate.toFixed(0) || 0}%
                          </div>
                          <div className="text-xs text-gray-600">
                            {member.manmonth?.thisMonthEstimated.toFixed(1) || 0}MM
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 개선 필요 팀원 */}
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 flex items-center gap-3`}>
                    <div className="p-2 bg-orange-100 rounded-xl">
                      <AlertCircle className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-orange-600`} />
                    </div>
                    개선 필요 팀원
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {needsImprovement.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <Avatar className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`}>
                          <AvatarFallback className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold`}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className={`${isMobile ? 'text-sm' : ''} font-semibold text-gray-900`}>{member.name}</div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>{member.role}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {groupLabels[member.group]}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {getPerformanceIcon(member.manmonth?.utilizationRate || 0)}
                        <div className="text-right">
                          <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-orange-600`}>
                            {member.manmonth?.utilizationRate.toFixed(0) || 0}%
                          </div>
                          <div className="text-xs text-gray-600">
                            개선 여지: {member.manmonth?.availableManmonth.toFixed(1) || 0}MM
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {!isMobile && (
            <>
              <TabsContent value="cost-analysis" className="space-y-8">
                {/* 비용 구성 차트 */}
                <Card className="border-0 shadow-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <DollarSign className="h-6 w-6 text-purple-600" />
                      </div>
                      팀별 비용 구성 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={costBreakdownData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 14, fontWeight: 500 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 14, fontWeight: 500 }}
                          tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: any, name: string) => [
                            formatCurrency(value), 
                            name === 'activeCost' ? '활용 비용' : '유휴 비용'
                          ]}
                        />
                        <Bar dataKey="activeCost" stackId="a" fill="#10B981" name="활용 비용" />
                        <Bar dataKey="idleCost" stackId="a" fill="#F59E0B" name="유휴 비용" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-8">
                {/* 주간 추이 차트 */}
                <Card className="border-0 shadow-xl bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                      </div>
                      주간 가동률 추이
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={weeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="week" 
                          tick={{ fontSize: 14, fontWeight: 500 }}
                        />
                        <YAxis 
                          domain={[60, 90]}
                          tick={{ fontSize: 14, fontWeight: 500 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: any) => [`${value.toFixed(1)}%`, '가동률']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="utilization" 
                          stroke="#6366F1" 
                          strokeWidth={3}
                          dot={{ fill: '#6366F1', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, fill: '#6366F1' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* 푸터 */}
        {!isMobile && (
          <div className="border-t pt-8">
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Building2 className="h-5 w-5 opacity-60" />
              <span className="text-sm">Powered by Clubschool • Monthly Details</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}