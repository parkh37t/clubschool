import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, Calendar, Download, Filter, BarChart3, PieChart as PieChartIcon, Activity, Target, FileSpreadsheet } from 'lucide-react';
import { mockMonthlyData, mockQuarterlyData, mockMemberPerformances, mockOptimizationRecommendations } from '../data/mockData';
import { useMobile } from '../hooks/useMobile';


const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

interface AnalyticsProps {
  dataStore: ReturnType<typeof import('../hooks/useDataStore').useDataStore>;
}

export function Analytics({ dataStore }: AnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('last-6-months');
  const [selectedMetric, setSelectedMetric] = useState('utilization');
  const isMobile = useMobile();

  // 차트 데이터 준비
  const chartData = mockMonthlyData.map(item => ({
    month: item.month.split('-')[1] + '월',
    planning: item.planning,
    design: item.design,
    publishing: item.publishing,
    total: item.total
  }));

  const pieChartData = [
    { name: '기획그룹', value: 32, color: 'var(--chart-1)' },
    { name: '디자인그룹', value: 14, color: 'var(--chart-2)' },
    { name: '퍼블리싱그룹', value: 8, color: 'var(--chart-3)' },
    { name: '사업관리팀', value: 1, color: 'var(--chart-4)' },
    { name: '본부장', value: 1, color: 'var(--chart-5)' }
  ];

  const performanceData = mockMemberPerformances.slice(0, 10).map((perf, index) => ({
    name: `구성원 ${index + 1}`,
    utilization: perf.averageUtilization,
    performance: perf.averagePerformance,
    projects: perf.totalProjects,
    manmonth: perf.totalManmonth
  }));

  const downloadReport = () => {
    // Excel/PDF 다운로드 기능
    const data = [
      ['기간', '기획그룹(MM)', '디자인그룹(MM)', '퍼블리싱그룹(MM)', '전체(MM)'],
      ...mockMonthlyData.map(item => [
        item.month,
        item.planning,
        item.design, 
        item.publishing,
        item.total
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `인력투입분석_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      <div className={`space-y-8 max-w-7xl mx-auto ${isMobile ? 'mobile-padding' : 'p-8'}`}>
        {/* 헤더 영역 */}
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} justify-between gap-6`}>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">데이터 분석</h1>
            <p className="text-xl text-muted-foreground">프로젝트 성과와 인력 효율성을 분석합니다</p>
          </div>
          <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4`}>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className={`glass-button ${isMobile ? 'w-full' : 'w-48'} touch-friendly`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card">
                <SelectItem value="last-6-months">최근 6개월</SelectItem>
                <SelectItem value="last-year">최근 1년</SelectItem>
                <SelectItem value="quarterly">분기별 분석</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={downloadReport} 
              className="glass-button touch-friendly gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {!isMobile && "분석 리포트"}
            </Button>
          </div>
        </div>

        {/* 핵심 지표 요약 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-purple-800">평균 가동률</p>
                  <p className="text-3xl font-bold text-purple-900">74.5%</p>
                  <p className="text-sm text-purple-600">목표: 80%</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-blue-800">월평균 투입</p>
                  <p className="text-3xl font-bold text-blue-900">42.1MM</p>
                  <p className="text-sm text-blue-600">전월 대비 +3.2%</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-green-800">프로젝트 수</p>
                  <p className="text-3xl font-bold text-green-900">23</p>
                  <p className="text-sm text-green-600">활성: 15개</p>
                </div>
                <div className="p-3 bg-green-500 rounded-xl">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-orange-800">그룹 효율성</p>
                  <p className="text-3xl font-bold text-orange-900">8.2/10</p>
                  <p className="text-sm text-orange-600">전월 대비 +0.3</p>
                </div>
                <div className="p-3 bg-orange-500 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 분석 탭 */}
        <Tabs defaultValue="trends" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 p-2 h-14 bg-gray-100 rounded-2xl">
            <TabsTrigger value="trends" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              <TrendingUp className="h-4 w-4 mr-2" />
              추세 분석
            </TabsTrigger>
            <TabsTrigger value="distribution" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              <PieChartIcon className="h-4 w-4 mr-2" />
              분포 분석
            </TabsTrigger>
            <TabsTrigger value="performance" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              <Users className="h-4 w-4 mr-2" />
              성과 분석
            </TabsTrigger>
            <TabsTrigger value="optimization" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              <Target className="h-4 w-4 mr-2" />
              최적화
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                  월별 인력투입 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="planning" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="design" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.7} />
                    <Area type="monotone" dataKey="publishing" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.7} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">팀별 가동률 비교</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { team: '기획팀', rate: 71.0 },
                      { team: '디자인팀', rate: 78.0 },
                      { team: '개발팀', rate: 76.0 },
                      { team: '사업관리팀', rate: 85.0 },
                      { team: '본부장', rate: 95.0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">분기별 성장률</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mockQuarterlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="averageUtilization" stroke="#10B981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <PieChartIcon className="h-6 w-6 text-purple-500" />
                    팀별 인력 구성
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">투입률 분포</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pieChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{item.value}명</div>
                        <div className="text-sm text-gray-600">{((item.value / 56) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Users className="h-6 w-6 text-green-500" />
                  개인별 성과 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#8B5CF6" name="가동률" />
                    <Bar dataKey="performance" fill="#10B981" name="성과점수" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">최적화 권장사항</h2>
              {mockOptimizationRecommendations.map((rec, index) => (
                <Card key={index} className="border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold">{rec.title}</CardTitle>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                        {rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '보통' : '낮음'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{rec.description}</p>
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <h4 className="font-semibold text-blue-900 mb-2">예상 효과</h4>
                      <p className="text-blue-700">{rec.impact}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">실행 방안</h4>
                      <ul className="space-y-2">
                        {rec.suggestedActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start gap-2 text-gray-700">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}