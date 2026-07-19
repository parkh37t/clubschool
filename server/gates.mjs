// 게이트 파이프라인 정의 — 가상 사무실의 G1~G6와 담당 에이전트 매핑.
// 프론트(components/VirtualOffice/officeSimulator.ts)의 SCENARIO와 의미가 일치한다.
// 서버는 프론트 TS를 import할 수 없으므로 여기서 별도로 선언한다(단일 계약, 값은 동일하게 유지).

// 에이전트 id → .claude/agents 파일명(페르소나). 라이브 모드에서 시스템 프롬프트로 로드.
export const AGENT_PERSONA = {
  han: 'handojeon-sales-lead',
  kim: 'kim-sales-support',
  jeong: 'jung-wooseon-po',
  na: 'na-service-planner',
  cha: 'cha-ui-designer',
  oh: 'oh-brand-designer',
  pyo: 'pyo-publisher',
  lee: 'lee-interaction-publisher',
  baek: 'baek-backend-developer',
  gu: 'gu-frontend-developer',
  go: 'go-data-analyst',
  hong: 'hong-marketer',
};

// 에이전트 id → 한국어 이름(로그·산출물 표기용).
export const AGENT_NAME = {
  han: '한도전', kim: '김영업', jeong: '정우선', na: '나기획',
  cha: '차도안', oh: '오색감', pyo: '표준수', lee: '이풍뎅',
  baek: '백연동', gu: '구동민', go: '고지표', hong: '홍보라',
};

// 게이트별 담당자·기본 작업·산출물. stage는 오피스 보드의 0-index(=g-1).
// artifact.file은 오피스 산출물 패널에 표시되는 이름(라이브 모드에선 실제 파일이 DELIVERABLES에 생성됨).
export const GATES = [
  {
    g: 1, stage: 0, name: '영업/평가',
    workers: [
      { id: 'han', task: 'RFP 5축 평가' },
      { id: 'kim', task: '고객 요구 정리' },
    ],
    artifact: { file: '수주평가서.md', score: 92 },
  },
  {
    g: 2, stage: 1, name: '기획',
    workers: [
      { id: 'jeong', task: 'PRD 초안 작성' },
      { id: 'na', task: 'IA·플로우 설계' },
    ],
    artifact: { file: 'PRD_v1.md', score: 88 },
  },
  {
    g: 3, stage: 2, name: '디자인',
    workers: [
      { id: 'cha', task: '메인 UI 시안' },
      { id: 'oh', task: '브랜드 무드보드' },
    ],
    artifact: { file: 'UI시안_v1.md', score: 90 },
  },
  {
    g: 4, stage: 3, name: '구현',
    workers: [
      { id: 'pyo', task: '마크업 셋업' },
      { id: 'lee', task: '인터랙션 구현' },
      { id: 'baek', task: 'API 개발' },
      { id: 'gu', task: '화면 개발' },
    ],
    artifact: { file: 'mvp_build_notes.md', score: 86 },
  },
  {
    g: 5, stage: 4, name: '검증/배포',
    workers: [{ id: 'go', task: 'QA·지표 검증' }],
    artifact: { file: 'QA리포트.md', score: 91 },
  },
  {
    g: 6, stage: 5, name: '그로스',
    workers: [{ id: 'hong', task: '런칭 캠페인' }],
    artifact: { file: '캠페인플랜.md', score: 89 },
  },
];

// 지시가 고른 게이트(예: ['G1','G2','G3'])만 순서대로 남긴다. 미지정/전체면 전 게이트.
export function pickGates(selected) {
  if (!Array.isArray(selected) || selected.length === 0) return [...GATES];
  const set = new Set(selected.map((s) => String(s).toUpperCase()));
  return GATES.filter((gate) => set.has('G' + gate.g));
}
