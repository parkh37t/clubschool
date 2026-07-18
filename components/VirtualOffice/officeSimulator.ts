/* APEX 가상 사무실 — 명령형 SVG 씬 빌더 + 이동 엔진 + 게이트 시뮬레이터.
 * 디자인 핸드오프(APEX Virtual Office.dc.html)의 class Component를 프레임워크 비의존
 * 순수 TS 클래스로 포팅. React는 VirtualOfficeView가 함수형 래퍼로 감싼다.
 * 좌표/색상은 hi-fi 원본 그대로 보존. onRender 콜백으로 React 재렌더를 유발한다. */

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
}

interface DeptDef { label: string; c: string; }
interface AgentDef {
  id: string; name: string; role: string; dept: string;
  hair: string; skin: string; hairStyle: string; acc: string | null;
}
interface CharOpts {
  skin?: string; hair?: string; shirt?: string;
  hairStyle?: string; acc?: string | null; charId?: string;
}
interface Worker { id: string; task: string; }
interface Stage { dur: number; workers: Worker[]; artifact: { file: string; score: number }; }
interface Spot { x: number; y: number; top?: number; }
interface Wander { phase: 'go' | 'linger' | 'back'; t: number; }
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

  private M: Record<string, MoveState> = {};
  private doors: Door[] = [];
  private st: St;
  private meetNeed = 0;
  private meetArr = 0;
  private wanderClk = 0;
  private wanderNext = 6;

  private feed: FeedItem[] = [];
  private artifacts: ArtifactItem[] = [];
  private toastMsg = '';
  private toastShow = false;

  private bossDoc: SVGGElement | null = null;
  private walkLayer!: SVGGElement;

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
    this.ZONES = { sales: { x: 20, y: 20 }, plan: { x: 300, y: 20 }, design: { x: 20, y: 250 }, pub: { x: 300, y: 250 }, dev: { x: 20, y: 480 }, dm: { x: 300, y: 480 } };
    this.GATES = ['영업/평가', '기획', '디자인', '구현', '검증/배포', '그로스'];
    this.SCENARIO = [
      { dur: 9000, workers: [{ id: 'han', task: 'RFP 5축 평가' }, { id: 'kim', task: '고객 요구 정리' }], artifact: { file: '수주평가서.md', score: 92 } },
      { dur: 10000, workers: [{ id: 'jeong', task: 'PRD 초안 작성' }, { id: 'na', task: 'IA 플로우 설계' }], artifact: { file: 'PRD_v1.md', score: 88 } },
      { dur: 10000, workers: [{ id: 'cha', task: '메인 UI 시안' }, { id: 'oh', task: '브랜드 무드보드' }], artifact: { file: 'UI시안_v1.fig', score: 90 } },
      { dur: 13000, workers: [{ id: 'pyo', task: '마크업 셋업' }, { id: 'lee', task: '인터랙션 구현' }, { id: 'baek', task: 'API 개발' }, { id: 'gu', task: '화면 개발' }], artifact: { file: 'mvp_build_v0.1', score: 86 } },
      { dur: 8000, workers: [{ id: 'go', task: 'QA·지표 검증' }], artifact: { file: 'QA리포트.md', score: 91 } },
      { dur: 8000, workers: [{ id: 'hong', task: '런칭 캠페인' }], artifact: { file: '캠페인플랜.md', score: 89 } },
    ];
    this.MEET_SPOTS = [{ x: 157, y: 735, top: 1 }, { x: 177, y: 796 }, { x: 237, y: 735, top: 1 }, { x: 257, y: 796 }, { x: 317, y: 735, top: 1 }, { x: 297, y: 796 }];
    this.LOUNGE_SPOTS = [{ x: 698, y: 306 }, { x: 626, y: 324 }, { x: 604, y: 331 }, { x: 622, y: 331 }, { x: 652, y: 376 }, { x: 700, y: 392 }];
    this.BRIEF_SPOTS = Array.from({ length: 12 }, (_, i) => i < 6 ? { x: 508 + i * 33, y: 800 } : { x: 508 + (i - 6) * 33, y: 826 });
    this.st = { stage: 0, phase: 'working', progress: 0, speed: opts.initialSpeed ?? 1, playing: true, auto: opts.autoApprove ?? false, clockMin: 540, day: 1, autoWait: 0, meetWait: 0 };

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
    el('rect', { x: 0, y: 0, width: 760, height: 880, fill: 'url(#tile)' });
    el('rect', { x: 4, y: 4, width: 752, height: 872, fill: 'none', stroke: '#141827', 'stroke-width': 4, rx: 8 });
    this.buildCorridors();
    for (const key in this.ZONES) {
      const z = this.ZONES[key], d = this.DEPT[key];
      el('rect', { x: z.x, y: z.y, width: 236, height: 182, fill: 'url(#wood)', stroke: '#6E4A2E', 'stroke-width': 2 });
      el('rect', { x: z.x, y: z.y, width: 236, height: 18, fill: '#4A3628' });
      el('rect', { x: z.x, y: z.y + 18, width: 236, height: 2, fill: 'rgba(0,0,0,.25)' });
      this.buildShelf(z.x + 152, z.y + 3);
      const chipW = key === 'dm' ? 104 : d.label.length * 12 + 28;
      el('rect', { x: z.x + 8, y: z.y + 3, width: chipW, height: 13, rx: 3, fill: '#2A2218' });
      el('rect', { x: z.x + 13, y: z.y + 6, width: 7, height: 7, fill: d.c });
      el('text', { x: z.x + 24, y: z.y + 13, class: 'zlabel', fill: '#F0E8D8', text: d.label });
      el('rect', { x: z.x + 14, y: z.y + 146, width: 20, height: 26, rx: 2, fill: '#6B7288' });
      el('rect', { x: z.x + 14, y: z.y + 146, width: 20, height: 3, fill: '#7C849A' });
      el('path', { d: `M${z.x + 18} ${z.y + 155}h12M${z.x + 18} ${z.y + 164}h12`, stroke: '#4E5670', 'stroke-width': 2 });
      this.buildPlant(z.x + 202, z.y + 150);
    }
    this.AGENTS.forEach((a, i) => {
      const z = this.ZONES[a.dept];
      const slot = this.AGENTS.filter(x => x.dept === a.dept).indexOf(a);
      this.buildDesk(a, z.x + (slot === 0 ? 40 : 140), z.y + 72, i);
    });
    this.buildBossRoom(); this.buildLounge(); this.buildServerRoom();
    this.buildMeetingRoom(); this.buildBriefingRoom(); this.buildDoors();
    this.walkLayer = el('g', { id: 'walkLayer' }) as SVGGElement;
  }

  private buildCorridors(): void {
    const el = this.el.bind(this);
    const strip = (x: number, y: number, w: number, h: number) => el('rect', { x, y, width: w, height: h, fill: 'url(#stone)' });
    strip(256, 20, 44, 840); strip(536, 20, 44, 690);
    strip(20, 202, 720, 48); strip(20, 432, 720, 48); strip(20, 662, 720, 48);
    strip(460, 710, 40, 150);
    this.buildPlant(259, 84); this.buildPlant(543, 300); this.buildPlant(259, 560);
  }

  private buildDesk(a: AgentDef, x: number, y: number, idx: number): void {
    const el = this.el.bind(this);
    const g = el('g', { class: 'desk-sprite', id: 'sp-' + a.id, transform: `translate(${x},${y})` }) as SVGGElement;
    el('rect', { x: 12, y: 6, width: 32, height: 24, rx: 3, fill: '#3A3F52' }, g);
    el('rect', { x: 12, y: 6, width: 32, height: 3, rx: 1.5, fill: '#4A5068' }, g);
    const av = el('g', { class: 'avatar' }, g) as SVGGElement;
    const ch = this.buildChar(av, 18, 0, { ...a, shirt: this.DEPT[a.dept].c, charId: a.id }, idx);
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
    this.M[a.id] = { mode: 'seated', node: ch, av, seatAbs: { x: x + 18, y: y }, pos: { x: x + 18, y: y }, path: [], cb: null, awayPath: null, wander: null, spd: 0.88 + (idx % 5) * 0.06, face: 1 };
  }

  private buildBossRoom(): void {
    const el = this.el.bind(this);
    el('rect', { x: 580, y: 20, width: 160, height: 182, fill: '#4E7CA6', stroke: '#33506E', 'stroke-width': 2 });
    el('rect', { x: 580, y: 20, width: 160, height: 18, fill: '#2F3A50' });
    el('rect', { x: 580, y: 38, width: 160, height: 2, fill: 'rgba(0,0,0,.25)' });
    el('text', { x: 590, y: 33, class: 'roomlabel', text: '사장실 · 결재' });
    el('rect', { x: 694, y: 23, width: 32, height: 13, fill: '#E8A33D' });
    el('rect', { x: 697, y: 25, width: 26, height: 9, fill: '#2D8C4E' });
    el('rect', { x: 596, y: 52, width: 128, height: 104, rx: 4, fill: '#5D8CB5' });
    el('rect', { x: 644, y: 56, width: 32, height: 22, rx: 3, fill: '#2E3440' });
    this.buildChar(null, 650, 60, { hair: '#4A4B52', hairStyle: 'short', shirt: '#37413A', skin: '#EAC49C' }, 3);
    el('rect', { x: 612, y: 94, width: 96, height: 13, fill: '#8A5A34' });
    el('rect', { x: 612, y: 107, width: 96, height: 7, fill: '#5E3D22' });
    el('rect', { x: 620, y: 97, width: 14, height: 9, fill: '#FFFFFF', stroke: '#B9AF97' });
    el('path', { d: 'M622 100h10M622 103h7', stroke: '#B9AF97', 'stroke-width': 1, fill: 'none' });
    const doc = el('g', { id: 'bossDoc', class: 'bossdoc', visibility: 'hidden' }) as SVGGElement;
    el('rect', { x: 676, y: 96, width: 20, height: 14, fill: '#FFFFFF', stroke: '#E8A33D', 'stroke-width': 2 }, doc);
    el('path', { d: 'M679 100h14M679 104h10', stroke: '#E8A33D', 'stroke-width': 1.4, fill: 'none' }, doc);
    el('circle', { cx: 692, cy: 107, r: 2.4, fill: '#D0684A' }, doc);
    el('rect', { x: 630, y: 126, width: 14, height: 10, rx: 2, fill: '#3A3F52' });
    el('rect', { x: 674, y: 126, width: 14, height: 10, rx: 2, fill: '#3A3F52' });
    el('text', { x: 660, y: 172, class: 'nrole', 'text-anchor': 'middle', text: '게이트 최종 승인' });
    doc.addEventListener('click', () => { if (this.st.phase === 'awaiting') this.approve(false); });
    this.bossDoc = doc;
  }

  private buildLounge(): void {
    const el = this.el.bind(this);
    el('rect', { x: 580, y: 250, width: 160, height: 182, fill: '#BFB9A8', stroke: '#8F897A', 'stroke-width': 2 });
    el('rect', { x: 580, y: 250, width: 160, height: 18, fill: '#4A4438' });
    el('rect', { x: 580, y: 268, width: 160, height: 2, fill: 'rgba(0,0,0,.2)' });
    el('text', { x: 590, y: 263, class: 'roomlabel', text: '라운지' });
    el('circle', { cx: 716, cy: 259, r: 6.5, fill: '#F4EEE0', stroke: '#141824', 'stroke-width': 1.5 });
    el('path', { d: 'M716 259v-4M716 259l3 2', stroke: '#141824', 'stroke-width': 1.4, fill: 'none' });
    el('rect', { x: 588, y: 278, width: 26, height: 44, rx: 2, fill: '#2E3440' });
    el('rect', { x: 591, y: 282, width: 20, height: 22, fill: '#1A1E2A' });
    ([['#D0684A', 0, 0], ['#2D8C4E', 7, 0], ['#E8A33D', 14, 0], ['#4A7DBF', 0, 8], ['#B75FA2', 7, 8], ['#7FE3A6', 14, 8]] as [string, number, number][])
      .forEach(it => el('rect', { x: 593 + it[1], y: 285 + it[2], width: 5, height: 5, fill: it[0] }));
    el('rect', { x: 591, y: 308, width: 20, height: 5, fill: '#141824' });
    el('rect', { x: 624, y: 286, width: 9, height: 8, fill: '#7FB8E8' });
    el('rect', { x: 622, y: 294, width: 13, height: 26, rx: 2, fill: '#D8D2C4' });
    el('rect', { x: 626, y: 300, width: 5, height: 3, fill: '#4E5670' });
    el('rect', { x: 682, y: 284, width: 44, height: 14, fill: '#8A5A34' });
    el('rect', { x: 682, y: 298, width: 44, height: 4, fill: '#5E3D22' });
    el('rect', { x: 688, y: 272, width: 14, height: 12, rx: 1, fill: '#2E3440' });
    el('rect', { x: 691, y: 281, width: 5, height: 3, fill: '#F4EEE0' });
    el('path', { d: 'M710 280c-2-3 2-4 0-7', stroke: '#B9C2D8', 'stroke-width': 1.4, fill: 'none', class: 'steam' });
    el('rect', { x: 588, y: 346, width: 6, height: 20, rx: 2, fill: '#8A3A30' });
    el('rect', { x: 640, y: 346, width: 6, height: 20, rx: 2, fill: '#8A3A30' });
    el('rect', { x: 592, y: 342, width: 50, height: 10, rx: 3, fill: '#A34A3E' });
    el('rect', { x: 592, y: 352, width: 50, height: 12, fill: '#B85548' });
    el('rect', { x: 592, y: 362, width: 50, height: 4, fill: '#8A3A30' });
    el('circle', { cx: 690, cy: 376, r: 16, fill: '#8A5A34' });
    el('circle', { cx: 690, cy: 376, r: 12, fill: '#A0713F' });
    el('circle', { cx: 664, cy: 396, r: 5, fill: '#3A3F52' });
    el('circle', { cx: 714, cy: 354, r: 5, fill: '#3A3F52' });
    el('rect', { x: 684, y: 371, width: 9, height: 7, fill: '#F4EEE0' });
    this.buildPlant(712, 404);
  }

  private buildServerRoom(): void {
    const el = this.el.bind(this);
    el('rect', { x: 580, y: 480, width: 160, height: 182, fill: '#20242F', stroke: '#12151E', 'stroke-width': 2 });
    el('text', { x: 590, y: 502, class: 'roomlabel', text: '서버룸 · 실행 계층' });
    [596, 646, 696].forEach((rx, r) => {
      el('rect', { x: rx, y: 514, width: 40, height: 60, rx: 2, fill: '#2E3440' });
      for (let j = 0; j < 4; j++) {
        el('rect', { x: rx + 4, y: 520 + j * 13, width: 32, height: 10, rx: 1, fill: '#1A1E2A' });
        el('circle', { cx: rx + 9, cy: 525 + j * 13, r: 2.2, fill: '#7FE3A6', class: 'led', style: 'animation-delay:' + ((r + j) * 0.31) + 's' });
        el('circle', { cx: rx + 15, cy: 525 + j * 13, r: 2.2, fill: '#E8A33D', class: 'led', style: 'animation-delay:' + ((r + j) * 0.47 + 0.2) + 's' });
        el('path', { d: `M${rx + 20} ${525 + j * 13}h12`, stroke: '#3A4152', 'stroke-width': 2 });
      }
    });
    el('rect', { x: 612, y: 606, width: 96, height: 18, rx: 2, fill: '#2E3440' });
    el('rect', { x: 616, y: 610, width: 40, height: 10, fill: '#1A1E2A' });
    el('path', { d: 'M619 615h8M630 615h6M639 615h10', stroke: '#7FE3A6', 'stroke-width': 1.6 });
    el('circle', { cx: 668, cy: 615, r: 2.4, fill: '#7FE3A6', class: 'led' });
    el('circle', { cx: 678, cy: 615, r: 2.4, fill: '#E8A33D', class: 'led', style: 'animation-delay:.5s' });
    el('path', { d: 'M596 640h128', stroke: '#2E3440', 'stroke-width': 3, 'stroke-dasharray': '8 6' });
  }

  private buildMeetingRoom(): void {
    const el = this.el.bind(this);
    el('rect', { x: 20, y: 710, width: 440, height: 150, fill: '#4E7CA6', stroke: '#33506E', 'stroke-width': 2 });
    el('rect', { x: 20, y: 710, width: 440, height: 18, fill: '#2F3A50' });
    el('rect', { x: 20, y: 728, width: 440, height: 2, fill: 'rgba(0,0,0,.25)' });
    el('text', { x: 30, y: 723, class: 'roomlabel', text: '회의실 · 킥오프' });
    this.buildShelf(370, 713);
    el('rect', { x: 36, y: 738, width: 52, height: 30, fill: '#F4EEE0', stroke: '#8F897A', 'stroke-width': 2 });
    el('path', { d: 'M42 746h38M42 752h26M42 758h32', stroke: '#2D8C4E', 'stroke-width': 1.6, fill: 'none' });
    el('rect', { x: 150, y: 766, width: 200, height: 30, fill: '#8A5A34' });
    el('path', { d: 'M150 781H350', stroke: '#7A4E2C', 'stroke-width': 1 });
    el('rect', { x: 150, y: 796, width: 200, height: 6, fill: '#5E3D22' });
    el('rect', { x: 200, y: 772, width: 36, height: 12, fill: '#F4EEE0' });
    el('path', { d: 'M204 776h28M204 780h18', stroke: '#B0AA98', 'stroke-width': 1 });
    el('rect', { x: 262, y: 772, width: 14, height: 10, rx: 1, fill: '#20242F' });
    ([[160, 752], [200, 752], [240, 752], [280, 752], [320, 752]] as [number, number][]).forEach(p => el('rect', { x: p[0], y: p[1], width: 14, height: 10, rx: 2, fill: '#3A3F52' }));
    ([[180, 806], [220, 806], [260, 806], [300, 806]] as [number, number][]).forEach(p => el('rect', { x: p[0], y: p[1], width: 14, height: 10, rx: 2, fill: '#3A3F52' }));
    this.buildPlant(428, 832);
  }

  private buildBriefingRoom(): void {
    const el = this.el.bind(this);
    el('rect', { x: 500, y: 710, width: 240, height: 150, fill: '#262B3E', stroke: '#161A26', 'stroke-width': 2 });
    el('text', { x: 512, y: 730, class: 'roomlabel', text: '브리핑 룸 · 사용자 직통' });
    el('rect', { x: 520, y: 736, width: 180, height: 62, rx: 3, fill: '#141824', stroke: '#2E3440', 'stroke-width': 2 });
    el('rect', { x: 526, y: 742, width: 168, height: 50, fill: '#101420' });
    el('rect', { x: 526, y: 742, width: 168, height: 11, fill: '#0C1016' });
    el('circle', { cx: 535, cy: 747.5, r: 2.6, fill: '#D0684A', class: 'onair' });
    el('text', { x: 542, y: 751, class: 'btask', style: 'fill:#7FE3A6;font-size:8.5px;letter-spacing:.08em', text: 'ON AIR · 사용자 채널' });
    ([[534, 14], [549, 22], [564, 10], [579, 26], [594, 18], [609, 28], [624, 12], [639, 24], [654, 20], [669, 16]] as [number, number][])
      .forEach((p, i) => el('rect', { x: p[0], y: 788 - p[1], width: 8, height: p[1], fill: i === 5 ? '#E8A33D' : '#2D8C4E' }));
    el('path', { d: 'M526 790h168', stroke: '#2E3440', 'stroke-width': 2 });
    el('rect', { x: 560, y: 798, width: 10, height: 5, fill: '#141824' });
    el('rect', { x: 650, y: 798, width: 10, height: 5, fill: '#141824' });
    this.buildPlant(716, 826);
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
    this.buildDoor(138, 202, true); this.buildDoor(418, 202, true);
    this.buildDoor(138, 432, true); this.buildDoor(418, 432, true);
    this.buildDoor(138, 662, true); this.buildDoor(418, 662, true);
    this.buildDoor(580, 111, false); this.buildDoor(580, 341, false); this.buildDoor(580, 571, false);
    this.buildDoor(226, 710, true); this.buildDoor(710, 710, true);
  }

  /* ── 이동 엔진: 복도 웨이포인트 라우팅 ── */
  private zoneMeta(a: AgentDef): { z: Pt; doorX: number; corY: number } {
    const z = this.ZONES[a.dept];
    return { z, doorX: z.x === 20 ? 138 : 418, corY: z.y === 20 ? 226 : z.y === 250 ? 456 : 686 };
  }

  private corridorRoute(ax: number, ay: number, bx: number, by: number): Pt[] {
    if (ay === by) return [{ x: bx, y: by - 16 }];
    const c278 = Math.abs(ax - 278) + Math.abs(bx - 278), c558 = Math.abs(ax - 558) + Math.abs(bx - 558);
    const vx = (c278 <= c558 ? 278 : 558) - 10;
    return [{ x: vx, y: ay - 16 }, { x: vx, y: by - 16 }, { x: bx, y: by - 16 }];
  }

  private exitPts(a: AgentDef): Pt[] {
    const m = this.M[a.id], { z, doorX } = this.zoneMeta(a);
    const slot = (m.seatAbs.x - z.x) < 100 ? 0 : 1;
    const sideX = slot === 0 ? z.x + 104 : z.x + 116;
    return [{ x: sideX, y: m.seatAbs.y }, { x: sideX, y: z.y + 124 }, { x: doorX - 10, y: z.y + 124 }, { x: doorX - 10, y: this.zoneMeta(a).corY - 16 }];
  }

  private pathToMeeting(a: AgentDef, spot: Spot): Pt[] {
    const { doorX, corY } = this.zoneMeta(a);
    const pts: Pt[] = [...this.corridorRoute(doorX - 10, corY, 216, 686), { x: 216, y: 730 }];
    if (spot.top) { pts.push({ x: spot.x, y: 730 }); }
    else { pts.push({ x: 120, y: 730 }, { x: 120, y: 826 }, { x: spot.x, y: 826 }); }
    pts.push({ x: spot.x, y: spot.y });
    return [...this.exitPts(a), ...pts];
  }

  private pathToLounge(a: AgentDef, spot: Spot): Pt[] {
    const { corY } = this.zoneMeta(a);
    return [...this.exitPts(a), { x: 548, y: corY - 16 }, { x: 548, y: 325 }, { x: 592, y: 325 }, { x: spot.x, y: 325 }, { x: spot.x, y: spot.y }];
  }

  private pathToBriefing(a: AgentDef, spot: Spot): Pt[] {
    const { doorX, corY } = this.zoneMeta(a);
    return [...this.exitPts(a), ...this.corridorRoute(doorX - 10, corY, 700, 686), { x: 700, y: 815 }, { x: spot.x, y: 815 }, { x: spot.x, y: spot.y }];
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
    m.node.setAttribute('transform', `translate(${m.pos.x},${m.pos.y})`);
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

  private loungeSocial(): void {
    const ls = Object.keys(this.M).filter(id => this.M[id].wander && this.M[id].wander.phase === 'linger');
    ls.forEach(id => this.M[id].node.classList.toggle('talking', ls.length >= 2));
  }

  private stepWalk(dtms: number): void {
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
      m.node.setAttribute('transform', m.face < 0 ? `translate(${m.pos.x + 20},${m.pos.y}) scale(-1,1)` : `translate(${m.pos.x},${m.pos.y})`);
      if (!m.path.length) {
        m.mode = 'standing';
        m.node.classList.remove('walker');
        const cb = m.cb; m.cb = null;
        if (cb) cb();
      }
    }
    const cs: Pt[] = [];
    for (const id in this.M) { const m = this.M[id]; if (m.mode === 'walking') cs.push({ x: m.pos.x + 10, y: m.pos.y + 16 }); }
    this.doors.forEach(d => {
      const open = cs.some(c => Math.abs(c.x - d.x) < 26 && Math.abs(c.y - d.y) < 30);
      d.g.classList.toggle('open', open);
    });
  }

  /* ── 상태/피드 ── */
  private setAgent(id: string, state: AgentState, task?: string): void {
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
      this.feedAdd('오케스트레이터', `G${st.stage + 1} ${this.GATES[st.stage]} 시작 — 단독 스프린트`, 'sys');
      this.beginWork();
      return;
    }
    st.phase = 'meeting';
    this.meetNeed = sc.workers.length; this.meetArr = 0;
    this.feedAdd('오케스트레이터', `G${st.stage + 1} ${this.GATES[st.stage]} 시작 — 회의실 킥오프 소집`, 'sys');
    sc.workers.forEach((w, i) => {
      const a = this.AGENTS.find(x => x.id === w.id)!;
      const spot = this.MEET_SPOTS[i % this.MEET_SPOTS.length];
      const pts = this.pathToMeeting(a, spot);
      this.M[w.id].awayPath = pts;
      this.walk(w.id, pts, () => {
        this.M[w.id].node.classList.add('talking');
        this.meetArr++;
        if (this.meetArr === this.meetNeed) this.feedAdd('회의실', `킥오프 진행 중 — 역할·산출물 정렬 (${this.meetNeed}명)`, 'gate');
      });
    });
    this.opts.onRender();
  }

  private endMeeting(): void {
    const st = this.st;
    st.phase = 'returning';
    const sc = this.SCENARIO[st.stage];
    this.feedAdd('회의실', '킥오프 종료 — 전원 자리 복귀', 'gate');
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
      this.feedAdd(a.name, `${w.task} 착수`);
    });
    this.opts.onRender();
  }

  private toAwaiting(): void {
    const st = this.st;
    st.phase = 'awaiting'; st.progress = 1; st.autoWait = 0;
    const sc = this.SCENARIO[st.stage];
    sc.workers.forEach(w => this.setAgent(w.id, 'waiting', ''));
    this.feedAdd('게이트', `G${st.stage + 1} 검수 통과 (${sc.artifact.score}점) — 결재 대기`, 'gate');
    this.setBossDoc(true);
    this.opts.onRender();
  }

  private approve(byAuto: boolean): void {
    const st = this.st;
    const sc = this.SCENARIO[st.stage];
    this.setBossDoc(false);
    this.artifacts = [{ g: 'G' + (st.stage + 1), f: sc.artifact.file, s: sc.artifact.score + '점' }, ...this.artifacts];
    this.feedAdd('사장', `G${st.stage + 1} 결재 완료${byAuto ? ' (자동)' : ''}`, 'sys');
    sc.workers.forEach(w => this.setAgent(w.id, 'idle', ''));
    st.stage++;
    if (st.stage >= this.SCENARIO.length) {
      st.phase = 'done-all';
      this.feedAdd('오케스트레이터', '전 게이트 통과 — 브리핑 룸 총회 소집', 'sys');
      this.toast('G6까지 전 게이트 통과 — 파이프라인 완료');
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
    this.toast(`G${st.stage} 결재 완료 — G${st.stage + 1} ${this.GATES[st.stage]} 착수`);
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

  /* ── 유휴 직원 라운지 나들이 ── */
  private maybeWander(dt: number): void {
    const st = this.st;
    if (st.phase !== 'working' && st.phase !== 'awaiting') return;
    for (const id in this.M) {
      const m = this.M[id];
      if (m.wander && m.wander.phase === 'linger') {
        m.wander.t += dt * st.speed;
        if (m.wander.t > 4.5) {
          m.wander.phase = 'back';
          this.walk(id, this.returnPts(id), () => this.seatInstant(id));
          this.loungeSocial();
        }
      }
    }
    this.wanderClk += dt * st.speed;
    if (this.wanderClk < this.wanderNext) return;
    this.wanderClk = 0; this.wanderNext = 6 + Math.random() * 6;
    const busy = new Set(this.SCENARIO[Math.min(st.stage, 5)].workers.map(w => w.id));
    const wandering = Object.keys(this.M).filter(id => this.M[id].wander).length;
    if (wandering >= 3) return;
    const cands = this.AGENTS.filter(a => !busy.has(a.id) && this.M[a.id].mode === 'seated');
    if (!cands.length) return;
    const a = cands[Math.floor(Math.random() * cands.length)];
    const spot = this.LOUNGE_SPOTS[Math.floor(Math.random() * this.LOUNGE_SPOTS.length)];
    const pts = this.pathToLounge(a, spot);
    this.M[a.id].awayPath = pts;
    this.M[a.id].wander = { phase: 'go', t: 0 };
    this.walk(a.id, pts, () => { const m = this.M[a.id]; if (m.wander) { m.wander = { phase: 'linger', t: 0 }; this.loungeSocial(); } });
  }

  private tick(): void {
    const st = this.st;
    const now = Date.now(), dt = (now - this.last) / 1000; this.last = now;
    if (!st.playing) return;
    st.clockMin += dt * st.speed * 4;
    if (st.clockMin >= 1140) { st.day++; st.clockMin = 540; }
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
    this.maybeWander(dt);
    this.opts.onRender();
  }

  /* ── 컨트롤 (React 핸들러가 호출) ── */
  togglePlay(): void {
    if (this.st.phase === 'done-all') { this.reset(); return; }
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

  getRenderVals(): RenderVals {
    const st = this.st;
    const sc = this.SCENARIO[Math.min(st.stage, this.SCENARIO.length - 1)];
    const gates: GateVals[] = this.GATES.map((name, i) => {
      let cls = 'pending', label = '대기', pct = 0;
      if (i < st.stage) { cls = 'done'; label = '완료'; pct = 100; }
      else if (i === st.stage && st.phase === 'meeting') { cls = 'active'; label = '킥오프 회의'; pct = 0; }
      else if (i === st.stage && st.phase === 'returning') { cls = 'active'; label = '자리 복귀'; pct = 0; }
      else if (i === st.stage && st.phase === 'working') { cls = 'active'; label = '진행 중 ' + Math.round(st.progress * 100) + '%'; pct = Math.round(st.progress * 100); }
      else if (i === st.stage && st.phase === 'awaiting') { cls = 'awaiting'; label = '결재 대기'; pct = 100; }
      else if (st.phase === 'done-all') { cls = 'done'; label = '완료'; pct = 100; }
      return {
        num: 'G' + (i + 1), name, label, pct: pct + '%',
        bg: cls === 'active' ? '#DFF2E6' : cls === 'awaiting' ? '#FBEED6' : 'transparent',
        fg: cls === 'active' ? '#1F6B3A' : cls === 'awaiting' ? '#A96F15' : cls === 'done' ? '#2D8C4E' : '#8B877B',
        barColor: cls === 'awaiting' ? '#E8A33D' : '#2D8C4E',
        opacity: cls === 'pending' ? 0.55 : 1,
        anim: cls === 'awaiting' ? 'apex-pulse 1.4s ease-in-out infinite' : 'none',
        showMini: cls === 'awaiting',
        showLink: i > 0,
        linkColor: i <= st.stage ? '#2D8C4E' : '#DDD6C8',
      };
    });
    return {
      teamLabel: this.opts.teamLabel ?? '컨버전스1팀 · 파일럿',
      clock: this.clockStr(),
      playLabel: st.phase === 'done-all' ? '▶ 재생' : (st.playing ? '⏸ 일시정지' : '▶ 재생'),
      speedLabel: `속도 ${st.speed}×`,
      auto: st.auto,
      gates,
      showApprovalCard: st.phase === 'awaiting',
      approvalDesc: `G${st.stage + 1} ${this.GATES[Math.min(st.stage, 5)]} 게이트 검수 통과`,
      approvalFile: sc.artifact.file,
      approvalScore: sc.artifact.score + '점',
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
