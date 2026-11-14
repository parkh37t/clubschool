// Wylie AX Office 오케스트레이터 서버.
// 역할: (1) 가상 사무실이 폴링하는 office-state.json 제공, (2) 브리핑(POST /api/instruct) 수신 →
//       팀장이 작업으로 나눠 12 에이전트에게 배정·실행·QA·승인 대기, (3) hive 조회·승인 API,
//       (4) 빌드된 화면(dist/)을 같은 주소로 내보냄 — http://127.0.0.1:8787/ 에서 화면과 API 가 같은 오리진이 된다.
// 의존성 0(내장 http/fs). mock 모드는 즉시 동작, claude_code 모드는 이 PC 의 Claude Code CLI 를 부른다.
//
// 실행:  node office-server.mjs                       (기본 mock 모드, 키 불필요)
//        OFFICE_MODE=claude_code node office-server.mjs  (로그인된 Claude Code 로 실제 실행 — 권장)
//        OFFICE_MODE=live ANTHROPIC_API_KEY=sk-... node office-server.mjs  (구 경로: Agent SDK + API 키)
// 환경:  PORT(기본 8787) · OFFICE_HOST(기본 모든 인터페이스, 설치형 앱은 127.0.0.1) · OFFICE_CONCURRENCY(기본 2, 최대 3)
//        OFFICE_HIVE_DIR · OFFICE_DELIVERABLES_DIR · OFFICE_DIST_DIR — 데이터·화면 위치(paths.mjs)

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readState, writeState, clearState } from './state.mjs';
import { runBriefing, watchOrphanApprovals } from './orchestrator.mjs';
import * as hive from './hive.mjs';
import { claudeAvailable, claudeBinPath, authStatus, openLoginWindow, killAllChildren, onRateLimit, probeLimits, failureHint, billingEnvPresent, apiKeyAllowed } from './claudeCode.mjs';
import { ALL_MAIL_IDS, ROSTER, LEADER, OWNER, AGENT_IDS, QA_AGENT, MAX_CUSTOM, loadCustomAgents, addCustomAgent, removeCustomAgent, agentById, nameOf } from './roster.mjs';
import { resolveSkills, registryStatus } from './skills.mjs';
import { DELIVERABLES_DIR, DELIVERABLES_DEFAULT, INBOX_DIR, DIST_DIR, HIVE_DIR, relData, absData, isInside } from './paths.mjs';
import { checkDeliverablesDir, changeDeliverablesDir, openLocal } from './storage.mjs';
import { kitStatus, kitGuide, listPacks, packDetail, kitFile } from './planning.mjs';
import { getSettings, updateSettings, publicSettings, stateText, currentConcurrency } from './settings.mjs';
import { templateSummaries } from './agentTemplates.mjs';
import { allBreakers, resetBreaker } from './breaker.mjs';
import { startQueue, enqueue, loadQueue, cancelItem, isBriefingRunning } from './leaderSession.mjs';
import { listTriggers, addTrigger, updateTrigger, removeTrigger, runTriggerNow, startTriggers, MAX_TRIGGERS } from './triggers.mjs';
import { listTemplates, addTemplate, removeTemplate, MAX_TEMPLATES } from './templates.mjs';
import { openPty, listPty, killPty, killAllPty, attachPtySocket, isAgentPtyOpen, ptyAvailable } from './pty.mjs';
import { loadPersona } from './agentRunner.mjs';
import { weighted, knownTokens } from './tokens.mjs';

const MAX_UPLOAD = 25 * 1024 * 1024; // 파일 첨부 상한 25MB

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.OFFICE_HOST || undefined; // 미지정 = 모든 인터페이스(기존 동작). 설치형 앱은 127.0.0.1
const MODE = ['live', 'claude_code', 'mock'].includes(process.env.OFFICE_MODE) ? process.env.OFFICE_MODE : 'mock';
if (process.env.OFFICE_MODE && !['live', 'claude_code', 'mock'].includes(process.env.OFFICE_MODE)) {
  console.error(`[office] OFFICE_MODE 값 오류: ${process.env.OFFICE_MODE} (mock | claude_code | live)`);
  process.exit(1);
}

// 브리핑은 대기열에서 한 번에 1건만 돈다(leaderSession.mjs). 브리핑 안의 작업은 풀에서 동시에 돈다.
const running = () => isBriefingRunning();

const log = (msg) => console.log(`[office] ${msg}`);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Rel-Path, X-Folder-Id');
}

function sendJson(res, code, obj) {
  cors(res);
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error('본문이 너무 큽니다.'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// 바이너리 안전 본문 수집(파일 업로드용). maxBytes 초과 시 거부.
function readBodyBuffer(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > maxBytes) { req.destroy(); reject(new Error('파일이 너무 큽니다(최대 25MB).')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// 파일명 정리 — 경로 조작(../, 절대경로) 차단. 업로드는 반드시 _inbox 안에만 저장된다.
function safeName(s) {
  return String(s || 'file')
    .replace(/[\\/]/g, '_')        // 경로 구분자 제거
    .replace(/\.\.+/g, '_')        // 상위 이동 방지
    .replace(/[:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'file';
}

/**
 * 이 PC 의 화면에서 온 요청인지 — 프로세스를 띄우는 API(로그인 창)는 다른 사이트·터널 경유 요청을 받지 않는다.
 * 브라우저는 POST 에 Origin 을 반드시 붙이므로, 공개 사이트(https://…github.io)나 악성 페이지는 여기서 걸린다.
 * 포트는 보지 않는다(개발 중 Vite 3000 → 프록시 8787 경로도 같은 PC 화면이다).
 */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * 이 PC 화면에서 온 읽기 요청인지 — 브라우저는 같은 오리진 GET 에 Origin 을 붙이지 않으므로
 * Sec-Fetch-Site(same-origin)와 Host(루프백)로 본다. 설정 화면의 전체 경로 표시에만 쓴다(바꾸는 요청은 sameOrigin).
 */
function localViewer(req) {
  if (sameOrigin(req)) return true;
  if (req.headers.origin || req.headers['sec-fetch-site'] !== 'same-origin') return false;
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(`http://${req.headers.host}`).hostname);
  } catch {
    return false;
  }
}

/** 요청 Host 가 이 PC(루프백)인지 — 기획 화면 파일(/plan-files)은 터널 같은 바깥 주소로는 내주지 않는다. */
function loopbackHost(req) {
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(`http://${req.headers.host}`).hostname);
  } catch {
    return false;
  }
}

// ── 화면(dist/) 정적 제공 ──
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

async function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { rel = '/'; }
  const target = path.join(DIST_DIR, rel);
  const inside = target === DIST_DIR || isInside(target, DIST_DIR);
  let file = null;
  if (inside) {
    try {
      const st = await fs.stat(target);
      if (st.isFile()) file = target;
    } catch { /* 없으면 아래에서 index.html */ }
  }
  // 확장자 없는 경로(화면 라우팅)는 index.html 로. 없는 파일(.js 등)은 404.
  if (!file && (!path.extname(rel) || rel.endsWith('.html'))) file = path.join(DIST_DIR, 'index.html');
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
  try {
    const body = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    const immutable = rel.startsWith('/assets/');
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><title>Wylie AX Office</title><body style="font-family:'Malgun Gothic',sans-serif;padding:40px;line-height:1.6"><h2>화면 빌드가 없습니다</h2><p>저장소 루트에서 <code>npm run build</code> 를 실행한 뒤 새로 고침하세요. API 는 동작 중입니다(<a href="/api/health">/api/health</a>).</p></body>`);
  }
}

// ── 대기 상태(브리핑 전) ──
// 상태 파일이 없을 때 404 대신 빈 사무실 상태를 돌려준다. 화면이 데모 시나리오로 빠지지 않고 '연결됨·대기'로 보인다.
/** 설정 화면에 보낼 값 — 저장된 설정 + 지금 쓰는 산출물·hive 위치. 이 PC 화면이 아니면 사용자 폴더를 ~ 로 줄인다. */
async function settingsView(local) {
  const s = await getSettings();
  const shown = (p) => (local ? p : maskHome(p));
  return {
    ...publicSettings(s),
    deliverables_dir: shown(DELIVERABLES_DIR),
    deliverables_default: shown(DELIVERABLES_DEFAULT),
    deliverables_custom: Boolean(s.deliverables_dir),
    hive_dir: shown(HIVE_DIR),
    plan_kit_dir: shown(String(s.plan_kit_dir || '')),
    plan_kit: await kitStatus().then((k) => ({ ok: k.ok, error: k.error || '' })),
    mode: MODE,
    desktop: process.env.OFFICE_DESKTOP === '1',
    running: running(),
  };
}

async function idleState() {
  const pending = await hive.pendingApprovals();
  return {
    stage: 0, phase: 'working', progress: 0, idle: true,
    agents: Object.fromEntries(AGENT_IDS.map((id) => [id, { state: 'idle', task: '' }])),
    concurrency: { limit: await currentConcurrency(), running: 0 },
    hive: { briefing: '', tasks: [], pending, approvals: [], mail: [], leader: { id: LEADER.id, name: LEADER.name, state: 'idle', task: '' } },
  };
}

// ── 명단·스킬 ──
let skillCache = { at: 0, data: null };
async function skillsByAgent() {
  if (skillCache.data && Date.now() - skillCache.at < 60000 && ROSTER.every((a) => skillCache.data[a.id])) return skillCache.data;
  const data = {};
  for (const a of ROSTER) {
    const items = [];
    for (const spec of a.skills) {
      const r = await resolveSkills([spec]);
      items.push({ spec, name: r.applied[0]?.name || null, available: r.applied.length > 0 });
    }
    data[a.id] = items;
  }
  skillCache = { at: Date.now(), data };
  return data;
}

// ── 승인 뒤 바뀐 산출물 표시 ──
// 승인된 작업(approved_hash)의 산출물이 지금 다른 내용이면 approval_stale. 파일 크기·수정 시각이 같으면 다시 해시하지 않는다.
const staleCache = new Map();
async function markApprovalStale(tasks) {
  const out = [];
  for (const t of tasks) {
    if (!t.approved_hash || !t.output) { out.push(t); continue; }
    const abs = absData(t.output);
    let st = null;
    try { st = await fs.stat(abs); } catch { /* 파일 없음 */ }
    const key = st ? `${st.size}:${st.mtimeMs}` : 'missing';
    let c = staleCache.get(t.id);
    if (!c || c.key !== key) {
      c = { key, hash: st ? await hive.fileHash(abs) : null };
      staleCache.set(t.id, c);
    }
    out.push({ ...t, approval_stale: c.hash !== t.approved_hash });
  }
  return out;
}

// ── 화면 위 사용량 막대(/api/usage/top) ──
// 구독 사용 한도(Claude 가 실행마다 알려 준 주간·5시간 창 사용률), 오늘 사용 토큰(끝난 작업 + 실행 중), 하루 한도에 가까운 담당, 실행 중 작업.
onRateLimit((info) => hive.recordLimits(info));
let lastProbeAt = 0;

async function usageTop() {
  const [u, st, ledger, limits] = await Promise.all([hive.usageSummary({ qaAgent: QA_AGENT }), getSettings(), hive.loadTasks(), hive.loadLimits()]);
  const today = hive.localDay();
  const running = [];
  for (const t of ledger.tasks) {
    if (t.status !== '진행') continue;
    running.push({ id: t.id, owner: t.owner, title: t.title, tokens: await hive.liveTokens(t.id), cap: t.cap_tokens || st.max_task_tokens });
  }
  const live = running.reduce((n, r) => n + r.tokens, 0);
  const byAgent = new Map(Object.entries(u.byAgentDay).map(([id, days]) => [id, days[today] || 0]));
  for (const r of running) byAgent.set(r.owner, (byAgent.get(r.owner) || 0) + r.tokens);
  const agents = [...byAgent.entries()].filter(([, used]) => used > 0)
    .map(([id, used]) => ({ id, used, ratio: st.agent_daily_tokens ? used / st.agent_daily_tokens : 0 }))
    .sort((a, b) => b.used - a.used).slice(0, 8);
  return {
    mode: MODE,
    today: (u.byDay[today] || 0) + live, today_done: u.byDay[today] || 0, live,
    parts_today: u.parts_today, agents, running,
    agent_daily_tokens: st.agent_daily_tokens, max_task_tokens: st.max_task_tokens,
    limits, probe_ready: MODE === 'claude_code' && Date.now() - lastProbeAt >= 60000,
  };
}

const STATUS_RANK = { '진행': 3, '검수': 2, '승인대기': 1 };

/** 팀장 + 12인의 현재 상태. 작업 원장에서 유도한다(진행 > 검수 > 승인대기 > 대기). */
async function rosterView() {
  const [ledger, usage, skills, state, breakers] = await Promise.all([hive.loadTasks(), hive.usageSummary({ qaAgent: QA_AGENT }), skillsByAgent(), readState(), allBreakers(AGENT_IDS)]);
  const now = {};
  const bump = (id, status, task) => {
    if (!now[id] || STATUS_RANK[status] > STATUS_RANK[now[id].status]) now[id] = { status, task };
  };
  for (const t of ledger.tasks) {
    if (!hive.ACTIVE_STATUS.includes(t.status)) continue;
    bump(t.owner, t.status, `${t.id} ${t.title}`);
    if (t.status === '검수') bump(QA_AGENT, '검수', `QA ${t.id} ${t.title}`);
  }
  const leader = state?.hive?.leader;
  const q = await loadQueue();
  const leaderBusy = q.items.some((i) => i.kind === 'message' && i.status === 'running');
  const members = [
    { id: LEADER.id, name: LEADER.name, name_en: LEADER.name_en, dept: '팀장', dept_en: 'Lead', role: '브리핑 분해·배정·추적·보고', role_en: 'Splits briefings, assigns, tracks and reports', skills: [], stages: [],
      status: leaderBusy || (running() && leader?.state === 'working') ? '진행' : '대기', task: leaderBusy ? stateText(await getSettings()).leaderMsg : running() ? (leader?.task || '') : '', usd: usage.byAgent[LEADER.id] || 0, custom: false, breaker: null },
    ...ROSTER.map((a) => {
      const b = breakers[a.id];
      return {
        id: a.id, name: a.name, name_en: a.name_en, dept: a.dept, dept_en: a.dept_en, role: a.role, role_en: a.role_en, stages: a.stages, skills: skills[a.id] || [],
        status: now[a.id]?.status || '대기', task: now[a.id]?.task || '', tokens: usage.byAgent[a.id] || 0,
        custom: !a.builtin, template: a.template || '', look: a.look || null,
        breaker: b ? { level: b.level, reason: b.reason, reason_code: b.reason_code, reason_detail: b.reason_detail, ratio: b.ratio, used_today: b.used_today, budget: b.budget, failures: b.failures } : null,
      };
    }),
  ];
  return { members, running: running(), mode: MODE, concurrency: await currentConcurrency(), max_custom: MAX_CUSTOM };
}

// ── 로그인 상태 — CLI 호출이 1~2초 걸려 1분간 기억한다(화면은 자주 폴링) ──
let authCache = { at: 0, data: null, inflight: null };
async function cachedAuth(force) {
  const age = Date.now() - authCache.at;
  if (authCache.data && (age < 60000 && !(force && age > 5000))) return authCache.data;
  if (!authCache.inflight) {
    authCache.inflight = authStatus()
      .then((d) => { authCache = { at: Date.now(), data: { ...d, checked_at: hive.nowIso() }, inflight: null }; return authCache.data; })
      .catch(() => { authCache.inflight = null; return { cli: false, loggedIn: null, checked_at: hive.nowIso() }; });
  }
  return authCache.inflight;
}

// ── 환경 점검(모니터 탭 맨 위) — CLI 유무·버전·실행 파일·로그인 여부. 계정 메일·조직 정보는 내보내지 않는다 ──
// CLI 를 두 번(--version, auth status) 부르므로 30초 기억하고, ?refresh=1 은 3초에 한 번까지만 다시 묻는다.
let envCache = { at: 0, data: null, inflight: null };
/** 터널(공개 주소)로 열릴 수 있으므로 실행 파일 경로의 사용자 폴더 부분은 ~ 로 줄인다. */
function maskHome(p) {
  const home = os.homedir();
  const s = String(p || '');
  return home && s.toLowerCase().startsWith(home.toLowerCase()) ? '~' + s.slice(home.length) : s;
}
async function envStatus(force) {
  const age = Date.now() - envCache.at;
  if (envCache.data && (age < 30000 && !(force && age > 3000))) return envCache.data;
  if (!envCache.inflight) {
    envCache.inflight = (async () => {
      const [version, auth] = await Promise.all([claudeAvailable().catch(() => false), authStatus().catch(() => ({ cli: false, loggedIn: null }))]);
      const data = {
        mode: MODE,
        cli: { found: Boolean(version), version: version || null, path: maskHome(claudeBinPath()) },
        loggedIn: version ? auth.loggedIn : null,
        checked_at: hive.nowIso(),
      };
      envCache = { at: Date.now(), data, inflight: null };
      // 로그인 배너(/api/auth)도 방금 확인한 값으로 맞춘다 — [다시 확인] 뒤 배너가 1분 동안 옛 상태로 남지 않게.
      authCache = { at: Date.now(), data: { cli: data.cli.found, loggedIn: data.loggedIn, checked_at: data.checked_at }, inflight: authCache.inflight };
      return data;
    })().catch((e) => {
      envCache.inflight = null;
      throw e;
    });
  }
  return envCache.inflight;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // 기획 탭의 2단 화면설계서 뷰어 — 패키지 폴더의 packs/·core/ 아래 화면·자산만. 에이전트가 만든 HTML 이 이 앱의 API 를
    // 같은 오리진으로 부르지 못하게 CSP sandbox(불투명 오리진)로 내보낸다. 이 PC 주소로 연 화면에서만.
    if (req.method === 'GET' && url.pathname.startsWith('/plan-files/')) {
      if (!loopbackHost(req)) { res.writeHead(403); res.end(); return; }
      const abs = await kitFile(decodeURIComponent(url.pathname.slice('/plan-files/'.length)));
      if (!abs) { res.writeHead(404); res.end(); return; }
      try {
        const body = await fs.readFile(abs);
        const ext = path.extname(abs).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ...(ext === '.html' ? { 'Content-Security-Policy': 'sandbox allow-scripts' } : {}),
        });
        res.end(body);
      } catch {
        res.writeHead(404); res.end();
      }
      return;
    }

    // 오피스가 2초마다 폴링하는 상태. 브리핑 전이면 hive 에서 대기 상태를 만들어 준다.
    if (req.method === 'GET' && url.pathname === '/office-state.json') {
      const st = (await readState()) || (await idleState());
      // 승인된 산출물이 그 뒤 바뀌었는지 — 작업 탭이 '승인 뒤 바뀜'으로 보인다
      if (Array.isArray(st?.hive?.tasks)) st.hive.tasks = await markApprovalStale(st.hive.tasks);
      sendJson(res, 200, st);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, mode: MODE, running: running(), concurrency: await currentConcurrency(), pending: (await hive.pendingApprovals()).length, desktop: process.env.OFFICE_DESKTOP === '1', pty: await ptyAvailable() });
      return;
    }

    // hive 스냅샷 — 작업 원장·승인 큐·메일 이벤트·현황판.
    if (req.method === 'GET' && url.pathname === '/api/hive') {
      const snap = await hive.snapshot({ events: 60 });
      snap.tasks = await markApprovalStale(snap.tasks);
      sendJson(res, 200, { ...snap, blackboard: await hive.readBlackboard(), mode: MODE, running: running() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/roster') {
      sendJson(res, 200, await rosterView());
      return;
    }

    // 에이전트 기억 파일(memory/<agent>.md)
    if (req.method === 'GET' && url.pathname.startsWith('/api/memory/')) {
      const agent = decodeURIComponent(url.pathname.slice('/api/memory/'.length));
      if (!ALL_MAIL_IDS.includes(agent)) { sendJson(res, 404, { error: '없는 에이전트' }); return; }
      sendJson(res, 200, { agent, content: await hive.readMemory(agent) });
      return;
    }

    // events.log 증분 — ?since=<ISO> 이후만. 없으면 최근 것.
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const since = url.searchParams.get('since') || '';
      const events = await hive.readEventsSince(since, since ? 500 : 200);
      sendJson(res, 200, { events, last: events.at(-1)?.ts || since });
      return;
    }

    // 로그인 여부만 돌려준다(계정 메일·조직 정보는 버림). ?refresh=1 이면 다시 확인.
    if (req.method === 'GET' && url.pathname === '/api/auth') {
      const a = await cachedAuth(url.searchParams.get('refresh') === '1');
      // api_key: 환경에 과금 자격 변수가 있는지(이름만), 그 키로 실제 과금되는지(allowed) — 화면이 경고 띠를 띄운다
      const keys = billingEnvPresent();
      sendJson(res, 200, { loggedIn: a.loggedIn, cli: a.cli, checked_at: a.checked_at, mode: MODE, api_key: { present: keys, billed: MODE === 'claude_code' && keys.length > 0 && apiKeyAllowed() } });
      return;
    }

    // [로그인] 버튼 — 새 PowerShell 창에서 claude auth login. 이 PC 화면에서 온 요청만 받는다.
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 로그인 창을 열 수 있습니다.' }); return; }
      const r = await openLoginWindow();
      authCache.at = 0; // 다음 확인 때 다시 묻는다
      log(r.ok ? '로그인 창을 열었습니다(claude auth login).' : `로그인 창 실패: ${r.message}`);
      sendJson(res, r.ok ? 200 : 400, r.ok ? { ok: true } : { error: r.message });
      return;
    }

    // 사용량 합계(에이전트별·일별). CLI 추정 금액이며 청구서가 아니다.
    if (req.method === 'GET' && url.pathname === '/api/usage') {
      // 사용 토큰(구독 사용량) — 작업마다 실행·QA 토큰과 그 작업의 한도. 금액은 usd_ref(API 환산 참고) 하나만 남긴다
      const [u, ledger, st] = await Promise.all([hive.usageSummary({ qaAgent: QA_AGENT }), hive.loadTasks(), getSettings()]);
      const tasks = ledger.tasks.slice(-40).reverse().map((t) => ({
        id: t.id, owner: t.owner, title: t.title, status: t.status, gate: t.gate,
        // 기록이 없으면(목업·아직 안 돎·토큰 기록 전) null — 화면은 0 이 아니라 '—'(모름)으로 보인다
        tokens: knownTokens(t.tokens), qa_tokens: knownTokens(t.qa?.tokens), parts: t.tokens || null,
        cap_tokens: t.cap_tokens || st.max_task_tokens, at: t.cost_at || t.updated || t.created,
      }));
      sendJson(res, 200, { ...u, tasks, max_task_tokens: st.max_task_tokens, agent_daily_tokens: st.agent_daily_tokens });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/skills/registry') {
      // 문서·제안 스킬 등록부 — 이 PC 에서 찾은 위치(저장소·사용자·동기화·플러그인)와 붙는 곳. 스킬 경로는 보내지 않는다
      sendJson(res, 200, await registryStatus());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/usage/top') {
      sendJson(res, 200, await usageTop());
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/usage/probe') {
      // 구독 사용 한도 지금 확인 — 이 호출도 구독 사용량이라 이 PC 화면에서만, 1분에 한 번만 받는다
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 확인할 수 있습니다.' }); return; }
      if (MODE !== 'claude_code') { sendJson(res, 400, { error: `claude_code 모드에서만 확인할 수 있습니다(지금 ${MODE}).` }); return; }
      if (Date.now() - lastProbeAt < 60000) { sendJson(res, 429, { error: '방금 확인했습니다. 1분 뒤 다시 누르세요.' }); return; }
      lastProbeAt = Date.now();
      const r = await probeLimits();
      await hive.recordUsage({ agent: LEADER.id, tokens: r.tokens, usd: r.costUsd, what: '구독 사용량 확인' });
      if (r.info) await hive.recordLimits(r.info);
      log(`구독 사용량 확인: ${r.ok ? '받음' : `실패(${r.code})`} · 사용 토큰 ${weighted(r.tokens)}`);
      if (!r.ok) { sendJson(res, 502, { error: failureHint(r.code) || '사용 한도 정보를 받지 못했습니다.', code: r.code, tokens: weighted(r.tokens) }); return; }
      sendJson(res, 200, { ok: true, tokens: weighted(r.tokens), limits: await hive.loadLimits() });
      return;
    }

    // ── 설정(언어·작업당 토큰 한도·하루 토큰 한도 등) ──
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      sendJson(res, 200, await settingsView(localViewer(req)));
      return;
    }
    // 산출물 저장 위치 바꾸기 — 진행 중인 브리핑이 없을 때만(원장 경로가 이 폴더 기준 상대경로라서)
    if (req.method === 'POST' && url.pathname === '/api/settings/deliverables') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 바꿀 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      if (running()) { sendJson(res, 409, { error: '브리핑이 진행 중입니다. 끝난 뒤에 바꿔 주세요.' }); return; }
      if (body?.check) { const c = await checkDeliverablesDir(body.dir); sendJson(res, c.ok ? 200 : 400, c); return; }
      const r = await changeDeliverablesDir({ dir: body?.dir, reset: Boolean(body?.reset), copy: Boolean(body?.copy) });
      if (!r.ok) { sendJson(res, 400, { error: r.error }); return; }
      await updateSettings({ deliverables_dir: body?.reset ? '' : r.dir });
      log(`산출물 위치 변경: ${r.from} → ${r.dir}${r.copied ? ' (기존 산출물 복사)' : ''}`);
      await hive.appendEvent({ kind: 'settings', what: 'deliverables_dir', from: r.from, to: r.dir, copied: r.copied, by: OWNER.id });
      sendJson(res, 200, { ...(await settingsView(true)), copied: r.copied });
      return;
    }
    // 기획 탭 — 패키지의 팩 목록 / 팩 한 개(화면 레지스트리, ?verify=1 이면 린트·verify 실행)
    if (req.method === 'GET' && url.pathname === '/api/plan/packs') {
      sendJson(res, 200, await listPacks());
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/plan/packs/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/plan/packs/'.length));
      const r = await packDetail(id, { verify: url.searchParams.get('verify') === '1' });
      sendJson(res, r.ok ? 200 : 404, r);
      return;
    }
    // 기획 에이전트 패키지 폴더 지정 — 패키지 구조(scripts·packs/_template·core)를 확인한 뒤에만. 빈 값이면 끈다
    if (req.method === 'POST' && url.pathname === '/api/settings/plan-kit') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 바꿀 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      const dir = String(body?.dir || '').trim().replace(/^"(.*)"$/, '$1');
      if (dir) {
        const k = await kitStatus(dir);
        // 어떤 폴더를 골랐는지 알려 주는 안내(빈 폴더·문서 폴더면 산출물 위치로, 상위 폴더면 안의 패키지로)
        if (!k.ok) { sendJson(res, 400, { error: k.error, guide: await kitGuide(dir, { deliverablesDir: DELIVERABLES_DIR }) }); return; }
      }
      await updateSettings({ plan_kit_dir: dir ? path.resolve(dir) : '' });
      log(`기획 에이전트 패키지: ${dir ? path.resolve(dir) : '(끔)'}`);
      sendJson(res, 200, await settingsView(true));
      return;
    }

    // 이 PC 에서 산출물 파일·폴더 열기(탐색기·기본 앱). 산출물 폴더 안의 문서만
    if (req.method === 'POST' && url.pathname === '/api/open') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 열 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      const target = ['deliverables', 'hive'].includes(body?.target) ? body.target : 'path';
      const r = await openLocal({ target, path: String(body?.path || ''), select: Boolean(body?.select) });
      sendJson(res, r.ok ? 200 : 400, r);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 바꿀 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      // 산출물 위치는 검사·복사가 필요해 /api/settings/deliverables 로만 바꾼다
      const { deliverables_dir: _ignored, plan_kit_dir: _ignored2, ...patch } = body || {};
      const next = await updateSettings(patch);
      log(`설정 변경: ${JSON.stringify(publicSettings(next))}`);
      sendJson(res, 200, await settingsView(true));
      return;
    }

    // ── 대기열(Munder Difflin QUEUE) — 팀장에게 보내는 메시지와 브리핑 ──
    if (req.method === 'GET' && url.pathname === '/api/queue') {
      const q = await loadQueue();
      sendJson(res, 200, { items: q.items.slice(-40), leader_terminal: isAgentPtyOpen(LEADER.id), running: running() });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/queue') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      const text = String(body?.text || '').trim();
      if (!text) { sendJson(res, 400, { error: '메시지가 비어 있습니다.' }); return; }
      const item = await enqueue({ kind: 'message', text, by: OWNER.id });
      if (item.duplicate) { log(`대기열: 같은 메시지 중복 — ${item.id} 그대로 둠`); sendJson(res, 200, { accepted: true, duplicate: true, item }); return; }
      log(`대기열: ${item.id} 팀장에게 메시지`);
      sendJson(res, 202, { accepted: true, item });
      return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/queue/')) {
      try { sendJson(res, 200, { ok: true, item: await cancelItem(decodeURIComponent(url.pathname.slice('/api/queue/'.length))) }); } catch (e) { sendJson(res, 400, { error: e.message }); }
      return;
    }

    // ── 질문(ask me) ──
    if (req.method === 'GET' && url.pathname === '/api/questions') {
      const book = await hive.loadQuestions();
      sendJson(res, 200, { questions: book.questions.slice(-60).reverse() });
      return;
    }
    if (req.method === 'POST' && /^\/api\/questions\/[^/]+\/answer$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.split('/')[3]);
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      try {
        const q = await hive.answerQuestion(id, { answer: String(body?.answer || '').trim(), by: String(body?.by || '').trim() });
        // 답은 질문한 쪽 inbox 로 — 역할 에이전트는 다음 작업 때 읽고(hive 규칙), 팀장은 상주 세션 대기열로 받는다.
        if (q.from === LEADER.id) await enqueue({ kind: 'message', text: `[${q.id} 재하 답변] 질문: ${q.text}\n답: ${q.answer}`, by: OWNER.id, source: q.id });
        else {
          await hive.sendMessage({ from: OWNER.id, to: q.from, type: 'answer', task: q.task, body: `${q.id} 답 — 질문: ${q.text}\n\n${q.answer}` });
          await hive.routeMail();
        }
        log(`질문 답변: ${q.id} → ${nameOf(q.from)} (${q.answered_by})`);
        sendJson(res, 200, { ok: true, question: q });
      } catch (e) { sendJson(res, 400, { error: e.message }); }
      return;
    }

    // ── 인원 추가(역할 템플릿) ──
    if (req.method === 'GET' && url.pathname === '/api/agents/templates') {
      sendJson(res, 200, { templates: templateSummaries(), max_custom: MAX_CUSTOM, custom: ROSTER.filter((a) => !a.builtin).length });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/agents') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 인원을 바꿀 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      try {
        const a = await addCustomAgent({ template: String(body?.template || ''), name: body?.name, name_en: body?.name_en });
        await hive.ensureHive(ALL_MAIL_IDS);
        skillCache.at = 0;
        await hive.appendEvent({ kind: 'agent', id: a.id, action: 'add', template: a.template });
        log(`인원 추가: ${a.id} ${a.name} (${a.template})`);
        sendJson(res, 201, { ok: true, agent: a });
      } catch (e) { sendJson(res, 400, { error: e.message }); }
      return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/agents/')) {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 인원을 바꿀 수 있습니다.' }); return; }
      const id = decodeURIComponent(url.pathname.slice('/api/agents/'.length));
      const active = (await hive.loadTasks()).tasks.some((t) => t.owner === id && ['대기', ...hive.ACTIVE_STATUS].includes(t.status));
      if (active) { sendJson(res, 409, { error: '진행·대기 중인 작업이 있어 지금은 뺄 수 없습니다.' }); return; }
      try {
        await removeCustomAgent(id);
        await hive.appendEvent({ kind: 'agent', id, action: 'remove' });
        log(`인원 삭제: ${id}`);
        sendJson(res, 200, { ok: true });
      } catch (e) { sendJson(res, 400, { error: e.message }); }
      return;
    }

    // ── 서킷 브레이커 ──
    if (req.method === 'GET' && url.pathname === '/api/breakers') {
      sendJson(res, 200, { breakers: await allBreakers(AGENT_IDS) });
      return;
    }
    if (req.method === 'POST' && /^\/api\/breakers\/[^/]+\/reset$/.test(url.pathname)) {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 초기화할 수 있습니다.' }); return; }
      const agent = decodeURIComponent(url.pathname.split('/')[3]);
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { body = {}; }
      const by = String(body?.by || '').trim();
      const reason = String(body?.reason || '').trim();
      if (!by || !reason) { sendJson(res, 400, { error: '초기화에는 행위자(by)와 사유(reason)가 필요합니다.' }); return; }
      if (!agentById(agent)) { sendJson(res, 404, { error: '없는 에이전트' }); return; }
      const r = await resetBreaker(agent, `${by}: ${reason}`);
      log(`서킷 브레이커 초기화: ${agent} (${by}: ${reason})`);
      sendJson(res, 200, { ok: true, breaker: r });
      return;
    }

    // ── 실시간 기록(터미널 탭) ── ?task=T-0001 | ?stream=lead, &after=<줄 번호>
    // ── 예약(트리거) — 정해진 시각에 브리핑을 대기열에 넣는다. 바꾸는 요청은 이 PC 화면에서만 ──
    if (req.method === 'GET' && url.pathname === '/api/triggers') {
      sendJson(res, 200, { triggers: await listTriggers(), now: new Date().toISOString(), max: MAX_TRIGGERS });
      return;
    }
    if (url.pathname === '/api/triggers' || url.pathname.startsWith('/api/triggers/')) {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 예약을 바꿀 수 있습니다.' }); return; }
      const parts = url.pathname.split('/').filter(Boolean); // ['api','triggers', id?, 'run'?]
      const id = parts[2] ? decodeURIComponent(parts[2]) : '';
      let body = {};
      if (req.method === 'POST') { try { body = JSON.parse((await readBody(req)) || '{}'); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; } }
      const by = String(body?.by || OWNER.id).trim() || OWNER.id;
      try {
        if (req.method === 'POST' && !id) {
          const t = await addTrigger(body, by);
          log(`예약 추가: ${t.id} ${t.title} — 다음 ${t.next_run || '없음'}`);
          sendJson(res, 201, { ok: true, trigger: t });
        } else if (req.method === 'POST' && id && parts[3] === 'run') {
          const r = await runTriggerNow(id, by);
          log(`예약 지금 실행: ${id} → 대기열 ${r.item.id}`);
          sendJson(res, 202, { ok: true, trigger: r.trigger, item: r.item });
        } else if (req.method === 'POST' && id) {
          const t = await updateTrigger(id, body, by);
          log(`예약 변경: ${id} (${t.enabled ? '켜짐' : '꺼짐'}) — 다음 ${t.next_run || '없음'}`);
          sendJson(res, 200, { ok: true, trigger: t });
        } else if (req.method === 'DELETE' && id) {
          const t = await removeTrigger(id, by);
          log(`예약 삭제: ${id} ${t.title}`);
          sendJson(res, 200, { ok: true });
        } else {
          sendJson(res, 405, { error: '지원하지 않는 요청' });
        }
      } catch (e) {
        sendJson(res, 400, { error: e.message });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/live') {
      const stream = url.searchParams.get('task') || url.searchParams.get('stream') || '';
      if (!/^(T-\d{4}|lead)$/.test(stream)) { sendJson(res, 400, { error: 'task 또는 stream 이 필요합니다.' }); return; }
      sendJson(res, 200, { stream, ...(await hive.readLive(stream, url.searchParams.get('after') || 0)) });
      return;
    }
    // 에이전트의 가장 최근 작업(기록 고를 때)
    if (req.method === 'GET' && url.pathname === '/api/live/latest') {
      const agent = url.searchParams.get('agent') || '';
      const t = (await hive.loadTasks()).tasks.filter((x) => x.owner === agent).at(-1);
      sendJson(res, 200, { agent, task: t ? { id: t.id, title: t.title, status: t.status } : null });
      return;
    }

    // ── 대화형 터미널(node-pty) — 이 PC 화면에서만 ──
    if (req.method === 'GET' && url.pathname === '/api/pty') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 볼 수 있습니다.' }); return; }
      sendJson(res, 200, { available: await ptyAvailable(), sessions: listPty() });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/pty') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 터미널을 열 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      const agent = String(body?.agent || '');
      if (!agentById(agent) || agent === OWNER.id) { sendJson(res, 404, { error: '없는 에이전트' }); return; }
      const existing = listPty().find((x) => x.agent === agent && x.exited === null);
      if (existing) { sendJson(res, 200, { ok: true, id: existing.id, title: existing.title, reused: true }); return; }
      try {
        let opened;
        if (agent === LEADER.id) {
          const st = await getSettings();
          opened = await openPty({ agent, cwd: HIVE_DIR, title: '팀장 상주 세션', resumeId: st.leader_session_id || '', cols: body.cols, rows: body.rows });
        } else {
          const last = (await hive.loadTasks()).tasks.filter((x) => x.owner === agent && x.output).at(-1);
          const project = last ? String(last.output).split('/')[0] : '';
          const cwd = (project && absData(project)) || DELIVERABLES_DIR;
          await import('node:fs').then((m) => m.promises.mkdir(cwd, { recursive: true }));
          const persona = `${await loadPersona(agent)}\n\n# 지금 위치\n이 폴더는 ${project ? `과제 '${project}' 의 산출물 폴더` : '산출물 폴더'}다. 재하가 직접 대화하며 일을 시킨다. 외부 발송·비용·삭제·범위 변경·수치 확정은 재하에게 먼저 확인한다.`;
          opened = await openPty({ agent, cwd, title: `${nameOf(agent)} — ${project || '산출물 폴더'}`, persona, cols: body.cols, rows: body.rows });
        }
        log(`터미널 열기: ${agent} (${opened.id})`);
        sendJson(res, 201, { ok: true, ...opened });
      } catch (e) {
        sendJson(res, 500, { error: `터미널을 열지 못했습니다: ${e.message}` });
      }
      return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/pty/')) {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 닫을 수 있습니다.' }); return; }
      sendJson(res, 200, { ok: killPty(decodeURIComponent(url.pathname.slice('/api/pty/'.length))) });
      return;
    }

    // ── 대화 탭 — 에이전트끼리 주고받은 메시지(받은 편지함 + 처리한 편지 .done). 읽기 전용 ──
    // ?limit=80(최대 200) &agent=<id> 면 그 사람이 보내거나 받은 것만. 본문은 앞 600자, 자료 울타리 안은 '(첨부 자료 생략)'.
    if (req.method === 'GET' && url.pathname === '/api/mail') {
      const limit = Math.max(1, Math.min(200, Math.floor(Number(url.searchParams.get('limit') || 80)) || 80));
      const agent = String(url.searchParams.get('agent') || '').trim();
      if (agent && !ALL_MAIL_IDS.includes(agent)) { sendJson(res, 404, { error: '없는 에이전트' }); return; }
      const list = await hive.listMail({ limit, agent });
      const messages = list.map((m) => {
        const pv = hive.mailPreview(m.body, 600);
        return { id: m.id, from: m.from || '', to: m.to || '', type: m.type || '', task: m.task || '', ts: m.at || '', body: pv.text, truncated: pv.truncated };
      });
      sendJson(res, 200, { messages, agent, limit });
      return;
    }

    // ── 브리핑 템플릿 — 기본 6개(코드, 한·영) + 사용자 저장(hive/templates.json). 바꾸는 요청은 이 PC 화면에서만 ──
    if (req.method === 'GET' && url.pathname === '/api/templates') {
      const q = url.searchParams.get('lang');
      const lang = q === 'ko' || q === 'en' ? q : (await getSettings()).lang;
      sendJson(res, 200, { templates: await listTemplates(lang), max: MAX_TEMPLATES, lang });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/templates') {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 템플릿을 저장할 수 있습니다.' }); return; }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      try {
        const t = await addTemplate(body || {}, String(body?.by || OWNER.id).trim() || OWNER.id);
        log(`템플릿 저장: ${t.id} ${t.title}`);
        sendJson(res, 201, { ok: true, template: t });
      } catch (e) { sendJson(res, 400, { error: e.message }); }
      return;
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/templates/')) {
      if (!sameOrigin(req)) { sendJson(res, 403, { error: '이 PC 의 AX Office 화면에서만 템플릿을 지울 수 있습니다.' }); return; }
      const id = decodeURIComponent(url.pathname.slice('/api/templates/'.length));
      try {
        const t = await removeTemplate(id, OWNER.id);
        log(`템플릿 삭제: ${t.id} ${t.title}`);
        sendJson(res, 200, { ok: true });
      } catch (e) { sendJson(res, e.status || 400, { error: e.message }); }
      return;
    }

    // ── 환경 점검 — {mode, cli:{found, version, path}, loggedIn, checked_at}. ?refresh=1 이면 다시 확인 ──
    if (req.method === 'GET' && url.pathname === '/api/env') {
      try {
        sendJson(res, 200, await envStatus(url.searchParams.get('refresh') === '1'));
      } catch (e) { sendJson(res, 500, { error: `환경을 확인하지 못했습니다: ${e.message}` }); }
      return;
    }

    // 특정 에이전트의 inbox (재하의 보고·승인 요청은 inbox/jaeha).
    if (req.method === 'GET' && url.pathname.startsWith('/api/inbox/')) {
      const agent = decodeURIComponent(url.pathname.slice('/api/inbox/'.length));
      if (!ALL_MAIL_IDS.includes(agent)) { sendJson(res, 404, { error: '없는 에이전트' }); return; }
      sendJson(res, 200, { agent, messages: (await hive.readInbox(agent)).slice(0, 50) });
      return;
    }

    // 재하의 승인·반려. by·reason 없으면 기록하지 않는다(행위자·사유 없는 결정은 없다).
    if (req.method === 'POST' && url.pathname === '/api/approve') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: '잘못된 JSON' }); return; }
      try {
        const a = await hive.resolveApproval(String(body.id || ''), { decision: body.decision, by: String(body.by || '').trim(), reason: String(body.reason || '').trim() });
        log(`승인 처리: ${a.id} → ${a.status} (${a.decided_by}: ${a.decision_reason})`);
        sendJson(res, 200, { ok: true, approval: a });
      } catch (e) {
        // 산출물이 승인 요청 뒤 바뀜 — 409 로 알리고(다시 확인하고 누르면 된다), 그 밖의 거절은 400
        if (e.code === 'artifact_changed') log(`승인 보류: ${body.id} — 승인 요청 뒤 산출물이 바뀜(다시 확인 필요)`);
        sendJson(res, e.code === 'artifact_changed' ? 409 : 400, { error: e.message, code: e.code || '' });
      }
      return;
    }

    // 브리핑 콘솔 → 파이프라인 착수. 즉시 202 응답 후 백그라운드 실행(오피스가 상태 폴링).
    if (req.method === 'POST' && url.pathname === '/api/instruct') {
      let instruction;
      try {
        instruction = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: '잘못된 JSON' });
        return;
      }
      if (!instruction || !instruction.title) {
        sendJson(res, 400, { error: 'title이 필요합니다.' });
        return;
      }
      // 실행 중이어도 거절하지 않고 대기열에 넣는다(Munder Difflin QUEUE). 앞 브리핑이 끝나면 차례로 돈다.
      const item = await enqueue({ kind: 'briefing', briefing: instruction, by: OWNER.id });
      if (item.duplicate) {
        log(`대기열: 같은 브리핑 중복 — ${item.id} "${instruction.title}" 그대로 둠`);
        sendJson(res, 200, { accepted: true, duplicate: true, queued: item.id, status: item.status, title: instruction.title });
        return;
      }
      const q = await loadQueue();
      const position = q.items.filter((i) => i.kind === 'briefing' && i.status === 'queued').findIndex((i) => i.id === item.id) + 1;
      log(`대기열: ${item.id} 브리핑 "${instruction.title}" (대기 ${position}번째${running() ? ', 앞 브리핑 실행 중' : ''})`);
      sendJson(res, 202, { accepted: true, queued: item.id, position, running: running(), title: instruction.title, mode: MODE, concurrency: await currentConcurrency() });
      return;
    }

    // 파일 첨부 업로드 → _inbox에 저장 후 산출물 폴더 기준 상대경로 반환. 브리핑 전송 시 attachments로 함께 보낸다.
    // 바이트 그대로 body로 받고 파일명은 X-File-Name 헤더(URL 인코딩)로 전달.
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      let buf;
      try {
        buf = await readBodyBuffer(req, MAX_UPLOAD);
      } catch (e) {
        sendJson(res, 413, { error: e.message });
        return;
      }
      if (!buf.length) { sendJson(res, 400, { error: '빈 파일입니다.' }); return; }
      let rawName = 'file';
      try { rawName = decodeURIComponent(req.headers['x-file-name'] || 'file'); } catch { /* 헤더 디코드 실패 시 기본명 */ }
      const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      // 폴더 첨부: X-Folder-Id(화면이 폴더 하나에 붙인 묶음 이름) + X-Rel-Path(폴더 안 상대경로) → _inbox/<묶음>/<상대경로>.
      // 경로 조각마다 safeName 을 거치고 '.'·'..' 은 버린다. 마지막에 _inbox 안인지 한 번 더 확인한다.
      let dest = path.join(INBOX_DIR, `${stamp}__${safeName(rawName)}`);
      if (req.headers['x-rel-path']) {
        let relRaw = '';
        let folderRaw = '';
        try { relRaw = decodeURIComponent(req.headers['x-rel-path']); folderRaw = decodeURIComponent(req.headers['x-folder-id'] || ''); } catch { /* 아래에서 거절 */ }
        const segs = relRaw.replace(/\\/g, '/').split('/').filter((x) => x && x !== '.' && x !== '..').map((x) => safeName(x));
        const folder = safeName(folderRaw).slice(0, 60);
        if (!segs.length || segs.length > 8 || !folder) { sendJson(res, 400, { error: '폴더 첨부 경로가 올바르지 않습니다.' }); return; }
        dest = path.join(INBOX_DIR, folder, ...segs);
      }
      if (!isInside(dest, INBOX_DIR)) { sendJson(res, 400, { error: '허용되지 않는 경로입니다.' }); return; }
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, buf);
      } catch (e) {
        sendJson(res, 500, { error: `저장 실패: ${e.message}` });
        return;
      }
      const rel = relData(dest);
      log(`첨부 수신: ${rawName} (${(buf.length / 1024).toFixed(0)}KB) → ${rel}`);
      sendJson(res, 200, { ok: true, name: rawName, path: rel, size: buf.length });
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res, url);
      return;
    }

    cors(res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  } catch (e) {
    log(`요청 처리 오류 ${req.method} ${url.pathname}: ${e?.stack || e}`);
    if (!res.headersSent) sendJson(res, 500, { error: '서버 오류' });
    else res.end();
  }
});

// ── 종료 — claude 자식 프로세스를 남기지 않는다 ──
let stopping = false;
function shutdown(why) {
  if (stopping) return;
  stopping = true;
  const n = killAllChildren();
  const t = killAllPty();
  log(`종료(${why}) — claude 자식 프로세스 ${n}개 · 터미널 ${t}개 정리`);
  server.close();
  setTimeout(() => process.exit(0), 300).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => { killAllChildren(); killAllPty(); });
// 설치형 앱: 부모(Electron)가 비정상 종료돼 stdin 파이프가 끊기면 같이 내려간다(고아 서버 방지).
if (process.env.OFFICE_EXIT_ON_STDIN_CLOSE === '1') {
  process.stdin.on('end', () => shutdown('부모 종료'));
  process.stdin.on('close', () => shutdown('부모 종료'));
  process.stdin.resume();
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`[office] 포트 ${PORT} 를 다른 프로그램이 쓰고 있습니다. PORT 를 바꾸거나 그 프로그램을 끄세요.`);
  else console.error(`[office] 서버 오류: ${e.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  await loadCustomAgents();
  await hive.ensureHive(ALL_MAIL_IDS);
  // 지난번에 돌다가 서버와 함께 끊긴 작업은 보류로 닫고, 남은 승인 대기는 이어서 지켜본다.
  const closed = await hive.closeInterrupted('서버 재시작으로 중단됨 — 필요하면 브리핑을 다시 보낼 것');
  if (closed.length) log(`지난 실행에서 끊긴 작업 ${closed.length}건을 보류로 닫음: ${closed.map((t) => t.id).join(', ')}`);
  await watchOrphanApprovals(log);
  // 대기열 일꾼 — 팀장 상주 세션(메시지)과 브리핑(한 번에 1건). 새 브리핑마다 이전 사무실 상태를 지우고 시작한다.
  await startQueue({
    mode: MODE, log,
    runBriefing: (b) => clearState().then(() => runBriefing(b, { setState: writeState, deliverablesRoot: DELIVERABLES_DIR, mode: MODE, log })),
    isLeaderPtyOpen: () => isAgentPtyOpen(LEADER.id),
  });
  await startTriggers({ log });
  await attachPtySocket(server, { allow: sameOrigin, log });
  const shown = HOST && HOST !== '0.0.0.0' ? HOST : 'localhost';
  log(`가동 — http://${shown}:${PORT}  (모드: ${MODE}, 동시 작업 ${await currentConcurrency()}건${HOST ? `, 바인딩 ${HOST}` : ''})`);
  {
    const saved = (await getSettings()).deliverables_dir;
    if (saved) {
      const r = await changeDeliverablesDir({ dir: saved });
      if (!r.ok) log(`경고: 설정한 산출물 위치(${saved})를 쓸 수 없어 기본 위치로 돕니다 — ${r.error}`);
    }
  }
  log(`데이터: hive=${HIVE_DIR} · 산출물=${DELIVERABLES_DIR}`);
  log(`화면: ${DIST_DIR}${(await fs.stat(path.join(DIST_DIR, 'index.html')).then(() => true).catch(() => false)) ? '' : ' (없음 — npm run build 필요)'}`);
  if (MODE === 'mock') log('mock 모드: 키 없이 배선만 검증(산출물은 목업, QA 내용검토 not_run). 실제 실행은 OFFICE_MODE=claude_code.');
  else if (MODE === 'claude_code') {
    const v = await claudeAvailable();
    if (v) log(`claude_code 모드: Claude Code CLI ${v} 사용(로그인된 계정의 구독 사용량). API 키 불필요. 실행 파일: ${claudeBinPath()}`);
    const keys = billingEnvPresent();
    if (keys.length && apiKeyAllowed()) log(`경고: ${keys.join(', ')} 가 있고 OFFICE_ALLOW_API_KEY=1 — 구독 대신 API 키로 인증되어 요금이 청구됩니다.`);
    else if (keys.length) log(`알림: 환경에 ${keys.join(', ')} 가 있어 claude 실행에는 빼고 넘깁니다(구독 사용량으로만). API 키로 돌리려면 OFFICE_ALLOW_API_KEY=1.`);
    else log('경고: claude_code 모드인데 claude CLI 를 찾지 못했습니다. 설치·로그인(claude) 후 다시 실행하세요. 더미로 바꿔 돌리지 않습니다.');
  } else if (!process.env.ANTHROPIC_API_KEY) log('경고: live 모드인데 ANTHROPIC_API_KEY가 없습니다.');
});
