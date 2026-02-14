import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Users, Calendar, AlertTriangle } from 'lucide-react';
import { Project, ReviewComment } from '../types';
import { mockMembers } from '../data/mockData';
import { useMobile } from '../hooks/useMobile';


interface ProjectReviewProps {
  dataStore: ReturnType<typeof import('../hooks/useDataStore').useDataStore>;
  onBack: () => void;
}

// 검토 대기중인 프로젝트 목 데이터
const mockReviewProjects: Project[] = [
  {
    id: 'review-1',
    name: 'E-커머스 플랫폼 고도화',
    status: 'review',
    startDate: '2024-03-01',
    endDate: '2024-06-30',
    description: '기존 E-커머스 플랫폼의 성능 개선 및 새로운 결제 시스템 도입',
    allocations: [],
    createdBy: '1',
    reviewers: ['1', '2'],
    reviewComments: [
      {
        id: '1',
        reviewerId: '2',
        comment: '팀 구성이 잘 되어있고 일정도 합리적입니다. 승인합니다.',
        type: 'approval',
        createdAt: '2024-02-15T10:30:00Z'
      }
    ]
  },
  {
    id: 'review-2',
    name: '모바일 앱 보안 강화',
    status: 'review',
    startDate: '2024-02-20',
    endDate: '2024-04-20',
    description: '모바일 앱의 보안 취약점 개선 및 인증 시스템 업그레이드',
    allocations: [],
    createdBy: '3',
    reviewers: ['1'],
    reviewComments: []
  },
  {
    id: 'review-3',
    name: 'AI 챗봇 시스템 구축',
    status: 'review',
    startDate: '2024-03-15',
    endDate: '2024-07-15',
    description: '고객 지원을 위한 AI 기반 챗봇 시스템 개발 및 도입',
    allocations: [],
    createdBy: '4',
    reviewers: ['1', '2'],
    reviewComments: [
      {
        id: '2',
        reviewerId: '1',
        comment: '일정이 너무 촉박해 보입니다. 개발 기간을 1개월 연장하는 것을 검토해보세요.',
        type: 'request_change',
        createdAt: '2024-02-16T14:20:00Z'
      }
    ]
  }
];

const statusLabels = {
  'draft': '초안',
  'review': '검토중',
  'approved': '승인됨',
  'planning': '기획중',
  'in-progress': '진행중',
  'completed': '완료',
  'on-hold': '보류'
};

const priorityLabels = {
  'high': '높음',
  'medium': '보통',
  'low': '낮음'
};

const priorityColors = {
  'high': 'bg-red-100 text-red-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-green-100 text-green-800'
};

export function ProjectReview({ onBack }: ProjectReviewProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewType, setReviewType] = useState<'approval' | 'rejection' | 'request_change'>('approval');
  const isMobile = useMobile();

  const getMemberById = (id: string) => {
    return mockMembers.find(m => m.id === id);
  };

  const handleReviewSubmit = () => {
    if (!selectedProject || !reviewComment) return;

    const newComment: ReviewComment = {
      id: Date.now().toString(),
      reviewerId: '1', // 현재 사용자 ID
      comment: reviewComment,
      type: reviewType,
      createdAt: new Date().toISOString()
    };

    // 실제로는 API 호출하여 검토 의견 저장
    console.log('Review submitted:', newComment);
    
    setReviewComment('');
    setSelectedProject(null);
  };

  const getProjectsByStatus = (status: 'review' | 'approved') => {
    return mockReviewProjects.filter(p => p.status === status);
  };

  if (selectedProject) {
    return (
      <div className="min-h-screen">
        <div className={`space-y-6 w-full max-w-none ${isMobile ? 'px-4 py-6' : 'p-12 max-w-4xl mx-auto space-y-8'}`}>
          <div className={`${isMobile ? 'space-y-4' : 'flex items-center gap-6'}`}>
            <Button 
              variant="ghost" 
              size={isMobile ? "default" : "lg"} 
              onClick={() => setSelectedProject(null)} 
              className="glass-button gap-2 korean-text"
            >
              <ArrowLeft className="h-5 w-5" />
              목록으로
            </Button>
            <div className="space-y-2">
              <h1 className={`font-bold tracking-tight korean-text ${
                isMobile ? 'text-2xl leading-tight' : 'text-4xl'
              }`}>
                프로젝트 검토
              </h1>
              <p className={`text-muted-foreground korean-text ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                {selectedProject.name}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {/* 프로젝트 정보 */}
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">프로젝트 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">프로젝트명</h3>
                    <p className="text-gray-700">{selectedProject.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">설명</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedProject.description}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900">시작일</h3>
                      <p className="text-gray-700">{selectedProject.startDate}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900">종료일</h3>
                      <p className="text-gray-700">{selectedProject.endDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 기존 검토 의견 */}
              {selectedProject.reviewComments && selectedProject.reviewComments.length > 0 && (
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      검토 의견
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedProject.reviewComments.map((comment) => {
                        const reviewer = getMemberById(comment.reviewerId);
                        return (
                          <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-sm font-semibold">
                                    {reviewer?.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-semibold text-gray-900">{reviewer?.name}</span>
                                  <Badge 
                                    variant={comment.type === 'approval' ? 'default' : 
                                           comment.type === 'rejection' ? 'destructive' : 'secondary'}
                                    className="ml-2"
                                  >
                                    {comment.type === 'approval' ? '승인' : 
                                     comment.type === 'rejection' ? '반려' : '수정 요청'}
                                  </Badge>
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{comment.comment}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 검토 액션 */}
            <div className="space-y-6">
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">검토 결정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="font-semibold mb-3 block text-gray-900">검토 결과</label>
                    <Select value={reviewType} onValueChange={(value: any) => setReviewType(value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approval">승인</SelectItem>
                        <SelectItem value="request_change">수정 요청</SelectItem>
                        <SelectItem value="rejection">반려</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-semibold mb-3 block text-gray-900">검토 의견</label>
                    <Textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="검토 의견을 입력해주세요"
                      rows={4}
                      className="min-h-32"
                    />
                  </div>

                  <Button 
                    onClick={handleReviewSubmit} 
                    disabled={!reviewComment}
                    className="w-full h-12 gap-2 font-semibold"
                    size="lg"
                  >
                    {reviewType === 'approval' && <CheckCircle className="h-4 w-4" />}
                    {reviewType === 'rejection' && <XCircle className="h-4 w-4" />}
                    {reviewType === 'request_change' && <AlertTriangle className="h-4 w-4" />}
                    검토 완료
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">프로젝트 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">현재 상태</span>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {statusLabels[selectedProject.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">생성자</span>
                      <span className="font-semibold text-gray-900">{getMemberById(selectedProject.createdBy)?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">검토자</span>
                      <span className="font-semibold text-gray-900">{selectedProject.reviewers.length}명</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className={`space-y-6 w-full max-w-none ${isMobile ? 'px-4 py-6' : 'p-12 max-w-6xl mx-auto space-y-8'}`}>
        <div className={`${isMobile ? 'space-y-6' : 'flex items-center gap-6'}`}>
          <Button 
            variant="ghost" 
            size={isMobile ? "default" : "lg"} 
            onClick={onBack} 
            className="glass-button gap-2 korean-text"
          >
            <ArrowLeft className="h-5 w-5" />
            뒤로
          </Button>
          <div className="space-y-2">
            <h1 className={`font-bold tracking-tight korean-text ${
              isMobile ? 'text-2xl leading-tight' : 'text-5xl'
            }`}>
              프로젝트 검토
            </h1>
            <p className={`text-muted-foreground korean-text ${
              isMobile ? 'text-base leading-relaxed' : 'text-xl'
            }`}>
              대기 중인 프로젝트 승인 및 피드백 관리
            </p>
          </div>
        </div>

        <Tabs defaultValue="pending" className={`space-y-8 ${isMobile ? 'space-y-6' : 'space-y-8'}`}>
          <TabsList className={`grid w-full grid-cols-2 p-2 apple-card ${
            isMobile ? 'h-12' : 'h-14 lg:w-96'
          }`}>
            <TabsTrigger 
              value="pending" 
              className={`font-semibold rounded-xl korean-text ${
                isMobile ? 'py-2 text-sm' : 'py-3'
              }`}
            >
              검토 대기 ({getProjectsByStatus('review').length}건)
            </TabsTrigger>
            <TabsTrigger 
              value="approved" 
              className={`font-semibold rounded-xl korean-text ${
                isMobile ? 'py-2 text-sm' : 'py-3'
              }`}
            >
              승인 완료 ({getProjectsByStatus('approved').length}건)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className={`space-y-6 ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {getProjectsByStatus('review').map((project) => {
              const creator = getMemberById(project.createdBy);
              const hasComments = project.reviewComments && project.reviewComments.length > 0;
              
              return (
                <Card 
                  key={project.id} 
                  className="apple-card cursor-pointer hover:scale-105 transition-all duration-300" 
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className={`${isMobile ? 'p-5' : 'p-8'}`}>
                    <div className={`flex items-start ${isMobile ? 'flex-col space-y-4' : 'justify-between'}`}>
                      <div className="flex-1 min-w-0 w-full">
                        <div className={`flex items-center gap-4 mb-3 ${isMobile ? 'flex-wrap gap-2' : ''}`}>
                          <h3 className={`font-bold korean-text ${isMobile ? 'text-lg' : 'text-xl'}`}>{project.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold korean-text ${
                              isMobile ? 'text-xs' : ''
                            }`}
                          >
                            검토 대기
                          </Badge>
                          {hasComments && (
                            <Badge variant="secondary" className={`font-medium korean-text ${isMobile ? 'text-xs' : ''}`}>
                              <MessageSquare className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                              의견 {project.reviewComments!.length}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-muted-foreground mb-4 leading-relaxed korean-text ${
                          isMobile ? 'text-sm' : ''
                        }`}>
                          {project.description}
                        </p>
                        <div className={`flex items-center gap-6 text-muted-foreground ${
                          isMobile ? 'text-xs gap-4 flex-col items-start' : 'text-sm'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="korean-text">{project.startDate} ~ {project.endDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="korean-text">생성자: {creator?.name}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "lg"} 
                        className={`font-semibold korean-text ${isMobile ? 'w-full' : 'ml-4 px-6'}`}
                      >
                        검토하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {getProjectsByStatus('review').length === 0 && (
              <Card className="apple-card">
                <CardContent className={`text-center ${isMobile ? 'p-8' : 'p-16'}`}>
                  <CheckCircle className={`text-muted-foreground mx-auto mb-6 ${isMobile ? 'h-12 w-12' : 'h-16 w-16'}`} />
                  <h3 className={`font-semibold mb-3 korean-text ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    검토 대기중인 프로젝트가 없습니다
                  </h3>
                  <p className={`text-muted-foreground korean-text ${isMobile ? 'text-sm' : ''}`}>
                    모든 프로젝트가 검토 완료되었습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-6">
            {getProjectsByStatus('approved').map((project) => {
              const creator = getMemberById(project.createdBy);
              
              return (
                <Card key={project.id} className="border-0 shadow-xl">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                          <Badge className="bg-green-50 text-green-700 border-green-200 font-semibold">
                            승인 완료
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4 leading-relaxed">{project.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{project.startDate} ~ {project.endDate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>생성자: {creator?.name}</span>
                          </div>
                          {project.approvedAt && (
                            <div>
                              승인일: {new Date(project.approvedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}