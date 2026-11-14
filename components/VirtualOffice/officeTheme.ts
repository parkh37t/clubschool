// 가상 사무실 화면 공통 값 — 색·글꼴·이름표. 여러 패널(커맨드 센터·에이전트 카드·브리핑 콘솔)이 함께 쓴다.
// 이 화면은 디자인 핸드오프의 픽셀 톤을 그대로 유지하므로 Tailwind 토큰 대신 이 상수를 쓴다.

// 와일리 문서 포인트 컬러(보라). 가상 사무실의 기존 초록 계열은 상태색(작업 중)으로만 남긴다.
export const WYLIE = '#6A4C9C';
export const WYLIE_DARK = '#43306B';
export const WYLIE_TINT = '#EFEAF7';

export const INK = '#24291F';
export const MUTED = '#8B877B';
export const LINE = '#DDD6C8';
export const LINE_SOFT = '#EEE9DD';
export const PAPER = '#FCFAF5';
export const OK_FG = '#1F6B3A';
export const WARN_FG = '#A96F15';
export const BAD_FG = '#B24A3A';

export const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
export const MONO = "ui-monospace,'SF Mono',Consolas,monospace";

export const GATE_NAMES = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'];

export const AGENT_NAMES: Record<string, string> = {
  han: '한도전', kim: '김영업', jeong: '정우선', na: '나기획', cha: '차도안', oh: '오색감',
  pyo: '표준수', lee: '이풍뎅', baek: '백연동', gu: '구동민', go: '고지표', hong: '홍보라', lead: '팀장', jaeha: '재하',
};

// 서버(roster.mjs)가 미연결일 때 카드·필터에 쓰는 기본 명단. 순서 = 화면 표시 순서.
export const AGENT_ORDER = ['lead', 'kim', 'han', 'jeong', 'na', 'oh', 'cha', 'pyo', 'lee', 'baek', 'gu', 'go', 'hong'];
export const AGENT_ROLES: Record<string, string> = {
  lead: '오케스트레이터', kim: '영업 조사', han: '영업팀장', jeong: 'PO', na: '서비스기획', oh: '브랜드 BX', cha: '제품 UI',
  pyo: '퍼블리싱', lee: '인터랙션', baek: '백엔드', gu: '프론트엔드', go: '데이터·QA', hong: '마케팅',
};

/** 카드·커맨드 센터 머리의 픽셀 아바타 — 사무실 캐릭터(officeSimulator AGENTS)와 같은 머리·피부·부서색. */
export interface AvatarLook { hair: string; skin: string; shirt: string; style: 'short' | 'long' | 'bun' | 'buzz' | 'ponytail'; glasses?: boolean; headset?: boolean; }
export const AVATARS: Record<string, AvatarLook> = {
  lead: { hair: '#2A2230', skin: '#EAC49C', shirt: '#6A4C9C', style: 'short', headset: true },
  han: { hair: '#3B2E24', skin: '#EAC49C', shirt: '#D0684A', style: 'short', headset: true },
  kim: { hair: '#191512', skin: '#D9AE84', shirt: '#D0684A', style: 'buzz' },
  jeong: { hair: '#4A3524', skin: '#F2D4AE', shirt: '#4A7DBF', style: 'bun', glasses: true },
  na: { hair: '#242424', skin: '#EAC49C', shirt: '#4A7DBF', style: 'long' },
  cha: { hair: '#5A3A28', skin: '#D9AE84', shirt: '#B75FA2', style: 'short', glasses: true },
  oh: { hair: '#7A2E4A', skin: '#F2D4AE', shirt: '#B75FA2', style: 'long' },
  pyo: { hair: '#2A2A33', skin: '#EAC49C', shirt: '#7A68C9', style: 'short' },
  lee: { hair: '#123A2E', skin: '#D9AE84', shirt: '#7A68C9', style: 'ponytail' },
  baek: { hair: '#33241C', skin: '#F2D4AE', shirt: '#3E9C8C', style: 'buzz' },
  gu: { hair: '#1C1C1C', skin: '#EAC49C', shirt: '#3E9C8C', style: 'short' },
  go: { hair: '#4A4132', skin: '#D9AE84', shirt: '#C79A3A', style: 'bun', glasses: true },
  hong: { hair: '#5B2A6E', skin: '#F2D4AE', shirt: '#C79A3A', style: 'long' },
};

export const nameOf = (id: string | undefined): string => (id ? AGENT_NAMES[id] ?? id : '');

export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  '대기': { bg: '#F2EFE7', fg: MUTED }, '진행': { bg: '#DFF2E6', fg: OK_FG }, '검수': { bg: '#E6EEF8', fg: '#2F5A8C' },
  '승인대기': { bg: '#FBEED6', fg: WARN_FG }, '완료': { bg: WYLIE_TINT, fg: WYLIE_DARK }, '보류': { bg: '#F2EFE7', fg: MUTED }, '실패': { bg: '#F8E3DF', fg: BAD_FG },
};
export const GATE_COLOR: Record<string, string> = { PASS: OK_FG, CONDITIONAL: WARN_FG, FAIL: BAD_FG, '미점검': MUTED };

export const smallMuted = { fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.55 } as const;
export const BREAKER_COLOR: Record<string, { bg: string; fg: string }> = {
  normal: { bg: '#EEF8F1', fg: OK_FG }, steer: { bg: '#FBF3DC', fg: WARN_FG }, constrain: { bg: '#FBE7D3', fg: '#B5621B' }, stop: { bg: '#F8E3DF', fg: BAD_FG },
};
export const panelStyle = { background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 14 } as const;
export const h2Style = { fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: MUTED, margin: 0 } as const;
export const inputStyle = { width: '100%', boxSizing: 'border-box' as const, font: 'inherit', fontSize: 13, padding: '8px 10px', border: `1px solid ${LINE}`, borderRadius: 8, outline: 'none', marginTop: 7, resize: 'vertical' as const, lineHeight: 1.5 };

/**
 * 사용 토큰 표기(구독 사용량) — 0 이면 '—'. 1,234 → 1.2천, 12,345 → 1만, 1,234,567 → 123만.
 * 사용 토큰 = 입력 + 캐시 생성 + 출력 + 캐시 읽기÷10(server/tokens.mjs). 금액이 아니다.
 */
export function tok(v: number | undefined | null): string {
  const n = Math.max(0, Math.round(Number(v) || 0));
  if (!n) return '—';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

/** 사용 토큰 네 갈래(입력·캐시 생성·캐시 읽기·출력) */
export interface TokenParts { in: number; cw: number; cr: number; out: number }

/** API 단가 환산 참고값 표기(청구액 아님 — 모니터 탭 각주에만). 0 이면 '—'. */
export function usd(v: number | undefined): string {
  if (!v) return '—';
  return v < 0.01 ? '<$0.01' : `$${v.toFixed(2)}`;
}

/** ISO → 이 PC 기준 HH:MM:SS */
export function clock(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const z = (n: number) => String(n).padStart(2, '0');
  return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}
