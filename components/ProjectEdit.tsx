import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { mockMembers } from '../data/mockData';
import { Project, Member, ProjectAllocation } from '../types';
import { useMobile } from '../hooks/useMobile';
import { 
  ArrowLeft, Calendar as CalendarIcon, Users, Settings, Check, ChevronRight, 
  Plus, X, UserCheck, UserX, Clock, AlertCircle, Edit, Save, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 관련 유틸리티 함수들
const formatDateSafely = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return format(date, 'PPP', { locale: ko });
  } catch {
    return '';
  }
};

const createDateSafely = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
};

const formatDateForInput = (date: Date): string => {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// 상태 라벨
const statusLabels = {
  'draft': '초안',
  'review': '검토중',
  'approved': '승인됨',
  'planning': '기획중',
  'in-progress': '진행중',
  'completed': '완료',
  'on-hold': '보류'
};

// 우선순위 라벨
const priorityLabels = {
  'high': '높음',
  'medium': '보통',
  'low': '낮음'
};

const groupLabels = {
  'planning': '기획그룹',
  'design': '디자인그룹',
  'publishing': '퍼블리싱그룹',
  'management': '사업관리팀',
  'executive': '본부장'
};

const groupColors = {
  'planning': 'bg-purple-100 text-purple-800',
  'design': 'bg-cyan-100 text-cyan-800',
  'publishing': 'bg-green-100 text-green-800',
  'management': 'bg-orange-100 text-orange-800',
  'executive': 'bg-red-100 text-red-800'
};

interface ProjectEditProps {
  project: Project;
  dataStore: ReturnType<typeof import('../hooks/useDataStore').useDataStore>;
  onBack: () => void;
  onSave: (updatedProject: Project) => void;
}

// 투입 가능성을 판단하는 함수
const getMemberAvailability = (member: Member, projectId: string) => {
  // 시뮬레이션: 현재 편집 중인 프로젝트에 이미 투입된 구성원은 available로 표시
  const unavailableMembers = ['member-2', 'member-5', 'member-8', 'member-12'];
  const partiallyAvailableMembers = ['member-3', 'member-7', 'member-10'];
  
  if (unavailableMembers.includes(member.id)) {
    return {
      status: 'unavailable' as const,
      reason: '다른 프로젝트 투입 중',
      endDate: '2024-12-15'
    };
  } else if (partiallyAvailableMembers.includes(member.id)) {
    return {
      status: 'partial' as const,
      reason: '50% 가용',
      endDate: '2024-11-30'
    };
  } else {
    return {
      status: 'available' as const,
      reason: '투입 가능',
      endDate: null
    };
  }
};

export function ProjectEdit({ project, onBack, onSave }: ProjectEditProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState('all');
  const [isModified, setIsModified] = useState(false);
  const [projectData, setProjectData] = useState<Project>({...project});

  const [selectedMembers, setSelectedMembers] = useState<Member[]>(() => {
    return project.allocations.map(allocation => {
      const member = mockMembers.find(m => m.id === allocation.memberId);
      return member;
    }).filter((member): member is Member => member !== undefined);
  });

  const [memberAllocations, setMemberAllocations] = useState<ProjectAllocation[]>(project.allocations);

  const isMobile = useMobile();

  // 데이터 변경 감지
  useEffect(() => {
    const isDataModified = 
      projectData.name !== project.name ||
      projectData.description !== project.description ||
      projectData.startDate !== project.startDate ||
      projectData.endDate !== project.endDate ||
      projectData.status !== project.status ||
      selectedMembers.length !== project.allocations.length ||
      JSON.stringify(memberAllocations) !== JSON.stringify(project.allocations);
    
    setIsModified(isDataModified);
  }, [projectData, selectedMembers, memberAllocations, project]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      if (isModified) {
        if (confirm('변경사항이 저장되지 않았습니다. 정말 나가시겠습니까?')) {
          onBack();
        }
      } else {
        onBack();
      }
    }
  };

  const handleSave = () => {
    // 새로운 allocations 생성
    const updatedAllocations = selectedMembers.map(member => {
      const existingAllocation = memberAllocations.find(a => a.memberId === member.id);
      return existingAllocation || {
        id: `allocation-${project.id}-${member.id}`,
        memberId: member.id,
        projectId: project.id,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        utilizationRate: 100,
        role: member.role,
        status: 'active' as const
      };
    });

    const updatedProject: Project = {
      ...projectData,
      allocations: updatedAllocations
    };

    onSave(updatedProject);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        if (!projectData.name || !projectData.description || !projectData.startDate || !projectData.endDate) {
          return false;
        }
        
        try {
          const startDate = new Date(projectData.startDate);
          const endDate = new Date(projectData.endDate);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return false;
          }
          
          if (endDate <= startDate) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
        
      case 2:
        return selectedMembers.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // 팀원을 가용성에 따라 필터링
  const getFilteredMembers = () => {
    const membersWithAvailability = mockMembers.map(member => ({
      ...member,
      availability: getMemberAvailability(member, project.id)
    }));

    switch (selectedAvailabilityFilter) {
      case 'available':
        return membersWithAvailability.filter(m => m.availability.status === 'available');
      case 'partial':
        return membersWithAvailability.filter(m => m.availability.status === 'partial');
      case 'unavailable':
        return membersWithAvailability.filter(m => m.availability.status === 'unavailable');
      default:
        return membersWithAvailability;
    }
  };

  const filteredMembers = getFilteredMembers();
  const availableCount = mockMembers.filter(m => getMemberAvailability(m, project.id).status === 'available').length;
  const partialCount = mockMembers.filter(m => getMemberAvailability(m, project.id).status === 'partial').length;
  const unavailableCount = mockMembers.filter(m => getMemberAvailability(m, project.id).status === 'unavailable').length;

  const updateMemberAllocation = (memberId: string, field: keyof ProjectAllocation, value: any) => {
    setMemberAllocations(prev => 
      prev.map(allocation => 
        allocation.memberId === memberId 
          ? { ...allocation, [field]: value }
          : allocation
      )
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-gradient)' }}>
      <div className={`space-y-6 w-full max-w-none ${isMobile ? 'mobile-padding' : 'p-12 max-w-5xl mx-auto space-y-8'}`}>
        {/* 헤더 - Apple 스타일 */}
        <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
          <div className="space-y-2 w-full min-w-0">
            <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center gap-6'}`}>
              <Button 
                variant="ghost" 
                size={isMobile ? "default" : "lg"}
                onClick={handleBack}
                className="glass-button gap-2 korean-text touch-friendly"
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Button>
              <div className="w-full min-w-0">
                <h1 className={`font-bold tracking-tight korean-text ${
                  isMobile ? 'text-2xl leading-tight mb-2' : 'text-4xl mb-2'
                }`}>
                  프로젝트 편집
                </h1>
                <p className={`text-muted-foreground korean-text ${
                  isMobile ? 'text-sm' : 'text-lg'
                }`}>
                  {project.name} 수정
                </p>
              </div>
            </div>
          </div>
          {isModified && (
            <div className={`glass-card p-3 border-orange-200/50 ${isMobile ? 'w-full mt-3' : 'w-auto'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className={`text-orange-900 korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  변경사항이 있습니다
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 진행 단계 표시 - Apple 스타일 */}
        <Card className="apple-card">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center font-medium ${isMobile ? 'text-sm' : 'text-base'}
                    transition-all duration-300 ease-in-out
                    ${currentStep >= step 
                      ? 'bg-primary text-primary-foreground apple-shadow-md scale-105' 
                      : 'bg-secondary text-muted-foreground'
                    }
                  `}>
                    {currentStep > step ? <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`
                      ${isMobile ? 'w-8 h-0.5 mx-1' : 'w-16 h-0.5 mx-2'} rounded-full transition-all duration-300
                      ${currentStep > step ? 'bg-primary' : 'bg-border'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-4 text-center ${isMobile ? 'mt-3' : 'mt-4'}`}>
              <div>
                <p className={`font-medium korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>프로젝트 정보</p>
                <p className={`text-muted-foreground korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>기본 정보 수정</p>
              </div>
              <div>
                <p className={`font-medium korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>팀 구성</p>
                <p className={`text-muted-foreground korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>인력 재배정</p>
              </div>
              <div>
                <p className={`font-medium korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>최종 검토</p>
                <p className={`text-muted-foreground korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>변경사항 확인</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 컨텐츠 - Apple 스타일 */}
        {currentStep === 1 && (
          <Card className="apple-card">
            <CardHeader className={`${isMobile ? 'pb-3 p-4' : 'pb-4 p-6'}`}>
              <CardTitle className={`font-semibold flex items-center gap-3 korean-text ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </div>
                프로젝트 기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 p-4 pt-0' : 'space-y-4 p-6 pt-0'}`}>
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="name" className="korean-text font-medium">프로젝트명 *</Label>
                  <Input
                    id="name"
                    placeholder="프로젝트명을 입력하세요"
                    value={projectData.name}
                    onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                    className="korean-text touch-friendly"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="korean-text font-medium">상태</Label>
                  <Select value={projectData.status} onValueChange={(value) => setProjectData({ ...projectData, status: value as any })}>
                    <SelectTrigger className="touch-friendly">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="review">검토중</SelectItem>
                      <SelectItem value="approved">승인됨</SelectItem>
                      <SelectItem value="planning">기획중</SelectItem>
                      <SelectItem value="in-progress">진행중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="on-hold">보류</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="korean-text font-medium">프로젝트 설명 *</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트에 대한 상세 설명을 입력하세요"
                  value={projectData.description}
                  onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                  className={`korean-text ${isMobile ? 'min-h-20' : 'min-h-24'}`}
                />
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label className="korean-text font-medium">시작일 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left korean-text touch-friendly">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateSafely(projectData.startDate) || '시작일을 선택하세요'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createDateSafely(projectData.startDate)}
                        onSelect={(date) => {
                          if (date) {
                            setProjectData({ ...projectData, startDate: formatDateForInput(date) });
                          } else {
                            setProjectData({ ...projectData, startDate: '' });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="korean-text font-medium">종료일 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left korean-text touch-friendly">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateSafely(projectData.endDate) || '종료일을 선택하세요'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createDateSafely(projectData.endDate)}
                        onSelect={(date) => {
                          if (date) {
                            setProjectData({ ...projectData, endDate: formatDateForInput(date) });
                          } else {
                            setProjectData({ ...projectData, endDate: '' });
                          }
                        }}
                        initialFocus
                        disabled={(date) => {
                          const startDate = createDateSafely(projectData.startDate);
                          if (startDate) {
                            return date < startDate;
                          }
                          return false;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="apple-card">
            <CardHeader className={`${isMobile ? 'pb-3 p-4' : 'pb-4 p-6'}`}>
              <CardTitle className={`font-semibold flex items-center gap-3 korean-text ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </div>
                팀 구성 편집
              </CardTitle>
              <div className={`text-muted-foreground korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>
                현재 {selectedMembers.length}명 투입 중 • 총 {mockMembers.length}명 중 선택
              </div>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 p-4 pt-0' : 'space-y-4 p-6 pt-0'}`}>
              {/* 현재 투입된 팀원 */}
              {selectedMembers.length > 0 && (
                <div className="glass-card p-4 border-primary/20">
                  <h3 className={`font-medium mb-3 flex items-center gap-2 korean-text ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    <UserCheck className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                    현재 투입 팀원 ({selectedMembers.length}명)
                  </h3>
                  <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                    {selectedMembers.map((member) => {
                      const allocation = memberAllocations.find(a => a.memberId === member.id);
                      return (
                        <div key={member.id} className={`flex items-center justify-between apple-card ${
                          isMobile ? 'p-3 flex-col space-y-3 items-start' : 'p-3'
                        }`}>
                          <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                            <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-8 w-8'}`}>
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className={`font-medium korean-text ${isMobile ? 'text-sm' : ''}`}>{member.name}</div>
                              <div className={`text-muted-foreground korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>{member.role}</div>
                            </div>
                            <Badge variant="secondary" className={`${groupColors[member.group]} ${isMobile ? 'text-xs' : ''}`}>
                              {groupLabels[member.group]}
                            </Badge>
                          </div>
                          <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between' : ''}`}>
                            <div className={`text-right korean-text ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              <div>가동률: {allocation?.utilizationRate || 100}%</div>
                              <div className="text-muted-foreground">
                                역할: {allocation?.role || member.role}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
                                setMemberAllocations(prev => prev.filter(a => a.memberId !== member.id));
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 가용성 필터 */}
              <div className="glass-card p-4">
                <div className={`flex items-center justify-between mb-3 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                  <h3 className={`font-medium korean-text ${isMobile ? 'text-sm' : 'text-base'}`}>추가 투입 가능한 팀원</h3>
                </div>
                
                <Tabs value={selectedAvailabilityFilter} onValueChange={setSelectedAvailabilityFilter} className="w-full">
                  <TabsList className={`grid w-full apple-card ${isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-4'}`}>
                    <TabsTrigger value="all" className={`flex items-center gap-2 korean-text ${isMobile ? 'text-xs' : ''}`}>
                      <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      {isMobile ? '전체' : `전체 (${mockMembers.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="available" className={`flex items-center gap-2 text-green-700 korean-text ${isMobile ? 'text-xs' : ''}`}>
                      <UserCheck className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      {isMobile ? '가능' : `투입가능 (${availableCount})`}
                    </TabsTrigger>
                    {!isMobile && (
                      <>
                        <TabsTrigger value="partial" className="flex items-center gap-2 text-yellow-700 korean-text">
                          <Clock className="h-4 w-4" />
                          부분가능 ({partialCount})
                        </TabsTrigger>
                        <TabsTrigger value="unavailable" className="flex items-center gap-2 text-red-700 korean-text">
                          <UserX className="h-4 w-4" />
                          투입불가 ({unavailableCount})
                        </TabsTrigger>
                      </>
                    )}
                    {isMobile && (
                      <>
                        <TabsTrigger value="partial" className="flex items-center gap-2 text-yellow-700 korean-text text-xs">
                          <Clock className="h-3 w-3" />
                          부분
                        </TabsTrigger>
                        <TabsTrigger value="unavailable" className="flex items-center gap-2 text-red-700 korean-text text-xs">
                          <UserX className="h-3 w-3" />
                          불가
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </Tabs>
              </div>

              {/* 팀원 목록 */}
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {filteredMembers
                  .filter(member => !selectedMembers.some(sm => sm.id === member.id))
                  .map((member) => {
                    const { status, reason, endDate } = member.availability;
                    
                    const statusColors = {
                      available: 'border-green-200/50 bg-green-50/50 hover:border-green-300/70 cursor-pointer hover:bg-green-50/70',
                      partial: 'border-yellow-200/50 bg-yellow-50/50 hover:border-yellow-300/70 cursor-pointer hover:bg-yellow-50/70',
                      unavailable: 'border-red-200/50 bg-red-50/50 cursor-not-allowed opacity-60'
                    };

                    const statusIcons = {
                      available: <UserCheck className="h-4 w-4 text-green-600" />,
                      partial: <Clock className="h-4 w-4 text-yellow-600" />,
                      unavailable: <UserX className="h-4 w-4 text-red-600" />
                    };

                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded-lg border transition-all duration-200 relative ${statusColors[status]} ${isMobile ? 'p-3' : 'p-3'}`}
                        onClick={() => {
                          if (status === 'unavailable') return;
                          
                          setSelectedMembers(prev => [...prev, member]);
                          setMemberAllocations(prev => [...prev, {
                            id: `allocation-${project.id}-${member.id}`,
                            memberId: member.id,
                            projectId: project.id,
                            startDate: projectData.startDate,
                            endDate: projectData.endDate,
                            utilizationRate: status === 'partial' ? 50 : 100,
                            role: member.role,
                            status: 'active'
                          }]);
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {statusIcons[status]}
                              <div>
                                <h3 className={`font-medium text-gray-900 korean-text ${isMobile ? 'text-sm' : 'text-sm'}`}>{member.name}</h3>
                                <p className={`text-gray-600 korean-text ${isMobile ? 'text-xs' : 'text-xs'}`}>{member.role}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className={`${groupColors[member.group]} ${isMobile ? 'text-xs' : 'text-xs'}`}>
                              {groupLabels[member.group]}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className={`
                              text-xs font-medium px-2 py-1 rounded-full inline-block korean-text
                              ${status === 'available' ? 'bg-green-100 text-green-800' :
                                status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'}
                            `}>
                              {reason}
                            </div>
                            {endDate && (
                              <div className="text-xs text-gray-500 korean-text">
                                {status === 'unavailable' ? '투입 가능일: ' : '부분 투입 종료일: '}
                                {endDate}
                              </div>
                            )}
                          </div>

                          {status === 'unavailable' && (
                            <div className="absolute inset-0 bg-gray-200/20 rounded-lg flex items-center justify-center">
                              <AlertCircle className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {filteredMembers.filter(member => !selectedMembers.some(sm => sm.id === member.id)).length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">해당 조건에 맞는 추가 투입 가능한 팀원이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="apple-card">
            <CardHeader className={`${isMobile ? 'pb-3 p-4' : 'pb-4 p-6'}`}>
              <CardTitle className={`font-semibold flex items-center gap-3 korean-text ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Check className={`text-green-600 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </div>
                변경사항 최종 검토
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : 'p-6 pt-0'}`}>
              {/* 변경 사항 요약 */}
              {isModified && (
                <Alert className="apple-shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="korean-text">
                    프로젝트 정보가 수정되었습니다. 아래 내용을 확인한 후 저장하세요.
                  </AlertDescription>
                </Alert>
              )}

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                <div className="space-y-3">
                  <h3 className={`font-medium text-gray-900 korean-text ${isMobile ? 'text-base' : 'text-lg'}`}>프로젝트 기본 정보</h3>
                  <div className="space-y-2 p-3 bg-gray-50/50 rounded-lg">
                    <div>
                      <strong>프로젝트명:</strong> 
                      {projectData.name !== project.name && (
                        <span className="text-orange-600 ml-1">(변경됨)</span>
                      )}
                      <div className="mt-1">{projectData.name}</div>
                    </div>
                    <div>
                      <strong>상태:</strong>
                      {projectData.status !== project.status && (
                        <span className="text-orange-600 ml-1">(변경됨)</span>
                      )}
                      <div className="mt-1">
                        <Badge variant="secondary">
                          {statusLabels[projectData.status]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <strong>기간:</strong>
                      {(projectData.startDate !== project.startDate || projectData.endDate !== project.endDate) && (
                        <span className="text-orange-600 ml-1">(변경됨)</span>
                      )}
                      <div className="mt-1 text-sm">{projectData.startDate} ~ {projectData.endDate}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className={`font-medium text-gray-900 korean-text ${isMobile ? 'text-base' : 'text-lg'}`}>팀 구성</h3>
                  <div className="space-y-2 p-3 bg-gray-50/50 rounded-lg">
                    {selectedMembers.length !== project.allocations.length && (
                      <div className="text-orange-600 text-sm mb-2">
                        투입 인원이 {project.allocations.length}명에서 {selectedMembers.length}명으로 변경됨
                      </div>
                    )}
                    {selectedMembers.map((member) => {
                      const allocation = memberAllocations.find(a => a.memberId === member.id);
                      const wasInOriginal = project.allocations.some(a => a.memberId === member.id);
                      return (
                        <div key={member.id} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {member.name}
                            {!wasInOriginal && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                신규
                              </Badge>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{member.role}</Badge>
                            <Badge variant="secondary" className={groupColors[member.group]}>
                              {groupLabels[member.group]}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* 제외된 멤버 표시 */}
                    {project.allocations.some(a => !selectedMembers.some(sm => sm.id === a.memberId)) && (
                      <div className="border-t pt-2 mt-2">
                        <div className="text-red-600 text-sm mb-2">제외된 팀원:</div>
                        {project.allocations
                          .filter(a => !selectedMembers.some(sm => sm.id === a.memberId))
                          .map(allocation => {
                            const member = mockMembers.find(m => m.id === allocation.memberId);
                            if (!member) return null;
                            return (
                              <div key={allocation.id} className="text-sm text-red-600">
                                • {member.name} ({member.role})
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트 설명</h3>
                {projectData.description !== project.description && (
                  <div className="text-orange-600 text-sm mb-2">(설명이 변경됨)</div>
                )}
                <p className="text-gray-700 p-4 bg-gray-50 rounded-xl">{projectData.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 하단 버튼 - Apple 스타일 */}
        <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
          <Button
            variant="outline"
            size={isMobile ? "default" : "lg"}
            onClick={handleBack}
            className={`gap-2 korean-text touch-friendly ${isMobile ? 'w-full' : 'px-6'}`}
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </Button>
          
          <Button
            size={isMobile ? "default" : "lg"}
            onClick={handleNext}
            disabled={!isStepValid(currentStep)}
            className={`apple-button-primary gap-2 korean-text touch-friendly ${isMobile ? 'w-full' : 'px-8'}`}
          >
            {currentStep === 3 ? (
              <>
                <Save className="h-4 w-4" />
                변경사항 저장
              </>
            ) : (
              <>
                다음
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}