// 표준 기획 프로세스(화면설계) — '기획 에이전트 패키지'(설정의 plan_kit_dir)를 AX Office 작업으로 돌린다.
//
//   ① Understand  정우선  요구 원장(요구 id·원문 위치·UI/비UI·수용 조건) + 미확정 목록
//   ② Clarify     나기획  팩의 규칙·작업가이드·IA(메뉴·화면 목록·추적표) — 재하 승인 '가이드확정' → 팩 계층 confirmed
//   ③ Build ×2    나기획·표준수  서버가 화면 뼈대를 만들고(new_screen.py) 두 사람이 나눠 2단 화면설계서를 채운다
//   ④ Review      고지표  린트·verify 결과(서버 실행) + 좌우 정합·근거 리뷰
//   ⑤ Handoff     정우선  추적 매트릭스(요구↔화면ID↔파일명↔개발목록 ID)·3키 확인 — 재하 승인 '컨펌'
//
// 패키지(규격 SKILL·린트·검증·골든·팩 템플릿)는 저장소에 두지 않는다 — 이 PC 의 폴더를 설정에서 가리킨다.
// 역할 에이전트는 명령을 실행하지 못하므로(Bash 금지) 패키지의 파이썬 스크립트는 서버가 정해진 자리에서 돌린다.
// 산출물: 보고서(md)는 평소처럼 과제 폴더에, 화면·SSOT 파일은 패키지의 packs/<팩>/ 에 쌓인다(팩은 브리핑을 넘어 이어진다).

import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { getSettings } from './settings.mjs';
import { absData } from './paths.mjs';

export const MAX_SCREENS = 6; // 브리핑 하나에서 만들 화면 수 상한(빌더 2명 × 3). 나머지는 남은 제한으로 넘긴다
const SCREEN_ID_RE = /^[a-z]+-[a-z]+-[A-Za-z0-9]+(-m)?$/;
const PACK_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const TYPES = ['list', 'detail', 'form', 'popup', 'list-m', 'detail-m'];

const SPEC = 'wylie-plan-spec';
export const PLAN_STEPS = [
  {
    key: 'understand', owner: 'jeong', stage: '02_requirements',
    ko: '기획 ① 요구 원장·미확정 목록', en: 'Planning ① Requirements ledger and open items',
    skills: ['ba-agent|product-strategy', SPEC],
    done: '요구 원장 표(요구 id · 원문 위치 · 요구 내용 · UI/비UI · 수용 조건)와 미확정 목록(결정 필요 질문·가정). 원문에 없는 요구는 만들지 않음',
    doneEn: 'A requirements ledger (req id, source location, requirement, UI/non-UI, acceptance criteria) and an open-items list (decisions needed, assumptions). No requirements beyond the source',
    deps: [],
  },
  {
    key: 'clarify', owner: 'na', stage: '05_plan', kit: 'pack-onboarder', capTokens: 800000,
    ko: '기획 ② 작업가이드·규칙·IA 확정안', en: 'Planning ② Work guide, rules and IA',
    skills: [SPEC, 'ia-flow-design'],
    done: '팩의 규칙.md·작업가이드.md(권한·상태값·정책·용어·메시지 톤)·IA.md(메뉴 트리·화면 목록·요구↔화면ID 추적표)를 채우고, 보고서에 화면 목록 JSON 블록을 남김. 빈칸은 [확인 필요]',
    doneEn: 'Fill the pack\'s rules, work guide (roles, states, policies, terms, message tone) and IA (menu tree, screen list, req↔screen-ID trace), and put the screen-list JSON block in the report. Blanks marked [확인 필요]',
    deps: ['understand'], approval: '가이드확정',
  },
  {
    key: 'build', owner: 'na', stage: '05_plan', kit: 'plan-builder', slice: 0, capTokens: 800000,
    ko: '기획 ③ 2단 화면설계서 생성 (앞쪽 화면)', en: 'Planning ③ Two-pane screen specs (first half)',
    skills: [SPEC],
    done: '맡은 화면의 2단 화면설계서(좌 화면 · 우 사양) — 린트·verify 위반 0, 화면ID = 파일명 = data-screen = h2, 좌우 마커 1:1, 메시지 표 전수',
    doneEn: 'Two-pane specs for the assigned screens — zero lint/verify violations, screen ID = file name = data-screen = h2, markers 1:1 left/right, full message table',
    deps: ['clarify'],
  },
  {
    key: 'build', owner: 'pyo', stage: '05_plan', kit: 'plan-builder', slice: 1, capTokens: 800000,
    ko: '기획 ③ 2단 화면설계서 생성 (뒤쪽 화면)', en: 'Planning ③ Two-pane screen specs (second half)',
    skills: [SPEC],
    done: '맡은 화면의 2단 화면설계서(좌 화면 · 우 사양) — 린트·verify 위반 0, 화면ID = 파일명 = data-screen = h2, 좌우 마커 1:1, 메시지 표 전수',
    doneEn: 'Two-pane specs for the assigned screens — zero lint/verify violations, screen ID = file name = data-screen = h2, markers 1:1 left/right, full message table',
    deps: ['clarify'],
  },
  {
    key: 'review', owner: 'go', stage: '05_plan', kit: 'plan-verifier',
    ko: '기획 ④ 화면설계서 리뷰', en: 'Planning ④ Spec review',
    skills: [SPEC],
    done: '화면별 기계 검사(린트·verify) 결과 요약, 좌우 정합·정책 근거·익명화 리뷰, 고칠 것 목록(화면ID·마커 단위), [확인 필요] 목록. 돌리지 않은 검사는 not_run',
    doneEn: 'Per-screen machine-check summary (lint/verify), left/right consistency, policy basis and anonymization review, a fix list by screen ID and marker, and [확인 필요] items. Unrun checks are not_run',
    deps: ['build'],
  },
  {
    key: 'handoff', owner: 'jeong', stage: '05_plan',
    ko: '기획 ⑤ 추적 매트릭스·3키 인계', en: 'Planning ⑤ Trace matrix and three-key handoff',
    skills: [SPEC],
    done: '추적 매트릭스(요구 id ↔ 화면ID ↔ 파일명 ↔ 개발목록 ID), 커버리지(미연결·비UI 따로), 3키 일치 표, 개발 인계 목록과 남은 미확정',
    doneEn: 'Trace matrix (req id ↔ screen ID ↔ file name ↔ dev-list ID), coverage (unlinked and non-UI counted separately), three-key match table, handoff list and remaining open items',
    deps: ['review'], approval: '컨펌',
  },
];

const RESULT_RE = /화면\s?설계|화면\s?기획|화면\s?정의|스토리보드|와이어프레임|정보\s?구조|\bIA\b|screen\s?spec|wireframe|storyboard/i;

/** 표준 기획 절차를 쓸 브리핑인지. process: 'planning' 이면 항상, 'free' 면 쓰지 않는다. */
export function isPlanningBriefing(b) {
  if (b.process === 'free') return false;
  if (b.process === 'planning') return true;
  return RESULT_RE.test(`${b.title}\n${b.result}`);
}

// ── 패키지 ──

const exists = (p) => fs.access(p).then(() => true, () => false);

/** 설정한 기획 에이전트 패키지 폴더를 확인한다. */
export async function kitStatus(dirArg) {
  const dir = dirArg !== undefined ? String(dirArg || '').trim() : String((await getSettings()).plan_kit_dir || '').trim();
  if (!dir) return { ok: false, dir: '', error: '기획 에이전트 패키지 폴더가 설정되지 않았습니다(설정 → 기획 에이전트).' };
  if (!path.isAbsolute(dir)) return { ok: false, dir, error: '전체 경로를 적어 주세요.' };
  const need = ['scripts/new_screen.py', 'scripts/verify_page.py', 'packs/_template/pack.json', 'core/golden', 'core/template'];
  const missing = [];
  for (const n of need) if (!(await exists(path.join(dir, n)))) missing.push(n);
  if (missing.length) return { ok: false, dir, error: `패키지 폴더가 아닙니다 — 없는 것: ${missing.join(', ')}` };
  return { ok: true, dir };
}

function runPy(kit, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(process.platform === 'win32' ? 'python' : 'python3', args, { cwd: kit, env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }, windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout, stderr, error: e });
      return;
    }
    const timer = setTimeout(() => { try { child.kill(); } catch { /* 이미 끝남 */ } stderr += '\n[timeout]'; }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr, error: e }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, error: null }); });
  });
}

const packDir = (kit, id) => path.join(kit, 'packs', id);

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw); // 메모장 BOM
}

/** 팩이 없으면 packs/_template 을 복사해 만든다. */
async function ensurePack(kit, id, { name = '' } = {}) {
  const dir = packDir(kit, id);
  if (await exists(path.join(dir, 'pack.json'))) return { dir, created: false };
  await fs.cp(path.join(kit, 'packs', '_template'), dir, { recursive: true, force: false, errorOnExist: false });
  const pj = await readJson(path.join(dir, 'pack.json'));
  pj.id = id;
  if (name && !pj.name) pj.name = name;
  await fs.writeFile(path.join(dir, 'pack.json'), JSON.stringify(pj, null, 2) + '\n', 'utf8');
  // 템플릿 nav.config.js 는 안내 주석·자리표시 포털(p1) 때문에 verify(V02)가 해석하지 못한다 — 빈 구조로 다시 쓴다.
  // 포털 이름은 ② 단계가, 메뉴·화면은 new_screen.py 가 채운다.
  await fs.writeFile(path.join(dir, 'nav.config.js'), [
    '/* nav.config.js — GNB·LNB 데이터(core/template/nav.js 가 window.PACK_NAV 로 읽음). screens 는 new_screen.py 가 추가한다. */',
    'window.PACK_NAV = {', '  brand: "",', '  user: "담당자",', '  portals: {', '  }', '};', '',
  ].join('\n'), 'utf8');
  return { dir, created: true };
}

/** 브리핑에서 팩 id 를 읽는다('팩: acme-portal'). 없으면 시각으로 새로 만든다. */
function packIdFrom(b) {
  const m = /(?:팩|pack)\s*[:：]\s*([a-z0-9][a-z0-9-]{1,39})/i.exec(`${b.title}\n${b.result}\n${b.context}\n${(b.constraints || []).join('\n')}`);
  if (m) return m[1].toLowerCase();
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `p${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * 브리핑 → 표준 기획 작업 목록. 기획 브리핑이 아니거나 패키지가 없으면 null(사유는 log).
 */
export async function planningPlan(b, { lang = 'ko', log = () => {} } = {}) {
  if (!isPlanningBriefing(b)) return null;
  const kit = await kitStatus();
  if (!kit.ok) { log(`팀장: 기획 브리핑이지만 표준 기획 프로세스를 쓰지 않음 — ${kit.error}`); return null; }
  const pack = packIdFrom(b);
  if (!PACK_ID_RE.test(pack)) { log(`팀장: 팩 id '${pack}' 가 규칙(영문 소문자·숫자·하이픈)에 맞지 않아 표준 기획 프로세스를 쓰지 않음`); return null; }
  const en = lang === 'en';
  const keyIndex = new Map();
  PLAN_STEPS.forEach((s, i) => { keyIndex.set(s.key, [...(keyIndex.get(s.key) || []), i]); });
  const tasks = PLAN_STEPS.map((s) => {
    const deps = s.deps.flatMap((k) => keyIndex.get(k) || []);
    return {
      title: en ? s.en : s.ko,
      owner: s.owner,
      stage: s.stage,
      input: deps.length ? (en ? 'Earlier step outputs · pack files · briefing' : '앞 단계 산출물 · 팩 파일 · 브리핑') : (en ? 'Briefing · attachments (RFP, requirements)' : '브리핑 · 첨부(RFP·요구사항)'),
      done_when: en ? s.doneEn : s.done,
      depends_on: deps,
      needs_approval: Boolean(s.approval),
      approval_reason: s.approval || '',
      skills: [...s.skills],
      process: 'planning',
      step: s.key,
      pack,
      ...(s.slice !== undefined ? { slice: s.slice } : {}),
      // 큰 SSOT·골든 HTML 을 읽고 쓰는 ②·③ 은 공통 한도로는 거의 항상 멈춘다(2026-11-14 실측) — 단계별 한도를 둔다
      ...(s.capTokens ? { cap_tokens: s.capTokens } : {}),
    };
  });
  return { tasks, pack, kit: kit.dir, summary: en ? `Standard planning process, ${tasks.length} steps · pack ${pack}` : `표준 기획 프로세스 ${tasks.length}단계 · 팩 ${pack}` };
}

// ── 실행 중 훅(orchestrator) ──

async function kitAgentNote(kit, name) {
  if (!name) return '';
  try {
    const body = (await fs.readFile(path.join(kit, '.claude', 'agents', `${name}.md`), 'utf8')).replace(/^---[\s\S]*?---\s*/, '').trim();
    return ['## 기획 에이전트 지침 (' + name + ')',
      '> 이 실행 환경에서는 명령(Bash·python)을 실행할 수 없다. 지침의 스크립트 실행 단계는 건너뛴다 — 화면 뼈대 생성(new_screen)과 린트·verify 는 서버가 하고 결과를 이 지시문에 붙인다.',
      '<<<자료 시작: 기획 에이전트 지침>>>', body.slice(0, 7000), '<<<자료 끝>>>'].join('\n');
  } catch {
    return '';
  }
}

/** 보고서(md)에서 ```json {"screens":[…]} ``` 블록을 찾는다. */
export function parseScreenList(text) {
  const blocks = [...String(text || '').matchAll(/```json\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const raw of blocks.reverse()) {
    try {
      const j = JSON.parse(raw);
      const list = Array.isArray(j) ? j : j.screens;
      if (Array.isArray(list) && list.length) return list;
    } catch { /* 다음 블록 */ }
  }
  return [];
}

function cleanScreen(s) {
  const req = Array.isArray(s.req) ? s.req.map(String) : String(s.req || '').split(',').map((x) => x.trim()).filter(Boolean);
  return {
    id: String(s.id || '').trim(), type: String(s.type || '').trim(), title: String(s.title || '').trim(),
    portal: String(s.portal || '').trim(), menu: String(s.menu || '').trim(), menu_label: String(s.menu_label || s.menuLabel || '').trim(),
    purpose: String(s.purpose || '').trim(), req, hidden: Boolean(s.hidden),
  };
}

function screenProblem(s) {
  if (!SCREEN_ID_RE.test(s.id)) return `화면ID 형식 위반(${s.id || '빈 값'})`;
  if (!TYPES.includes(s.type)) return `유형 '${s.type}' 은 ${TYPES.join('·')} 중 하나여야 함`;
  if (!s.title || !s.portal || !s.menu || !s.purpose) return '제목·포털·메뉴·목적 중 빈 값';
  return '';
}

async function clarifyScreens(tasks, task) {
  const clarify = tasks.find((t) => t.briefing === task.briefing && t.step === 'clarify' && t.output);
  if (!clarify) return { screens: [], note: '② 단계 산출물이 없음' };
  const abs = absData(clarify.output);
  const text = abs ? await fs.readFile(abs, 'utf8').catch(() => '') : '';
  const screens = parseScreenList(text).map(cleanScreen);
  return { screens, note: screens.length ? '' : `② 단계 보고서(${clarify.output})에 화면 목록 JSON 블록이 없음` };
}

async function verifyFiles(kit, files) {
  if (!files.length) return { ran: false, results: [] };
  const rels = files.map((f) => path.relative(kit, f).split(path.sep).join('/'));
  const r = await runPy(kit, ['scripts/verify_page.py', '--json', ...rels]);
  if (r.error) return { ran: false, error: r.error.code === 'ENOENT' ? '파이썬을 찾지 못함' : r.error.message, results: [] };
  try {
    const j = JSON.parse(r.stdout);
    return { ran: true, results: Array.isArray(j) ? j : [j] };
  } catch {
    return { ran: false, error: (r.stderr || r.stdout || '').slice(0, 300) || `종료 코드 ${r.code}`, results: [] };
  }
}

function verifySummary(v) {
  if (!v.ran) return v.error ? `검사 못 함 — ${v.error}` : '검사할 화면 없음';
  const bad = v.results.filter((x) => !x.ok);
  const codes = {};
  for (const x of v.results) for (const vi of x.violations || []) codes[vi.code] = (codes[vi.code] || 0) + 1;
  const top = Object.entries(codes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c}×${n}`).join(', ');
  return `화면 ${v.results.length}개 · 통과 ${v.results.length - bad.length} · 위반 ${Object.values(codes).reduce((a, b) => a + b, 0)}건${top ? ` (${top})` : ''}`;
}

function verifyTable(v) {
  if (!v.ran) return '';
  return ['| 화면 파일 | 결과 | 위반(코드·내용) |', '| --- | --- | --- |',
    ...v.results.map((x) => `| ${x.file} | ${x.ok ? 'pass' : 'fail'} | ${(x.violations || []).slice(0, 6).map((vi) => `${vi.code} ${vi.msg}`).join('<br>') || '—'} |`)].join('\n');
}

/**
 * 작업 실행 전 — 팩 준비·화면 뼈대 생성·검사 결과를 지시문에 붙인다.
 * @returns {Promise<{context:string, addDirs:string[], files:string[], skip?:string, error?:string}>}
 */
export async function planningBefore(task, { tasks, log = () => {} }) {
  const kit = await kitStatus();
  if (!kit.ok) return { context: '', addDirs: [], files: [], error: kit.error };
  const id = task.pack;
  const { dir, created } = await ensurePack(kit.dir, id);
  if (created) log(`기획 팩 생성: packs/${id} (packs/_template 복사)`);
  const rel = (p) => p.split(path.sep).join('/');
  const files = { pack: rel(path.join(dir, 'pack.json')), rules: rel(path.join(dir, '규칙.md')), ia: rel(path.join(dir, 'IA.md')), guide: rel(path.join(dir, '작업가이드.md')), nav: rel(path.join(dir, 'nav.config.js')), readme: rel(path.join(dir, 'readme')), screens: rel(path.join(dir, 'screens')) };
  const addDirs = [dir, path.join(kit.dir, 'core'), path.join(kit.dir, 'prompts')];
  const head = [
    `## 기획 팩 — ${id}`,
    `- 패키지 폴더: ${rel(kit.dir)} (규격 SKILL·골든·템플릿은 읽기만, 고치지 않는다)`,
    `- 팩 폴더: ${rel(dir)} — pack.json · 규칙.md · IA.md · 작업가이드.md · nav.config.js · readme/ · screens/`,
  ];
  const kitNote = await kitAgentNote(kit.dir, PLAN_STEPS.find((s) => s.key === task.step && (s.slice === undefined || s.slice === task.slice))?.kit);

  if (task.step === 'understand') {
    return { addDirs, files: [], context: [...head, '',
      '## 이번 단계에서 할 일',
      `- 보고서(md)에 요구 원장 표와 미확정 목록을 쓴다. 요구 id 는 원문에 있으면 그대로, 없으면 REQ-01… 로 붙인다.`,
      `- 같은 요구 원장을 팩의 IA.md(${files.ia}) '요구사항' 절에 표로 옮긴다(다른 절은 비워 둠).`,
      '- 원문에 없는 요구·수치를 만들지 않는다. 모르는 것은 미확정 목록으로.'].join('\n') };
  }
  if (task.step === 'clarify') {
    return { addDirs, files: [], context: [...head, '',
      '## 이번 단계에서 할 일 (SSOT 1~3계층)',
      `- 팩 pack.json(${files.pack})의 name·brand·prefix(영문 소문자 2~4자)·portals 를 채운다. id·screens·layers 는 손대지 않는다(서버·승인이 바꾼다).`,
      `- nav.config.js(${files.nav})의 brand 를 pack.json 과 같게 채우고, portals 에 pack.json 과 같은 키로 { name: "포털명", menus: [] } 를 넣는다(메뉴·화면은 서버가 화면을 만들 때 추가). 주석을 늘리지 않는다.`,
      `- 규칙.md(${files.rules}): 화면ID 규칙 {prefix}-{portal}-{area}{Function}, 금지어·명명. 작업가이드.md(${files.guide}): 권한(역할)·상태값 표준·정책·용어·메시지 톤. IA.md(${files.ia}): 포털›메뉴›화면 트리와 요구↔화면ID 추적표.`,
      `- 화면은 이번 브리핑에서 최대 ${MAX_SCREENS}개까지 만든다 — 핵심 화면부터 고르고 나머지는 IA 에 '다음 차수'로 남긴다.`,
      '- 보고서(md) 맨 끝에 아래 형식의 JSON 블록을 반드시 넣는다(서버가 이 목록으로 화면 뼈대를 만든다). type 은 list·detail·form·popup·list-m·detail-m 중 하나, 상세·등록 화면은 hidden:true.',
      '```json',
      '{"screens":[{"id":"abc-admin-memberList","type":"list","title":"회원 목록","portal":"admin","menu":"member","menu_label":"회원 관리","purpose":"회원을 조건으로 찾고 상세로 이동","req":["REQ-01"],"hidden":false}]}',
      '```',
      '- 확정 못 한 것은 [확인 필요] 로 표시한다. 재하가 승인하면 규칙·IA·작업가이드가 확정(confirmed)되고 화면 생성이 시작된다.',
      kitNote].filter(Boolean).join('\n') };
  }
  if (task.step === 'build') {
    const { screens, note } = await clarifyScreens(tasks, task);
    const valid = [];
    const problems = [];
    for (const s of screens.slice(0, MAX_SCREENS)) {
      const p = screenProblem(s);
      if (p) problems.push(`${s.id || '?'}: ${p}`); else valid.push(s);
    }
    const half = Math.ceil(valid.length / 2);
    const mine = task.slice === 1 ? valid.slice(half) : valid.slice(0, half);
    if (!mine.length) return { addDirs, files: [], context: '', skip: note || (problems.length ? `쓸 수 있는 화면이 없음 — ${problems.join(' / ')}` : '이 빌더에게 배정된 화면이 없음') };
    const pj = await readJson(path.join(dir, 'pack.json')).catch(() => ({}));
    if (pj?.layers?.guide !== 'confirmed') return { addDirs, files: [], context: '', error: '작업가이드가 확정(confirmed)되지 않아 화면을 만들 수 없음 — ② 단계 승인 필요' };
    const made = [];
    for (const s of mine) {
      const target = path.join(dir, 'screens', `${s.id}.html`);
      if (await exists(target)) { made.push({ s, file: target, note: '이미 있음 — 고친다' }); continue; }
      const args = ['scripts/new_screen.py', id, s.type, s.id, '--title', s.title, '--portal', s.portal, '--menu', s.menu, '--purpose', s.purpose, '--no-lint'];
      if (s.menu_label) args.push('--menu-label', s.menu_label);
      if (s.req.length) args.push('--req', s.req.join(','));
      if (s.hidden || ['detail', 'form', 'detail-m'].includes(s.type)) args.push('--hidden');
      const r = await runPy(kit.dir, args);
      if (r.code === 0 && await exists(target)) made.push({ s, file: target, note: '뼈대 생성' });
      else problems.push(`${s.id}: 뼈대 생성 실패(종료 ${r.code}) ${(r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-2).join(' ').slice(0, 200)}`);
    }
    log(`기획 뼈대: ${made.map((m) => m.s.id).join(', ') || '없음'}${problems.length ? ` · 문제 ${problems.length}건` : ''}`);
    if (!made.length) return { addDirs, files: [], context: '', error: `화면 뼈대를 만들지 못함 — ${problems.join(' / ')}` };
    const planFiles = made.map((m) => path.relative(kit.dir, m.file).split(path.sep).join('/'));
    return { addDirs, files: made.map((m) => m.file), planFiles, context: [...head, '',
      '## 이번 단계에서 할 일 — 맡은 화면의 2단 화면설계서를 채운다',
      '서버가 골든을 복제해 뼈대를 만들고 pack.json·nav.config.js 에 등록해 두었다. 아래 파일만 Edit 로 고친다(새 파일·다른 화면을 만들지 않는다).',
      ...made.map((m) => `- ${rel(m.file)} — ${m.s.title} (${m.s.type}${m.s.req.length ? ` · ${m.s.req.join(',')}` : ''}) · ${m.note}`),
      '- 작업가이드·IA 에 없는 개념은 넣지 않는다. 골든의 더미·치환 토큰(__X__ 등)은 모두 실제 내용으로 바꾼다.',
      '- 저장한 뒤 서버가 린트(L01~L13)·verify(V01~V08)를 돌려 게이트에 넣는다. 위반이 있으면 QA 반려 → 1회 보완으로 돌아온다.',
      '- 보고서(md)에는 화면별로 무엇을 채웠는지와 [확인 필요] 목록을 쓴다.',
      problems.length ? `\n## 만들지 못한 화면(보고서 '남은 제한'에 그대로 옮길 것)\n${problems.map((p) => `- ${p}`).join('\n')}` : '',
      kitNote].filter(Boolean).join('\n') };
  }
  if (task.step === 'review' || task.step === 'handoff') {
    const mine = tasks.filter((t) => t.briefing === task.briefing && t.step === 'build').flatMap((t) => t.plan_files || []);
    const v = await verifyFiles(kit.dir, mine.map((f) => path.join(kit.dir, f)));
    const idx = await runPy(kit.dir, ['scripts/pack_index.py', id]).catch(() => null);
    const pj = await readJson(path.join(dir, 'pack.json')).catch(() => ({}));
    const reg = (pj.screens || []).map((s) => `| ${s.id} | ${s.title || ''} | ${s.type || ''} | ${(s.req || []).join(', ') || '미연결'} | ${s.status || ''} |`);
    return { addDirs, files: [], context: [...head, '',
      `## 서버가 돌린 기계 검사 — ${verifySummary(v)}`, verifyTable(v),
      idx && idx.code === 0 ? `- 팩 화면 목록 페이지를 다시 만들었다: ${rel(path.join(dir, 'index.html'))}` : '',
      '', '## 화면 레지스트리 (pack.json.screens)', '| 화면ID | 화면명 | 유형 | 요구 | 상태 |', '| --- | --- | --- | --- | --- |', ...reg,
      '', task.step === 'review'
        ? '## 이번 단계에서 할 일\n- 위 기계 검사 결과를 화면별로 요약하고(돌지 않았으면 not_run), 좌우 정합·정책 근거(작업가이드 §)·익명화를 직접 읽고 리뷰한다.\n- 고칠 것은 화면ID·마커 단위로 적는다. 화면 파일은 고치지 않는다(리뷰만).'
        : '## 이번 단계에서 할 일\n- 요구 원장(① 단계)과 위 레지스트리로 추적 매트릭스(요구 id ↔ 화면ID ↔ 파일명 ↔ 개발목록 ID)를 만든다. 개발목록 ID 가 없으면 \'미정\'.\n- 3키(화면ID = 파일명 = data-screen = h2 = pack.json 등록) 일치 여부는 verify V03 결과로 적는다.\n- 커버리지: 화면이 연결된 요구 / 미연결 / 비UI 를 따로 센다. 남은 미확정·다음 차수 화면을 인계 목록에 적는다.',
      kitNote].filter(Boolean).join('\n') };
  }
  return { context: head.join('\n'), addDirs, files: [] };
}

/**
 * QA 기계 검사에 더할 것 — 화면 생성 단계면 서버가 린트·verify 를 돌린다. mock 은 내용을 채우지 않으므로 참고로만.
 * @returns {Promise<{checks:object[], issues:string[]}>}
 */
export async function planningChecks(task, before, { mode }) {
  if (task.step !== 'build' || !before?.files?.length) return { checks: [], issues: [] };
  const kit = await kitStatus();
  if (!kit.ok) return { checks: [{ id: 'spec_verify', status: 'not_run', evidence: kit.error }], issues: [] };
  const v = await verifyFiles(kit.dir, before.files);
  const optional = mode !== 'claude_code' ? { required: false } : {};
  if (!v.ran) return { checks: [{ id: 'spec_verify', status: v.error ? 'error' : 'not_run', evidence: verifySummary(v), ...optional }], issues: [] };
  const bad = v.results.filter((x) => !x.ok);
  const issues = bad.flatMap((x) => (x.violations || []).slice(0, 4).map((vi) => `${path.basename(x.file)} ${vi.code} ${vi.msg}`)).slice(0, 8);
  return { checks: [{ id: 'spec_verify', status: bad.length ? 'fail' : 'pass', evidence: verifySummary(v), ...optional }], issues };
}

/** 승인 뒤 — ② 가이드확정이면 팩의 규칙·IA·작업가이드 계층을 confirmed 로 올린다. */
export async function planningOnApproved(task, { log = () => {} } = {}) {
  if (task.process !== 'planning' || task.step !== 'clarify') return;
  const kit = await kitStatus();
  if (!kit.ok) { log(`가이드 확정 반영 못 함 — ${kit.error}`); return; }
  const file = path.join(packDir(kit.dir, task.pack), 'pack.json');
  try {
    const pj = await readJson(file);
    pj.layers = { ...(pj.layers || {}), rules: 'confirmed', ia: 'confirmed', guide: 'confirmed' };
    if (pj.status === 'onboarding') pj.status = 'active';
    await fs.writeFile(file, JSON.stringify(pj, null, 2) + '\n', 'utf8');
    log(`기획 팩 ${task.pack}: 규칙·IA·작업가이드 confirmed (승인 ${task.id})`);
  } catch (e) {
    log(`가이드 확정 반영 실패(${task.pack}): ${e.message}`);
  }
}

/** mock 전용 — ② 단계 목업 보고서 끝에 붙일 화면 목록(배선 시험). 팩 메타가 비어 있으면 시험값으로 채운다. */
export async function mockClarifyBlock(task) {
  const kit = await kitStatus();
  if (!kit.ok || !task.pack) return '';
  const file = path.join(packDir(kit.dir, task.pack), 'pack.json');
  try {
    const pj = await readJson(file);
    if (!pj.prefix) {
      Object.assign(pj, { prefix: 'mck', name: pj.name || '목업 시험 팩', portals: { admin: { name: '관리자', segment: 'admin' } } });
      await fs.writeFile(file, JSON.stringify(pj, null, 2) + '\n', 'utf8');
    }
  } catch {
    return '';
  }
  const screens = [
    { id: 'mck-admin-noticeList', type: 'list', title: '공지 목록', portal: 'admin', menu: 'notice', menu_label: '공지 관리', purpose: '공지를 조건으로 찾고 상세로 이동', req: ['REQ-01'] },
    { id: 'mck-admin-noticeDetail', type: 'detail', title: '공지 상세', portal: 'admin', menu: 'notice', purpose: '공지 내용과 이력을 확인', req: ['REQ-02'], hidden: true },
    { id: 'mck-admin-noticeCreate', type: 'form', title: '공지 등록', portal: 'admin', menu: 'notice', purpose: '공지를 등록하거나 고침', req: ['REQ-03'], hidden: true },
  ];
  return ['', '```json', JSON.stringify({ screens }), '```', ''].join('\n');
}

// ── 화면(기획 탭)용 ──

/** 팩 목록 — 이름·접두·계층 상태·화면 수. */
export async function listPacks() {
  const kit = await kitStatus();
  if (!kit.ok) return { kit, packs: [] };
  const root = path.join(kit.dir, 'packs');
  const out = [];
  for (const name of await fs.readdir(root).catch(() => [])) {
    if (name.startsWith('_') || name.startsWith('.')) continue;
    try {
      const pj = await readJson(path.join(root, name, 'pack.json'));
      out.push({ id: pj.id || name, name: pj.name || '', prefix: pj.prefix || '', status: pj.status || '', version: pj.version || '', layers: pj.layers || {}, screens: (pj.screens || []).length, portals: Object.keys(pj.portals || {}) });
    } catch { /* pack.json 없는 폴더는 건너뜀 */ }
  }
  return { kit, packs: out };
}

/** 팩 한 개 — 화면 레지스트리 + 파일 유무 + (요청 시) verify 결과. */
export async function packDetail(id, { verify = false } = {}) {
  const kit = await kitStatus();
  if (!kit.ok) return { ok: false, error: kit.error };
  if (!PACK_ID_RE.test(id)) return { ok: false, error: '팩 id 형식이 아닙니다.' };
  const dir = packDir(kit.dir, id);
  let pj;
  try { pj = await readJson(path.join(dir, 'pack.json')); } catch { return { ok: false, error: '팩이 없습니다.' }; }
  const screens = [];
  for (const s of pj.screens || []) {
    const file = path.join(dir, 'screens', `${s.id}.html`);
    screens.push({ ...s, file: `packs/${id}/screens/${s.id}.html`, exists: await exists(file) });
  }
  let results = null;
  if (verify) {
    const v = await verifyFiles(kit.dir, screens.filter((s) => s.exists).map((s) => path.join(kit.dir, s.file)));
    results = v.ran ? Object.fromEntries(v.results.map((x) => [path.basename(x.file, '.html'), { ok: x.ok, violations: x.violations || [], warnings: x.warnings || [] }])) : { _error: verifySummary(v) };
  }
  return { ok: true, pack: { id: pj.id || id, name: pj.name || '', brand: pj.brand || '', prefix: pj.prefix || '', status: pj.status || '', version: pj.version || '', layers: pj.layers || {}, portals: pj.portals || {}, note: pj.note || '' }, screens, verify: results, index: await exists(path.join(dir, 'index.html')) ? `packs/${id}/index.html` : '' };
}

// 화면 뷰어가 패키지 폴더에서 읽을 수 있는 파일 — 화면·템플릿 자산만(실행 파일·스크립트 원본·문서 밖은 안 줌)
const VIEW_EXT = new Set(['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2']);

/** /plan-files/<상대경로> → 패키지 폴더 안의 절대경로(허용 확장자·packs/·core/ 아래만). 아니면 null. */
export async function kitFile(relPath) {
  const kit = await kitStatus();
  if (!kit.ok) return null;
  const clean = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!/^(packs|core)\//.test(clean)) return null;
  const abs = path.resolve(kit.dir, clean);
  const back = path.relative(kit.dir, abs);
  if (!back || back.startsWith('..') || path.isAbsolute(back)) return null;
  if (!VIEW_EXT.has(path.extname(abs).toLowerCase())) return null;
  return abs;
}
