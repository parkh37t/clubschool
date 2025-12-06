import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { mockProjects, mockMembers } from '../data/mockData';
import { Project } from '../types';
import { useMobile } from '../hooks/useMobile';
import { Search, Filter, Plus, Calendar, Users, Clock, CheckCircle2, AlertTriangle, Pause, Play, FolderOpen } from 'lucide-react';


interface ProjectManagementProps {
  onCreateProject: () => void;
  onProjectSelect: (project: Project) => void;
}

const statusConfig = {
  'planning': {
    label: '기획중',
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: Clock
  },
  'in-progress': {
    label: '진행중',
    color: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
    icon: Play
  },
  'on-hold': {
    label: '보류',
    color: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
    icon: Pause
  },
  'completed': {
    label: '완료',
    color: 'bg-muted text-muted-foreground border-border',
    icon: CheckCircle2
  },
  'cancelled': {
    label: '취소',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle
  }
};

export function ProjectManagement({ onCreateProject, onProjectSelect }: ProjectManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const isMobile = useMobile();

  // 필터링 및 정렬
  const filteredProjects = mockProjects
    .filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(project => selectedStatus === 'all' || project.status === selectedStatus)
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'members') {
        return b.allocations.length - a.allocations.length;
      }
      return 0;
    });

  // 프로젝트 통계
  const projectStats = {
    total: mockProjects.length,
    active: mockProjects.filter(p => p.status === 'in-progress').length,
    planning: mockProjects.filter(p => p.status === 'planning').length,
    completed: mockProjects.filter(p => p.status === 'completed').length
  };

  // 프로젝트 진행률 계산
  const getProjectProgress = (project: Project) => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();
    
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    
    return Math.round((elapsed / totalDuration) * 100);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      <div className={`space-y-8 max-w-7xl mx-auto ${isMobile ? 'mobile-padding' : 'p-8'}`}>
        {/* 헤더 영역 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">프로젝트 관리</h1>
            <p className="text-xl text-muted-foreground">프로젝트 현황과 팀 배정을 통합 관리합니다</p>
          </div>
          <Button 
            onClick={onCreateProject} 
            className="apple-button-primary touch-friendly gap-2"
          >
            <Plus className="h-4 w-4" />
            프로젝트 생성
          </Button>
        </div>

        {/* 프로젝트 통계 */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          <Card className="apple-card">
            <CardContent className={isMobile ? "p-4" : "p-6"}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">전체 프로젝트</p>
                  <p className="text-2xl font-semibold text-foreground">{projectStats.total}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card">
            <CardContent className={isMobile ? "p-4" : "p-6"}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">진행중</p>
                  <p className="text-2xl font-semibold text-foreground">{projectStats.active}</p>
                </div>
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <Play className="h-5 w-5 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card">
            <CardContent className={isMobile ? "p-4" : "p-6"}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">기획중</p>
                  <p className="text-2xl font-semibold text-foreground">{projectStats.planning}</p>
                </div>
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Clock className="h-5 w-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-card">
            <CardContent className={isMobile ? "p-4" : "p-6"}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">완료</p>
                  <p className="text-2xl font-semibold text-foreground">{projectStats.completed}</p>
                </div>
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 검색 및 필터 */}
        <Card className="apple-card">
          <CardContent className={isMobile ? "p-4" : "p-6"}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="프로젝트명이나 설명으로 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 touch-friendly"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full lg:w-48 touch-friendly">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="planning">기획중</SelectItem>
                  <SelectItem value="in-progress">진행중</SelectItem>
                  <SelectItem value="on-hold">보류</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-48 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">최근 생성순</SelectItem>
                  <SelectItem value="name">프로젝트명순</SelectItem>
                  <SelectItem value="members">팀원수순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 목록 */}
        <Tabs defaultValue="grid" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 p-2 h-14 bg-gray-100 rounded-2xl lg:w-80">
            <TabsTrigger value="grid" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              카드 보기
            </TabsTrigger>
            <TabsTrigger value="list" className="font-semibold py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
              목록 보기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-8">
            {/* 검색 결과 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-gray-500" />
                <span className="text-lg font-semibold text-gray-900">
                  {filteredProjects.length}개의 프로젝트
                </span>
                {searchQuery && (
                  <Badge variant="secondary">
                    "{searchQuery}" 검색 결과
                  </Badge>
                )}
              </div>
            </div>

            {/* 프로젝트 카드 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => {
                const statusInfo = statusConfig[project.status];
                const StatusIcon = statusInfo.icon;
                const progress = getProjectProgress(project);
                const memberCount = project.allocations.length;

                return (
                  <Card 
                    key={project.id} 
                    className="border-0 shadow-xl bg-white hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => onProjectSelect(project)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{project.name}</h3>
                          <p className="text-gray-600 text-sm line-clamp-3 mb-3">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`${statusInfo.color} font-semibold px-3 py-1 flex items-center gap-2`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="secondary" className="font-medium">
                          <Users className="h-3 w-3 mr-1" />
                          {memberCount}명
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* 프로젝트 진행률 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">진행률</span>
                          <span className="text-lg font-bold text-gray-900">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* 프로젝트 일정 */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(project.startDate)}</span>
                        </div>
                        <span className="text-gray-400">~</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>{formatDate(project.endDate)}</span>
                        </div>
                      </div>

                      {/* 팀 구성 미리보기 */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-sm font-semibold text-gray-700 mb-2">팀 구성</div>
                        <div className="flex flex-wrap gap-1">
                          {project.allocations.slice(0, 3).map((allocation) => {
                            const member = mockMembers.find(m => m.id === allocation.memberId);
                            return (
                              <Badge key={allocation.id} variant="outline" className="text-xs">
                                {member?.name || '알 수 없음'}
                              </Badge>
                            );
                          })}
                          {project.allocations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.allocations.length - 3}명
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">프로젝트가 없습니다</p>
                <p className="text-gray-400 mb-6">새로운 프로젝트를 만들어보세요</p>
                <Button onClick={onCreateProject} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  프로젝트 만들기
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-8">
            {/* 목록 형태의 프로젝트 보기 */}
            <Card className="border-0 shadow-xl">
              <CardContent className="p-0">
                <div className="space-y-0">
                  {filteredProjects.map((project, index) => {
                    const statusInfo = statusConfig[project.status];
                    const StatusIcon = statusInfo.icon;
                    const progress = getProjectProgress(project);
                    const memberCount = project.allocations.length;

                    return (
                      <div 
                        key={project.id}
                        className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                          index !== filteredProjects.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                        onClick={() => onProjectSelect(project)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                              <Badge className={`${statusInfo.color} font-semibold px-3 py-1 flex items-center gap-2`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(project.startDate)} ~ {formatDate(project.endDate)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{memberCount}명 참여</span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6 text-right min-w-0 w-32">
                            <div className="text-lg font-bold text-gray-900 mb-1">{progress}%</div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">프로젝트가 없습니다</p>
                <p className="text-gray-400 mb-6">새로운 프로젝트를 만들어보세요</p>
                <Button onClick={onCreateProject} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  프로젝트 만들기
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}