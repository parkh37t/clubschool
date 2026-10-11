// AX 기획 에이전트(con-ai) 서브 메뉴 — con-ai 사이트의 왼쪽 메뉴를 그대로 옮긴 것.
// 항목의 route 는 con-ai 의 해시 라우트(#/…)다. 사이드바에서 누르면 iframe 이 그 화면으로 간다.

export const CON_AI_URL = 'https://parkh37t.github.io/con-ai/';

export interface AxAgentMenuItem {
  /** 사이드바 표시명 */
  label: string;
  /** con-ai 해시 라우트(예: '#/asis') */
  route: string;
  /** 작업 흐름 단계 번호(있으면 번호 칩으로 표시) */
  step?: number;
}

export interface AxAgentMenuGroup {
  /** 섹션 제목. 없으면 제목 없이 항목만 */
  title?: string;
  items: AxAgentMenuItem[];
}

export const AX_AGENT_MENU: AxAgentMenuGroup[] = [
  { items: [{ label: '프로젝트 홈', route: '#/advanced' }] },
  {
    title: '작업 흐름',
    items: [
      { label: 'AS-IS 분석', route: '#/asis', step: 1 },
      { label: '화면', route: '#/advanced?stage=screens', step: 2 },
      { label: '검토 중', route: '#/advanced?stage=review', step: 3 },
      { label: '완료', route: '#/advanced?stage=done', step: 4 },
    ],
  },
  { title: '발주 자료', items: [{ label: 'RFP 분석 (요구사항 추출)', route: '#/rfp' }] },
  { title: '메뉴에서 만들기', items: [{ label: '메뉴구조도에서 화면 만들기', route: '#/plan' }] },
  { title: '둘러보기', items: [{ label: '프로토타입 4단계 실행', route: '#/prototype' }] },
  {
    title: '자료',
    items: [
      { label: 'ID 매핑 (추적 체인)', route: '#/trace' },
      { label: '레퍼런스 포트폴리오', route: '#/references' },
    ],
  },
];

export const AX_AGENT_DEFAULT_ROUTE = '#/advanced';

const ALL_ROUTES = new Set(AX_AGENT_MENU.flatMap((g) => g.items.map((i) => i.route)));

/** 메뉴에 있는 라우트만 허용(아무 문자열이나 iframe 에 넣지 않는다). */
export function isAxAgentRoute(r: string): boolean {
  return ALL_ROUTES.has(r);
}
