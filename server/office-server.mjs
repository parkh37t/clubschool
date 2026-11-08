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
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readState, writeState, clearState } from './state.mjs';
import { runBriefing, watchOrphanApprovals, CONCURRENCY } from './orchestrator.mjs';
import * as hive from './hive.mjs';
import { claudeAvailable, claudeBinPath, authStatus, openLoginWindow, killAllChildren } from './claudeCode.mjs';
import { ALL_MAIL_IDS, ROSTER, LEADER, AGENT_IDS, QA_AGENT } from './roster.mjs';
import { resolveSkills } from './skills.mjs';
import { DELIVERABLES_DIR, INBOX_DIR, DIST_DIR, HIVE_DIR, relData, isInside } from './paths.mjs';

const MAX_UPLOAD = 25 * 1024 * 1024; // 파일 첨부 상한 25MB

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.OFFICE_HOST || undefined; // 미지정 = 모든 인터페이스(기존 동작). 설치형 앱은 127.0.0.1
const MODE = ['live', 'claude_code', 'mock'].includes(process.env.OFFICE_MODE) ? process.env.OFFICE_MODE : 'mock';
if (process.env.OFFICE_MODE && !['live', 'claude_code', 'mock'].includes(process.env.OFFICE_MODE)) {
  console.error(`[office] OFFICE_MODE 값 오류: ${process.env.OFFICE_MODE} (mock | claude_code | live)`);
  process.exit(1);
}

let running = false; // 한 번에 브리핑 1건만(브리핑 안의 작업은 풀에서 동시에 돈다)

const log = (msg) => console.log(`[office] ${msg}`);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');
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
async function idleState() {
  const pending = await hive.pendingApprovals();
  return {
    stage: 0, phase: 'working', progress: 0, idle: true,
    agents: Object.fromEntries(AGENT_IDS.map((id) => [id, { state: 'idle', task: '' }])),
    concurrency: { limit: CONCURRENCY, running: 0 },
    hive: { briefing: '', tasks: [], pending, approvals: [], mail: [], leader: { id: LEADER.id, name: LEADER.name, state: 'idle', task: '' } },
  };
}

// ── 명단·스킬 ──
let skillCache = { at: 0, data: null };
async function skillsByAgent() {
  if (skillCache.data && Date.now() - skillCache.at < 60000) return skillCache.data;
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

const STATUS_RANK = { '진행': 3, '검수': 2, '승인대기': 1 };

/** 팀장 + 12인의 현재 상태. 작업 원장에서 유도한다(진행 > 검수 > 승인대기 > 대기). */
async function rosterView() {
  const [ledger, usage, skills, state] = await Promise.all([hive.loadTasks(), hive.usageSummary({ qaAgent: QA_AGENT }), skillsByAgent(), readState()]);
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
  const members = [
    { id: LEADER.id, name: LEADER.name, dept: '팀장', role: '브리핑 분해·배정·추적·보고', skills: [], stages: [],
      status: running && leader?.state === 'working' ? '진행' : '대기', task: running ? (leader?.task || '') : '', usd: usage.byAgent[LEADER.id] || 0 },
    ...ROSTER.map((a) => ({
      id: a.id, name: a.name, dept: a.dept, role: a.role, stages: a.stages, skills: skills[a.id] || [],
      status: now[a.id]?.status || '대기', task: now[a.id]?.task || '', usd: usage.byAgent[a.id] || 0,
    })),
  ];
  return { members, running, mode: MODE, concurrency: CONCURRENCY };
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // 오피스가 2초마다 폴링하는 상태. 브리핑 전이면 hive 에서 대기 상태를 만들어 준다.
    if (req.method === 'GET' && url.pathname === '/office-state.json') {
      sendJson(res, 200, (await readState()) || (await idleState()));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, mode: MODE, running, concurrency: CONCURRENCY, pending: (await hive.pendingApprovals()).length, desktop: process.env.OFFICE_DESKTOP === '1' });
      return;
    }

    // hive 스냅샷 — 작업 원장·승인 큐·메일 이벤트·현황판.
    if (req.method === 'GET' && url.pathname === '/api/hive') {
      const snap = await hive.snapshot({ events: 60 });
      sendJson(res, 200, { ...snap, blackboard: await hive.readBlackboard(), mode: MODE, running });
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
      sendJson(res, 200, { loggedIn: a.loggedIn, cli: a.cli, checked_at: a.checked_at, mode: MODE });
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
      sendJson(res, 200, await hive.usageSummary({ qaAgent: QA_AGENT }));
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
        sendJson(res, 400, { error: e.message });
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
      if (running) {
        sendJson(res, 409, { error: '이미 다른 브리핑을 실행 중입니다. 끝난 뒤 보내 주세요.' });
        return;
      }
      running = true;
      sendJson(res, 202, { accepted: true, title: instruction.title, mode: MODE, concurrency: CONCURRENCY });
      // 새 브리핑 → 이전 상태 초기화 후 실행.
      clearState()
        .then(() => runBriefing(instruction, { setState: writeState, deliverablesRoot: DELIVERABLES_DIR, mode: MODE, log }))
        .catch((err) => log(`오케스트레이션 오류: ${err?.stack || err}`))
        .finally(() => { running = false; });
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
      const stored = `${stamp}__${safeName(rawName)}`;
      try {
        await fs.mkdir(INBOX_DIR, { recursive: true });
        await fs.writeFile(path.join(INBOX_DIR, stored), buf); // safeName 보장 → _inbox 밖으로 못 나감
      } catch (e) {
        sendJson(res, 500, { error: `저장 실패: ${e.message}` });
        return;
      }
      const rel = relData(path.join(INBOX_DIR, stored));
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
  log(`종료(${why}) — claude 자식 프로세스 ${n}개 정리`);
  server.close();
  setTimeout(() => process.exit(0), 300).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => { killAllChildren(); });
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
  await hive.ensureHive(ALL_MAIL_IDS);
  // 지난번에 돌다가 서버와 함께 끊긴 작업은 보류로 닫고, 남은 승인 대기는 이어서 지켜본다.
  const closed = await hive.closeInterrupted('서버 재시작으로 중단됨 — 필요하면 브리핑을 다시 보낼 것');
  if (closed.length) log(`지난 실행에서 끊긴 작업 ${closed.length}건을 보류로 닫음: ${closed.map((t) => t.id).join(', ')}`);
  await watchOrphanApprovals(log);
  const shown = HOST && HOST !== '0.0.0.0' ? HOST : 'localhost';
  log(`가동 — http://${shown}:${PORT}  (모드: ${MODE}, 동시 작업 ${CONCURRENCY}건${HOST ? `, 바인딩 ${HOST}` : ''})`);
  log(`데이터: hive=${HIVE_DIR} · 산출물=${DELIVERABLES_DIR}`);
  log(`화면: ${DIST_DIR}${(await fs.stat(path.join(DIST_DIR, 'index.html')).then(() => true).catch(() => false)) ? '' : ' (없음 — npm run build 필요)'}`);
  if (MODE === 'mock') log('mock 모드: 키 없이 배선만 검증(산출물은 목업, QA 내용검토 not_run). 실제 실행은 OFFICE_MODE=claude_code.');
  else if (MODE === 'claude_code') {
    const v = await claudeAvailable();
    if (v) log(`claude_code 모드: Claude Code CLI ${v} 사용(로그인된 계정의 구독 사용량). API 키 불필요. 실행 파일: ${claudeBinPath()}`);
    else log('경고: claude_code 모드인데 claude CLI 를 찾지 못했습니다. 설치·로그인(claude) 후 다시 실행하세요. 더미로 바꿔 돌리지 않습니다.');
  } else if (!process.env.ANTHROPIC_API_KEY) log('경고: live 모드인데 ANTHROPIC_API_KEY가 없습니다.');
});
