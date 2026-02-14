import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts';
import { Target, TrendingUp, TrendingDown, Calendar, Users, AlertTriangle, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Trophy, Clock, Activity } from 'lucide-react';
import { useMobile } from '../hooks/useMobile';


// 56명 규모의 시뮬레이션 데이터
const yearlyUtilizationData = {
  year: 2024,
  annualTarget: 90,
  currentAverageUtilization: 74.5,
  projectedYearEndUtilization: 87.8,
  targetAchievementProbability: 82,
  totalMembers: 56,
  monthlyData: [
    { month: "2024-01", targetUtilization: 85, actualUtilization: 73.2, plannedUtilization: 85, deviation: -11.8, status: 'critical' as const },
    { month: "2024-02", targetUtilization: 87, actualUtilization: 76.1, plannedUtilization: 87, deviation: -10.9, status: 'warning' as const },
    { month: "2024-03", targetUtilization: 88, actualUtilization: 79.5, plannedUtilization: 88, deviation: -8.5, status: 'warning' as const },
    { month: "2024-04", targetUtilization: 89, actualUtilization: 82.1, plannedUtilization: 89, deviation: -6.9, status: 'warning' as const },
    { month: "2024-05", targetUtilization: 90, actualUtilization: 84.3, plannedUtilization: 90, deviation: -5.7, status: 'warning' as const },
    { month: "2024-06", targetUtilization: 90, actualUtilization: 86.2, plannedUtilization: 90, deviation: -3.8, status: 'warning' as const },
    { month: "2024-07", targetUtilization: 91, actualUtilization: 88.1, plannedUtilization: 91, deviation: -2.9, status: 'warning' as const },
    { month: "2024-08", targetUtilization: 91, actualUtilization: 89.8, plannedUtilization: 91, deviation: -1.2, status: 'achieved' as const },
    { month: "2024-09", targetUtilization: 90, actualUtilization: 89.4, plannedUtilization: 90, deviation: -0.6, status: 'achieved' as const },
    { month: "2024-10", targetUtilization: 90, actualUtilization: 90.2, plannedUtilization: 90, deviation: +0.2, status: 'achieved' as const },
    { month: "2024-11", targetUtilization: 89, actualUtilization: 0, plannedUtilization: 89, deviation: 0, status: 'warning' as const },
    { month: "2024-12", targetUtilization: 88, actualUtilization: 0, plannedUtilization: 88, deviation: 0, status: 'warning' as const }
  ],
  groupBreakdown: {
    executive: { memberCount: 1, currentAverageUtilization: 95.0, projectedYearEndUtilization: 95.0, targetAchievementStatus: 'on-track' as const },
    management: { memberCount: 1, currentAverageUtilization: 85.0, projectedYearEndUtilization: 89.0, targetAchievementStatus: 'at-risk' as const },
    planning: { memberCount: 32, currentAverageUtilization: 71.0, projectedYearEndUtilization: 86.5, targetAchievementStatus: 'behind' as const },
    design: { memberCount: 14, currentAverageUtilization: 78.0, projectedYearEndUtilization: 89.2, targetAchievementStatus: 'at-risk' as const },
    publishing: { memberCount: 8, currentAverageUtilization: 76.0, projectedYearEndUtilization: 88.5, targetAchievementStatus: 'at-risk' as const }
  }
};

const groupColors = {
  executive: '#8B5CF6',
  management: '#F59E0B',
  planning: '#8B5CF6',
  design: '#06B6D4',
  publishing: '#10B981'
};

const groupLabels = {
  executive: '본부장',
  management: '사업관리팀',
  planning: '기획팀',
  design: '디자인팀',
  publishing: '개발팀'
};

const statusColors = {
  'achieved': 'bg-green-100 text-green-800 border-green-200',
  'warning': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'critical': 'bg-red-100 text-red-800 border-red-200'
};

const statusIcons = {
  'achieved': CheckCircle2,
  'warning': AlertTriangle,
  'critical': AlertTriangle
};

const insights = [
  {
    type: 'warning' as const,
    priority: 'high' as const,
    title: '기획팀 가동률 개선 필요',
    description: '기획팀의 현재 평균 가동률이 71.0%로 목표 대비 19% 부족합니다.',
    impact: '연간 목표 달성을 위해 즉시 개선이 필요한 상황입니다.',
    actionItems: [
      '기획팀 업무 프로세스 최적화',
      '외부 기획 인력 단기 충원 검토',
      '타 팀과의 업무 분담 재조정'
    ],
    affectedGroups: ['planning'],
    timeframe: '1개월 내'
  },
  {
    type: 'recommendation' as const,
    priority: 'medium' as const,
    title: '하반기 가동률 집중 관리',
    description: '현재 추세로는 연말 87.8% 달성 예상으로 목표에 근접하고 있습니다.',
    impact: '추가 2.2% 개선으로 목표 달성 가능합니다.',
    actionItems: [
      '11-12월 프로젝트 일정 최적화',
      '연말 휴가철 대비 인력 배치 계획',
      '목표 달성 인센티브 제도 도입'
    ],
    affectedGroups: ['planning', 'design', 'publishing'],
    timeframe: '3개월 내'
  },
  {
    type: 'achievement' as const,
    priority: 'low' as const,
    title: '본부장 우수 성과 유지',
    description: '본부장 95%로 안정적인 가동률을 보이고 있습니다.',
    impact: '조직 전체의 벤치마킹 대상으로 활용 가능합니다.',
    actionItems: [
      '우수 사례 전파 워크숍 개최',
      '베스트 프랙티스 문서화',
      '타 팀 멘토링 프로그램 운영'
    ],
    affectedGroups: ['executive'],
    timeframe: '진행중'
  }
];

interface YearlyUtilizationProps {
  dataStore: ReturnType<typeof import('../hooks/useDataStore').useDataStore>;
}

export function YearlyUtilization({ dataStore }: YearlyUtilizationProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('current-year');
  const [selectedView, setSelectedView] = useState('overview');
  const isMobile = useMobile();

  // 차트 데이터 포맷팅
  const monthlyChartData = yearlyUtilizationData.monthlyData.map(item => ({
    month: item.month.split('-')[1] + '월',
    target: item.targetUtilization,
    actual: item.actualUtilization || null,
    planned: item.plannedUtilization,
    status: item.status
  }));

  const groupPerformanceData = Object.entries(yearlyUtilizationData.groupBreakdown).map(([key, data]) => ({
    name: groupLabels[key as keyof typeof groupLabels],
    current: data.currentAverageUtilization,
    projected: data.projectedYearEndUtilization,
    members: data.memberCount,
    group: key
  }));

  // Excel 다운로드 함수
  const downloadExcel = () => {
    const data = [
      ['월', '목표가동률(%)', '실제가동률(%)', '편차(%)', '상태'],
      ...yearlyUtilizationData.monthlyData.map(item => [
        item.month,
        item.targetUtilization,
        item.actualUtilization || '-',
        item.deviation || '-',
        item.status === 'achieved' ? '달성' : item.status === 'warning' ? '주의' : '위험'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `연간_가동률_현황_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      <div className={`space-y-8 max-w-7xl mx-auto ${isMobile ? 'mobile-padding' : 'p-8'}`}>
        {/* 헤더 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">연간 가동률 관리</h1>
              <p className="text-xl text-muted-foreground">목표 90% 달성을 위한 월별 성과 추적 및 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="glass-button w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="current-year">2024년 현황</SelectItem>
                <SelectItem value="last-year">2023년 비교</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={downloadExcel} className="glass-button gap-3">
              <FileSpreadsheet className="h-5 w-5" />
              {!isMobile && "데이터 다운로드"}
            </Button>
          </div>
        </div>

        {/* 핵심 지표 카드들 */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          <Card className="apple-card" style={{ background: 'linear-gradient(135deg, var(--chart-1), rgba(0, 122, 255, 0.1))' }}>
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-primary-foreground opacity-90">연간 목표</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-primary-foreground`}>{yearlyUtilizationData.annualTarget}%</p>
                  </div>
                  {!isMobile && <p className="text-sm text-primary-foreground opacity-80">프로젝트 수행본부</p>}
                </div>
                <div className="glass p-3 rounded-xl">
                  <Target className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-primary`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card" style={{ background: 'linear-gradient(135deg, var(--chart-2), rgba(52, 199, 89, 0.1))' }}>
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-primary-foreground opacity-90">현재 평균</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-primary-foreground`}>{yearlyUtilizationData.currentAverageUtilization}%</p>
                  </div>
                  {!isMobile && (
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-primary-foreground opacity-80" />
                      <p className="text-sm text-primary-foreground opacity-80">목표 대비 -15.5%</p>
                    </div>
                  )}
                </div>
                <div className="glass p-3 rounded-xl">
                  <Activity className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-chart-2`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card" style={{ background: 'linear-gradient(135deg, var(--chart-4), rgba(175, 82, 222, 0.1))' }}>
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-primary-foreground opacity-90">연말 예상</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-primary-foreground`}>{yearlyUtilizationData.projectedYearEndUtilization}%</p>
                  </div>
                  {!isMobile && <p className="text-sm text-primary-foreground opacity-80">목표까지 2.2%</p>}
                </div>
                <div className="glass p-3 rounded-xl">
                  <TrendingUp className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-chart-4`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card" style={{ background: 'linear-gradient(135deg, var(--chart-3), rgba(255, 149, 0, 0.1))' }}>
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-medium text-primary-foreground opacity-90">달성 확률</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-primary-foreground`}>{yearlyUtilizationData.targetAchievementProbability}%</p>
                  </div>
                  {!isMobile && <p className="text-sm text-primary-foreground opacity-80">개선 필요</p>}
                </div>
                <div className="glass p-3 rounded-xl">
                  <Trophy className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-chart-3`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-8">
          <TabsList className="glass-card grid w-full grid-cols-3 p-2 h-14">
            <TabsTrigger value="overview" className="glass-button rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              {!isMobile ? "월별 현황" : "월별"}
            </TabsTrigger>
            <TabsTrigger value="groups" className="glass-button rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              {!isMobile ? "팀별 분석" : "팀별"}
            </TabsTrigger>
            <TabsTrigger value="insights" className="glass-button rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4 mr-2" />
              {!isMobile ? "개선 인사이트" : "인사이트"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* 월별 진척 차트 */}
            <Card className="apple-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="glass p-2 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  2024년 월별 가동률 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 450}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis 
                      domain={[65, 95]}
                      tick={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card-backdrop)', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: 'var(--radius-lg)', 
                        backdropFilter: 'blur(20px)',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--foreground)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="var(--destructive)" 
                      strokeWidth={3}
                      strokeDasharray="8 8"
                      name="목표 가동률"
                      dot={{ r: 5, strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="var(--chart-2)" 
                      strokeWidth={3}
                      name="실제 가동률"
                      dot={{ r: 6, strokeWidth: 3 }}
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="planned" 
                      stroke="var(--muted-foreground)" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      name="계획 가동률"
                      dot={{ r: 3, strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 월별 상세 현황 */}
            <div className="grid gap-6">
              <h2 className="text-2xl font-bold text-gray-900">월별 상세 현황</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {yearlyUtilizationData.monthlyData.slice(0, 10).map((month, index) => {
                  const StatusIcon = statusIcons[month.status];
                  return (
                    <Card key={month.month} className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900">{month.month.split('-')[1]}월</h3>
                          <Badge className={`${statusColors[month.status]} text-sm font-semibold px-3 py-1 flex items-center gap-2`}>
                            <StatusIcon className="h-3 w-3" />
                            {month.status === 'achieved' ? '달성' : month.status === 'warning' ? '주의' : '위험'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-600">목표</span>
                              <span className="text-lg font-bold text-gray-900">{month.targetUtilization}%</span>
                            </div>
                            <Progress value={month.targetUtilization} className="h-2" />
                          </div>
                          
                          {month.actualUtilization > 0 && (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600">실제</span>
                                <span className="text-lg font-bold text-green-600">{month.actualUtilization}%</span>
                              </div>
                              <Progress value={month.actualUtilization} className="h-2" />
                            </div>
                          )}
                          
                          {month.deviation !== 0 && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">편차</span>
                                <span className={`text-lg font-bold ${month.deviation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {month.deviation > 0 ? '+' : ''}{month.deviation.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-8">
            {/* 팀별 성과 비교 차트 */}
            <Card className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  팀별 가동률 현황 및 전망
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={groupPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 14, fontWeight: 500 }}
                      axisLine={{ stroke: '#9ca3af' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 14, fontWeight: 500 }}
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
                    />
                    <Bar dataKey="current" fill="#10b981" name="현재 평균 가동률" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="projected" fill="#6366f1" name="연말 예상 가동률" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 팀별 상세 현황 */}
            <div className="grid gap-8">
              <h2 className="text-2xl font-bold text-gray-900">팀별 상세 분석</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(yearlyUtilizationData.groupBreakdown).map(([key, data]) => {
                  const groupKey = key as keyof typeof groupLabels;
                  const statusColor = data.targetAchievementStatus === 'on-track' ? 'green' : 
                                     data.targetAchievementStatus === 'at-risk' ? 'yellow' : 'red';
                  
                  return (
                    <Card key={key} className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: groupColors[groupKey] }}
                            />
                            {groupLabels[groupKey]}
                          </CardTitle>
                          <Badge className={`bg-${statusColor}-100 text-${statusColor}-800 border-${statusColor}-200 text-sm font-semibold px-3 py-1`}>
                            {data.memberCount}명
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-xl">
                            <div className="text-sm font-medium text-blue-600 mb-1">현재 평균</div>
                            <div className="text-2xl font-bold text-blue-800">{data.currentAverageUtilization.toFixed(1)}%</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-xl">
                            <div className="text-sm font-medium text-purple-600 mb-1">연말 예상</div>
                            <div className="text-2xl font-bold text-purple-800">{data.projectedYearEndUtilization.toFixed(1)}%</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">목표 달성 상태</span>
                            <Badge className={`bg-${statusColor}-100 text-${statusColor}-800 border-${statusColor}-200`}>
                              {data.targetAchievementStatus === 'on-track' ? '순조' : 
                               data.targetAchievementStatus === 'at-risk' ? '위험' : '지연'}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-600">목표 대비 진척</span>
                              <span className="text-sm font-bold text-gray-900">
                                {((data.projectedYearEndUtilization / 90) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={(data.projectedYearEndUtilization / 90) * 100} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-8">
            <div className="grid gap-8">
              <h2 className="text-2xl font-bold text-gray-900">개선 인사이트 및 권장사항</h2>
              {insights.map((insight, index) => {
                const typeColors = {
                  achievement: 'bg-green-50 border-green-200',
                  warning: 'bg-yellow-50 border-yellow-200',
                  recommendation: 'bg-blue-50 border-blue-200'
                };
                
                const priorityColors = {
                  high: 'bg-red-100 text-red-800 border-red-200',
                  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
                  low: 'bg-green-100 text-green-800 border-green-200'
                };

                return (
                  <Card key={index} className={`border-0 shadow-xl ${typeColors[insight.type]} hover:shadow-2xl transition-all duration-300`}>
                    <CardHeader className="pb-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <Badge className={`${priorityColors[insight.priority]} text-base font-semibold px-4 py-2`}>
                              {insight.priority === 'high' ? '높음' : insight.priority === 'medium' ? '보통' : '낮음'} 우선순위
                            </Badge>
                            <Badge variant="outline" className="text-sm font-medium">
                              {insight.timeframe}
                            </Badge>
                          </div>
                          <CardTitle className="text-2xl font-bold text-gray-900">{insight.title}</CardTitle>
                          <p className="text-lg text-gray-600 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/50">
                        <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-500" />
                          예상 효과
                        </h4>
                        <p className="text-base text-gray-700 leading-relaxed">{insight.impact}</p>
                      </div>
                      
                      <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/50">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">실행 방안</h4>
                        <ul className="space-y-3">
                          {insight.actionItems.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-base text-gray-700 flex items-start gap-3 leading-relaxed">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {insight.affectedGroups.map((group) => (
                          <Badge key={group} variant="outline" className="text-sm font-medium">
                            {groupLabels[group as keyof typeof groupLabels]}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}