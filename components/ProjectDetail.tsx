import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ArrowLeft, Calendar, Users, TrendingUp, Edit, Building2 } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from './ui/use-mobile';
import { Project, Member } from '../types';
import { mockMembers } from '../data/mockData';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit?: () => void;
}

const statusColors = {
  'planning': 'bg-chart-3',
  'in-progress': 'bg-chart-1',
  'completed': 'bg-chart-2',
  'on-hold': 'bg-muted-foreground'
};

const statusLabels = {
  'planning': '기획중',
  'in-progress': '진행중',
  'completed': '완료',
  'on-hold': '보류'
};

const groupColors = {
  'planning': 'bg-chart-4/10 text-chart-4',
  'design': 'bg-chart-1/10 text-chart-1',
  'publishing': 'bg-chart-2/10 text-chart-2'
};

const groupLabels = {
  'planning': '기획',
  'design': '디자인',
  'publishing': '퍼블리싱'
};

export function ProjectDetail({ project, onBack, onEdit }: ProjectDetailProps) {
  const isMobile = useIsMobile();

  const getProjectMembers = () => {
    return project.allocations.map(allocation => {
      const member = mockMembers.find(m => m.id === allocation.memberId);
      return {
        ...allocation,
        member: member!
      };
    });
  };

  const projectMembers = getProjectMembers();
  const averageUtilization = project.allocations.reduce((sum, alloc) => sum + alloc.utilizationRate, 0) / project.allocations.length;

  const getGroupStats = () => {
    const groups = ['planning', 'design', 'publishing'] as const;
    return groups.map(group => {
      const groupMembers = projectMembers.filter(pm => pm.member.group === group);
      const avgUtilization = groupMembers.length > 0 
        ? groupMembers.reduce((sum, pm) => sum + pm.utilizationRate, 0) / groupMembers.length 
        : 0;
      return {
        group,
        count: groupMembers.length,
        avgUtilization
      };
    }).filter(stat => stat.count > 0);
  };

  const groupStats = getGroupStats();

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      {/* 모바일 헤더 */}
      <MobileHeader 
        title="대시보드로 돌아가기"
        onBack={onBack}
        subtitle={`${project.name} 상세`}
        showLogo={true}
      />

      <div className={`${isMobile ? 'mobile-padding' : 'p-8'} space-y-${isMobile ? '6' : '8'} max-w-6xl mx-auto`}>
        {/* 데스크톱 헤더 */}
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button className="glass-button gap-2" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
                뒤로가기
              </Button>
              <div className="flex items-center gap-4">
                <Building2 className="h-8 w-8 text-primary" />
                <div className="w-px h-8 bg-border"></div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              </div>
            </div>
            {onEdit && (
              <Button onClick={onEdit} variant="outline" size="lg" className="gap-2 px-6">
                <Edit className="h-4 w-4" />
                수정
              </Button>
            )}
          </div>
        )}

        {/* 모바일 제목 섹션 */}
        {isMobile && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 text-sm">{project.description}</p>
            {onEdit && (
              <Button onClick={onEdit} variant="outline" size="sm" className="gap-2 w-full">
                <Edit className="h-4 w-4" />
                수정
              </Button>
            )}
          </div>
        )}

        {/* 프로젝트 정보 카드 */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              프로젝트 정보
              <Badge variant="outline" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                {statusLabels[project.status]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} gap-${isMobile ? '4' : '6'}`}>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">프로젝트 기간</div>
                  <div className="font-medium text-sm">{project.startDate} ~ {project.endDate}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">투입 인원</div>
                  <div className="font-medium">{project.allocations.length}명</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">평균 가동률</div>
                  <div className="font-medium">{averageUtilization.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 그룹별 통계 */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>그룹별 투입 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} gap-4`}>
              {groupStats.map(({ group, count, avgUtilization }) => (
                <div key={group} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className={groupColors[group]}>
                      {groupLabels[group]}
                    </Badge>
                    <span className="text-sm font-medium">{count}명</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>평균 가동률</span>
                      <span>{avgUtilization.toFixed(1)}%</span>
                    </div>
                    <Progress value={avgUtilization} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 구성원 목록 */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>투입 구성원</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectMembers.map((pm, index) => (
                <div key={pm.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {pm.member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{pm.member.name}</div>
                        <div className="text-sm text-muted-foreground">{pm.member.role}</div>
                        <div className="text-sm text-muted-foreground">
                          프로젝트 역할: {pm.role}
                        </div>
                      </div>
                    </div>
                    <div className={`${isMobile ? 'flex justify-between items-center' : 'text-right'}`}>
                      <Badge variant="secondary" className={groupColors[pm.member.group]}>
                        {groupLabels[pm.member.group]}
                      </Badge>
                      <div className={`${isMobile ? '' : 'mt-2'}`}>
                        <div className="text-sm text-muted-foreground">가동률</div>
                        <div className="font-medium">{pm.utilizationRate}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>투입 기간</span>
                      <span className="text-right">{pm.startDate} ~ {pm.endDate}</span>
                    </div>
                    <Progress value={pm.utilizationRate} className="h-2" />
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
              <span className="text-sm">Powered by Clubschool • Project Details</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}