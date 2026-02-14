import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { mockMembers, mockMemberManmonths, getGroupSummary } from '../data/mockData';
import { useMobile } from '../hooks/useMobile';
import { Search, Filter, Users, Plus, Mail, Phone, MapPin, TrendingUp, Calendar, Award, UserCheck, Star, Send, UserPlus, X } from 'lucide-react';


const groupColors = {
  'executive': {
    bg: 'linear-gradient(135deg, var(--chart-5), rgba(255, 45, 146, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-5)',
    light: 'var(--accent)'
  },
  'management': {
    bg: 'linear-gradient(135deg, var(--chart-3), rgba(255, 149, 0, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-3)',
    light: 'var(--accent)'
  },
  'planning': {
    bg: 'linear-gradient(135deg, var(--chart-4), rgba(175, 82, 222, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-4)',
    light: 'var(--accent)'
  },
  'design': {
    bg: 'linear-gradient(135deg, var(--chart-1), rgba(0, 122, 255, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-1)',
    light: 'var(--accent)'
  },
  'publishing': {
    bg: 'linear-gradient(135deg, var(--chart-2), rgba(52, 199, 89, 0.1))',
    text: 'text-primary-foreground',
    accent: 'var(--chart-2)',
    light: 'var(--accent)'
  }
};

const groupLabels = {
  'executive': '본부장',
  'management': '사업관리팀',
  'planning': '기획그룹',
  'design': '디자인그룹',
  'publishing': '퍼블리싱그룹'
};

interface MemberManagementProps {
  dataStore: ReturnType<typeof import('../hooks/useDataStore').useDataStore>;
  onViewMemberProfile: (memberId: string) => void;
}

export function MemberManagement({ onViewMemberProfile }: MemberManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: '',
    group: '',
    message: ''
  });
  const isMobile = useMobile();

  const groupSummaries = getGroupSummary();

  const getMemberManmonth = (memberId: string) => {
    return mockMemberManmonths.find(mm => mm.memberId === memberId);
  };

  // 필터링 및 정렬
  const filteredMembers = mockMembers
    .filter(member => 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(member => selectedGroup === 'all' || member.group === selectedGroup)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'utilization') {
        const aUtil = getMemberManmonth(a.id)?.utilizationRate || 0;
        const bUtil = getMemberManmonth(b.id)?.utilizationRate || 0;
        return bUtil - aUtil;
      }
      return 0;
    });

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-chart-2 bg-chart-2/10';
    if (rate >= 60) return 'text-chart-3 bg-chart-3/10';
    return 'text-destructive bg-destructive/10';
  };

  const getPerformanceIcon = (rate: number) => {
    if (rate >= 90) return <Star className="h-4 w-4 text-chart-3" />;
    if (rate >= 80) return <Award className="h-4 w-4 text-primary" />;
    if (rate >= 70) return <UserCheck className="h-4 w-4 text-chart-2" />;
    return <Users className="h-4 w-4 text-muted-foreground" />;
  };

  const handleInvite = () => {
    // 실제로는 API 호출
    console.log('초대 전송:', inviteForm);
    setShowInviteDialog(false);
    setInviteForm({ name: '', email: '', role: '', group: '', message: '' });
    // 성공 메시지 표시 (실제 구현에서는 toast 등 사용)
    alert('초대 이메일이 성공적으로 전송되었습니다!');
  };

  return (
    <div className="min-h-screen">
      <div className={`space-y-8 max-w-7xl mx-auto ${isMobile ? 'mobile-padding' : 'p-8'}`}>
        {/* 헤더 영역 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1>인력 관리</h1>
            <p className="text-muted-foreground">56명 구성원의 배치와 성과를 효율적으로 관리합니다</p>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button 
                size={isMobile ? "default" : "lg"} 
                className="glass-button apple-shadow-md hover:apple-shadow-lg touch-friendly gap-2"
              >
                <UserPlus className="h-4 w-4" />
                구성원 초대
              </Button>
            </DialogTrigger>
            <DialogContent className="apple-card max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-primary" />
                  구성원 초대
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  새로운 구성원을 팀에 초대합니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      placeholder="이름을 입력하세요"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="touch-friendly"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일 *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="touch-friendly"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">역할</Label>
                    <Input
                      id="role"
                      placeholder="ex) 시니어 기획자"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      className="touch-friendly"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">소속팀</Label>
                    <Select value={inviteForm.group} onValueChange={(value) => setInviteForm({ ...inviteForm, group: value })}>
                      <SelectTrigger className="touch-friendly">
                        <SelectValue placeholder="팀을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="apple-card">
                        <SelectItem value="executive">본부장</SelectItem>
                        <SelectItem value="management">사업관리팀</SelectItem>
                        <SelectItem value="planning">기획팀</SelectItem>
                        <SelectItem value="design">디자인팀</SelectItem>
                        <SelectItem value="publishing">개발팀</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">초대 메시지</Label>
                  <Textarea
                    id="message"
                    placeholder="개인화된 초대 메시지를 작성하세요..."
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    className="min-h-24"
                  />
                </div>

                <div className="glass rounded-xl p-4 border-primary/20">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="text-primary mb-1">초대 이메일 미리보기</h4>
                      <p className="text-sm text-muted-foreground">
                        "{inviteForm.name || '[이름]'}"님, 프로젝트 관리 시스템에 초대합니다. 
                        {inviteForm.role && ` ${inviteForm.role} 역할로 `}
                        {inviteForm.group && `${groupLabels[inviteForm.group as keyof typeof groupLabels]}에서 `}
                        함께 일하게 되어 기쁩니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowInviteDialog(false)} 
                    variant="outline" 
                    className="flex-1 touch-friendly glass-button"
                  >
                    취소
                  </Button>
                  <Button 
                    onClick={handleInvite}
                    disabled={!inviteForm.name || !inviteForm.email}
                    className="flex-1 touch-friendly gap-2 apple-button-primary"
                  >
                    <Send className="h-4 w-4" />
                    초대 보내기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 검색 및 필터 */}
        <Card className="apple-card">
          <CardContent className={isMobile ? "p-4" : "p-6"}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="팀원 이름이나 역할로 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 touch-friendly"
                />
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full lg:w-48 touch-friendly">
                  <SelectValue placeholder="팀 선택" />
                </SelectTrigger>
                <SelectContent className="apple-card">
                  <SelectItem value="all">전체 팀</SelectItem>
                  <SelectItem value="executive">본부장</SelectItem>
                  <SelectItem value="management">사업관리팀</SelectItem>
                  <SelectItem value="planning">기획팀</SelectItem>
                  <SelectItem value="design">디자인팀</SelectItem>
                  <SelectItem value="publishing">개발팀</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-48 touch-friendly">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="apple-card">
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="role">역할순</SelectItem>
                  <SelectItem value="utilization">가동률순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 팀별 요약 */}
        <Tabs defaultValue="summary" className="space-y-8">
          <TabsList className="glass-card grid w-full grid-cols-2 p-1 h-auto">
            <TabsTrigger 
              value="summary" 
              className="touch-friendly data-[state=active]:bg-card-backdrop data-[state=active]:apple-shadow-md rounded-lg transition-all duration-200"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              팀별 요약
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="touch-friendly data-[state=active]:bg-card-backdrop data-[state=active]:apple-shadow-md rounded-lg transition-all duration-200"
            >
              <Users className="h-4 w-4 mr-2" />
              전체 팀원
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {groupSummaries.filter(summary => groupColors[summary.group] && groupLabels[summary.group]).map((summary) => {
                const colors = groupColors[summary.group];
                const members = mockMembers.filter(m => m.group === summary.group);
                
                return (
                  <Card key={summary.group} className="apple-card hover:apple-shadow-xl transition-all duration-300">
                    <CardHeader className={isMobile ? "pb-4" : "pb-6"}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.accent} apple-shadow-sm`} />
                          <CardTitle className="text-foreground">
                            {groupLabels[summary.group]}
                          </CardTitle>
                        </div>
                        {/* 향상된 인원수 표시 */}
                        <div className="flex items-center gap-2">
                          <div className="glass rounded-full px-3 py-1.5 apple-shadow-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold">
                                {summary.totalMembers}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                명
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className={`space-y-6 ${isMobile ? "p-4" : "p-6"}`}>
                      {/* 팀 통계 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass rounded-xl p-4 text-center apple-shadow-sm">
                          <div className="text-sm text-muted-foreground mb-1">평균 가동률</div>
                          <div className="text-2xl font-semibold text-foreground">
                            {summary.averageUtilization.toFixed(0)}%
                          </div>
                        </div>
                        <div className="glass rounded-xl p-4 text-center apple-shadow-sm">
                          <div className="text-sm text-muted-foreground mb-1">이번달 투입</div>
                          <div className="text-2xl font-semibold text-foreground">
                            {summary.totalThisMonthEstimated.toFixed(1)}MM
                          </div>
                        </div>
                      </div>

                      {/* 주요 팀원 (상위 3명) */}
                      <div className="space-y-3">
                        <h4 className="text-foreground">주요 팀원</h4>
                        {members.slice(0, 3).map((member) => {
                          const manmonth = getMemberManmonth(member.id);
                          return (
                            <div key={member.id} className="flex items-center gap-3 p-3 glass rounded-xl apple-shadow-sm">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-sm">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">{member.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-foreground">
                                  {manmonth?.utilizationRate.toFixed(0) || 0}%
                                </div>
                                {manmonth && getPerformanceIcon(manmonth.utilizationRate)}
                              </div>
                            </div>
                          );
                        })}
                        {members.length > 3 && (
                          <Button variant="ghost" className="w-full text-sm glass-button touch-friendly">
                            +{members.length - 3}명 더 보기
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-8">
            {/* 검색 결과 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">
                  {filteredMembers.length}명의 팀원
                </span>
                {searchQuery && (
                  <Badge variant="secondary">
                    "{searchQuery}" 검색 결과
                  </Badge>
                )}
              </div>
            </div>

            {/* 팀원 목록 */}
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredMembers.map((member) => {
                const manmonth = getMemberManmonth(member.id);
                const colors = groupColors[member.group];
                
                return (
                  <Card 
                    key={member.id} 
                    className="apple-card hover:apple-shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => onViewMemberProfile(member.id)}
                  >
                    <CardHeader className={isMobile ? "pb-3" : "pb-4"}>
                      <div className="flex items-start gap-4">
                        <Avatar className={isMobile ? "h-12 w-12" : "h-16 w-16"}>
                          <AvatarFallback className={isMobile ? "text-lg" : "text-xl"}>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-foreground truncate">{member.name}</h3>
                              <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colors?.accent || 'bg-muted-foreground'} apple-shadow-sm`} />
                              <Badge variant="secondary" className="text-xs">
                                {groupLabels[member.group]}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className={`space-y-4 ${isMobile ? "p-4" : "p-6"}`}>
                      {/* 연락처 정보 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>

                      {/* 가동률 */}
                      {manmonth && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">현재 가동률</span>
                            <div className="flex items-center gap-2">
                              {getPerformanceIcon(manmonth.utilizationRate)}
                              <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getUtilizationColor(manmonth.utilizationRate)}`}>
                                {manmonth.utilizationRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <Progress value={manmonth.utilizationRate} className="h-2" />
                        </div>
                      )}

                      {/* Manmonth 정보 */}
                      {manmonth && (
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                          <div className="text-center p-3 glass rounded-xl apple-shadow-sm">
                            <div className="text-xs text-muted-foreground mb-1">이번달 예상</div>
                            <div className="text-sm font-semibold text-foreground">
                              {manmonth.thisMonthEstimated.toFixed(1)}MM
                            </div>
                          </div>
                          <div className="text-center p-3 glass rounded-xl apple-shadow-sm">
                            <div className="text-xs text-muted-foreground mb-1">투입 가능</div>
                            <div className="text-sm font-semibold text-foreground">
                              {manmonth.availableManmonth.toFixed(1)}MM
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">검색 결과가 없습니다</p>
                <p className="text-muted-foreground/70 text-sm">다른 검색어를 시도해보세요</p>
              </div>
            )}
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}