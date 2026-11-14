/* APEX 가상 사무실 — 명령형 SVG 씬 빌더 + 이동 엔진 + 게이트 시뮬레이터.
 * 디자인 핸드오프(APEX Virtual Office.dc.html)의 class Component를 프레임워크 비의존
 * 순수 TS 클래스로 포팅. React는 VirtualOfficeView가 함수형 래퍼로 감싼다.
 * 좌표/색상은 hi-fi 원본 그대로 보존. onRender 콜백으로 React 재렌더를 유발한다. */

import { SIM_TEXT } from './simText';
import type { Lang, SimText } from './simText';

type Pt = { x: number; y: number };
type Phase = 'meeting' | 'returning' | 'working' | 'awaiting' | 'done-all';
type AgentState = 'idle' | 'working' | 'waiting';
type MoveMode = 'seated' | 'walking' | 'standing';

export interface FeedItem { t: string; who: string; msg: string; whoColor: string; }
export interface ArtifactItem { g: string; f: string; s: string; }
export interface GateVals {
  num: string; name: string; label: string; pct: string;
  bg: string; fg: string; barColor: string; opacity: number;
  anim: string; showMini: boolean; showLink: boolean; linkColor: string;
}
export interface RenderVals {
  teamLabel: string; clock: string; playLabel: string; speedLabel: string; auto: boolean;
  gates: GateVals[];
  showApprovalCard: boolean; approvalDesc: string; approvalFile: string; approvalScore: string;
  feed: FeedItem[]; feedEmpty: boolean;
  artifacts: ArtifactItem[]; artifactsEmpty: boolean;
  toastMsg: string; toastOpacity: number; toastTransform: string;
}

export interface OfficeSimulatorOptions {
  teamLabel: string;
  autoApprove: boolean;
  initialSpeed: number;
  onRender: () => void;
  /** 책상을 누르면 그 에이전트 id 로 호출(에이전트 카드 선택과 같은 동작) */
  onSelectAgent?: (id: string) => void;
}

/** 실전 연동용 외부 상태 스키마 (오케스트레이터가 쓰는 office-state.json 형태).
 *  applyOfficeState(state)로 주입하면 내부 자동 시나리오는 멈추고 이 상태가 화면을 구동한다. */
export interface OfficeAgentState { state: AgentState; task?: string; }

/** hive(server/hive) 요약 — 작업 원장·승인 큐·메일 이벤트. 서버 orchestrator.officeState()가 만든다. */
export interface HiveTask {
  id: string; title: string; owner: string; status: string; gate: string; output?: string; needs_approval?: boolean;
  stage?: string; depends_on?: string[]; tokens?: number; qa_tokens?: number; qa_summary?: string; // tokens = 사용 토큰
  docx?: string; // 산출물 Word 판(산출물 폴더 기준 상대경로)
  xlsx?: string; // 산출물의 표를 옮긴 엑셀 판(견적 단계 등)
  process?: string; // 표준 절차(proposal·estimate·planning)
  step?: string;
}
export interface HiveApproval {
  id: string; task: string; kind: string; reason: string; status: string; payload?: { output?: string; gate?: string } | null;
  requested_at?: string; decided_by?: string | null; decided_at?: string | null; decision_reason?: string | null;
}
export interface HiveMail { id: string; from: string; to: string; type: string; task?: string; ts?: string; }
export interface HiveState {
  briefing?: string;
  tasks: HiveTask[];
  pending: HiveApproval[];
  approvals?: HiveApproval[];
  mail: HiveMail[];
  leader?: { id: string; name: string; state: AgentState; task?: string };
}
export interface OfficeState {
  stage: number;
  phase: Phase;
  progress?: number;
  agents?: Record<string, OfficeAgentState>;
  artifact?: { file: string; score: number; gate?: string };
  hive?: HiveState;
  question?: string; // 팀장이 되물은 질문(분해 실패 시)
  concurrency?: { limit: number; running: number }; // 작업 풀: 동시 실행 상한·현재 실행 수
  /** 게이트 보드 G1~G6 별 작업 집계(hive). 있으면 stage 하나 대신 이 값으로 보드를 그린다. */
  boards?: { total: number; done: number; active: number; awaiting: number; closed: number }[];
  idle?: boolean; // 브리핑 전 대기 상태(서버가 hive 에서 만든 빈 사무실)
}

interface DeptDef { label: string; c: string; }
interface AgentDef {
  id: string; name: string; role: string; dept: string;
  hair: string; skin: string; hairStyle: string; acc: string | null;
  shirt?: string; // 추가 인원은 부서색 대신 템플릿 색
}
/** 추가 인원(역할 템플릿) — 사무실 '확장 구역' 책상에 앉는다. */
export interface CustomAgentDesk {
  id: string; name: string; role: string;
  look?: { hair: string; skin: string; shirt: string; style: string; glasses?: boolean } | null;
}
interface CharOpts {
  skin?: string; hair?: string; shirt?: string;
  hairStyle?: string; acc?: string | null; charId?: string;
}
interface Worker { id: string; task: string; }
interface Stage { dur: number; workers: Worker[]; artifact: { file: string; score: number }; }
interface Spot { x: number; y: number; top?: number; }
interface Wander { phase: 'go' | 'linger' | 'back'; t: number; room?: HangoutRoom; key?: string; booth?: number; }
type HangoutRoom = 'lounge' | 'print' | 'focus';
/** 쉬는 사람의 나들이 자리 — 문(doorX·corY) → 방 안 통로(laneY) → 자리(spot). w 는 고를 때 가중치. */
interface Hangout { room: HangoutRoom; key: string; doorX: number; corY: number; laneY: number; spot: Spot; w: number; booth?: number; }
interface Door { x: number; y: number; g: SVGGElement; }
interface MoveState {
  mode: MoveMode; node: SVGGElement; av: SVGGElement;
  seatAbs: Pt; pos: Pt; path: Pt[]; cb: (() => void) | null;
  awayPath: Pt[] | null; wander: Wander | null; spd: number; face: number;
}
interface St {
  stage: number; phase: Phase; progress: number; speed: number;
  playing: boolean; auto: boolean; clockMin: number; day: number;
  autoWait: number; meetWait: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ── 가로형 평면도(1440×860) ──
 * 위 두 줄: 부서 방 3개씩(문은 아래쪽) + 오른쪽 사장실·라운지 / 팀장실·서버룸. 각 줄 아래에 가로 복도(A·B)가 있고,
 * 두 복도는 가운데 세로 복도(VX)로 이어진다. 아래 줄: 회의실(킥오프) · 포커스룸(통화 부스 2) · 자료실(복합기) · 확장 구역(추가 인원 3×2석).
 * 방 크기는 사람(1.5배 스프라이트) 기준 — 회의실은 12석 탁자+상석 2, 확장 구역은 책상 6개가 들어가는 만큼만 잡는다.
 * 좌표는 SVG 사용자 단위. 걷는 사람의 위치는 스프라이트 왼쪽 위라서 복도·문 '가운데'로 걸을 때 x-CX, y-CY 를 쓴다. */
const W = 1440;
const H = 860;
const ROW_A = 44;          // 위 줄 방 y
const ROW_B = 284;         // 가운데 줄 방 y
const ROOM_W = 264;        // 부서 방 크기
const ROOM_H = 190;
const COR_A_Y0 = 234;      // 가로 복도 A(위 줄 아래)
const COR_B_Y0 = 474;      // 가로 복도 B(가운데 줄 아래)
const COR_H = 50;
const COR_A = COR_A_Y0 + COR_H / 2; // 복도 가운데 y
const COR_B = COR_B_Y0 + COR_H / 2;
const ROW_C = COR_B_Y0 + COR_H;     // 아래 줄 방 y(524)
const ROW_C_H = H - 20 - ROW_C;     // 아래 줄 방 높이(316)
const VX0 = 844;           // 세로 연결 복도
const VX1 = 886;
const VX = (VX0 + VX1) / 2;
type Rect = { x: number; y: number; w: number; h: number };
const BOSS: Rect = { x: 890, y: ROW_A, w: 260, h: ROOM_H };
const LOUNGE: Rect = { x: 1162, y: ROW_A, w: 254, h: ROOM_H };
const BRIEF: Rect = { x: 890, y: ROW_B, w: 260, h: ROOM_H };
const SERVER: Rect = { x: 1162, y: ROW_B, w: 254, h: ROOM_H };
const MEET: Rect = { x: 24, y: ROW_C, w: 620, h: ROW_C_H };
const FOCUS: Rect = { x: 656, y: ROW_C, w: 168, h: ROW_C_H };
const PRINT: Rect = { x: 836, y: ROW_C, w: 158, h: ROW_C_H };
const ANNEX: Rect = { x: 1006, y: ROW_C, w: 410, h: ROW_C_H };
const LOUNGE_DOOR_X = LOUNGE.x + 127;
const BRIEF_DOOR_X = BRIEF.x + 130;
const MEET_DOOR_X = MEET.x + 310;
const FOCUS_DOOR_X = FOCUS.x + 84;
const PRINT_DOOR_X = PRINT.x + 79;
const ANNEX_DOOR_X = ANNEX.x + 136;   // 첫째·둘째 열 책상 사이 통로 위
// 사람·책상 배율 — 스프라이트(20×33)를 1.5배로 키워 넓은 평면도에서도 잘 보이게 한다. 걷는 길 좌표는 이 크기 기준.
const DS = 1.5;
const SW = 20 * DS;        // 걷는 사람 폭·키(사용자 단위)
const SH = 33 * DS;
const CX = SW / 2;         // 복도·문 '가운데'로 걸을 때 스프라이트 위치 보정
const CY = SH / 2;
const LOUNGE_LANE = LOUNGE.y + ROOM_H - SH - 4;   // 방 안 문 앞 통로(스프라이트 위쪽 y)
const BRIEF_LANE = BRIEF.y + ROOM_H - SH - 4;
const ROW_C_LANE = ROW_C + 30;        // 아래 줄 방(문이 위쪽 벽): 문 안쪽 통로
const MEET_LANE_TOP = ROW_C_LANE;     // 회의실: 탁자 위쪽 통로 · 왼쪽 통로 x · 아래쪽 통로
const MEET_AISLE_X = MEET.x + 22;
const MEET_LANE_BOTTOM = ROW_C + 250;
const MEET_TABLE_X = MEET.x + 120;    // 긴 탁자(12석) 왼쪽 위 모서리와 크기
const MEET_TABLE_Y = ROW_C + 120;
const MEET_TABLE_W = 420;
const MEET_TABLE_H = 60;
const MEET_SEAT_XS = [0, 1, 2, 3, 4, 5].map(i => MEET_TABLE_X + 24 + i * 66);   // 위·아래 의자 6개씩(걷는 사람 x)
const FOCUS_BOOTHS = [FOCUS.x + 4, FOCUS.x + 88];   // 통화 부스 2칸(폭 76) x
const ANNEX_DESKS = [0, 1, 2, 3, 4, 5].map(i => ({ x: ANNEX.x + 30 + (i % 3) * 126, y: ANNEX.y + (i < 3 ? 40 : 198) }));

export class OfficeSimulator {
  private svg: SVGSVGElement;
  private opts: OfficeSimulatorOptions;

  private DEPT: Record<string, DeptDef>;
  private AGENTS: AgentDef[];
  private ZONES: Record<string, Pt>;
  private GATES: string[];
  private SCENARIO: Stage[];
  private MEET_SPOTS: Spot[];
  private LOUNGE_SPOTS: Spot[];
  private BRIEF_SPOTS: Spot[];
  private HANGOUTS: Hangout[];
  private boothLeds: SVGElement[] = [];
  private boothBusy: boolean[] = [];

  private M: Record<string, MoveState> = {};
  private doors: Door[] = [];
  private st: St;
  private meetNeed = 0;
  private meetArr = 0;
  private wanderClk = 0;
  private wanderNext = 6;
  private externalMode = false;   // applyOfficeState 주입 시 true → 내부 자동 시나리오 정지
  private lastExtStage = 0;

  private feed: FeedItem[] = [];
  private artifacts: ArtifactItem[] = [];
  private toastMsg = '';
  private toastShow = false;

  private bossDoc: SVGGElement | null = null;
  private walkLayer!: SVGGElement;

  // hive 연동 — 봉투 비행·피드 중복 방지·마지막 hive 스냅샷
  private envelopes: { node: SVGGElement; from: Pt; to: Pt; t: number; dur: number }[] = [];
  private seenMail = new Set<string>();
  private seenTaskState = new Map<string, string>();
  private hive: HiveState | null = null;
  private question = '';
  private agentStates: Record<string, OfficeAgentState> = {}; // 자리별 현재 상태(카드·라운지 나들이 판단용)
  private idle = false; // 서버 연결됨 · 브리핑 전(게이트 보드를 전부 '대기'로)
  private boards: OfficeState['boards'] = undefined;
  private selectedId: string | null = null;
  private lang: Lang = 'ko';
  private T: SimText = SIM_TEXT.ko;
  private custom: CustomAgentDesk[] = [];
  private roundsClk = 0; // 팀장 현장 순회 시계
  private roundsNext = 14;

  private timer: ReturnType<typeof setInterval> | null = null;
  private raf = 0;
  private toastT: ReturnType<typeof setTimeout> | null = null;
  private last = 0;
  private lastRaf = 0;

  constructor(svg: SVGSVGElement, opts: OfficeSimulatorOptions) {
    this.svg = svg;
    this.opts = opts;
    this.DEPT = {
      sales: { label: '영업', c: '#D0684A' }, plan: { label: '기획', c: '#4A7DBF' },
      design: { label: '디자인', c: '#B75FA2' }, pub: { label: '퍼블리싱', c: '#7A68C9' },
      dev: { label: '개발', c: '#3E9C8C' }, dm: { label: '데이터·마케팅', c: '#C79A3A' },
      lead: { label: '팀장', c: '#6A4C9C' }, // Wylie AX Office 팀장(오케스트레이터) — 와일리 보라
    };
    this.AGENTS = [
      { id: 'han', name: '한도전', role: '영업팀장', dept: 'sales', hair: '#3B2E24', skin: '#EAC49C', hairStyle: 'short', acc: 'headset' },
      { id: 'kim', name: '김영업', role: '영업', dept: 'sales', hair: '#191512', skin: '#D9AE84', hairStyle: 'buzz', acc: null },
      { id: 'jeong', name: '정우선', role: 'PO', dept: 'plan', hair: '#4A3524', skin: '#F2D4AE', hairStyle: 'bun', acc: 'glasses' },
      { id: 'na', name: '나기획', role: '서비스기획', dept: 'plan', hair: '#242424', skin: '#EAC49C', hairStyle: 'long', acc: null },
      { id: 'cha', name: '차도안', role: '제품 UI', dept: 'design', hair: '#5A3A28', skin: '#D9AE84', hairStyle: 'short', acc: 'glasses' },
      { id: 'oh', name: '오색감', role: '브랜드 BX', dept: 'design', hair: '#7A2E4A', skin: '#F2D4AE', hairStyle: 'long', acc: 'hairpin' },
      { id: 'pyo', name: '표준수', role: '퍼블리싱', dept: 'pub', hair: '#2A2A33', skin: '#EAC49C', hairStyle: 'short', acc: 'headphones' },
      { id: 'lee', name: '이풍뎅', role: '인터랙션', dept: 'pub', hair: '#123A2E', skin: '#D9AE84', hairStyle: 'ponytail', acc: null },
      { id: 'baek', name: '백연동', role: '백엔드', dept: 'dev', hair: '#33241C', skin: '#F2D4AE', hairStyle: 'buzz', acc: 'headphones' },
      { id: 'gu', name: '구동민', role: '프론트엔드', dept: 'dev', hair: '#1C1C1C', skin: '#EAC49C', hairStyle: 'short', acc: 'headphones' },
      { id: 'go', name: '고지표', role: '데이터', dept: 'dm', hair: '#4A4132', skin: '#D9AE84', hairStyle: 'bun', acc: 'glasses' },
      { id: 'hong', name: '홍보라', role: '마케팅', dept: 'dm', hair: '#5B2A6E', skin: '#F2D4AE', hairStyle: 'long', acc: 'hairpin' },
    ];
    this.ZONES = { sales: { x: 24, y: ROW_A }, plan: { x: 300, y: ROW_A }, design: { x: 576, y: ROW_A }, pub: { x: 24, y: ROW_B }, dev: { x: 300, y: ROW_B }, dm: { x: 576, y: ROW_B } };
    this.GATES = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'];
    this.SCENARIO = [
      { dur: 9000, workers: [{ id: 'han', task: 'RFP 5축 평가' }, { id: 'kim', task: '고객 요구 정리' }], artifact: { file: '수주평가서.md', score: 92 } },
      { dur: 10000, workers: [{ id: 'jeong', task: 'PRD 초안 작성' }, { id: 'na', task: 'IA 플로우 설계' }], artifact: { file: 'PRD_v1.md', score: 88 } },
      { dur: 10000, workers: [{ id: 'cha', task: '메인 UI 시안' }, { id: 'oh', task: '브랜드 무드보드' }], artifact: { file: 'UI시안_v1.fig', score: 90 } },
      { dur: 13000, workers: [{ id: 'pyo', task: '마크업 셋업' }, { id: 'lee', task: '인터랙션 구현' }, { id: 'baek', task: 'API 개발' }, { id: 'gu', task: '화면 개발' }], artifact: { file: 'mvp_build_v0.1', score: 86 } },
      { dur: 8000, workers: [{ id: 'go', task: 'QA·지표 검증' }], artifact: { file: 'QA리포트.md', score: 91 } },
      { dur: 8000, workers: [{ id: 'hong', task: '런칭 캠페인' }], artifact: { file: '캠페인플랜.md', score: 89 } },
    ];
    // 회의실 긴 탁자 — 위 6 · 아래 6 · 왼쪽 상석, 마지막은 발표 화면 앞 오른쪽 상석(팀장 자리). top=1 은 위쪽 통로에서 곧장 내려간다.
    this.MEET_SPOTS = MEET_SEAT_XS.map((x): Spot => ({ x, y: MEET_TABLE_Y - SH + 8, top: 1 }))
      .concat(MEET_SEAT_XS.map((x): Spot => ({ x, y: MEET_TABLE_Y + MEET_TABLE_H - 10 })))
      .concat([{ x: MEET_TABLE_X - 42, y: MEET_TABLE_Y + 6, top: 1 }, { x: MEET_TABLE_X + MEET_TABLE_W + 12, y: MEET_TABLE_Y + 6, top: 1 }]);
    // 라운지 — 커피 카운터 앞 2 · 정수기 옆 · 소파 2 · 둥근 탁자 옆
    this.LOUNGE_SPOTS = ([[158, 52], [204, 56], [70, 70], [28, 108], [60, 108], [118, 100]] as [number, number][]).map(([dx, dy]) => ({ x: LOUNGE.x + dx, y: LOUNGE.y + dy }));
    this.BRIEF_SPOTS = Array.from({ length: 12 }, (_, i) => ({ x: BRIEF.x + 12 + (i % 6) * 25, y: BRIEF.y + (i < 6 ? 90 : 116) }));
    // 나들이 자리 — 라운지가 가장 잦고, 자료실(복합기·서류함·정리 탁자)과 통화 부스가 가끔.
    this.HANGOUTS = [
      ...this.LOUNGE_SPOTS.map((spot, i): Hangout => ({ room: 'lounge', key: 'L' + i, doorX: LOUNGE_DOOR_X, corY: COR_A, laneY: LOUNGE_LANE, spot, w: 3 })),
      ...([[62, 52], [92, 104], [60, 174]] as [number, number][]).map(([dx, dy], i): Hangout => ({ room: 'print', key: 'P' + i, doorX: PRINT_DOOR_X, corY: COR_B, laneY: ROW_C_LANE, spot: { x: PRINT.x + dx, y: PRINT.y + dy }, w: 1.6 })),
      ...FOCUS_BOOTHS.map((bx, i): Hangout => ({ room: 'focus', key: 'F' + i, doorX: FOCUS_DOOR_X, corY: COR_B, laneY: ROW_C_LANE, spot: { x: bx + 23, y: FOCUS.y + 210 }, w: 1.4, booth: i })),
    ];
    this.st = { stage: 0, phase: 'working', progress: 0, speed: opts.initialSpeed ?? 1, playing: true, auto: opts.autoApprove ?? false, clockMin: 540, day: 1, autoWait: 0, meetWait: 0 };

    this.applyText();
    this.buildOffice();
    this.startStage();
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
    const loop = (t: number) => {
      if (this.lastRaf === 0) this.lastRaf = t;
      const dt = t - this.lastRaf; this.lastRaf = t;
      if (this.st.playing) this.stepWalk(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** 문구 표(한·영)를 부서·이름·역할·게이트·데모 작업에 입힌다. */
  private applyText(): void {
    for (const k in this.DEPT) this.DEPT[k].label = this.T.dept[k] ?? this.DEPT[k].label;
    this.AGENTS.forEach(a => { a.name = this.T.names[a.id] ?? a.name; a.role = this.T.roles[a.id] ?? a.role; });
    this.GATES = [...this.T.gates];
    this.SCENARIO.forEach((sc, i) => sc.workers.forEach((w, j) => { w.task = this.T.demoTasks[i]?.[j] ?? w.task; }));
  }

  /** 다시 그리기 — 언어·추가 인원이 바뀌었을 때. 걷던 사람은 자리로 돌아오고 상태·강조는 다시 입힌다. */
  private rebuild(): void {
    this.envelopes = [];
    this.buildOffice();
    for (const id in this.agentStates) {
      const s = this.agentStates[id];
      this.setAgent(id, s.state, s.task);
    }
    const sel = this.selectedId;
    this.selectedId = null;
    this.highlightAgent(sel);
    this.setBossDoc(Boolean(this.hive && this.hive.pending.length));
    if (!this.externalMode) this.startStage();
    this.opts.onRender();
  }

  /** 화면 언어 전환(ko | en). */
  setLang(lang: Lang): void {
    if (lang === this.lang) return;
    this.lang = lang;
    this.T = SIM_TEXT[lang];
    this.applyText();
    this.rebuild();
  }

  /** 추가 인원 책상을 맞춘다(명단 API 기준). 바뀐 것이 없으면 다시 그리지 않는다. */
  syncCustomAgents(list: CustomAgentDesk[]): void {
    const key = (l: CustomAgentDesk[]) => l.map(a => `${a.id}:${a.name}:${a.role}`).join('|');
    if (key(list) === key(this.custom)) return;
    this.custom = list.slice(0, 6);
    this.rebuild();
  }

  destroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    if (this.toastT !== null) clearTimeout(this.toastT);
  }

  private el(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
    const n = document.createElementNS(SVG_NS, tag) as SVGElement;
    for (const k in attrs) {
      if (k === 'text') n.textContent = String(attrs[k]);
      else n.setAttribute(k, String(attrs[k]));
    }
    (parent ?? this.svg).appendChild(n);
    return n;
  }

  /* ── 공용 캐릭터 스프라이트 20x33 ── */
  private buildChar(parent: Element | null, x: number, y: number, a: CharOpts, idx: number): SVGGElement {
    const el = this.el.bind(this);
    const skin = a.skin || '#EAC49C', hair = a.hair || '#26201A', shirt = a.shirt || '#6B7288';
    const g = el('g', { transform: `translate(${x},${y})` }, parent ?? this.svg) as SVGGElement;
    if (a.charId) g.setAttribute('id', 'char-' + a.charId);
    el('ellipse', { cx: 10, cy: 33, rx: 8, ry: 2.6, fill: 'rgba(0,0,0,.25)' }, g);
    el('rect', { x: 4, y: 26, width: 5, height: 6, fill: '#262B3A', class: 'legA' }, g);
    el('rect', { x: 11, y: 26, width: 5, height: 6, fill: '#262B3A', class: 'legB' }, g);
    el('rect', { x: 4, y: 31, width: 5, height: 2, fill: '#141824', class: 'legA' }, g);
    el('rect', { x: 11, y: 31, width: 5, height: 2, fill: '#141824', class: 'legB' }, g);
    el('rect', { x: 2, y: 16, width: 16, height: 11, rx: 2, fill: shirt }, g);
    el('rect', { x: 6, y: 16, width: 8, height: 2, fill: 'rgba(255,255,255,.35)' }, g);
    el('rect', { x: -1, y: 17, width: 3, height: 9, rx: 1, fill: shirt }, g);
    el('rect', { x: 18, y: 17, width: 3, height: 9, rx: 1, fill: shirt }, g);
    const hg = el('g', { class: 'headgrp idlebreathe', style: 'animation-delay:' + ((idx || 0) * 0.37) + 's' }, g) as SVGGElement;
    el('rect', { x: 3, y: 2, width: 14, height: 13, fill: skin }, hg);
    el('rect', { x: 1, y: 7, width: 2, height: 4, fill: skin }, hg);
    el('rect', { x: 17, y: 7, width: 2, height: 4, fill: skin }, hg);
    if (a.acc !== 'glasses') {
      el('rect', { x: 6, y: 8, width: 2, height: 2, fill: '#26201A' }, hg);
      el('rect', { x: 12, y: 8, width: 2, height: 2, fill: '#26201A' }, hg);
    }
    el('rect', { x: 9, y: 12, width: 3, height: 1.5, fill: 'rgba(0,0,0,.35)' }, hg);
    const HS = a.hairStyle || 'short';
    if (HS === 'buzz') { el('rect', { x: 3, y: 0, width: 14, height: 4, fill: hair }, hg); }
    else if (HS === 'long') {
      el('rect', { x: 2, y: 0, width: 16, height: 5, fill: hair }, hg);
      el('rect', { x: 0, y: 3, width: 3, height: 13, fill: hair }, hg);
      el('rect', { x: 17, y: 3, width: 3, height: 13, fill: hair }, hg);
    } else if (HS === 'bun') {
      el('rect', { x: 3, y: 0, width: 14, height: 4, fill: hair }, hg);
      el('rect', { x: 6, y: -4, width: 8, height: 5, rx: 2, fill: hair }, hg);
    } else if (HS === 'ponytail') {
      el('rect', { x: 3, y: 0, width: 14, height: 4, fill: hair }, hg);
      el('rect', { x: 16, y: 3, width: 3, height: 12, rx: 1, fill: hair }, hg);
      el('rect', { x: 16, y: 3, width: 3, height: 2, fill: '#B5453A' }, hg);
    } else {
      el('rect', { x: 3, y: 0, width: 14, height: 5, fill: hair }, hg);
      el('rect', { x: 3, y: 4, width: 2, height: 3, fill: hair }, hg);
      el('rect', { x: 15, y: 4, width: 2, height: 3, fill: hair }, hg);
    }
    if (a.acc === 'headphones' || a.acc === 'headset') {
      el('rect', { x: 3, y: -2, width: 14, height: 2, rx: 1, fill: '#141824' }, hg);
      el('rect', { x: 0, y: 6, width: 3, height: 6, rx: 1, fill: '#141824' }, hg);
      el('rect', { x: 17, y: 6, width: 3, height: 6, rx: 1, fill: '#141824' }, hg);
      if (a.acc === 'headset') el('path', { d: 'M2 12c0 3 3 4 6 4', stroke: '#141824', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, hg);
    } else if (a.acc === 'glasses') {
      el('rect', { x: 5, y: 7, width: 4, height: 3, fill: '#26201A' }, hg);
      el('rect', { x: 11, y: 7, width: 4, height: 3, fill: '#26201A' }, hg);
      el('rect', { x: 9, y: 8, width: 2, height: 1, fill: '#26201A' }, hg);
    } else if (a.acc === 'hairpin') {
      el('rect', { x: 13, y: 1, width: 4, height: 2, fill: '#E8A33D' }, hg);
    }
    const mt = el('g', { class: 'minitalk' }, g) as SVGGElement;
    el('rect', { x: 1, y: -15, width: 18, height: 10, rx: 3, fill: '#FFFFFF', stroke: '#24291F', 'stroke-width': 1 }, mt);
    el('polygon', { points: '8,-5 14,-5 11,-2', fill: '#FFFFFF' }, mt);
    [0, 1, 2].forEach(i => el('circle', { cx: 6 + i * 4, cy: -10, r: 1.3, fill: '#24291F', class: 'td' + i }, mt));
    return g;
  }

  private buildPlant(x: number, y: number): void {
    const el = this.el.bind(this);
    el('rect', { x: x + 1, y: y + 1, width: 8, height: 7, fill: '#3E9C5C' });
    el('rect', { x: x - 2, y: y + 3, width: 5, height: 5, fill: '#2D8C4E' });
    el('rect', { x: x + 7, y: y + 3, width: 5, height: 5, fill: '#2D8C4E' });
    el('rect', { x: x, y: y + 8, width: 10, height: 7, fill: '#A34A3E' });
    el('rect', { x: x, y: y + 8, width: 10, height: 2, fill: '#8A3A30' });
  }

  private buildShelf(x: number, y: number): void {
    const el = this.el.bind(this);
    el('rect', { x: x, y: y, width: 70, height: 12, fill: '#3A2A1E' });
    const cs = ['#D0684A', '#4A7DBF', '#2D8C4E', '#E8A33D', '#B75FA2', '#7A68C9'];
    for (let i = 0; i < 10; i++) el('rect', { x: x + 3 + i * 6.5, y: y + 2, width: 5, height: 8, fill: cs[(i + (x | 0)) % 6] });
  }

  private buildOffice(): void {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild); // StrictMode 재마운트 대비 멱등
    this.doors = [];
    this.boothLeds = []; this.boothBusy = [];
    const el = this.el.bind(this);
    const defs = el('defs', {});
    const pat = el('pattern', { id: 'tile', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M24 0H0V24', fill: 'none', stroke: '#232840', 'stroke-width': 1 }, pat);
    const wp = el('pattern', { id: 'wood', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 0, y: 0, width: 24, height: 24, fill: '#B0804C' }, wp);
    el('path', { d: 'M0 8H24M0 16H24', stroke: '#A0713F', 'stroke-width': 1 }, wp);
    el('path', { d: 'M12 0V8M4 16V24', stroke: '#9A6A3A', 'stroke-width': 1 }, wp);
    const sp = el('pattern', { id: 'stone', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 0, y: 0, width: 24, height: 24, fill: '#4E5670' }, sp);
    el('path', { d: 'M24 0H0V24', fill: 'none', stroke: '#454C64', 'stroke-width': 1 }, sp);
    const cp = el('pattern', { id: 'carpet', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 0, y: 0, width: 16, height: 16, fill: '#4E7CA6' }, cp);
    el('path', { d: 'M0 16L16 0', stroke: '#47729A', 'stroke-width': 1 }, cp);
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#tile)' });
    el('rect', { x: 4, y: 4, width: W - 8, height: H - 8, fill: 'none', stroke: '#141827', 'stroke-width': 4, rx: 8 });
    this.buildWindows();
    this.buildCorridors();
    for (const key in this.ZONES) {
      const z = this.ZONES[key], d = this.DEPT[key];
      el('rect', { x: z.x, y: z.y, width: ROOM_W, height: ROOM_H, fill: 'url(#wood)', stroke: '#6E4A2E', 'stroke-width': 2 });
      el('rect', { x: z.x, y: z.y, width: ROOM_W, height: 18, fill: '#4A3628' });
      el('rect', { x: z.x, y: z.y + 18, width: ROOM_W, height: 2, fill: 'rgba(0,0,0,.25)' });
      this.buildShelf(z.x + ROOM_W - 78, z.y + 3);
      const chipW = Math.min(150, Math.max(46, [...d.label].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 12 : 7), 0) + 28));
      el('rect', { x: z.x + 8, y: z.y + 3, width: chipW, height: 13, rx: 3, fill: '#2A2218' });
      el('rect', { x: z.x + 13, y: z.y + 6, width: 7, height: 7, fill: d.c });
      el('text', { x: z.x + 24, y: z.y + 13, class: 'zlabel', fill: '#F0E8D8', text: d.label });
      // 서류함 · 화분 · 작은 화이트보드(방마다 같은 소품, 부서색 띠)
      el('rect', { x: z.x + 14, y: z.y + ROOM_H - 42, width: 20, height: 26, rx: 2, fill: '#6B7288' });
      el('rect', { x: z.x + 14, y: z.y + ROOM_H - 42, width: 20, height: 3, fill: '#7C849A' });
      el('path', { d: `M${z.x + 18} ${z.y + ROOM_H - 33}h12M${z.x + 18} ${z.y + ROOM_H - 24}h12`, stroke: '#4E5670', 'stroke-width': 2 });
      el('rect', { x: z.x + 98, y: z.y + 26, width: 68, height: 22, rx: 2, fill: '#F4EEE0', stroke: '#8F897A', 'stroke-width': 1.5 });
      el('rect', { x: z.x + 98, y: z.y + 26, width: 68, height: 3, fill: d.c });
      el('path', { d: `M${z.x + 104} ${z.y + 36}h40M${z.x + 104} ${z.y + 42}h28`, stroke: '#B0AA98', 'stroke-width': 1.4 });
      this.buildPlant(z.x + ROOM_W - 28, z.y + ROOM_H - 34);
    }
    this.AGENTS.forEach((a, i) => {
      const z = this.ZONES[a.dept];
      const slot = this.AGENTS.filter(x => x.dept === a.dept).indexOf(a);
      this.buildDesk(a, z.x + (slot === 0 ? 30 : 150), z.y + 60, i);
    });
    this.buildBossRoom(); this.buildLounge(); this.buildServerRoom();
    this.buildMeetingRoom(); this.buildFocusRoom(); this.buildPrintRoom(); this.buildBriefingRoom(); this.buildAnnex(); this.buildDoors();
    this.walkLayer = el('g', { id: 'walkLayer' }) as SVGGElement;
  }

  /** 위쪽 외벽 — 창문 띠(방 위로 창이 나 있다). */
  private buildWindows(): void {
    const el = this.el.bind(this);
    el('rect', { x: 20, y: 20, width: W - 40, height: 22, fill: '#2A3048' });
    const spans: [number, number][] = [[24, ROOM_W], [300, ROOM_W], [576, ROOM_W], [BOSS.x, BOSS.w], [LOUNGE.x, LOUNGE.w]];
    spans.forEach(([x0, w]) => {
      for (let i = 0; i < 3; i++) {
        const x = x0 + 24 + i * ((w - 48 - 44) / 2);
        el('rect', { x, y: 24, width: 44, height: 13, rx: 1, fill: '#9CC7E8', stroke: '#1B2034', 'stroke-width': 1.5 });
        el('path', { d: `M${x + 22} 24v13M${x} 30.5h44`, stroke: '#1B2034', 'stroke-width': 1 });
      }
    });
  }

  /** 확장 구역 — 인원 추가로 들어온 사람의 책상(최대 6, 3×2). 빈 자리는 점선 책상, 아무도 없으면 안내 한 줄. 걷는 안무 없이 자리에서 일한다. */
  private buildAnnex(): void {
    const el = this.el.bind(this);
    const R = ANNEX;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: 'url(#wood)', stroke: '#6E4A2E', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#4A3628' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.25)' });
    const label = this.T.rooms.ext;
    const w = Math.min(240, [...label].reduce((n, ch) => n + (/[가-힣]/.test(ch) ? 12 : 7), 0) + 28);
    el('rect', { x: R.x + 8, y: R.y + 3, width: w, height: 13, rx: 3, fill: '#2A2218' });
    el('rect', { x: R.x + 13, y: R.y + 6, width: 7, height: 7, fill: '#6A4C9C' });
    el('text', { x: R.x + 24, y: R.y + 13, class: 'zlabel', fill: '#F0E8D8', text: label });
    this.buildShelf(R.x + R.w - 80, R.y + 3);
    this.buildPlant(R.x + 8, R.y + R.h - 30);
    this.buildPlant(R.x + R.w - 22, R.y + R.h - 30);
    ANNEX_DESKS.forEach((d, i) => {
      if (i < this.custom.length) return;
      el('rect', { x: d.x, y: d.y + 28 * DS, width: 56 * DS, height: 20 * DS, rx: 2, fill: 'rgba(94,61,34,.35)', stroke: 'rgba(240,232,216,.35)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' });
      el('rect', { x: d.x + 27 * DS - 10, y: d.y + 6, width: 20, height: 26, rx: 3, fill: 'none', stroke: 'rgba(240,232,216,.22)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' });
    });
    if (!this.custom.length) el('text', { x: R.x + R.w / 2, y: R.y + 176, class: 'nrole', 'text-anchor': 'middle', text: this.T.rooms.extEmpty });
    this.custom.slice(0, ANNEX_DESKS.length).forEach((c, i) => {
      const look = c.look || { hair: '#2A2230', skin: '#EAC49C', shirt: '#6A4C9C', style: 'short' };
      const acc = look.glasses ? 'glasses' : null;
      const d = ANNEX_DESKS[i];
      this.buildDesk({ id: c.id, name: c.name, role: c.role, dept: 'ext', hair: look.hair, skin: look.skin, hairStyle: look.style, acc, shirt: look.shirt }, d.x, d.y, 13 + i);
    });
  }

  private buildCorridors(): void {
    const el = this.el.bind(this);
    const strip = (x: number, y: number, w: number, h: number) => el('rect', { x, y, width: w, height: h, fill: 'url(#stone)' });
    strip(24, COR_A_Y0, W - 48, COR_H);
    strip(24, COR_B_Y0, W - 48, COR_H);
    strip(VX0, ROW_A, VX1 - VX0, COR_B_Y0 - ROW_A);
    // 복도 가운데 안내선(점선)
    el('path', { d: `M34 ${COR_A}H${W - 34}M34 ${COR_B}H${W - 34}M${VX} ${ROW_A + 10}V${COR_B_Y0}`, stroke: 'rgba(240,232,216,.07)', 'stroke-width': 2, 'stroke-dasharray': '10 12', fill: 'none' });
    // 세로 복도 위쪽 정수기, 복도 양 끝 화분(걷는 길 밖)
    el('rect', { x: VX - 7, y: ROW_A + 6, width: 14, height: 10, rx: 2, fill: '#7FB8E8' });
    el('rect', { x: VX - 9, y: ROW_A + 16, width: 18, height: 26, rx: 2, fill: '#D8D2C4' });
    el('rect', { x: VX - 4, y: ROW_A + 22, width: 8, height: 3, fill: '#4E5670' });
    this.buildPlant(VX - 5, ROW_A + 150);
    ([[30, COR_A_Y0 + 18], [W - 44, COR_A_Y0 + 18], [30, COR_B_Y0 + 18], [W - 44, COR_B_Y0 + 18]] as [number, number][]).forEach(([x, y]) => this.buildPlant(x, y));
  }

  private buildDesk(a: AgentDef, x: number, y: number, idx: number): void {
    const el = this.el.bind(this);
    const g = el('g', { class: 'desk-sprite', id: 'sp-' + a.id, transform: `translate(${x},${y}) scale(${DS})` }) as SVGGElement;
    // 선택 강조 테두리(에이전트 카드·책상 클릭). 기본은 숨김, .selected 일 때 보인다.
    el('rect', { x: -10, y: -8, width: 76, height: 88, rx: 6, class: 'deskhl', fill: 'rgba(183,156,232,.10)', stroke: '#B79CE8', 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }, g);
    el('rect', { x: 12, y: 6, width: 32, height: 24, rx: 3, fill: '#3A3F52' }, g);
    el('rect', { x: 12, y: 6, width: 32, height: 3, rx: 1.5, fill: '#4A5068' }, g);
    const av = el('g', { class: 'avatar' }, g) as SVGGElement;
    const ch = this.buildChar(av, 18, 0, { ...a, shirt: a.shirt || this.DEPT[a.dept]?.c || '#6A4C9C', charId: a.id }, idx);
    el('rect', { x: 0, y: 28, width: 56, height: 13, fill: '#8A5A34' }, g);
    el('path', { d: 'M0 34.5H56', stroke: '#7A4E2C', 'stroke-width': 1 }, g);
    el('rect', { x: 0, y: 41, width: 56, height: 7, fill: '#5E3D22' }, g);
    el('rect', { x: 16, y: 14, width: 24, height: 17, rx: 2, class: 'screen' }, g);
    el('rect', { x: 18, y: 16, width: 20, height: 12, rx: 1, fill: '#20242F' }, g);
    el('path', { d: 'M22 20h12M22 23h8', stroke: '#2E3442', 'stroke-width': 1.4 }, g);
    el('rect', { x: 26, y: 28, width: 4, height: 3, fill: '#141824' }, g);
    el('rect', { x: 20, y: 32, width: 16, height: 4, rx: 1, fill: '#3A4152' }, g);
    el('rect', { x: 21, y: 31, width: 4, height: 3, fill: a.skin, class: 'hand' }, g);
    el('rect', { x: 31, y: 31, width: 4, height: 3, fill: a.skin, class: 'hand h2' }, g);
    el('rect', { x: 46, y: 31, width: 5, height: 5, fill: '#F4EEE0' }, g);
    el('rect', { x: 5, y: 31, width: 8, height: 6, fill: '#DCD6C4' }, g);
    el('path', { d: 'M6 33h6M6 35h4', stroke: '#B0AA98', 'stroke-width': 1 }, g);
    el('circle', { cx: 52, cy: 2, r: 4, class: 'statusdot', stroke: '#1B1F2E', 'stroke-width': 2 }, g);
    el('text', { x: 28, y: 62, class: 'nname', 'text-anchor': 'middle', text: a.name }, g);
    el('text', { x: 28, y: 74, class: 'nrole', 'text-anchor': 'middle', text: a.role }, g);
    const b = el('g', { class: 'bubble' }, g) as SVGGElement;
    el('rect', { x: -20, y: -28, width: 96, height: 18, rx: 4, fill: '#FFFFFF', stroke: '#24291F', 'stroke-width': 1.2 }, b);
    el('polygon', { points: '23,-11 33,-11 28,-4', fill: '#FFFFFF', stroke: '#24291F', 'stroke-width': 1.2 }, b);
    el('rect', { x: 24, y: -12, width: 8, height: 3, fill: '#FFFFFF' }, b);
    el('text', { x: 28, y: -15, class: 'btask', 'text-anchor': 'middle', id: 'task-' + a.id, text: '' }, b);
    g.addEventListener('click', () => this.opts.onSelectAgent?.(a.id));
    this.M[a.id] = { mode: 'seated', node: ch, av, seatAbs: { x: x + 18 * DS, y: y }, pos: { x: x + 18 * DS, y: y }, path: [], cb: null, awayPath: null, wander: null, spd: 0.88 + (idx % 5) * 0.06, face: 1 };
  }

  private buildBossRoom(): void {
    const el = this.el.bind(this);
    const R = BOSS;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#4E7CA6', stroke: '#33506E', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#2F3A50' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.25)' });
    el('text', { x: R.x + 10, y: R.y + 13, class: 'roomlabel', text: this.T.rooms.boss });
    el('rect', { x: R.x + R.w - 46, y: R.y + 3, width: 32, height: 13, fill: '#E8A33D' });
    el('rect', { x: R.x + R.w - 43, y: R.y + 5, width: 26, height: 9, fill: '#2D8C4E' });
    el('rect', { x: R.x + 16, y: R.y + 30, width: R.w - 32, height: R.h - 54, rx: 4, fill: '#5D8CB5' });
    this.buildShelf(R.x + 20, R.y + 34);
    this.buildPlant(R.x + R.w - 34, R.y + 36);
    // 사장 의자 등받이 → 사장 → 큰 책상(사람 배율). 책상 윗면이 몸 아래쪽을 가려 앉은 모습이 된다.
    el('rect', { x: R.x + 106, y: R.y + 30, width: 48, height: 30, rx: 4, fill: '#2E3440' });
    el('rect', { x: R.x + 106, y: R.y + 30, width: 48, height: 5, rx: 2, fill: '#3A4152' });
    this.buildChar(null, R.x + 115, R.y + 26, { hair: '#4A4B52', hairStyle: 'short', shirt: '#37413A', skin: '#EAC49C' }, 3).setAttribute('transform', `translate(${R.x + 115},${R.y + 26}) scale(${DS})`);
    el('rect', { x: R.x + 60, y: R.y + 68, width: 140, height: 22, fill: '#8A5A34' });
    el('path', { d: `M${R.x + 60} ${R.y + 79}H${R.x + 200}`, stroke: '#7A4E2C', 'stroke-width': 1 });
    el('rect', { x: R.x + 60, y: R.y + 90, width: 140, height: 10, fill: '#5E3D22' });
    el('rect', { x: R.x + 72, y: R.y + 71, width: 21, height: 14, fill: '#FFFFFF', stroke: '#B9AF97' });
    el('path', { d: `M${R.x + 75} ${R.y + 76}h15M${R.x + 75} ${R.y + 80}h10`, stroke: '#B9AF97', 'stroke-width': 1, fill: 'none' });
    el('circle', { cx: R.x + 188, cy: R.y + 76, r: 4.5, fill: '#E8A33D' });
    const doc = el('g', { id: 'bossDoc', class: 'bossdoc', visibility: 'hidden' }) as SVGGElement;
    el('rect', { x: R.x + 140, y: R.y + 70, width: 28, height: 18, fill: '#FFFFFF', stroke: '#E8A33D', 'stroke-width': 2 }, doc);
    el('path', { d: `M${R.x + 144} ${R.y + 75}h20M${R.x + 144} ${R.y + 80}h14`, stroke: '#E8A33D', 'stroke-width': 1.4, fill: 'none' }, doc);
    el('circle', { cx: R.x + 163, cy: R.y + 84, r: 3, fill: '#D0684A' }, doc);
    el('rect', { x: R.x + 94, y: R.y + 116, width: 22, height: 16, rx: 3, fill: '#3A3F52' });
    el('rect', { x: R.x + 144, y: R.y + 116, width: 22, height: 16, rx: 3, fill: '#3A3F52' });
    el('text', { x: R.x + R.w / 2, y: R.y + 158, class: 'nrole', 'text-anchor': 'middle', text: this.T.rooms.bossNote });
    doc.addEventListener('click', () => { if (this.st.phase === 'awaiting') this.approve(false); });
    this.bossDoc = doc;
  }

  private buildLounge(): void {
    const el = this.el.bind(this);
    const R = LOUNGE;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#BFB9A8', stroke: '#8F897A', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#4A4438' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.2)' });
    el('text', { x: R.x + 10, y: R.y + 13, class: 'roomlabel', text: this.T.rooms.lounge });
    el('circle', { cx: R.x + R.w - 16, cy: R.y + 9, r: 6.5, fill: '#F4EEE0', stroke: '#141824', 'stroke-width': 1.5 });
    el('path', { d: `M${R.x + R.w - 16} ${R.y + 9}v-4M${R.x + R.w - 16} ${R.y + 9}l3 2`, stroke: '#141824', 'stroke-width': 1.4, fill: 'none' });
    // 자판기
    el('rect', { x: R.x + 8, y: R.y + 24, width: 30, height: 60, rx: 2, fill: '#2E3440' });
    el('rect', { x: R.x + 11, y: R.y + 28, width: 24, height: 30, fill: '#1A1E2A' });
    ([['#D0684A', 0, 0], ['#2D8C4E', 8, 0], ['#E8A33D', 16, 0], ['#4A7DBF', 0, 10], ['#B75FA2', 8, 10], ['#7FE3A6', 16, 10]] as [string, number, number][])
      .forEach(it => el('rect', { x: R.x + 13 + it[1], y: R.y + 31 + it[2], width: 6, height: 6, fill: it[0] }));
    el('rect', { x: R.x + 11, y: R.y + 64, width: 24, height: 7, fill: '#141824' });
    // 정수기
    el('rect', { x: R.x + 46, y: R.y + 28, width: 12, height: 12, fill: '#7FB8E8' });
    el('rect', { x: R.x + 44, y: R.y + 40, width: 16, height: 36, rx: 2, fill: '#D8D2C4' });
    // 커피 카운터 · 머신 · 머그
    el('rect', { x: R.x + 150, y: R.y + 30, width: 94, height: 20, fill: '#8A5A34' });
    el('rect', { x: R.x + 150, y: R.y + 50, width: 94, height: 6, fill: '#5E3D22' });
    el('rect', { x: R.x + 160, y: R.y + 16, width: 20, height: 16, rx: 1, fill: '#2E3440' });
    el('rect', { x: R.x + 164, y: R.y + 27, width: 7, height: 4, fill: '#F4EEE0' });
    el('path', { d: `M${R.x + 190} ${R.y + 26}c-2-3 2-4 0-7`, stroke: '#B9C2D8', 'stroke-width': 1.4, fill: 'none', class: 'steam' });
    el('rect', { x: R.x + 210, y: R.y + 36, width: 7, height: 7, rx: 1, fill: '#F4EEE0' });
    el('rect', { x: R.x + 222, y: R.y + 36, width: 7, height: 7, rx: 1, fill: '#D0684A' });
    // 소파(3인)
    el('rect', { x: R.x + 12, y: R.y + 124, width: 8, height: 34, rx: 2, fill: '#8A3A30' });
    el('rect', { x: R.x + 92, y: R.y + 124, width: 8, height: 34, rx: 2, fill: '#8A3A30' });
    el('rect', { x: R.x + 18, y: R.y + 120, width: 76, height: 14, rx: 3, fill: '#A34A3E' });
    el('rect', { x: R.x + 18, y: R.y + 134, width: 76, height: 18, fill: '#B85548' });
    el('rect', { x: R.x + 18, y: R.y + 150, width: 76, height: 6, fill: '#8A3A30' });
    // 둥근 탁자 · 의자 3
    el('circle', { cx: R.x + 172, cy: R.y + 138, r: 22, fill: '#8A5A34' });
    el('circle', { cx: R.x + 172, cy: R.y + 138, r: 17, fill: '#A0713F' });
    el('rect', { x: R.x + 165, y: R.y + 132, width: 12, height: 9, fill: '#F4EEE0' });
    ([[142, 162], [204, 114], [204, 162]] as [number, number][]).forEach(([dx, dy]) => el('circle', { cx: R.x + dx, cy: R.y + dy, r: 7, fill: '#3A3F52' }));
    this.buildPlant(R.x + R.w - 20, R.y + R.h - 30);
  }

  private buildServerRoom(): void {
    const el = this.el.bind(this);
    const R = SERVER;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#20242F', stroke: '#12151E', 'stroke-width': 2 });
    el('text', { x: R.x + 10, y: R.y + 16, class: 'roomlabel', text: this.T.rooms.server });
    [0, 1, 2, 3].forEach(r => {
      const rx = R.x + 14 + r * 58;
      el('rect', { x: rx, y: R.y + 28, width: 44, height: 64, rx: 2, fill: '#2E3440' });
      for (let j = 0; j < 4; j++) {
        el('rect', { x: rx + 4, y: R.y + 34 + j * 14, width: 36, height: 11, rx: 1, fill: '#1A1E2A' });
        el('circle', { cx: rx + 9, cy: R.y + 39.5 + j * 14, r: 2.2, fill: '#7FE3A6', class: 'led', style: 'animation-delay:' + ((r + j) * 0.31) + 's' });
        el('circle', { cx: rx + 15, cy: R.y + 39.5 + j * 14, r: 2.2, fill: '#E8A33D', class: 'led', style: 'animation-delay:' + ((r + j) * 0.47 + 0.2) + 's' });
        el('path', { d: `M${rx + 20} ${R.y + 39.5 + j * 14}h16`, stroke: '#3A4152', 'stroke-width': 2 });
      }
    });
    el('rect', { x: R.x + 30, y: R.y + 118, width: 120, height: 18, rx: 2, fill: '#2E3440' });
    el('rect', { x: R.x + 34, y: R.y + 122, width: 50, height: 10, fill: '#1A1E2A' });
    el('path', { d: `M${R.x + 37} ${R.y + 127}h10M${R.x + 50} ${R.y + 127}h8M${R.x + 61} ${R.y + 127}h14`, stroke: '#7FE3A6', 'stroke-width': 1.6 });
    el('circle', { cx: R.x + 98, cy: R.y + 127, r: 2.4, fill: '#7FE3A6', class: 'led' });
    el('circle', { cx: R.x + 108, cy: R.y + 127, r: 2.4, fill: '#E8A33D', class: 'led', style: 'animation-delay:.5s' });
    el('path', { d: `M${R.x + 16} ${R.y + 156}h${R.w - 32}`, stroke: '#2E3440', 'stroke-width': 3, 'stroke-dasharray': '8 6' });
  }

  private buildMeetingRoom(): void {
    const el = this.el.bind(this);
    const R = MEET;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: 'url(#carpet)', stroke: '#33506E', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#2F3A50' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.25)' });
    el('text', { x: R.x + 10, y: R.y + 13, class: 'roomlabel', text: this.T.rooms.meeting });
    this.buildShelf(R.x + R.w - 84, R.y + 3);
    // 벽면 — 왼쪽 화이트보드, 오른쪽 지표 화면
    el('rect', { x: R.x + 40, y: R.y + 24, width: 118, height: 30, fill: '#F4EEE0', stroke: '#8F897A', 'stroke-width': 2 });
    el('path', { d: `M${R.x + 48} ${R.y + 33}h60M${R.x + 48} ${R.y + 40}h84M${R.x + 48} ${R.y + 47}h44`, stroke: '#2D8C4E', 'stroke-width': 1.6, fill: 'none' });
    el('rect', { x: R.x + R.w - 120, y: R.y + 24, width: 84, height: 44, rx: 2, fill: '#141824', stroke: '#2E3440', 'stroke-width': 2 });
    el('path', { d: `M${R.x + R.w - 112} ${R.y + 58}l14-14 12 9 16-18 16 11`, stroke: '#7FE3A6', 'stroke-width': 1.6, fill: 'none' });
    // 탁자 밑 러그 → 의자(사람이 앉으면 가려진다) → 12석 긴 탁자
    const tx = MEET_TABLE_X, ty = MEET_TABLE_Y, tw = MEET_TABLE_W, th = MEET_TABLE_H;
    el('rect', { x: tx - 64, y: ty - 50, width: tw + 128, height: th + 100, rx: 6, fill: '#3F6890', stroke: '#5A88B2', 'stroke-width': 2 });
    MEET_SEAT_XS.forEach(sx => {
      el('rect', { x: sx + 4.5, y: ty - 26, width: 21, height: 16, rx: 3, fill: '#3A3F52' });
      el('rect', { x: sx + 4.5, y: ty - 26, width: 21, height: 4, rx: 2, fill: '#4A5068' });
      el('rect', { x: sx + 4.5, y: ty + th + 12, width: 21, height: 16, rx: 3, fill: '#3A3F52' });
      el('rect', { x: sx + 4.5, y: ty + th + 24, width: 21, height: 4, rx: 2, fill: '#4A5068' });
    });
    el('rect', { x: tx - 30, y: ty + 19, width: 16, height: 22, rx: 3, fill: '#3A3F52' });
    el('rect', { x: tx + tw + 14, y: ty + 19, width: 16, height: 22, rx: 3, fill: '#3A3F52' });
    el('rect', { x: tx, y: ty, width: tw, height: th, rx: 4, fill: '#8A5A34' });
    el('rect', { x: tx + 6, y: ty + 6, width: tw - 12, height: th - 12, rx: 3, fill: '#94643B' });
    el('rect', { x: tx, y: ty + th, width: tw, height: 8, fill: '#5E3D22' });
    // 자리마다 노트북·서류(번갈아), 가운데 회의용 스피커폰
    MEET_SEAT_XS.forEach((sx, i) => {
      [ty + 6, ty + th - 19].forEach((yy, side) => {
        if ((i + side) % 2 === 0) {
          el('rect', { x: sx + 6, y: yy, width: 18, height: 13, fill: '#F4EEE0', stroke: '#B9AF97' });
        } else {
          el('rect', { x: sx + 5, y: yy, width: 20, height: 13, rx: 1, fill: '#2E3440' });
          el('rect', { x: sx + 7, y: yy + 2, width: 16, height: 8, fill: '#4A7DBF' });
        }
      });
    });
    el('circle', { cx: tx + tw / 2, cy: ty + th / 2, r: 8, fill: '#20242F' });
    el('circle', { cx: tx + tw / 2, cy: ty + th / 2, r: 2.6, fill: '#7FE3A6', class: 'led' });
    // 오른쪽 벽 발표 화면(벽걸이, 옆에서 본 모습)
    el('rect', { x: R.x + R.w - 22, y: ty - 30, width: 10, height: th + 60, rx: 2, fill: '#141824', stroke: '#2E3440', 'stroke-width': 2 });
    el('rect', { x: R.x + R.w - 20, y: ty - 26, width: 4, height: th + 52, fill: '#4A7DBF', opacity: 0.75 });
    // 물·컵 놓인 수납장, 화분
    el('rect', { x: R.x + R.w - 110, y: R.y + R.h - 34, width: 70, height: 16, fill: '#8A5A34' });
    el('rect', { x: R.x + R.w - 110, y: R.y + R.h - 18, width: 70, height: 5, fill: '#5E3D22' });
    [0, 1, 2].forEach(i => el('rect', { x: R.x + R.w - 102 + i * 9, y: R.y + R.h - 44, width: 6, height: 14, rx: 2, fill: '#7FB8E8' }));
    [0, 1].forEach(i => el('rect', { x: R.x + R.w - 66 + i * 10, y: R.y + R.h - 38, width: 7, height: 7, rx: 1, fill: '#F4EEE0' }));
    this.buildPlant(R.x + 8, R.y + R.h - 30);
    this.buildPlant(R.x + R.w - 26, R.y + R.h - 30);
  }

  /** 포커스룸 — 1인 통화 부스 2칸. 쉬는 사람이 가끔 들어가 통화한다. 부스 문 위 표시등은 쓰는 중이면 빨강. */
  private buildFocusRoom(): void {
    const el = this.el.bind(this);
    const R = FOCUS;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#3E4660', stroke: '#2A3048', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#2A3048' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.25)' });
    el('text', { x: R.x + 10, y: R.y + 13, class: 'roomlabel', text: this.T.rooms.focus });
    // 대기 공간 — 옷걸이 · 작은 탁자 · 화분(부스로 가는 길 밖)
    el('circle', { cx: R.x + 14, cy: R.y + 100, r: 7, fill: '#5E3D22' });
    el('rect', { x: R.x + 9, y: R.y + 90, width: 4, height: 8, fill: '#4A7DBF' });
    el('rect', { x: R.x + 15, y: R.y + 92, width: 4, height: 7, fill: '#D0684A' });
    el('circle', { cx: R.x + 84, cy: R.y + 102, r: 11, fill: '#8A5A34' });
    el('circle', { cx: R.x + 84, cy: R.y + 102, r: 8, fill: '#A0713F' });
    el('rect', { x: R.x + 81, y: R.y + 98, width: 6, height: 6, rx: 1, fill: '#F4EEE0' });
    this.buildPlant(R.x + R.w - 20, R.y + 94);
    FOCUS_BOOTHS.forEach(bx => {
      const by = R.y + 130, bw = 76, bh = R.h - 136;
      el('rect', { x: bx, y: by, width: bw, height: bh, fill: '#56607E' });
      // 유리벽(위쪽 가운데가 문)
      el('path', { d: `M${bx} ${by}h21M${bx + 55} ${by}h21M${bx} ${by}v${bh}M${bx + bw} ${by}v${bh}M${bx} ${by + bh}h${bw}`, stroke: '#BFE3F0', 'stroke-width': 3, opacity: 0.8, fill: 'none' });
      // 의자(앉으면 가려진다) → 작은 책상 · 노트북 · 스탠드
      el('rect', { x: bx + 28, y: R.y + 226, width: 20, height: 16, rx: 3, fill: '#3A3F52' });
      el('rect', { x: bx + 14, y: R.y + 250, width: 48, height: 14, fill: '#8A5A34' });
      el('rect', { x: bx + 14, y: R.y + 264, width: 48, height: 5, fill: '#5E3D22' });
      el('rect', { x: bx + 30, y: R.y + 252, width: 16, height: 10, rx: 1, fill: '#2E3440' });
      el('circle', { cx: bx + 56, cy: R.y + 255, r: 3, fill: '#E8A33D' });
      this.boothLeds.push(el('circle', { cx: bx + bw / 2, cy: by - 6, r: 3, fill: '#7FE3A6' }));
      this.boothBusy.push(false);
    });
  }

  /** 자료실 · 복합기 — 쉬는 사람이 가끔 들러 출력물을 찾거나 서류를 정리한다. */
  private buildPrintRoom(): void {
    const el = this.el.bind(this);
    const R = PRINT;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#C9C3B2', stroke: '#8F897A', 'stroke-width': 2 });
    el('rect', { x: R.x, y: R.y, width: R.w, height: 18, fill: '#4A4438' });
    el('rect', { x: R.x, y: R.y + 18, width: R.w, height: 2, fill: 'rgba(0,0,0,.2)' });
    el('text', { x: R.x + 10, y: R.y + 13, class: 'roomlabel', text: this.T.rooms.print });
    // 복합기(왼쪽 벽)
    el('rect', { x: R.x + 10, y: R.y + 40, width: 48, height: 56, rx: 3, fill: '#D8D2C4', stroke: '#8F897A', 'stroke-width': 1.5 });
    el('rect', { x: R.x + 10, y: R.y + 40, width: 48, height: 14, rx: 3, fill: '#B9B2A2' });
    el('rect', { x: R.x + 16, y: R.y + 44, width: 16, height: 6, rx: 1, fill: '#20242F' });
    el('circle', { cx: R.x + 50, cy: R.y + 47, r: 2.4, fill: '#7FE3A6', class: 'led' });
    el('rect', { x: R.x + 16, y: R.y + 60, width: 36, height: 8, fill: '#F4EEE0' });
    el('path', { d: `M${R.x + 14} ${R.y + 78}h40M${R.x + 14} ${R.y + 88}h40`, stroke: '#A8A190', 'stroke-width': 1.5 });
    // 서류함(오른쪽 벽, 3단)
    [0, 1, 2].forEach(i => {
      const y = R.y + 30 + i * 40;
      el('rect', { x: R.x + R.w - 38, y, width: 28, height: 38, rx: 2, fill: '#6B7288' });
      el('rect', { x: R.x + R.w - 38, y, width: 28, height: 4, fill: '#7C849A' });
      el('rect', { x: R.x + R.w - 28, y: y + 16, width: 8, height: 3, fill: '#4E5670' });
    });
    // 정리 탁자 — 서류 더미 · 바인더
    el('rect', { x: R.x + 30, y: R.y + 214, width: 90, height: 24, fill: '#8A5A34' });
    el('rect', { x: R.x + 30, y: R.y + 238, width: 90, height: 6, fill: '#5E3D22' });
    el('rect', { x: R.x + 38, y: R.y + 218, width: 20, height: 14, fill: '#F4EEE0', stroke: '#B9AF97' });
    el('rect', { x: R.x + 64, y: R.y + 220, width: 14, height: 12, fill: '#4A7DBF' });
    el('rect', { x: R.x + 84, y: R.y + 218, width: 24, height: 14, fill: '#F4EEE0', stroke: '#B9AF97' });
    // 복사지 상자 · 문서 세단기
    el('rect', { x: R.x + 10, y: R.y + R.h - 58, width: 30, height: 22, fill: '#C9A270', stroke: '#8A6A40' });
    el('rect', { x: R.x + 12, y: R.y + R.h - 36, width: 30, height: 22, fill: '#BF9866', stroke: '#8A6A40' });
    el('rect', { x: R.x + R.w - 40, y: R.y + R.h - 50, width: 24, height: 30, rx: 2, fill: '#3A3F52' });
    el('rect', { x: R.x + R.w - 36, y: R.y + R.h - 46, width: 16, height: 3, fill: '#141824' });
  }

  private buildBriefingRoom(): void {
    const el = this.el.bind(this);
    const R = BRIEF;
    el('rect', { x: R.x, y: R.y, width: R.w, height: R.h, fill: '#262B3E', stroke: '#161A26', 'stroke-width': 2 });
    el('text', { x: R.x + 10, y: R.y + 16, class: 'roomlabel', text: this.T.rooms.briefing });
    el('rect', { x: R.x + 14, y: R.y + 24, width: 160, height: 62, rx: 3, fill: '#141824', stroke: '#2E3440', 'stroke-width': 2 });
    el('rect', { x: R.x + 20, y: R.y + 30, width: 148, height: 50, fill: '#101420' });
    el('rect', { x: R.x + 20, y: R.y + 30, width: 148, height: 11, fill: '#0C1016' });
    el('circle', { cx: R.x + 29, cy: R.y + 35.5, r: 2.6, fill: '#D0684A', class: 'onair' });
    el('text', { x: R.x + 36, y: R.y + 39, class: 'btask', style: 'fill:#7FE3A6;font-size:8.5px;letter-spacing:.08em', text: this.T.rooms.onAir });
    ([14, 22, 10, 26, 18, 28, 12, 24, 20] as number[]).forEach((h, i) => el('rect', { x: R.x + 28 + i * 15, y: R.y + 76 - h, width: 8, height: h, fill: i === 5 ? '#E8A33D' : '#2D8C4E' }));
    el('path', { d: `M${R.x + 20} ${R.y + 78}h148`, stroke: '#2E3440', 'stroke-width': 2 });
    this.buildPlant(R.x + R.w - 24, R.y + R.h - 30);
    // 팀장 책상 — 재하의 브리핑을 받아 작업을 나누는 자리. 일이 돌면 가끔 일어나 현장을 돈다.
    this.buildDesk({ id: 'lead', name: this.T.names.lead, role: this.T.roles.lead, dept: 'lead', hair: '#2A2230', skin: '#EAC49C', hairStyle: 'short', acc: 'headset' }, R.x + 172, R.y + 30, 12);
  }

  private buildDoor(cx: number, cy: number, horiz: boolean): void {
    const el = this.el.bind(this);
    const g = el('g', { transform: `translate(${cx},${cy})`, class: 'apex-door' }) as SVGGElement;
    const glass = '#BFE3CC', frame = '#2D8C4E';
    if (horiz) {
      el('rect', { x: -30, y: -4, width: 60, height: 8, fill: 'url(#stone)' }, g);
      el('rect', { x: -31, y: -5, width: 4, height: 10, fill: '#141827' }, g);
      el('rect', { x: 27, y: -5, width: 4, height: 10, fill: '#141827' }, g);
      el('rect', { x: -27, y: -3.5, width: 26, height: 7, rx: 1.5, fill: glass, stroke: frame, 'stroke-width': 1.4, class: 'door-l' }, g);
      el('rect', { x: 1, y: -3.5, width: 26, height: 7, rx: 1.5, fill: glass, stroke: frame, 'stroke-width': 1.4, class: 'door-r' }, g);
      el('rect', { x: -4, y: -11, width: 8, height: 4, rx: 1, fill: '#141824' }, g);
      el('circle', { cx: 0, cy: -9, r: 2.4, fill: '#7FE3A6', class: 'led' }, g);
    } else {
      el('rect', { x: -4, y: -30, width: 8, height: 60, fill: 'url(#stone)' }, g);
      el('rect', { x: -5, y: -31, width: 10, height: 4, fill: '#141827' }, g);
      el('rect', { x: -5, y: 27, width: 10, height: 4, fill: '#141827' }, g);
      el('rect', { x: -3.5, y: -27, width: 7, height: 26, rx: 1.5, fill: glass, stroke: frame, 'stroke-width': 1.4, class: 'door-u' }, g);
      el('rect', { x: -3.5, y: 1, width: 7, height: 26, rx: 1.5, fill: glass, stroke: frame, 'stroke-width': 1.4, class: 'door-d' }, g);
      el('rect', { x: -11, y: -4, width: 4, height: 8, rx: 1, fill: '#141824' }, g);
      el('circle', { cx: -9, cy: 0, r: 2.4, fill: '#7FE3A6', class: 'led' }, g);
    }
    this.doors.push({ x: cx, y: cy, g });
  }

  private buildDoors(): void {
    for (const k in this.ZONES) { const z = this.ZONES[k]; this.buildDoor(z.x + ROOM_W / 2, z.y + ROOM_H, true); }
    this.buildDoor(BOSS.x + 130, BOSS.y + BOSS.h, true);
    this.buildDoor(LOUNGE_DOOR_X, LOUNGE.y + LOUNGE.h, true);
    this.buildDoor(BRIEF_DOOR_X, BRIEF.y + BRIEF.h, true);
    this.buildDoor(SERVER.x + 127, SERVER.y + SERVER.h, true);
    this.buildDoor(MEET_DOOR_X, ROW_C, true);
    this.buildDoor(FOCUS_DOOR_X, ROW_C, true);
    this.buildDoor(PRINT_DOOR_X, ROW_C, true);
    this.buildDoor(ANNEX_DOOR_X, ROW_C, true);
  }

  /* ── 이동 엔진: 복도 웨이포인트 라우팅 ──
   * 방마다 문 x(doorX)·문이 닿는 복도 가운데 y(corY)·방 안 문 앞 통로 y(insideY)를 둔다. 복도가 다르면 세로 복도 VX 로 갈아탄다. */
  private roomMeta(a: AgentDef): { doorX: number; corY: number; insideY: number } {
    if (a.dept === 'lead') return { doorX: BRIEF_DOOR_X, corY: COR_B, insideY: BRIEF_LANE };
    if (a.dept === 'ext') return { doorX: ANNEX_DOOR_X, corY: COR_B, insideY: ROW_C_LANE };
    const z = this.ZONES[a.dept];
    return { doorX: z.x + ROOM_W / 2, corY: z.y === ROW_A ? COR_A : COR_B, insideY: z.y + ROOM_H - SH - 6 };
  }

  /** 복도 위 한 문 앞(ax, ay=복도 y)에서 다른 문 앞(bx, by)으로 — 스프라이트 위치(왼쪽 위)로 돌려준다. */
  private corridorRoute(_ax: number, ay: number, bx: number, by: number): Pt[] {
    if (ay === by) return [{ x: bx - CX, y: by - CY }];
    return [{ x: VX - CX, y: ay - CY }, { x: VX - CX, y: by - CY }, { x: bx - CX, y: by - CY }];
  }

  /** 자리 → 문 → 복도. 부서 방은 문이 책상 사이 통로 바로 아래라 옆으로 한 칸 나가 곧장 내려간다. */
  private exitPts(a: AgentDef): Pt[] {
    const m = this.M[a.id], r = this.roomMeta(a);
    if (a.dept === 'lead') return [{ x: m.seatAbs.x, y: r.insideY }, { x: r.doorX - CX, y: r.insideY }, { x: r.doorX - CX, y: r.corY - CY }];
    return [{ x: r.doorX - CX, y: m.seatAbs.y }, { x: r.doorX - CX, y: r.corY - CY }];
  }

  private pathToMeeting(a: AgentDef, spot: Spot): Pt[] {
    const r = this.roomMeta(a);
    const pts: Pt[] = [...this.exitPts(a), ...this.corridorRoute(r.doorX, r.corY, MEET_DOOR_X, COR_B), { x: MEET_DOOR_X - CX, y: MEET_LANE_TOP }];
    if (spot.top) pts.push({ x: spot.x, y: MEET_LANE_TOP });
    else pts.push({ x: MEET_AISLE_X, y: MEET_LANE_TOP }, { x: MEET_AISLE_X, y: MEET_LANE_BOTTOM }, { x: spot.x, y: MEET_LANE_BOTTOM });
    pts.push({ x: spot.x, y: spot.y });
    return pts;
  }

  /** 나들이 — 자리 → 문 → 복도 → 목적지 문 → 방 안 통로 → 자리. 라운지(문이 아래)·아래 줄 방(문이 위) 모두 같은 모양. */
  private pathToHangout(a: AgentDef, h: Hangout): Pt[] {
    const r = this.roomMeta(a);
    return [...this.exitPts(a), ...this.corridorRoute(r.doorX, r.corY, h.doorX, h.corY), { x: h.doorX - CX, y: h.laneY }, { x: h.spot.x, y: h.laneY }, { x: h.spot.x, y: h.spot.y }];
  }

  private pathToBriefing(a: AgentDef, spot: Spot): Pt[] {
    const r = this.roomMeta(a);
    return [...this.exitPts(a), ...this.corridorRoute(r.doorX, r.corY, BRIEF_DOOR_X, COR_B), { x: BRIEF_DOOR_X - CX, y: BRIEF_LANE }, { x: spot.x, y: BRIEF_LANE }, { x: spot.x, y: spot.y }];
  }

  /** 팀장 현장 순회 — 팀장 자리에서 대상의 방 문 안쪽까지. */
  private pathToVisit(lead: AgentDef, target: AgentDef): Pt[] {
    const rl = this.roomMeta(lead), rt = this.roomMeta(target);
    return [...this.exitPts(lead), ...this.corridorRoute(rl.doorX, rl.corY, rt.doorX, rt.corY), { x: rt.doorX - CX, y: rt.insideY }];
  }

  /** 걷기 경로에 쓸 사람 정의 — 기본 12인, 팀장, 추가 인원. */
  private defOf(id: string): AgentDef | null {
    const a = this.AGENTS.find(x => x.id === id);
    if (a) return a;
    if (id === 'lead') return { id: 'lead', name: this.T.names.lead, role: this.T.roles.lead, dept: 'lead', hair: '#2A2230', skin: '#EAC49C', hairStyle: 'short', acc: 'headset' };
    const c = this.custom.find(x => x.id === id);
    return c ? { id: c.id, name: c.name, role: c.role, dept: 'ext', hair: '#2A2230', skin: '#EAC49C', hairStyle: 'short', acc: null } : null;
  }

  private returnPts(id: string): Pt[] {
    const m = this.M[id];
    const rev = [...(m.awayPath || [])].reverse();
    rev.shift();
    rev.push({ ...m.seatAbs });
    return rev;
  }

  private walk(id: string, pts: Pt[], cb: (() => void) | null): void {
    const m = this.M[id];
    if (m.mode === 'walking') { this.seatInstant(id); }
    if (m.mode === 'seated') {
      m.pos = { ...m.seatAbs };
      this.walkLayer.appendChild(m.node);
    }
    m.node.setAttribute('transform', `translate(${m.pos.x},${m.pos.y}) scale(${DS})`);
    m.node.classList.add('walker'); m.node.classList.remove('talking');
    m.path = pts.slice(); m.cb = cb; m.mode = 'walking';
  }

  private seatInstant(id: string): void {
    const m = this.M[id];
    m.path = []; m.cb = null; m.mode = 'seated'; m.wander = null; m.awayPath = null;
    m.node.classList.remove('walker', 'talking');
    m.av.appendChild(m.node);
    m.face = 1;
    m.node.setAttribute('transform', 'translate(18,0)');
    m.pos = { ...m.seatAbs };
  }

  /* ── 봉투 비행: hive 메일 이벤트(assign/result/approval…)를 책상 사이를 나는 봉투로 보여 준다 ── */
  private seatOf(id: string): Pt | null {
    if (id === 'jaeha') return { x: BOSS.x + 130, y: BOSS.y + 60 }; // 재하 = 사장실
    const m = this.M[id];
    return m ? { x: m.seatAbs.x + CX, y: m.seatAbs.y + 8 } : null;
  }

  private flyEnvelope(fromId: string, toId: string, type: string): void {
    const from = this.seatOf(fromId), to = this.seatOf(toId);
    if (!from || !to || !this.walkLayer) return;
    const el = this.el.bind(this);
    const color = type === 'approval' ? '#E8A33D' : type === 'result' || type === 'report' ? '#7FE3A6' : type === 'question' ? '#D0684A' : '#FFFFFF';
    const g = el('g', { class: 'envelope', transform: `translate(${from.x},${from.y})` }, this.walkLayer) as SVGGElement;
    el('rect', { x: -7, y: -5, width: 14, height: 10, rx: 1.5, fill: color, stroke: '#24291F', 'stroke-width': 1 }, g);
    el('path', { d: 'M-7 -5l7 5 7-5', stroke: '#24291F', 'stroke-width': 1, fill: 'none' }, g);
    const dist = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    this.envelopes.push({ node: g, from, to, t: 0, dur: Math.max(500, Math.min(1800, dist * 2.2)) });
  }

  private stepEnvelopes(dtms: number): void {
    if (!this.envelopes.length) return;
    this.envelopes = this.envelopes.filter(e => {
      e.t += dtms * this.st.speed;
      const k = Math.min(1, e.t / e.dur);
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = e.from.x + (e.to.x - e.from.x) * ease;
      const y = e.from.y + (e.to.y - e.from.y) * ease - Math.sin(k * Math.PI) * 28; // 포물선
      e.node.setAttribute('transform', `translate(${x},${y})`);
      if (k >= 1) { e.node.remove(); return false; }
      return true;
    });
  }

  private loungeSocial(): void {
    const ls = Object.keys(this.M).filter(id => { const w = this.M[id].wander; return !!w && w.phase === 'linger' && w.room === 'lounge'; });
    ls.forEach(id => this.M[id].node.classList.toggle('talking', ls.length >= 2));
  }

  private stepWalk(dtms: number): void {
    this.stepEnvelopes(dtms);
    for (const id in this.M) {
      const m = this.M[id];
      if (m.mode !== 'walking') continue;
      let rem = 78 * m.spd * this.st.speed * dtms / 1000;
      while (rem > 0 && m.path.length) {
        const t = m.path[0], dx = t.x - m.pos.x, dy = t.y - m.pos.y, dist = Math.abs(dx) + Math.abs(dy);
        if (Math.abs(dx) > 0.5) m.face = dx < 0 ? -1 : 1;
        if (dist <= rem) { m.pos = { x: t.x, y: t.y }; m.path.shift(); rem -= dist; }
        else {
          const mx = Math.sign(dx) * Math.min(rem, Math.abs(dx));
          const my = Math.abs(dx) > 0.01 ? 0 : Math.sign(dy) * Math.min(rem, Math.abs(dy));
          m.pos = { x: m.pos.x + mx, y: m.pos.y + my }; rem = 0;
        }
      }
      m.node.setAttribute('transform', m.face < 0 ? `translate(${m.pos.x + SW},${m.pos.y}) scale(${-DS},${DS})` : `translate(${m.pos.x},${m.pos.y}) scale(${DS})`);
      if (!m.path.length) {
        m.mode = 'standing';
        m.node.classList.remove('walker');
        const cb = m.cb; m.cb = null;
        if (cb) cb();
      }
    }
    const cs: Pt[] = [];
    for (const id in this.M) { const m = this.M[id]; if (m.mode === 'walking') cs.push({ x: m.pos.x + CX, y: m.pos.y + CY }); }
    this.doors.forEach(d => {
      const open = cs.some(c => Math.abs(c.x - d.x) < 30 && Math.abs(c.y - d.y) < 36);
      d.g.classList.toggle('open', open);
    });
  }

  /* ── 상태/피드 ── */
  private setAgent(id: string, state: AgentState, task?: string): void {
    this.agentStates[id] = { state, task: task !== undefined ? task : this.agentStates[id]?.task };
    const sp = this.svg.querySelector('#sp-' + id);
    if (!sp) return;
    sp.classList.remove('working', 'waiting');
    if (state === 'working' || state === 'waiting') sp.classList.add(state);
    const t = this.svg.querySelector('#task-' + id);
    if (t && task !== undefined) { t.textContent = task && task.length > 9 ? task.slice(0, 9) + '…' : (task || ''); }
  }

  private setBossDoc(on: boolean): void {
    if (!this.bossDoc) return;
    this.bossDoc.setAttribute('visibility', on ? 'visible' : 'hidden');
    this.bossDoc.classList.toggle('blink', !!on);
  }

  private clockStr(): string {
    const h = Math.floor(this.st.clockMin / 60), m = Math.floor(this.st.clockMin % 60);
    return `DAY ${this.st.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private feedAdd(who: string, msg: string, cls?: string): void {
    const whoColor = cls === 'sys' ? '#1F6B3A' : cls === 'gate' ? '#A96F15' : '#24291F';
    this.feed = [{ t: this.clockStr(), who, msg, whoColor }, ...this.feed].slice(0, 40);
    this.opts.onRender();
  }

  private toast(msg: string): void {
    this.toastMsg = msg; this.toastShow = true; this.opts.onRender();
    if (this.toastT !== null) clearTimeout(this.toastT);
    this.toastT = setTimeout(() => { this.toastShow = false; this.opts.onRender(); }, 2400);
  }

  /* ── 시나리오 흐름: 킥오프 회의 → 복귀 → 작업 → 결재 ── */
  private startStage(): void {
    const st = this.st;
    const sc = this.SCENARIO[st.stage];
    st.progress = 0; st.meetWait = 0;
    this.AGENTS.forEach(a => this.setAgent(a.id, 'idle', ''));
    sc.workers.forEach(w => { if (this.M[w.id].mode !== 'seated') this.seatInstant(w.id); });
    if (sc.workers.length < 2) {
      st.phase = 'working';
      this.feedAdd(this.T.feed.orchestrator, this.T.feed.soloStart(`G${st.stage + 1} ${this.GATES[st.stage]}`), 'sys');
      this.beginWork();
      return;
    }
    st.phase = 'meeting';
    this.meetNeed = sc.workers.length; this.meetArr = 0;
    this.feedAdd(this.T.feed.orchestrator, this.T.feed.kickoff(`G${st.stage + 1} ${this.GATES[st.stage]}`), 'sys');
    sc.workers.forEach((w, i) => {
      const a = this.AGENTS.find(x => x.id === w.id)!;
      const spot = this.MEET_SPOTS[i % this.MEET_SPOTS.length];
      const pts = this.pathToMeeting(a, spot);
      this.M[w.id].awayPath = pts;
      this.walk(w.id, pts, () => {
        this.M[w.id].node.classList.add('talking');
        this.meetArr++;
        if (this.meetArr === this.meetNeed) this.feedAdd(this.T.feed.meeting, this.T.feed.kickoffOn(this.meetNeed), 'gate');
      });
    });
    this.opts.onRender();
  }

  private endMeeting(): void {
    const st = this.st;
    st.phase = 'returning';
    const sc = this.SCENARIO[st.stage];
    this.feedAdd(this.T.feed.meeting, this.T.feed.kickoffEnd, 'gate');
    let back = 0;
    sc.workers.forEach(w => {
      this.walk(w.id, this.returnPts(w.id), () => {
        this.seatInstant(w.id);
        back++;
        if (back === sc.workers.length) this.beginWork();
      });
    });
    this.opts.onRender();
  }

  private beginWork(): void {
    const st = this.st;
    st.phase = 'working'; st.progress = 0;
    const sc = this.SCENARIO[st.stage];
    sc.workers.forEach(w => {
      this.setAgent(w.id, 'working', w.task);
      const a = this.AGENTS.find(x => x.id === w.id)!;
      this.feedAdd(a.name, this.T.feed.start(w.task));
    });
    this.opts.onRender();
  }

  private toAwaiting(): void {
    const st = this.st;
    st.phase = 'awaiting'; st.progress = 1; st.autoWait = 0;
    const sc = this.SCENARIO[st.stage];
    sc.workers.forEach(w => this.setAgent(w.id, 'waiting', ''));
    if (this.externalMode) this.feedAdd(this.T.feed.gate, this.T.feed.awaitExt(`G${st.stage + 1} ${this.GATES[st.stage]}`), 'gate');
    else this.feedAdd(this.T.feed.gate, this.T.feed.awaitDemo(`G${st.stage + 1}`, sc.artifact.score), 'gate');
    this.setBossDoc(true);
    this.opts.onRender();
  }

  private approve(byAuto: boolean): void {
    const st = this.st;
    const sc = this.SCENARIO[st.stage];
    this.setBossDoc(false);
    this.artifacts = [{ g: 'G' + (st.stage + 1), f: sc.artifact.file, s: this.T.feed.points(sc.artifact.score) }, ...this.artifacts];
    this.feedAdd(this.T.feed.boss, this.T.feed.approved(`G${st.stage + 1}`, byAuto), 'sys');
    sc.workers.forEach(w => this.setAgent(w.id, 'idle', ''));
    st.stage++;
    if (st.stage >= this.SCENARIO.length) {
      st.phase = 'done-all';
      this.feedAdd(this.T.feed.orchestrator, this.T.feed.allPassed, 'sys');
      this.toast(this.T.feed.allPassedToast);
      this.AGENTS.forEach((a, i) => {
        if (this.M[a.id].mode !== 'seated') this.seatInstant(a.id);
        const spot = this.BRIEF_SPOTS[i];
        const pts = this.pathToBriefing(a, spot);
        this.M[a.id].awayPath = pts;
        this.walk(a.id, pts, () => this.M[a.id].node.classList.add('talking'));
      });
      this.opts.onRender();
      return;
    }
    this.toast(this.T.feed.nextToast(`G${st.stage}`, `G${st.stage + 1} ${this.GATES[st.stage]}`));
    this.opts.onRender();
    setTimeout(() => { if (this.st.phase !== 'done-all') this.startStage(); }, 500);
  }

  reset(): void {
    Object.assign(this.st, { stage: 0, phase: 'working', progress: 0, clockMin: 540, day: 1, playing: true, autoWait: 0, meetWait: 0 });
    this.AGENTS.forEach(a => this.seatInstant(a.id));
    this.feed = []; this.artifacts = [];
    this.setBossDoc(false);
    this.wanderClk = 0; this.wanderNext = 6;
    this.startStage();
    this.opts.onRender();
  }

  /* ── 유휴 직원 나들이(라운지 · 자료실 · 통화 부스) ── */
  private maybeWander(dt: number): void {
    const st = this.st;
    this.syncBooths();
    if (st.phase !== 'working' && st.phase !== 'awaiting') return;
    for (const id in this.M) {
      const m = this.M[id];
      if (m.wander && m.wander.phase === 'linger') {
        m.wander.t += dt * st.speed;
        if (m.wander.t > (m.wander.room === 'focus' ? 7 : 4.5)) {
          m.wander.phase = 'back';
          this.walk(id, this.returnPts(id), () => this.seatInstant(id));
          this.loungeSocial();
        }
      }
    }
    this.maybeRounds(dt);
    this.wanderClk += dt * st.speed;
    if (this.wanderClk < this.wanderNext) return;
    this.wanderClk = 0; this.wanderNext = 6 + Math.random() * 6;
    // 외부(hive) 상태에서는 실제로 일하거나 기다리는 사람을 자리에 둔다. 데모에서는 현재 게이트 담당.
    const busy = this.externalMode
      ? new Set(Object.keys(this.agentStates).filter(id => this.agentStates[id].state !== 'idle'))
      : new Set(this.SCENARIO[Math.min(st.stage, 5)].workers.map(w => w.id));
    const away = Object.keys(this.M).filter(id => this.M[id].wander);
    if (away.length >= 3) return;
    const cands = this.AGENTS.filter(a => !busy.has(a.id) && this.M[a.id].mode === 'seated');
    if (!cands.length) return;
    // 이미 누가 가 있거나 가는 자리는 빼고, 가중치(라운지 3 · 자료실 1.6 · 부스 1.4)로 고른다
    const taken = new Set(away.map(id => this.M[id].wander?.key).filter(Boolean));
    const free = this.HANGOUTS.filter(h => !taken.has(h.key));
    if (!free.length) return;
    let roll = Math.random() * free.reduce((n, h) => n + h.w, 0);
    const h = free.find(x => (roll -= x.w) < 0) ?? free[free.length - 1];
    const a = cands[Math.floor(Math.random() * cands.length)];
    const pts = this.pathToHangout(a, h);
    this.M[a.id].awayPath = pts;
    this.M[a.id].wander = { phase: 'go', t: 0, room: h.room, key: h.key, booth: h.booth };
    this.walk(a.id, pts, () => {
      const m = this.M[a.id];
      if (!m.wander) return;
      m.wander = { ...m.wander, phase: 'linger', t: 0 };
      if (h.room === 'focus') m.node.classList.add('talking');   // 부스 안에서 통화 중
      else this.loungeSocial();
    });
  }

  /** 통화 부스 표시등 — 부스 안에 머무는 사람이 있으면 빨강, 아니면 초록(바뀔 때만 칠한다). */
  private syncBooths(): void {
    this.boothLeds.forEach((led, i) => {
      const busy = Object.keys(this.M).some(id => { const w = this.M[id].wander; return !!w && w.booth === i && w.phase === 'linger'; });
      if (busy === this.boothBusy[i]) return;
      this.boothBusy[i] = busy;
      led.setAttribute('fill', busy ? '#D0684A' : '#7FE3A6');
    });
  }

  /** 팀장 현장 순회 — 일하는 사람이 있으면 16~26초마다 한 명의 방 앞까지 걸어가 들여다보고 돌아온다(머무는 시간은 라운지 나들이와 같다). */
  private maybeRounds(dt: number): void {
    this.roundsClk += dt * this.st.speed;
    if (this.roundsClk < this.roundsNext) return;
    this.roundsClk = 0; this.roundsNext = 16 + Math.random() * 10;
    const lm = this.M.lead;
    const lead = this.defOf('lead');
    if (!lm || !lead || lm.mode !== 'seated' || lm.wander) return;
    const working = Object.keys(this.agentStates).filter(id => id !== 'lead' && this.agentStates[id].state === 'working' && this.M[id] && this.M[id].mode === 'seated');
    if (!working.length) return;
    const target = this.defOf(working[Math.floor(Math.random() * working.length)]);
    if (!target) return;
    const pts = this.pathToVisit(lead, target);
    lm.awayPath = pts;
    lm.wander = { phase: 'go', t: 0 };
    this.walk('lead', pts, () => { if (lm.wander) { lm.wander = { phase: 'linger', t: 0 }; lm.node.classList.add('talking'); } });
    this.feedAdd(lead.name, this.T.feed.rounds(target.name));
  }

  private tick(): void {
    const st = this.st;
    const now = Date.now(), dt = (now - this.last) / 1000; this.last = now;
    if (!st.playing) return;
    st.clockMin += dt * st.speed * 4;
    if (st.clockMin >= 1140) { st.day++; st.clockMin = 540; }
    if (!this.externalMode) {
      // 내부 자동 시나리오 진행(외부 상태 주입 시엔 externalMode가 이를 대체)
      if (st.phase === 'working') {
        st.progress += (dt * 1000 * st.speed) / this.SCENARIO[st.stage].dur;
        if (st.progress >= 1) { this.toAwaiting(); return; }
      } else if (st.phase === 'meeting') {
        if (this.meetNeed > 0 && this.meetArr === this.meetNeed) {
          st.meetWait += dt * st.speed;
          if (st.meetWait > 3.2) { this.endMeeting(); return; }
        }
      } else if (st.phase === 'awaiting' && st.auto) {
        st.autoWait += dt * st.speed;
        if (st.autoWait > 1.8) { this.approve(true); return; }
      }
    }
    this.maybeWander(dt);
    this.opts.onRender();
  }

  /* ── 컨트롤 (React 핸들러가 호출) ── */
  togglePlay(): void {
    // 데모가 끝났을 때만 처음부터 다시 돈다. 실제(hive) 상태에서는 데모로 되돌리지 않고 애니메이션만 멈춘다/잇는다.
    if (this.st.phase === 'done-all' && !this.externalMode) { this.reset(); return; }
    this.st.playing = !this.st.playing; this.opts.onRender();
  }
  cycleSpeed(): void {
    this.st.speed = this.st.speed === 1 ? 2 : this.st.speed === 2 ? 4 : 1; this.opts.onRender();
  }
  setAuto(on: boolean): void {
    this.st.auto = on; this.st.autoWait = 0; this.opts.onRender();
  }
  approveManual(): void {
    if (this.st.phase === 'awaiting') this.approve(false);
  }

  /** 지시 콘솔에서 지시가 접수됐음을 라이브 피드에 남긴다(오케스트레이터 실행 대기 표시). */
  noteInstruction(title: string): void {
    this.feedAdd(this.T.feed.order, this.T.feed.received(title), 'sys');
  }

  /* ── 실전 연동: 외부(오케스트레이터) 상태를 화면에 반영 ──
   * 최초 호출 시 externalMode 진입 → 내부 자동 시나리오 정지, 이후 이 상태가 SSOT.
   * 단계/페이즈 전이 시에만 이동 안무를 구동하고, agents 맵으로 자리 상태를 덮어쓴다. */
  applyOfficeState(ext: OfficeState): void {
    if (!this.externalMode) {
      // 데모 → 실제 상태로 처음 넘어갈 때: 데모 안무(회의실로 걷던 사람)와 데모 피드를 걷어 낸다.
      this.AGENTS.forEach(a => { this.M[a.id].wander = null; this.seatInstant(a.id); this.setAgent(a.id, 'idle', ''); });
      this.feed = []; this.artifacts = [];
      this.setBossDoc(false);
    }
    this.externalMode = true;
    const st = this.st;
    const stageClamped = Math.max(0, Math.min(ext.stage | 0, this.SCENARIO.length - 1));
    const phaseChanged = ext.phase !== st.phase;
    const stageChanged = stageClamped !== st.stage;
    // 단계 상승 = 이전 게이트 결재 완료 → 산출물 적재 (hive 가 있으면 작업 원장에서 산출물을 만들므로 건너뛴다)
    if (!ext.hive && ext.stage > this.lastExtStage && ext.artifact) {
      this.artifacts = [{ g: 'G' + ext.stage, f: ext.artifact.file, s: this.T.feed.points(ext.artifact.score) }, ...this.artifacts];
      this.feedAdd(this.T.feed.boss, this.T.feed.approved(`G${ext.stage}`, false), 'sys');
    }
    this.lastExtStage = ext.stage;
    st.stage = stageClamped;
    this.question = ext.question || '';
    this.idle = Boolean(ext.idle);
    this.boards = ext.boards;
    if (ext.hive) this.applyHive(ext.hive);
    if (typeof ext.progress === 'number') st.progress = Math.max(0, Math.min(1, ext.progress));
    if (phaseChanged || stageChanged) {
      st.phase = ext.phase;
      if (ext.phase !== 'awaiting') this.setBossDoc(false);
      this.driveExternalPhase(ext.phase, this.SCENARIO[st.stage]?.workers ?? []);
    }
    if (ext.agents) {
      for (const id in ext.agents) {
        if (this.M[id]) this.setAgent(id, ext.agents[id].state, ext.agents[id].task);
      }
    }
    this.opts.onRender();
  }

  /** hive 스냅샷 → 산출물 패널·피드·봉투·팀장 자리. 상태 변화가 있는 항목만 피드에 쓴다. */
  private applyHive(h: HiveState): void {
    this.hive = h;
    const name = (id: string) => this.T.names[id] ?? this.custom.find(c => c.id === id)?.name ?? (this.AGENTS.find(a => a.id === id)?.name ?? id);
    for (const m of h.mail || []) {
      if (!m.id || this.seenMail.has(m.id)) continue;
      this.seenMail.add(m.id);
      this.flyEnvelope(m.from, m.to, m.type);
      const what = this.T.feed.mailType[m.type] ?? m.type;
      this.feedAdd(name(m.from), this.T.feed.mail(name(m.to), what, m.task), m.type === 'approval' || m.type === 'question' ? 'gate' : undefined);
    }
    for (const t of h.tasks || []) {
      const key = `${t.status}|${t.gate}`;
      if (this.seenTaskState.get(t.id) === key) continue;
      this.seenTaskState.set(t.id, key);
      if (t.status === '완료') this.feedAdd(this.T.feed.qa, this.T.feed.taskDone(t.id, t.title, t.gate), 'sys');
      else if (t.status === '실패') this.feedAdd(this.T.feed.qa, this.T.feed.taskFail(t.id, t.title), 'gate');
      else if (t.status === '승인대기') this.feedAdd(this.T.feed.lead, this.T.feed.taskAwait(t.id, t.title), 'gate');
    }
    this.artifacts = (h.tasks || []).filter(t => t.status === '완료' && t.output).map(t => ({
      g: t.id, f: (t.output || '').split('/').pop() || t.title, s: t.gate,
    })).reverse();
    if (h.leader) this.setAgent('lead', h.leader.state, h.leader.task || '');
    this.setBossDoc((h.pending || []).length > 0);
  }

  /** 마지막 hive 스냅샷(React 패널이 작업판·승인 카드를 그린다). */
  getHive(): HiveState | null { return this.hive; }
  getQuestion(): string { return this.question; }
  /** 자리별 현재 상태 — 서버 미연결(데모)일 때 에이전트 카드가 읽는다. */
  getAgentStates(): Record<string, OfficeAgentState> { return this.agentStates; }

  /** 책상 강조. null 이면 해제. 에이전트 카드·책상 클릭으로 바뀐다. */
  highlightAgent(id: string | null): void {
    if (this.selectedId === id) return;
    if (this.selectedId) this.svg.querySelector('#sp-' + this.selectedId)?.classList.remove('selected');
    this.selectedId = id;
    if (id) this.svg.querySelector('#sp-' + id)?.classList.add('selected');
  }

  /** 실제(hive) 상태: 서 있거나 걷는 사람을 자리로 돌려보낸다 — 앞 브리핑의 '모두 모임'이 다음 브리핑까지 남지 않게. */
  private returnAllToSeats(keepWander = false): void {
    for (const id in this.M) {
      const m = this.M[id];
      if (m.mode === 'seated' || (keepWander && m.wander)) continue; // 라운지 나들이·현장 순회는 그대로 둔다
      m.wander = null;
      if (m.awayPath && m.mode === 'standing') this.walk(id, this.returnPts(id), () => this.seatInstant(id));
      else this.seatInstant(id);
    }
  }

  /** 실제(hive) 상태의 분해 단계 — 팀장이 회의실 탁자 가운데로 가서 브리핑을 나눈다(데모 직원 대신). */
  private leadToMeeting(): void {
    const lead = this.defOf('lead'), lm = this.M.lead;
    if (!lead || !lm) return;
    const spot = this.MEET_SPOTS[this.MEET_SPOTS.length - 1];
    const rl = this.roomMeta(lead);
    const pts: Pt[] = [...this.exitPts(lead), ...this.corridorRoute(rl.doorX, rl.corY, MEET_DOOR_X, COR_B), { x: MEET_DOOR_X - CX, y: MEET_LANE_TOP }, { x: spot.x, y: MEET_LANE_TOP }, { x: spot.x, y: spot.y }];
    lm.awayPath = pts;
    lm.wander = null;
    this.walk('lead', pts, () => lm.node.classList.add('talking'));
  }

  private driveExternalPhase(phase: Phase, workers: Worker[]): void {
    if (phase === 'meeting' && this.hive) {
      this.AGENTS.forEach(a => this.setAgent(a.id, 'idle', ''));
      this.returnAllToSeats();
      this.leadToMeeting();
      return;
    }
    if (this.hive && (phase === 'working' || phase === 'awaiting')) this.returnAllToSeats(true);
    if (phase === 'meeting') {
      this.AGENTS.forEach(a => this.setAgent(a.id, 'idle', ''));
      workers.forEach(w => { if (this.M[w.id].mode !== 'seated') this.seatInstant(w.id); });
      this.walkToMeeting(workers);
    } else if (phase === 'returning') {
      workers.forEach(w => this.walk(w.id, this.returnPts(w.id), () => this.seatInstant(w.id)));
    } else if (phase === 'working') {
      this.beginWork();
    } else if (phase === 'awaiting') {
      this.toAwaiting();
    } else if (phase === 'done-all') {
      this.driveDoneAll();
    }
  }

  private walkToMeeting(workers: Worker[]): void {
    this.meetNeed = workers.length; this.meetArr = 0;
    workers.forEach((w, i) => {
      const a = this.AGENTS.find(x => x.id === w.id)!;
      const spot = this.MEET_SPOTS[i % this.MEET_SPOTS.length];
      const pts = this.pathToMeeting(a, spot);
      this.M[w.id].awayPath = pts;
      this.walk(w.id, pts, () => {
        this.M[w.id].node.classList.add('talking');
        this.meetArr++;
        if (this.meetArr === this.meetNeed) this.feedAdd(this.T.feed.meeting, this.T.feed.kickoffOn(this.meetNeed), 'gate');
      });
    });
  }

  private driveDoneAll(): void {
    // hive 상태에서는 모든 작업이 끝났다는 뜻(PASS 여부와 무관)이므로 '통과'라고 쓰지 않는다.
    this.feedAdd(this.T.feed.lead, this.hive ? this.T.feed.briefDone : this.T.feed.allPassed, 'sys');
    this.toast(this.hive ? this.T.feed.briefDoneToast : this.T.feed.allPassedToast);
    this.AGENTS.forEach((a, i) => {
      if (this.M[a.id].mode !== 'seated') this.seatInstant(a.id);
      const spot = this.BRIEF_SPOTS[i];
      const pts = this.pathToBriefing(a, spot);
      this.M[a.id].awayPath = pts;
      this.walk(a.id, pts, () => this.M[a.id].node.classList.add('talking'));
    });
  }

  getRenderVals(): RenderVals {
    const st = this.st;
    const sc = this.SCENARIO[Math.min(st.stage, this.SCENARIO.length - 1)];
    const gates: GateVals[] = this.GATES.map((name, i) => {
      const L = this.T.gate;
      let cls = 'pending', label = L.waiting, pct = 0;
      const b = this.externalMode && !this.idle ? this.boards?.[i] : undefined;
      if (this.idle) { /* 브리핑 전 — 모든 게이트 대기 */ }
      else if (b) {
        // hive 집계 — 단계마다 따로: 진행 > 결재 대기 > 완료 > 대기, 작업 없는 단계는 '해당 없음'
        pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
        if (!b.total) label = L.none;
        else if (b.active) { cls = 'active'; label = L.activeOf(b.done, b.total); }
        else if (b.awaiting) { cls = 'awaiting'; label = L.awaitingN(b.awaiting); pct = 100; }
        else if (b.done + b.closed === b.total) { cls = 'done'; label = b.closed ? L.doneOf(b.done, b.total) : L.done; }
        else label = L.waitingOf(b.done, b.total);
      }
      else if (i < st.stage) { cls = 'done'; label = L.done; pct = 100; }
      else if (i === st.stage && st.phase === 'meeting') { cls = 'active'; label = L.kickoff; pct = 0; }
      else if (i === st.stage && st.phase === 'returning') { cls = 'active'; label = L.returning; pct = 0; }
      else if (i === st.stage && st.phase === 'working') { cls = 'active'; label = L.progress(Math.round(st.progress * 100)); pct = Math.round(st.progress * 100); }
      else if (i === st.stage && st.phase === 'awaiting') { cls = 'awaiting'; label = L.awaiting; pct = 100; }
      else if (st.phase === 'done-all') { cls = 'done'; label = L.done; pct = 100; }
      return {
        num: 'G' + (i + 1), name, label, pct: pct + '%',
        bg: cls === 'active' ? '#DFF2E6' : cls === 'awaiting' ? '#FBEED6' : 'transparent',
        fg: cls === 'active' ? '#1F6B3A' : cls === 'awaiting' ? '#A96F15' : cls === 'done' ? '#2D8C4E' : '#8B877B',
        barColor: cls === 'awaiting' ? '#E8A33D' : '#2D8C4E',
        opacity: cls === 'pending' ? 0.55 : 1,
        anim: cls === 'awaiting' ? 'apex-pulse 1.4s ease-in-out infinite' : 'none',
        showMini: cls === 'awaiting',
        showLink: i > 0,
        linkColor: this.boards && this.externalMode ? '#DDD6C8' : (i <= st.stage && !this.idle ? '#2D8C4E' : '#DDD6C8'),
      };
    });
    return {
      teamLabel: this.lang === 'ko' ? (this.opts.teamLabel ?? this.T.team) : this.T.team,
      clock: this.clockStr(),
      playLabel: st.phase === 'done-all' && !this.externalMode ? this.T.play : (st.playing ? this.T.pause : this.T.play),
      speedLabel: this.T.speed(st.speed),
      auto: st.auto,
      gates,
      showApprovalCard: st.phase === 'awaiting' && !(this.hive && this.hive.pending.length === 0 && !this.question),
      approvalDesc: this.hive ? this.T.approvalHive : this.T.approvalDemo(`G${st.stage + 1} ${this.GATES[Math.min(st.stage, 5)]}`),
      approvalFile: this.hive ? (this.hive.pending[0]?.payload?.output?.split('/').pop() ?? '') : sc.artifact.file,
      approvalScore: this.hive ? (this.hive.pending[0]?.payload?.gate ?? '') : this.T.feed.points(sc.artifact.score),
      feed: this.feed,
      feedEmpty: this.feed.length === 0,
      artifacts: this.artifacts,
      artifactsEmpty: this.artifacts.length === 0,
      toastMsg: this.toastMsg,
      toastOpacity: this.toastShow ? 1 : 0,
      toastTransform: this.toastShow ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
    };
  }
}
