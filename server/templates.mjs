// 브리핑 템플릿 — 자주 쓰는 브리핑 4요소(과제명·결과·맥락·제약)를 골라 입력창에 채운다.
//
//   기본   아래 DEFAULTS 6개(한·영 두 벌). 와일리(디지털 에이전시) 업무 — RFP 검토, 제안서, 주간 보고, 회의록, 벤치마킹, 화면설계.
//          결과 줄은 '끝나면 손에 쥘 것'을 구체적으로 적고, [대괄호] 부분은 쓰는 사람이 고친다. 지울 수 없다.
//   사용자 hive/templates.json(TPL-0001…, 최대 30개). 입력창의 [템플릿으로 저장]으로 만들고 템플릿 탭에서 지운다.
//          쓴 언어 그대로 돌려준다(번역하지 않는다).
// 화면은 채우기만 하고, 보내기는 사람이 누른다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';
import * as hive from './hive.mjs';
import { OWNER } from './roster.mjs';

const FILE = path.join(HIVE_DIR, 'templates.json');
export const MAX_TEMPLATES = 30;
const LIMIT = { title: 80, result: 2000, context: 6000, constraint: 300, constraints: 20 };

const DEFAULTS = [
  {
    id: 'rfp-review',
    ko: {
      title: '[고객사] RFP 검토·Go/No-Go',
      result: 'RFP 요약 1쪽과 Go/No-Go 권고서(마크다운) — 핵심 요구·예산·일정·평가 배점 표, 5축(적합성·승산·수익성·리스크·전략가치) 판단과 근거, 발주처에 질의할 것 목록',
      context: 'RFP 원문은 파일·폴더로 첨부한다. 발주처: [고객사] · 사업명: [사업명] · 제출 마감: [YYYY-MM-DD]. 우리 강점(유사 구축 경험)과 투입 가능한 인력 상황을 적으면 판단이 정확해진다.',
      constraints: ['RFP 에 없는 예산·일정은 지어내지 않고 "확인 필요"로 표시', '외부 발송 금지 — 내부 검토용', 'Go/No-Go 최종 결정은 재하가 한다(권고까지만)'],
    },
    en: {
      title: '[Client] RFP review · Go/No-Go',
      result: 'A one-page RFP summary and a Go/No-Go recommendation (markdown) — table of key requirements, budget, schedule and scoring; a 5-axis call (fit, win odds, margin, risk, strategic value) with evidence; questions to ask the client',
      context: 'Attach the RFP as files or a folder. Client: [Client] · Project: [Project] · Due: [YYYY-MM-DD]. Note our strengths (similar builds) and who is available — it sharpens the call.',
      constraints: ['Do not invent budget or dates missing from the RFP — mark them "to confirm"', 'No external sending — internal review only', 'Jaeha makes the final Go/No-Go call (recommend only)'],
    },
  },
  {
    id: 'proposal-draft',
    // 결과 줄에 '제안서'가 있으면 서버가 표준 제안 프로세스(server/proposal.mjs)로 나눈다. steps 는 화면 안내용.
    ko: {
      title: '[고객사] [사업명] 제안서 — 전체 프로세스',
      result: '제안서 초안 묶음(마크다운) — 조사, RFP 요구·평가 대응표와 Go/No-Go, 전략·목차, UX·디자인 섹션, KPI, 장표 구성안·근거표, 본문, 검수 보고서',
      context: 'RFP 원문·과업지시서는 파일·폴더로 첨부한다. 발주처: [고객사] · 사업명: [사업명] · 대상 서비스: [웹/앱/플랫폼] · 제출 마감: [YYYY-MM-DD] · 발표 시간: [분]. 강조할 레퍼런스: [유사 사업]. 투입 가능한 인력 상황을 적으면 Go/No-Go 판단이 정확해진다.',
      constraints: ['Go/No-Go 는 재하가 승인한 뒤 다음 단계로 넘어감', '견적 금액·투입 M/M 은 범위로만(확정은 승인 필요)', '근거 없는 효과 수치·상투어 금지, 확인 못 한 값은 "미확인"', '외부 발송 금지 — 내부 검토용'],
      steps: ['① 조사 — 김영업', '② RFP 분석·Go/No-Go — 한도전 (재하 승인)', '③ 전략·스토리·목차 — 한도전', '④ UX·디자인 섹션 — 차도안 (화면·서비스 과제일 때)', '⑤ KPI 설계 — 고지표 (성과·지표 언급 시)', '⑥ 장표 구성안·근거표 — 한도전', '⑦ 본문 — 한도전', '⑧ 검수 — 고지표'],
    },
    en: {
      title: '[Client] [Project] proposal — full process',
      result: 'A proposal draft set (markdown) — research, RFP requirement-scoring matrix and Go/No-Go, strategy and outline, UX/design section, KPIs, slide plan and evidence table, body, review report',
      context: 'Attach the RFP and statement of work as files or a folder. Client: [client] · Project: [project] · Service: [web/app/platform] · Due: [YYYY-MM-DD] · Pitch length: [minutes]. References to stress: [similar projects]. Note who is available to staff it for a sharper Go/No-Go.',
      constraints: ['Moves past Go/No-Go only after Jaeha approves', 'Price and man-months as ranges only (committing numbers needs approval)', 'No unsupported effect numbers or clichés; unverified values marked "unverified"', 'No external sending — internal review only'],
      steps: ['① Research — Kim Youngeop', '② RFP analysis · Go/No-Go — Han Dojeon (Jaeha approves)', '③ Strategy · story · outline — Han Dojeon', '④ UX/design section — Cha Doan (screen or service projects)', '⑤ KPI design — Go Jipyo (when results or metrics are mentioned)', '⑥ Slide plan · evidence table — Han Dojeon', '⑦ Body — Han Dojeon', '⑧ Review — Go Jipyo'],
    },
  },
  {
    id: 'weekly-report',
    ko: {
      title: '주간 보고 — [본부/프로젝트]',
      result: '주간 현황 보고 1쪽(마크다운) — 이번 주 한 일, 다음 주 할 일, 이슈·리스크와 대응, 결정이 필요한 것 3개 이내',
      context: '이번 주 회의록·작업 메모·일정표를 첨부하거나 붙여 넣는다. 보고 대상: [본부장/고객 PM].',
      constraints: ['1쪽 이내', '자료에 없는 진척률·수치는 쓰지 않는다', '작업은 2건 이내로 나눌 것'],
    },
    en: {
      title: 'Weekly report — [division/project]',
      result: 'A one-page weekly status (markdown) — done this week, next week, issues and risks with responses, at most three decisions needed',
      context: 'Attach or paste this week\'s minutes, work notes and schedule. Audience: [division head / client PM].',
      constraints: ['One page at most', 'No progress figures that are not in the material', 'Split into at most 2 tasks'],
    },
  },
  {
    id: 'meeting-minutes',
    ko: {
      title: '[회의명] 회의록 정리',
      result: '회의록(마크다운) — 참석자, 안건별 논의 요약, 결정 사항, 담당·기한이 붙은 액션 아이템 표, 미결 사항',
      context: '녹취 텍스트나 메모를 맥락에 붙여 넣는다. 회의 일시: [YYYY-MM-DD HH:MM] · 참석: [이름].',
      constraints: ['발언을 지어내지 않는다 — 불분명한 부분은 "확인 필요"', '고객사 내부 정보는 외부 공유 금지', '작업은 1건으로'],
    },
    en: {
      title: '[Meeting] minutes',
      result: 'Meeting minutes (markdown) — attendees, discussion summary per agenda item, decisions, an action-item table with owners and due dates, open items',
      context: 'Paste the transcript or notes into the context. Date: [YYYY-MM-DD HH:MM] · Attendees: [names].',
      constraints: ['Never invent statements — mark unclear parts "to confirm"', 'No external sharing of client-internal information', 'One task only'],
    },
  },
  {
    id: 'competitor-benchmark',
    ko: {
      title: '[서비스 분야] 경쟁 서비스 벤치마킹',
      result: '경쟁·대체 서비스 5곳 비교 매트릭스(마크다운 표)와 시사점 — 기능·UX 흐름·콘텐츠·차별 포인트 비교, 우리 제안에 쓸 개선 기회 5개',
      context: '대상 고객: [고객사] · 분야: [예: 모바일 뱅킹 / 커머스 앱]. 꼭 볼 서비스: [서비스명]. 비교 관점: [예: 가입·인증 흐름, 홈 개인화]. 화면 캡처·공개 자료가 있으면 첨부한다.',
      constraints: ['확인하지 못한 기능은 "미확인"으로 표시(추정 금지)', '근거(첨부 화면·공개 자료)를 함께 적기', '비교 대상은 5곳 이내'],
    },
    en: {
      title: '[Service area] competitor benchmark',
      result: 'A comparison matrix of five competing or substitute services (markdown table) with implications — features, UX flow, content and differentiators; five improvement opportunities for our proposal',
      context: 'Client: [Client] · Area: [e.g. mobile banking / commerce app]. Must-see services: [names]. Angles: [e.g. sign-up and auth flow, home personalisation]. Attach screenshots or public material if you have them.',
      constraints: ['Mark features you could not verify as "unverified" (no guessing)', 'Cite the evidence (attached screens, public material)', 'At most five services'],
    },
  },
  {
    id: 'wireframe-draft',
    // 결과 줄에 '화면설계'가 있고 기획 에이전트 패키지가 설정돼 있으면 서버가 표준 기획 프로세스(server/planning.mjs)로 나눈다.
    ko: {
      title: '[서비스명] 화면설계 — 기획 에이전트 프로세스',
      result: '2단 화면설계서(좌 화면 · 우 사양) 핵심 화면 최대 6개와 요구 원장·작업가이드·IA·리뷰·추적 매트릭스',
      context: '팩: [영문-소문자-팩id — 기존 팩이면 이어서, 없으면 새로 만듦]\n요구사항 정의서나 RFP 기능 목록을 첨부한다. 주요 사용자: [역할] · 채널: [앱/웹] · 핵심 과업: [예: 비대면 계좌 개설].',
      constraints: ['작업가이드·규칙·IA 는 재하가 승인(가이드확정)한 뒤 화면 생성', '요구사항에 없는 기능은 "제안"으로 구분', '실기관·실인물 이름은 쓰지 않음(익명화)'],
      steps: ['① 요구 원장·미확정 — 정우선', '② 작업가이드·규칙·IA — 나기획 (재하 승인: 가이드확정)', '③ 2단 화면설계서 — 나기획·표준수 (서버가 뼈대 생성, 린트·verify 게이트)', '④ 리뷰 — 고지표', '⑤ 추적 매트릭스·3키 인계 — 정우선 (재하 승인: 컨펌)'],
    },
    en: {
      title: '[Service] screen spec — planning-agent process',
      result: 'Two-pane screen specs (left screen · right spec) for up to six key screens, plus requirements ledger, work guide, IA, review and trace matrix',
      context: 'Pack: [lowercase-pack-id — continues an existing pack or creates one]\nAttach the requirements spec or the RFP feature list. Main users: [roles] · Channel: [app/web] · Key job: [e.g. opening an account online].',
      constraints: ['Screens are generated only after Jaeha approves the work guide, rules and IA', 'Mark features not in the requirements as "proposal"', 'No real organization or person names (anonymized)'],
      steps: ['① Requirements ledger · open items — Jeong Useon', '② Work guide · rules · IA — Na Gihoek (Jaeha approves the guide)', '③ Two-pane specs — Na Gihoek · Pyo Junsu (server scaffolds; lint/verify gate)', '④ Review — Go Jipyo', '⑤ Trace matrix · three-key handoff — Jeong Useon (Jaeha confirms)'],
    },
  },
];

const BUILTIN_IDS = new Set(DEFAULTS.map((d) => d.id));

/** 기본 템플릿(현재 언어). */
export function builtinTemplates(lang = 'ko') {
  const l = lang === 'en' ? 'en' : 'ko';
  return DEFAULTS.map((d) => ({ id: d.id, builtin: true, ...d[l], constraints: [...d[l].constraints] }));
}

let tail = Promise.resolve();
const lock = (fn) => { const run = tail.then(fn); tail = run.catch(() => {}); return run; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load() {
  try {
    const d = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return { seq: Number(d.seq) || 0, templates: Array.isArray(d.templates) ? d.templates : [] };
  } catch {
    return { seq: 0, templates: [] };
  }
}

async function save(d) {
  await fs.mkdir(HIVE_DIR, { recursive: true });
  await fs.writeFile(FILE + '.tmp', JSON.stringify(d, null, 2), 'utf8');
  // Windows 는 백신·동기화 프로그램이 파일을 잠깐 잡으면 rename 이 실패하므로 몇 번 다시 시도한다(hive.mjs 와 같은 이유).
  for (let i = 0; ; i++) {
    try { await fs.rename(FILE + '.tmp', FILE); return; } catch (e) {
      if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await sleep(40 * (i + 1));
    }
  }
}

/** 화면에서 받은 값을 검사·정리한다. 과제명·결과는 필수(결과 줄이 없으면 팀장이 나누지 않는다). */
export function cleanTemplate(input) {
  const title = String(input?.title || '').trim().slice(0, LIMIT.title);
  if (!title) return { error: '템플릿 이름(과제명)이 필요합니다.' };
  const result = String(input?.result || '').trim().slice(0, LIMIT.result);
  if (!result) return { error: '결과(끝나면 손에 쥘 것)가 필요합니다.' };
  const context = String(input?.context || '').trim().slice(0, LIMIT.context);
  const raw = Array.isArray(input?.constraints) ? input.constraints : String(input?.constraints || '').split('\n');
  const constraints = raw.map((s) => String(s || '').trim().slice(0, LIMIT.constraint)).filter(Boolean).slice(0, LIMIT.constraints);
  return { title, result, context, constraints };
}

/** 기본 + 사용자 템플릿. 사용자 것은 최근에 만든 것부터. */
export async function listTemplates(lang = 'ko') {
  const d = await load();
  const mine = d.templates.slice().reverse().map((x) => ({ ...x, builtin: false }));
  return [...builtinTemplates(lang), ...mine];
}

export async function addTemplate(input, by = OWNER.id) {
  const c = cleanTemplate(input);
  if (c.error) throw new Error(c.error);
  const t = await lock(async () => {
    const d = await load();
    if (d.templates.length >= MAX_TEMPLATES) throw new Error(`템플릿은 최대 ${MAX_TEMPLATES}개까지 저장합니다. 안 쓰는 것을 지운 뒤 다시 저장하세요.`);
    d.seq += 1;
    const item = { id: `TPL-${String(d.seq).padStart(4, '0')}`, ...c, by: String(by || OWNER.id).slice(0, 40), created: hive.nowIso() };
    d.templates.push(item);
    await save(d);
    return item;
  });
  await hive.appendEvent({ kind: 'template', action: 'add', id: t.id, title: t.title, by: t.by });
  return { ...t, builtin: false };
}

/** 사용자 템플릿만 지운다. 기본 템플릿은 400, 없는 id 는 404(status 로 구분). */
export async function removeTemplate(id, by = OWNER.id) {
  if (BUILTIN_IDS.has(id)) throw Object.assign(new Error('기본 템플릿은 지울 수 없습니다.'), { status: 400 });
  const t = await lock(async () => {
    const d = await load();
    const found = d.templates.find((x) => x.id === id);
    if (!found) throw Object.assign(new Error(`템플릿 ${id} 없음`), { status: 404 });
    d.templates = d.templates.filter((x) => x.id !== id);
    await save(d);
    return found;
  });
  await hive.appendEvent({ kind: 'template', action: 'remove', id: t.id, title: t.title, by });
  return t;
}
