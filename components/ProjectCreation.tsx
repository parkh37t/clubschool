import { useState } from 'react';
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
import { mockMembers } from '../data/mockData';
import { formatBudgetInput, parseCurrency } from '../utils/currency';
import { ProjectDraft, Member } from '../types';
import { useMobile } from '../hooks/useMobile';
import { ArrowLeft, Calendar as CalendarIcon, Users, Settings, Check, ChevronRight, Plus, X, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
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

interface ProjectCreationProps {
  onBack: () => void;
  onSubmit: (project: ProjectDraft) => void;
}

// 투입 가능성을 판단하는 함수 (실제로는 API에서 가져와야 함)
const getMemberAvailability = (member: Member) => {
  // 시뮬레이션: 일부 구성원들은 다른 프로젝트에 투입 중
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

export function ProjectCreation({ onBack, onSubmit }: ProjectCreationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState('all');
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    category: '',
    selectedMembers: [] as Member[],
    estimatedBudget: 0,
    objectives: [] as string[],
    deliverables: [] as string[]
  });

  const isMobile = useMobile();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // selectedMembers를 teamComposition으로 변환
      const teamComposition = projectData.selectedMembers.map(member => ({
        memberId: member.id,
        role: member.role,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        utilizationRate: 80, // 기본값, 나중에 개별 설정 가능하도록 확장
        isRequired: true
      }));

      const projectDraft: ProjectDraft = {
        name: projectData.name,
        description: projectData.description,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        teamComposition,
        estimatedBudget: projectData.estimatedBudget,
        priority: projectData.priority,
        category: projectData.category || '일반 프로젝트'
      };

      console.log('프로젝트 생성 데이터:', projectDraft);
      onSubmit(projectDraft);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const addObjective = () => {
    setProjectData({
      ...projectData,
      objectives: [...(projectData.objectives || []), '']
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...(projectData.objectives || [])];
    newObjectives[index] = value;
    setProjectData({
      ...projectData,
      objectives: newObjectives
    });
  };

  const removeObjective = (index: number) => {
    setProjectData({
      ...projectData,
      objectives: projectData.objectives?.filter((_, i) => i !== index) || []
    });
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        // 기본 정보와 날짜 유효성 검사
        if (!projectData.name || !projectData.description || !projectData.startDate || !projectData.endDate) {
          return false;
        }
        
        // 날짜 형식 및 논리적 유효성 검사
        try {
          const startDate = new Date(projectData.startDate);
          const endDate = new Date(projectData.endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 유효한 날짜인지 확인
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return false;
          }
          
          // 종료일이 시작일보다 늦은지 확인
          if (endDate <= startDate) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
        
      case 2:
        return projectData.selectedMembers && projectData.selectedMembers.length > 0;
      case 3:
        return true; // 마지막 단계는 항상 유효
      default:
        return false;
    }
  };

  // 팀원을 가용성에 따라 필터링
  const getFilteredMembers = () => {
    const membersWithAvailability = mockMembers.map(member => ({
      ...member,
      availability: getMemberAvailability(member)
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
  const availableCount = mockMembers.filter(m => getMemberAvailability(m).status === 'available').length;
  const partialCount = mockMembers.filter(m => getMemberAvailability(m).status === 'partial').length;
  const unavailableCount = mockMembers.filter(m => getMemberAvailability(m).status === 'unavailable').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="p-8 space-y-8 max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={handleBack}
              className="gap-3 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
              뒤로
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">프로젝트 생성</h1>
              <p className="text-gray-600">3단계 간편 프로젝트 설정</p>
            </div>
          </div>
        </div>

        {/* 진행 단계 표시 */}
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                    ${currentStep >= step 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {currentStep > step ? <Check className="h-6 w-6" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`
                      w-24 h-1 mx-4
                      ${currentStep > step ? 'bg-blue-500' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="font-semibold text-gray-900">프로젝트 정보</p>
                <p className="text-sm text-gray-600">기본 설정</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">팀 배정</p>
                <p className="text-sm text-gray-600">인력 선택</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">최종 검토</p>
                <p className="text-sm text-gray-600">설정 확인</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 컨텐츠 */}
        {currentStep === 1 && (
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-6 w-6 text-blue-500" />
                프로젝트 기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">프로젝트명 *</Label>
                  <Input
                    id="name"
                    placeholder="프로젝트명을 입력하세요"
                    value={projectData.name || ''}
                    onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Select value={projectData.priority} onValueChange={(value) => setProjectData({ ...projectData, priority: value as any })}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">프로젝트 카테고리</Label>
                  <Input
                    id="category"
                    placeholder="예: 웹사이트 리뉴얼, 모바일 앱 개발 등"
                    value={projectData.category || ''}
                    onChange={(e) => setProjectData({ ...projectData, category: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">예상 예산 (원)</Label>
                  <Input
                    id="budget"
                    type="text"
                    placeholder="예상 예산을 입력하세요 (예: 5,000,000)"
                    value={formatBudgetInput(projectData.estimatedBudget || 0)}
                    onChange={(e) => {
                      const parsedValue = parseCurrency(e.target.value);
                      setProjectData({ ...projectData, estimatedBudget: parsedValue });
                    }}
                    className="h-12"
                  />
                  {projectData.estimatedBudget > 0 && (
                    <p className="text-sm text-muted-foreground">
                      입력된 예산: {formatBudgetInput(projectData.estimatedBudget)}원
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">프로젝트 설명 *</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트에 대한 상세 설명을 입력하세요"
                  value={projectData.description || ''}
                  onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                  className="min-h-32"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>시작일 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start text-left">
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
                  <Label>종료일 *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start text-left">
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
                          // 시작일이 설정되어 있으면 시작일 이전 날짜는 비활성화
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>프로젝트 목표</Label>
                  <Button variant="outline" size="sm" onClick={addObjective}>
                    <Plus className="h-4 w-4 mr-2" />
                    목표 추가
                  </Button>
                </div>
                {projectData.objectives?.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`목표 ${index + 1}`}
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeObjective(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="apple-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="glass p-2 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                팀 구성
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                총 {mockMembers.length}명 중 투입 가능한 팀원을 선택하세요
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 가용성 필터 */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">팀원 가용성 현황</h3>
                  <div className="text-sm text-muted-foreground">
                    선택된 팀원: {projectData.selectedMembers?.length || 0}명
                  </div>
                </div>
                
                <Tabs value={selectedAvailabilityFilter} onValueChange={setSelectedAvailabilityFilter} className="w-full">
                  <TabsList className="glass-card grid w-full grid-cols-4">
                    <TabsTrigger value="all" className="glass-button flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Users className="h-4 w-4" />
                      전체 ({mockMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="available" className="glass-button flex items-center gap-2 data-[state=active]:bg-chart-2 data-[state=active]:text-primary-foreground">
                      <UserCheck className="h-4 w-4" />
                      투입가능 ({availableCount})
                    </TabsTrigger>
                    <TabsTrigger value="partial" className="glass-button flex items-center gap-2 data-[state=active]:bg-chart-3 data-[state=active]:text-primary-foreground">
                      <Clock className="h-4 w-4" />
                      부분가능 ({partialCount})
                    </TabsTrigger>
                    <TabsTrigger value="unavailable" className="glass-button flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-primary-foreground">
                      <UserX className="h-4 w-4" />
                      투입불가 ({unavailableCount})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 팀원 목록 */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((member) => {
                  const isSelected = projectData.selectedMembers?.some(m => m.id === member.id);
                  const { status, reason, endDate } = member.availability;
                  
                  const statusColors = {
                    available: 'border-green-200 bg-green-50 hover:border-green-300',
                    partial: 'border-yellow-200 bg-yellow-50 hover:border-yellow-300',
                    unavailable: 'border-red-200 bg-red-50 cursor-not-allowed opacity-75'
                  };

                  const statusIcons = {
                    available: <UserCheck className="h-4 w-4 text-green-600" />,
                    partial: <Clock className="h-4 w-4 text-yellow-600" />,
                    unavailable: <UserX className="h-4 w-4 text-red-600" />
                  };

                  return (
                    <div
                      key={member.id}
                      className={`
                        p-4 rounded-xl border-2 transition-all relative
                        ${isSelected && status !== 'unavailable'
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : statusColors[status]
                        }
                        ${status !== 'unavailable' ? 'cursor-pointer' : ''}
                      `}
                      onClick={() => {
                        if (status === 'unavailable') return;
                        
                        const currentSelected = projectData.selectedMembers || [];
                        if (isSelected) {
                          setProjectData({
                            ...projectData,
                            selectedMembers: currentSelected.filter(m => m.id !== member.id)
                          });
                        } else {
                          setProjectData({
                            ...projectData,
                            selectedMembers: [...currentSelected, member]
                          });
                        }
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcons[status]}
                            <div>
                              <h3 className="font-semibold text-gray-900">{member.name}</h3>
                              <p className="text-sm text-gray-600">{member.role}</p>
                            </div>
                          </div>
                          {status !== 'unavailable' && (
                            <Checkbox checked={isSelected} readOnly />
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className={`
                            text-xs font-medium px-2 py-1 rounded-full inline-block
                            ${status === 'available' ? 'bg-green-100 text-green-800' :
                              status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}
                          `}>
                            {reason}
                          </div>
                          {endDate && (
                            <div className="text-xs text-gray-500">
                              {status === 'unavailable' ? '투입 가능일: ' : '부분 투입 종료일: '}
                              {endDate}
                            </div>
                          )}
                        </div>

                        {status === 'unavailable' && (
                          <div className="absolute inset-0 bg-gray-200/20 rounded-xl flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">해당 조건에 맞는 팀원이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Check className="h-6 w-6 text-green-500" />
                최종 검토
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                    <div><strong>프로젝트명:</strong> {projectData.name}</div>
                    <div><strong>카테고리:</strong> {projectData.category || '일반 프로젝트'}</div>
                    <div><strong>기간:</strong> {projectData.startDate} ~ {projectData.endDate}</div>
                    <div><strong>우선순위:</strong> 
                      <Badge variant="secondary" className="ml-2">
                        {projectData.priority === 'high' ? '높음' : projectData.priority === 'medium' ? '보통' : '낮음'}
                      </Badge>
                    </div>
                    {projectData.estimatedBudget > 0 && (
                      <div><strong>예상 예산:</strong> {projectData.estimatedBudget.toLocaleString()}원</div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">팀 구성</h3>
                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    {projectData.selectedMembers?.map((member) => {
                      const availability = getMemberAvailability(member);
                      return (
                        <div key={member.id} className="flex items-center justify-between">
                          <span>{member.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{member.role}</Badge>
                            <Badge 
                              variant="secondary" 
                              className={`
                                ${availability.status === 'available' ? 'bg-green-100 text-green-800' :
                                  availability.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'}
                              `}
                            >
                              {availability.reason}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트 설명</h3>
                <p className="text-gray-700 p-4 bg-gray-50 rounded-xl">{projectData.description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="gap-2 px-6"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </Button>
          
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!isStepValid(currentStep)}
            className="gap-2 px-8"
          >
            {currentStep === 3 ? '프로젝트 생성' : '다음'}
            {currentStep < 3 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

      </div>
    </div>
  );
}