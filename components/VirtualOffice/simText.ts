// 사무실 그림(officeSimulator) 안의 문구 — 한국어(기본)·영어. 화면 패널 문구는 i18n.ts 에 있다.

export type Lang = 'ko' | 'en';

export interface SimText {
  dept: Record<string, string>;
  names: Record<string, string>;
  roles: Record<string, string>;
  gates: string[];
  demoTasks: string[][]; // SCENARIO 게이트별 작업 이름(데모)
  bar: { compact: string; full: string; compactTitle: string; fullTitle: string };
  rooms: { boss: string; bossNote: string; lounge: string; server: string; meeting: string; briefing: string; onAir: string; ext: string; extEmpty: string; hall: string; focus: string; print: string };
  owner: string;
  feed: {
    orchestrator: string; meeting: string; gate: string; boss: string; order: string; qa: string; lead: string;
    soloStart: (g: string) => string; kickoff: (g: string) => string; kickoffOn: (n: number) => string; kickoffEnd: string; rounds: (who: string) => string;
    start: (task: string) => string; awaitExt: (g: string) => string; awaitDemo: (g: string, score: number) => string;
    approved: (g: string, auto: boolean) => string; allPassed: string; allPassedToast: string; nextToast: (g: string, next: string) => string;
    received: (title: string) => string; mail: (to: string, what: string, task?: string) => string;
    mailType: Record<string, string>; taskDone: (id: string, title: string, gate: string) => string; taskFail: (id: string, title: string) => string;
    taskAwait: (id: string, title: string) => string; briefDone: string; briefDoneToast: string; points: (n: number) => string;
  };
  gate: {
    waiting: string; none: string; done: string; kickoff: string; returning: string; awaiting: string;
    progress: (pct: number) => string; activeOf: (d: number, t: number) => string; awaitingN: (n: number) => string;
    doneOf: (d: number, t: number) => string; waitingOf: (d: number, t: number) => string;
  };
  team: string; play: string; pause: string; speed: (n: number) => string; approvalHive: string; approvalDemo: (g: string) => string;
}

const ko: SimText = {
  dept: { sales: '영업', plan: '기획', design: '디자인', pub: '퍼블리싱', dev: '개발', dm: '데이터·마케팅', lead: '팀장', ext: '추가 인원' },
  names: { han: '한도전', kim: '김영업', jeong: '정우선', na: '나기획', cha: '차도안', oh: '오색감', pyo: '표준수', lee: '이풍뎅', baek: '백연동', gu: '구동민', go: '고지표', hong: '홍보라', lead: '팀장', jaeha: '재하' },
  roles: { han: '영업팀장', kim: '영업', jeong: 'PO', na: '서비스기획', cha: '제품 UI', oh: '브랜드 BX', pyo: '퍼블리싱', lee: '인터랙션', baek: '백엔드', gu: '프론트엔드', go: '데이터', hong: '마케팅', lead: '오케스트레이터' },
  gates: ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'],
  demoTasks: [['RFP 5축 평가', '고객 요구 정리'], ['PRD 초안 작성', 'IA 플로우 설계'], ['메인 UI 시안', '브랜드 무드보드'], ['마크업 셋업', '인터랙션 구현', 'API 개발', '화면 개발'], ['QA·지표 검증'], ['런칭 캠페인']],
  bar: { compact: '간단히', full: '자세히', compactTitle: '에이전트 바를 한 줄로 줄여 사무실을 크게 봅니다', fullTitle: '에이전트 카드를 자세히 봅니다(지금 작업·사용량)' },
  rooms: { boss: '사장실 · 결재', bossNote: '게이트 최종 승인', lounge: '라운지', server: '서버룸 · 실행 계층', meeting: '회의실 · 킥오프', briefing: '팀장실 · 브리핑', onAir: 'ON AIR · 사용자 채널', ext: '확장 구역 · 추가 인원', extEmpty: '빈 자리 — ＋ 인원 추가로 들이면 여기 앉습니다', hall: '복도', focus: '포커스룸 · 통화', print: '자료실 · 복합기' },
  owner: '재하',
  feed: {
    orchestrator: '오케스트레이터', meeting: '회의실', gate: '게이트', boss: '사장', order: '지시', qa: 'QA', lead: '팀장',
    soloStart: (g) => `${g} 시작 — 단독 스프린트`, kickoff: (g) => `${g} 시작 — 회의실 킥오프 소집`,
    kickoffOn: (n) => `킥오프 진행 중 — 역할·산출물 정렬 (${n}명)`, kickoffEnd: '킥오프 종료 — 전원 자리 복귀', rounds: (who) => `현장 순회 — ${who} 자리 확인`,
    start: (t) => `${t} 착수`, awaitExt: (g) => `${g} — 결재 대기`, awaitDemo: (g, s) => `${g} 검수 통과 (${s}점) — 결재 대기`,
    approved: (g, a) => `${g} 결재 완료${a ? ' (자동)' : ''}`, allPassed: '전 게이트 통과 — 브리핑 룸 총회 소집', allPassedToast: 'G6까지 전 게이트 통과 — 파이프라인 완료',
    nextToast: (g, n) => `${g} 결재 완료 — ${n} 착수`, received: (t) => `접수: ${t} — 오케스트레이터 실행 대기`,
    mail: (to, what, task) => `${to}에게 ${what}${task ? ` (${task})` : ''}`,
    mailType: { assign: '작업 배정', result: '산출물 회신', approval: '승인 요청', question: '질문', answer: '답변', report: '보고' },
    taskDone: (id, t, g) => `${id} ${t} — 게이트 ${g} · 완료`, taskFail: (id, t) => `${id} ${t} — 게이트 FAIL`, taskAwait: (id, t) => `${id} ${t} — 재하 승인 대기`,
    briefDone: '브리핑 작업 마감 — 보고서를 현황판·재하 inbox 에 남김', briefDoneToast: '브리핑 완료 — 팀장 보고서 작성됨', points: (n) => `${n}점`,
  },
  gate: {
    waiting: '대기', none: '해당 없음', done: '완료', kickoff: '킥오프 회의', returning: '자리 복귀', awaiting: '결재 대기',
    progress: (p) => `진행 중 ${p}%`, activeOf: (d, t) => `진행 중 ${d}/${t}`, awaitingN: (n) => `결재 대기 ${n}건`, doneOf: (d, t) => `완료 ${d}/${t}`, waitingOf: (d, t) => `대기 ${d}/${t}`,
  },
  team: '와일리 컨버전스 · AX Office', play: '▶ 재생', pause: '⏸ 일시정지', speed: (n) => `속도 ${n}×`, approvalHive: '재하 승인 대기', approvalDemo: (g) => `${g} 게이트 검수 통과`,
};

const en: SimText = {
  dept: { sales: 'Sales', plan: 'Planning', design: 'Design', pub: 'Publishing', dev: 'Engineering', dm: 'Data · Marketing', lead: 'Lead', ext: 'New hires' },
  names: { han: 'Han Dojeon', kim: 'Kim Youngeop', jeong: 'Jeong Useon', na: 'Na Gihoek', cha: 'Cha Doan', oh: 'Oh Saekgam', pyo: 'Pyo Junsu', lee: 'Lee Pungdeng', baek: 'Baek Yeondong', gu: 'Gu Dongmin', go: 'Go Jipyo', hong: 'Hong Bora', lead: 'Team Lead', jaeha: 'Jaeha' },
  roles: { han: 'Sales lead', kim: 'Sales', jeong: 'PO', na: 'Service planner', cha: 'Product UI', oh: 'Brand BX', pyo: 'Publishing', lee: 'Interaction', baek: 'Backend', gu: 'Frontend', go: 'Data', hong: 'Marketing', lead: 'Orchestrator' },
  gates: ['Sales', 'Planning', 'Design', 'Build', 'QA/Release', 'Growth'],
  demoTasks: [['RFP 5-axis review', 'Customer needs'], ['PRD draft', 'IA & flows'], ['Main UI mockup', 'Brand moodboard'], ['Markup setup', 'Interactions', 'API build', 'Screen build'], ['QA & metrics'], ['Launch campaign']],
  bar: { compact: 'Compact', full: 'Details', compactTitle: 'Shrink the agent bar to one line for a bigger office', fullTitle: 'Show detailed agent cards (current task, usage)' },
  rooms: { boss: 'Boss · Approvals', bossNote: 'Final gate approval', lounge: 'Lounge', server: 'Server room', meeting: 'Meeting · Kickoff', briefing: 'Lead room · Briefing', onAir: 'ON AIR · User channel', ext: 'Annex · New hires', extEmpty: 'Empty desks — use + Add agent to fill them', hall: 'Hall', focus: 'Focus booths', print: 'Print · Files' },
  owner: 'Jaeha',
  feed: {
    orchestrator: 'Orchestrator', meeting: 'Meeting room', gate: 'Gate', boss: 'Boss', order: 'Order', qa: 'QA', lead: 'Lead',
    soloStart: (g) => `${g} started — solo sprint`, kickoff: (g) => `${g} started — kickoff in the meeting room`,
    kickoffOn: (n) => `Kickoff — aligning roles and deliverables (${n})`, kickoffEnd: 'Kickoff over — back to desks', rounds: (who) => `Running the floor — checking on ${who}`,
    start: (t) => `started ${t}`, awaitExt: (g) => `${g} — awaiting approval`, awaitDemo: (g, s) => `${g} passed review (${s}) — awaiting approval`,
    approved: (g, a) => `${g} approved${a ? ' (auto)' : ''}`, allPassed: 'All gates passed — all hands in the briefing room', allPassedToast: 'All gates through G6 — pipeline done',
    nextToast: (g, n) => `${g} approved — starting ${n}`, received: (t) => `Received: ${t} — waiting for the orchestrator`,
    mail: (to, what, task) => `${what} → ${to}${task ? ` (${task})` : ''}`,
    mailType: { assign: 'assignment', result: 'deliverable', approval: 'approval request', question: 'question', answer: 'answer', report: 'report' },
    taskDone: (id, t, g) => `${id} ${t} — gate ${g} · done`, taskFail: (id, t) => `${id} ${t} — gate FAIL`, taskAwait: (id, t) => `${id} ${t} — awaiting Jaeha's approval`,
    briefDone: 'Briefing closed — report left on the board and in Jaeha\'s inbox', briefDoneToast: 'Briefing done — the lead wrote the report', points: (n) => `${n} pts`,
  },
  gate: {
    waiting: 'Waiting', none: 'N/A', done: 'Done', kickoff: 'Kickoff', returning: 'Returning', awaiting: 'Awaiting approval',
    progress: (p) => `Working ${p}%`, activeOf: (d, t) => `Working ${d}/${t}`, awaitingN: (n) => `Awaiting ${n}`, doneOf: (d, t) => `Done ${d}/${t}`, waitingOf: (d, t) => `Waiting ${d}/${t}`,
  },
  team: 'Wylie Convergence · AX Office', play: '▶ Play', pause: '⏸ Pause', speed: (n) => `Speed ${n}×`, approvalHive: 'Awaiting Jaeha\'s approval', approvalDemo: (g) => `${g} gate passed review`,
};

export const SIM_TEXT: Record<Lang, SimText> = { ko, en };
