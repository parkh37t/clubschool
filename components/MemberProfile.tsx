import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ArrowLeft, TrendingUp, Calendar, Award, Target, Building2 } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from './ui/use-mobile';
import { Member, MemberPerformance, MemberHistory } from '../types';
import { mockMemberPerformances, mockMemberHistories, mockMembers } from '../data/mockData';

interface MemberProfileProps {
  memberId: string;
  onBack: () => void;
}

const groupColors = {
  'planning': 'bg-chart-4/10 text-chart-4',
  'design': 'bg-chart-1/10 text-chart-1',
  'publishing': 'bg-chart-2/10 text-chart-2'
};

const groupLabels = {
  'planning': '기획그룹',
  'design': '디자인그룹',
  'publishing': '퍼블리싱그룹'
};

export function MemberProfile({ memberId, onBack }: MemberProfileProps) {
  const isMobile = useIsMobile();
  const member = mockMembers.find(m => m.id === memberId);
  const performance = mockMemberPerformances.find(p => p.memberId === memberId);
  const history = mockMemberHistories.filter(h => h.memberId === memberId);

  if (!member || !performance) {
    return (
      <div className="p-4 md:p-6">
        <MobileHeader 
          title="구성원 관리"
          onBack={onBack}
          subtitle="구성원을 찾을 수 없습니다"
        />
        <div className="p-4">
          <p className="text-center text-gray-500">요청하신 구성원 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  // 스킬 레이더 차트 데이터
  const skillData = [
    { skill: '기술역량', value: performance.skillRating.technical },
    { skill: '커뮤니케이션', value: performance.skillRating.communication },
    { skill: '리더십', value: performance.skillRating.leadership },
    { skill: '문제해결', value: performance.skillRating.problemSolving }
  ];

  // 가상의 월별 가동률 데이터
  const monthlyUtilization = [
    { month: '1월', utilization: 78 },
    { month: '2월', utilization: 82 },
    { month: '3월', utilization: 85 },
    { month: '4월', utilization: 79 },
    { month: '5월', utilization: 88 },
    { month: '6월', utilization: 84 }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      {/* 모바일 헤더 */}
      <MobileHeader 
        title="구성원 관리"
        onBack={onBack}
        subtitle={`${member.name} 프로필`}
        showLogo={true}
      />

      <div className={`${isMobile ? 'mobile-padding' : 'p-8'} space-y-${isMobile ? '6' : '8'} max-w-6xl mx-auto`}>
        {/* 데스크톱 헤더 */}
        {!isMobile && (
          <div className="flex items-center gap-6">
            <Button className="glass-button gap-2" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
              뒤로가기
            </Button>
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-primary" />
              <div className="w-px h-8 bg-border"></div>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 apple-shadow-xl">
                  <AvatarFallback className="text-2xl font-bold">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{member.name}</h1>
                  <p className="text-xl text-muted-foreground">{member.role}</p>
                  <Badge className={`${groupColors[member.group]} mt-2 px-3 py-1`}>
                    {groupLabels[member.group]}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모바일 프로필 섹션 */}
        {isMobile && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <Avatar className="h-16 w-16 shadow-md">
              <AvatarFallback className="text-xl font-bold">
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
              <p className="text-gray-600">{member.role}</p>
              <Badge variant="secondary" className={`${groupColors[member.group]} mt-1 text-sm`}>
                {groupLabels[member.group]}
              </Badge>
            </div>
          </div>
        )}

        {/* 주요 지표 */}
        <div className={`grid grid-cols-2 ${isMobile ? '' : 'md:grid-cols-4'} gap-${isMobile ? '4' : '6'}`}>
          <Card className="border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 가동률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.averageUtilization.toFixed(1)}%</div>
            <p className="text-xs text-green-600">+{performance.growthRate.toFixed(1)}% 성장</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">참여 프로젝트</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.totalProjects}개</div>
            <p className="text-xs text-muted-foreground">총 투입 프로젝트</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 성과</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.averagePerformance.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">10점 만점</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 Manmonth</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.totalManmonth.toFixed(1)}MM</div>
            <p className="text-xs text-muted-foreground">누적 투입량</p>
          </CardContent>
        </Card>
        </div>

        <div className={`grid gap-${isMobile ? '6' : '8'} ${isMobile ? '' : 'md:grid-cols-2'}`}>
          {/* 월별 가동률 추이 */}
          <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>월별 가동률 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="utilization" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          {/* 스킬 레이더 차트 */}
          <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>역량 평가</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={skillData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis domain={[0, 10]} />
                <Radar
                  name="점수"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
          </Card>
        </div>

        {/* 역량 상세 */}
        <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>역량별 상세 평가</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>기술 역량</span>
                <span>{performance.skillRating.technical.toFixed(1)}/10</span>
              </div>
              <Progress value={performance.skillRating.technical * 10} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>커뮤니케이션</span>
                <span>{performance.skillRating.communication.toFixed(1)}/10</span>
              </div>
              <Progress value={performance.skillRating.communication * 10} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>리더십</span>
                <span>{performance.skillRating.leadership.toFixed(1)}/10</span>
              </div>
              <Progress value={performance.skillRating.leadership * 10} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>문제 해결 능력</span>
                <span>{performance.skillRating.problemSolving.toFixed(1)}/10</span>
              </div>
              <Progress value={performance.skillRating.problemSolving * 10} />
            </div>
          </div>
        </CardContent>
      </Card>

        {/* 프로젝트 히스토리 */}
        <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>프로젝트 히스토리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.map((project, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{project.projectName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {project.startDate} ~ {project.endDate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        투입량: {project.manmonth.toFixed(1)}MM ({project.utilizationRate}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{project.performance.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">성과 점수</div>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{project.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        </Card>

        {/* 푸터 */}
        {!isMobile && (
          <div className="border-t pt-8">
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Building2 className="h-5 w-5 opacity-60" />
              <span className="text-sm">Powered by Clubschool • Member Profile</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}