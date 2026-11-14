// hive — Wylie AX Office 의 공유 작업 공간(평문 파일).
// 팀장·역할 에이전트·대시보드가 전부 이 폴더의 파일만 읽고 쓴다. 메모리 상태는 두지 않는다.
//
//   <HIVE_DIR>/            기본 server/hive, OFFICE_HIVE_DIR 로 바꿀 수 있다(설치형 앱: 문서\Wylie AX Office\hive)
//     briefings/           재하가 보낸 브리핑 원문 (YYYYMMDD-HHmm_<제목>.json)
//     tasks.json           작업 원장: 작업(status)과 산출물 판정(gate)은 별도 필드
//     approvals.json       승인 대기 큐: 재하가 approve/reject 할 때까지 해당 작업은 멈춘다
//     inbox/<agent>/       받은 메시지 1건 = md 1파일 (front matter + 본문)
//     outbox/<agent>/      보낼 메시지. routeMail()이 수신자 inbox로 옮긴다
//     inbox/<agent>/.done/ 처리한 메시지(Munder Difflin hive 규칙 — 작업이 끝나면 읽은 편지를 여기로 옮긴다)
//     memory/<agent>.md    에이전트별 장기 기억(결정·배운 것·고객 선호), 작업 끝날 때 3줄 이내 추가, 작업 시작 때 읽는다
//     questions.json       에이전트가 재하에게 묻는 질문(ask me)과 답
//     templates.json       사용자 브리핑 템플릿(templates.mjs, 최대 30개)
//     live/<task>.jsonl    역할 실행 실시간 기록(stream-json 요약). live/lead.jsonl = 팀장 상주 세션
//     blackboard.md        팀장이 갱신하는 공유 현황판
//     open_items.md        확정하지 못한 것(추측하지 않고 여기에 남긴다)
//     events.log           추가 전용 이벤트 로그(jsonl). 대시보드·봉투 애니메이션 원천
//
// 상태 값(고정):
//   task.status : 대기 | 진행 | 검수 | 승인대기 | 완료 | 보류 | 실패
//   task.gate   : 미점검 | PASS | CONDITIONAL | FAIL         (con-ai 의 작업/산출물 상태 분리 원칙)
//   approval.status : pending | approved | rejected
// 승인·반려·발번은 행위자(by)·시각(at)·사유(reason)가 전부 있어야 기록된다 (con-ai IdIssuance 규칙).
//
// 동시 작업: 작업 풀이 여러 작업을 함께 돌리므로 tasks.json·approvals.json 의 읽고-고치고-쓰기가 겹치면
// 서로 덮어쓴다. 그래서 파일마다 프로세스 안 잠금(쓰기 직렬화)을 두고, 갱신은 전부 그 잠금 안에서 한다.

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR, absData } from './paths.mjs';
import { weighted, addTokens } from './tokens.mjs';

export { HIVE_DIR };

export const TASK_STATUS = ['대기', '진행', '검수', '승인대기', '완료', '보류', '실패'];
export const GATE_VALUES = ['미점검', 'PASS', 'CONDITIONAL', 'FAIL'];
export const MSG_TYPES = ['assign', 'result', 'question', 'answer', 'approval', 'report'];
export const ACTIVE_STATUS = ['진행', '검수', '승인대기'];

const p = (...seg) => path.join(HIVE_DIR, ...seg);

// ── 쓰기 잠금 ──
// 앞 작업이 끝난 뒤 다음 작업을 시작하는 약속 사슬. 앞 작업이 실패해도 사슬은 이어진다.
function makeLock() {
  let tail = Promise.resolve();
  return (fn) => {
    const run = tail.then(() => fn());
    tail = run.catch(() => {});
    return run;
  };
}
const ledgerLock = makeLock(); // tasks.json (작업·메시지 번호·미확정 번호)
const approvalLock = makeLock(); // approvals.json
const appendLock = makeLock(); // events.log·memory·open_items 추가 쓰기
const routeLock = makeLock(); // outbox → inbox 이동(같은 파일을 두 번 옮기지 않게)
const questionLock = makeLock(); // questions.json

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function writeJson(file, obj) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  // 원자적 교체 — 대시보드가 반쯤 쓰인 파일을 읽지 않게. Windows 는 백신·동기화 프로그램이 파일을 잠깐 잡으면
  // rename 이 EPERM/EBUSY 로 실패하므로 몇 번 다시 시도한다.
  for (let i = 0; ; i++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (e) {
      if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await sleep(40 * (i + 1));
    }
  }
}

export function nowIso() {
  return new Date().toISOString();
}

/** ISO 시각 → 이 PC 기준 날짜(YYYY-MM-DD). 사용량 일별 합계에 쓴다. */
export function localDay(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function stamp(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
}

function safeSlug(s) {
  return String(s || 'task').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'task';
}

/** hive 폴더와 기본 파일을 만든다(있으면 그대로). 서버 시작 시 1회. */
export async function ensureHive(agentIds) {
  await fs.mkdir(p('briefings'), { recursive: true });
  await fs.mkdir(p('memory'), { recursive: true });
  for (const id of agentIds) {
    await fs.mkdir(p('inbox', id), { recursive: true });
    await fs.mkdir(p('outbox', id), { recursive: true });
  }
  if (!(await exists(p('tasks.json')))) await writeJson(p('tasks.json'), { seq: 0, tasks: [] });
  if (!(await exists(p('approvals.json')))) await writeJson(p('approvals.json'), { seq: 0, approvals: [] });
  if (!(await exists(p('blackboard.md')))) await fs.writeFile(p('blackboard.md'), '# 현황판\n\n(아직 브리핑이 없습니다)\n', 'utf8');
  if (!(await exists(p('open_items.md')))) await fs.writeFile(p('open_items.md'), '# 미확정 목록\n\n| 번호 | 항목 | 왜 필요한가 | 결정 전 진행 방법 | 출처 |\n| --- | --- | --- | --- | --- |\n', 'utf8');
  if (!(await exists(p('events.log')))) await fs.writeFile(p('events.log'), '', 'utf8');
}

async function exists(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}

// ── 이벤트 로그 ──
export function appendEvent(ev) {
  const line = JSON.stringify({ ts: nowIso(), ...ev });
  return appendLock(() => fs.appendFile(p('events.log'), line + '\n', 'utf8'));
}

async function readAllEvents() {
  try {
    const raw = await fs.readFile(p('events.log'), 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function readEvents(limit = 60) {
  return (await readAllEvents()).slice(-limit);
}

/** since(ISO) 이후 이벤트. since 가 없으면 최근 limit 건. 화면 활동 탭이 증분으로 읽는다. */
export async function readEventsSince(since, limit = 500) {
  const all = await readAllEvents();
  const after = since ? all.filter((e) => String(e.ts) > String(since)) : all;
  return after.slice(-limit);
}

// ── 브리핑 ──
export async function saveBriefing(briefing) {
  const id = `${stamp()}_${safeSlug(briefing.title)}`;
  const file = p('briefings', id + '.json');
  await writeJson(file, { id, received_at: nowIso(), ...briefing });
  await appendEvent({ kind: 'briefing', id, title: briefing.title });
  return { id, file };
}

// ── 작업 원장 ──
export async function loadTasks() {
  return readJson(p('tasks.json'), { seq: 0, tasks: [] });
}

async function saveTasks(ledger) {
  await writeJson(p('tasks.json'), ledger);
}

/** 작업 여러 건을 한 번에 등록한다(팀장 분해 결과). depends_on 은 같은 묶음 안의 순번(0부터) 또는 기존 id. */
export async function addTasks(briefingId, drafts) {
  const created = await ledgerLock(async () => {
    const ledger = await loadTasks();
    const ids = [];
    const made = [];
    for (const d of drafts) {
      ledger.seq += 1;
      const id = `T-${String(ledger.seq).padStart(4, '0')}`;
      ids.push(id);
      made.push({
        id,
        title: d.title,
        briefing: briefingId,
        owner: d.owner,
        stage: d.stage || '',
        status: '대기',
        gate: '미점검',
        needs_approval: Boolean(d.needs_approval),
        approval_reason: d.approval_reason || '',
        depends_on: [],
        _dep_refs: d.depends_on || [],
        input: d.input || '',
        done_when: d.done_when || '',
        // 작업별 스킬(있으면 담당의 기본 스킬 대신 쓴다)·표준 절차 표시(제안 프로세스의 어느 단계인지)
        ...(Array.isArray(d.skills) && d.skills.length ? { skills: d.skills.map(String) } : {}),
        ...(d.process ? { process: String(d.process), step: String(d.step || '') } : {}),
        ...(d.pack ? { pack: String(d.pack) } : {}),
        ...(Number.isInteger(d.slice) ? { slice: d.slice } : {}),
        ...(Number(d.cap_tokens) > 0 ? { cap_tokens: Math.round(Number(d.cap_tokens)) } : {}),
        // 팀장이 골라 붙인 등록 스킬(담당의 기본 스킬에 더해진다, 최대 3개)
        ...(Array.isArray(d.extra_skills) && d.extra_skills.length ? { extra_skills: d.extra_skills.map(String).slice(0, 3) } : {}),
        // 산출물을 함께 저장할 형식(견적 단계의 표 → 엑셀). 정해 둔 형식만 받는다
        ...(Array.isArray(d.export) && d.export.some((x) => x === 'xlsx') ? { export: ['xlsx'] } : {}),
        output: '',
        qa: null,
        created: nowIso(),
        updated: nowIso(),
      });
    }
    // 순번 참조를 실제 id 로 바꾼다. 자기 자신을 가리키는 참조는 영원히 시작하지 못하므로 버린다.
    made.forEach((t, i) => {
      t.depends_on = (t._dep_refs || []).map((r) => (typeof r === 'number' ? (r !== i ? ids[r] : null) : r)).filter(Boolean);
      delete t._dep_refs;
    });
    ledger.tasks.push(...made);
    await saveTasks(ledger);
    return made;
  });
  for (const t of created) await appendEvent({ kind: 'task', id: t.id, owner: t.owner, title: t.title, status: t.status });
  return created;
}

export async function updateTask(id, patch) {
  if (patch.status && !TASK_STATUS.includes(patch.status)) throw new Error(`상태 값 오류: ${patch.status}`);
  if (patch.gate && !GATE_VALUES.includes(patch.gate)) throw new Error(`gate 값 오류: ${patch.gate}`);
  const t = await ledgerLock(async () => {
    const ledger = await loadTasks();
    const found = ledger.tasks.find((x) => x.id === id);
    if (!found) throw new Error(`작업 ${id} 없음`);
    Object.assign(found, patch, { updated: nowIso() });
    await saveTasks(ledger);
    return { ...found };
  });
  await appendEvent({ kind: 'task', id: t.id, owner: t.owner, title: t.title, status: t.status, gate: t.gate });
  return t;
}

export async function getTask(id) {
  const ledger = await loadTasks();
  return ledger.tasks.find((x) => x.id === id) || null;
}

export async function tasksOf(briefingId) {
  const ledger = await loadTasks();
  return ledger.tasks.filter((t) => t.briefing === briefingId);
}

/** 선행 작업이 전부 완료된 대기 작업. 실행 순서는 이 함수가 정한다. */
export function readyTasks(tasks) {
  const done = new Set(tasks.filter((t) => t.status === '완료').map((t) => t.id));
  return tasks.filter((t) => t.status === '대기' && t.depends_on.every((d) => done.has(d)));
}

/**
 * 서버가 다시 켜졌을 때, 돌던 프로세스가 사라져 멈춘 작업(대기·진행·검수)을 보류로 닫는다.
 * 원장에 '진행' 이 남아 있으면 화면이 그 담당을 계속 일하는 중으로 보여 주기 때문이다. 승인대기는 그대로 둔다.
 */
export async function closeInterrupted(reason) {
  const closed = await ledgerLock(async () => {
    const ledger = await loadTasks();
    const hit = [];
    for (const t of ledger.tasks) {
      if (!['대기', '진행', '검수'].includes(t.status)) continue;
      t.status = '보류';
      t.qa = { ...(t.qa || {}), summary: reason };
      t.updated = nowIso();
      hit.push({ ...t });
    }
    if (hit.length) await saveTasks(ledger);
    return hit;
  });
  for (const t of closed) await appendEvent({ kind: 'task', id: t.id, owner: t.owner, title: t.title, status: t.status, gate: t.gate, note: reason });
  return closed;
}

// ── 메시지(메일함) ──
async function nextMsgId() {
  const seq = await ledgerLock(async () => {
    const ledger = await loadTasks();
    ledger.msgSeq = (ledger.msgSeq || 0) + 1;
    await saveTasks(ledger);
    return ledger.msgSeq;
  });
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `M-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${String(seq).padStart(4, '0')}`;
}

function renderMessage(m) {
  const fm = ['---', `id: ${m.id}`, `from: ${m.from}`, `to: ${m.to}`, `task: ${m.task || ''}`, `type: ${m.type}`, `stage: ${m.stage || ''}`, `due: ${m.due || ''}`, `at: ${m.at}`, '---'];
  return fm.join('\n') + '\n' + (m.body || '') + '\n';
}

export function parseMessage(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const head = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) head[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { ...head, body: m[2] };
}

/** outbox 에 메시지를 쓴다. 전달은 routeMail() 이 한다(라우터 1곳만 inbox 에 쓴다). */
export async function sendMessage({ from, to, task, type, stage, due, body }) {
  if (!MSG_TYPES.includes(type)) throw new Error(`메시지 유형 오류: ${type}`);
  const id = await nextMsgId();
  const m = { id, from, to, task, type, stage, due, at: nowIso(), body };
  await fs.mkdir(p('outbox', from), { recursive: true });
  const file = p('outbox', from, `${id}_${type}.md`);
  await fs.writeFile(file, renderMessage(m), 'utf8');
  return m;
}

/** 모든 outbox 를 수신자 inbox 로 옮기고 이벤트를 남긴다. 옮긴 메시지 목록을 돌려준다. */
export function routeMail() {
  return routeLock(async () => {
    const moved = [];
    let senders = [];
    try { senders = await fs.readdir(p('outbox')); } catch { return moved; }
    for (const from of senders) {
      const dir = p('outbox', from);
      let files = [];
      try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')); } catch { continue; }
      for (const f of files.sort()) {
        const raw = await fs.readFile(path.join(dir, f), 'utf8');
        const m = parseMessage(raw);
        if (!m || !m.to) continue;
        await fs.mkdir(p('inbox', m.to), { recursive: true });
        await fs.rename(path.join(dir, f), p('inbox', m.to, f));
        moved.push(m);
        await appendEvent({ kind: 'mail', id: m.id, from: m.from, to: m.to, type: m.type, task: m.task });
      }
    }
    return moved;
  });
}

/** 특정 에이전트의 inbox 에서 특정 작업의 메시지를 읽는다(최신순). */
export async function readInbox(agent, { task, type } = {}) {
  const dir = p('inbox', agent);
  let files = [];
  try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')); } catch { return []; }
  const out = [];
  for (const f of files.sort().reverse()) {
    const m = parseMessage(await fs.readFile(path.join(dir, f), 'utf8'));
    if (!m) continue;
    if (task && m.task !== task) continue;
    if (type && m.type !== type) continue;
    out.push(m);
  }
  return out;
}

/**
 * 안 읽은 편지 — 작업 시작 때 에이전트가 읽는다(hive 규칙). exclude 에 든 id(지금 배정 메시지 등)는 뺀다.
 * inbox/<agent>/ 바로 아래 .md 만 안 읽은 것이다(읽은 것은 .done/ 으로 옮겨져 있다).
 */
export async function unreadInbox(agent, { exclude = [] } = {}) {
  const all = await readInbox(agent);
  return all.filter((m) => !exclude.includes(m.id)).reverse(); // 오래된 것부터
}

/** 처리한 메시지를 inbox/<agent>/.done/ 으로 옮긴다. 옮긴 개수. */
export function markInboxDone(agent, ids) {
  return routeLock(async () => {
    const dir = p('inbox', agent);
    const done = path.join(dir, '.done');
    let files = [];
    try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md')); } catch { return 0; }
    await fs.mkdir(done, { recursive: true });
    let n = 0;
    for (const f of files) {
      if (!ids.some((id) => f.startsWith(id + '_'))) continue;
      try { await fs.rename(path.join(dir, f), path.join(done, f)); n += 1; } catch { /* 이미 옮겨졌을 수 있음 */ }
    }
    if (n) await appendEvent({ kind: 'inbox_done', agent, count: n });
    return n;
  });
}

// ── 메시지 목록(대화 탭) — 받은 편지함·처리한 편지(.done)·아직 옮기지 않은 outbox 를 모아 최근순으로 ──
// 메시지 파일은 한 번 쓰면 내용이 바뀌지 않고 자리만 옮겨지므로(outbox → inbox → .done) id 로 파싱 결과를 기억해 둔다.
const mailCache = new Map(); // id → parseMessage 결과
const MAIL_CACHE_MAX = 4000;
const MAIL_SCAN_MAX = 3000; // 담당 필터로 찾을 때 최대로 열어 볼 파일 수(아주 큰 hive 에서 멈추지 않게)
const MAIL_FILE = /^(M-(\d{8})-(\d+))_[a-z]+\.md$/;

async function mailFiles() {
  const out = [];
  for (const [root, withDone] of [['inbox', true], ['outbox', false]]) {
    let owners = [];
    try { owners = await fs.readdir(p(root)); } catch { continue; }
    for (const o of owners) {
      const dirs = withDone ? [p(root, o), p(root, o, '.done')] : [p(root, o)];
      for (const dir of dirs) {
        let files = [];
        try { files = await fs.readdir(dir); } catch { continue; }
        for (const f of files) {
          const m = MAIL_FILE.exec(f);
          // 정렬 키 = 날짜 × 1e6 + 번호. 번호(msgSeq)는 날짜가 바뀌어도 이어지지만, hive 를 보관 처리하면 1부터 다시 시작하므로 날짜를 앞에 둔다.
          if (m) out.push({ id: m[1], key: Number(m[2]) * 1e6 + Number(m[3]), file: path.join(dir, f) });
        }
      }
    }
  }
  return out;
}

/**
 * 최근 메시지 limit 건(최신순). agent 가 있으면 그 사람이 보내거나 받은 것만. 같은 id 는 한 번만.
 * 파일을 읽는 사이에 라우터가 옮겼으면(읽기 실패) 다른 자리의 같은 id 를 대신 읽는다.
 */
export async function listMail({ limit = 80, agent = '' } = {}) {
  const files = (await mailFiles()).sort((a, b) => b.key - a.key);
  const seen = new Set();
  const out = [];
  let scanned = 0;
  for (const f of files) {
    if (out.length >= limit || scanned >= MAIL_SCAN_MAX) break;
    if (seen.has(f.id)) continue;
    let m = mailCache.get(f.id);
    if (!m) {
      try { m = parseMessage(await fs.readFile(f.file, 'utf8')); } catch { m = null; }
      if (!m) continue;
      mailCache.set(f.id, m);
      if (mailCache.size > MAIL_CACHE_MAX) mailCache.delete(mailCache.keys().next().value);
    }
    seen.add(f.id);
    scanned += 1;
    if (agent && m.from !== agent && m.to !== agent) continue;
    out.push(m);
  }
  return out;
}

/** 대화 탭에 보일 본문 — 자료 울타리 안(고객 원문·기억·받은 편지)은 줄이고 앞 max 자만. 닫히지 않은 울타리는 끝까지 줄인다. */
export function mailPreview(body, max = 600) {
  const s = String(body || '').replace(/<<<자료 시작[^\n>]*>>>[\s\S]*?(?:<<<자료 끝>>>|$)/g, '(첨부 자료 생략)').trim();
  const cut = s.length > max;
  return { text: cut ? s.slice(0, max) + '…' : s, truncated: cut };
}

// ── 질문(ask me) — 에이전트가 재하에게 묻는 것. 작업을 멈추지 않는다(답은 다음 작업 때 inbox 로 읽힌다) ──
export async function loadQuestions() {
  return readJson(p('questions.json'), { seq: 0, questions: [] });
}

export async function addQuestion({ from, task, text, briefing }) {
  const q = await questionLock(async () => {
    const book = await loadQuestions();
    book.seq += 1;
    const item = { id: `Q-${String(book.seq).padStart(4, '0')}`, from, task: task || '', briefing: briefing || '', text: String(text || '').slice(0, 1000), status: 'open', asked_at: nowIso(), answer: null, answered_by: null, answered_at: null };
    book.questions.push(item);
    await writeJson(p('questions.json'), book);
    return item;
  });
  await appendEvent({ kind: 'question', id: q.id, from: q.from, task: q.task });
  return q;
}

/** 재하의 답. by·answer 가 없으면 거부. 답은 질문한 에이전트 inbox 로 간다(호출하는 쪽에서 메시지 발송). */
export async function answerQuestion(id, { answer, by }) {
  if (!answer || !by) throw new Error('답과 답한 사람(by)이 필요합니다.');
  const q = await questionLock(async () => {
    const book = await loadQuestions();
    const found = book.questions.find((x) => x.id === id);
    if (!found) throw new Error(`질문 ${id} 없음`);
    if (found.status !== 'open') throw new Error(`이미 답함: ${found.id}`);
    Object.assign(found, { status: 'answered', answer: String(answer).slice(0, 2000), answered_by: by, answered_at: nowIso() });
    await writeJson(p('questions.json'), book);
    return { ...found };
  });
  await appendEvent({ kind: 'question', id: q.id, from: q.from, task: q.task, status: 'answered', by });
  return q;
}

// ── 실시간 기록(live) — 역할 실행 stream-json 을 줄 단위 요약으로 남긴다 ──
const safeStream = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) || 'misc';

export function appendLive(stream, entry) {
  const line = JSON.stringify({ ts: nowIso(), ...entry });
  return appendLock(async () => {
    await fs.mkdir(p('live'), { recursive: true });
    await fs.appendFile(p('live', safeStream(stream) + '.jsonl'), line + '\n', 'utf8');
  });
}

/** after 번째 줄 다음부터(0부터). { lines, next } */
export async function readLive(stream, after = 0, limit = 400) {
  try {
    const raw = await fs.readFile(p('live', safeStream(stream) + '.jsonl'), 'utf8');
    const all = raw.split('\n').filter(Boolean);
    const from = Math.max(0, Number(after) || 0);
    const lines = all.slice(from, from + limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    return { lines, next: from + lines.length, total: all.length };
  } catch {
    return { lines: [], next: 0, total: 0 };
  }
}

/**
 * 실행 중인 작업의 지금까지 사용 토큰 — live 파일 끝의 마지막 'usage' 줄(live.mjs 가 실행 중에 남긴다).
 * 같은 작업이 여러 번 돌았을 수 있으므로 마지막 실행(마지막 'start' 뒤)만 본다. 끝난 실행이면 0.
 * 파일 전체가 아니라 끝 32KB 만 읽는다(화면 위 막대가 몇 초마다 부른다).
 */
export async function liveTokens(stream) {
  let fh;
  try {
    fh = await fs.open(p('live', safeStream(stream) + '.jsonl'), 'r');
    const { size } = await fh.stat();
    const len = Math.min(size, 32768);
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n').reverse();
    for (const l of lines) {
      if (!/"k":"(usage|start|end)"/.test(l)) continue;
      try {
        const e = JSON.parse(l);
        if (e.k === 'usage') return Number(e.tokens) || 0;
        return 0; // start(아직 응답 전) 또는 end(끝난 실행)
      } catch { /* 잘린 첫 줄 */ }
    }
    return 0;
  } catch {
    return 0;
  } finally {
    await fh?.close().catch(() => {});
  }
}

// ── 구독 사용 한도 — Claude Code 가 실행마다 알려 주는 rate_limit_event 의 마지막 값(limits.json) ──
// 창(window)마다 따로 남긴다: 한 이벤트에 주간 창만 오고 다음 이벤트에 5시간 창이 와도 둘 다 보이게. 계정·세션 정보는 남기지 않는다.
const limitsLock = makeLock();
const isoFromEpoch = (s) => (Number(s) > 0 ? new Date(Number(s) * 1000).toISOString() : '');

export function recordLimits(info) {
  if (!info || typeof info !== 'object') return Promise.resolve(null);
  return limitsLock(async () => {
    const prev = await readJson(p('limits.json'), { windows: {} });
    const at = nowIso();
    const windows = { ...(prev.windows || {}) };
    for (const [k, w] of Object.entries(info.unifiedWindows || {})) {
      if (!w || typeof w !== 'object' || !/^[a-z0-9_]{1,40}$/i.test(k)) continue;
      const u = Number(w.utilization);
      windows[k] = { utilization: Number.isFinite(u) ? Math.max(0, Math.min(u, 2)) : null, resets_at: isoFromEpoch(w.resetsAt), status: String(w.status || '').slice(0, 30), at };
    }
    // 창 정보가 없는 옛 형식 — 대표 창 하나만 상태·재설정 시각으로 남긴다
    if (!Object.keys(info.unifiedWindows || {}).length && info.rateLimitType && /^[a-z0-9_]{1,40}$/i.test(info.rateLimitType)) {
      windows[info.rateLimitType] = { ...(windows[info.rateLimitType] || {}), utilization: windows[info.rateLimitType]?.utilization ?? null, resets_at: isoFromEpoch(info.resetsAt), status: String(info.status || '').slice(0, 30), at };
    }
    const rec = {
      at, status: String(info.status || '').slice(0, 30), type: String(info.rateLimitType || '').slice(0, 40),
      resets_at: isoFromEpoch(info.resetsAt), overage: Boolean(info.isUsingOverage), windows,
    };
    await fs.mkdir(HIVE_DIR, { recursive: true });
    await writeJson(p('limits.json'), rec);
    return rec;
  });
}

export async function loadLimits() {
  return readJson(p('limits.json'), null);
}

// ── 승인 큐 ──
export async function loadApprovals() {
  return readJson(p('approvals.json'), { seq: 0, approvals: [] });
}

export async function requestApproval({ task, kind, reason, payload }) {
  const a = await approvalLock(async () => {
    const q = await loadApprovals();
    q.seq += 1;
    const item = {
      id: `A-${String(q.seq).padStart(4, '0')}`,
      task,
      kind, // 외부발송 | 비용 | 삭제 | 범위변경 | 수치확정 | 산출물승인
      reason,
      payload: payload || null,
      requested_at: nowIso(),
      status: 'pending',
      decided_by: null,
      decided_at: null,
      decision_reason: null,
    };
    q.approvals.push(item);
    await writeJson(p('approvals.json'), q);
    return item;
  });
  await appendEvent({ kind: 'approval', id: a.id, task, status: 'pending', approval_kind: kind });
  return a;
}

/** 재하의 결정. by·reason 이 없으면 거부한다(행위자·사유 없는 승인은 기록하지 않는다). */
/** 파일 내용의 sha256(16진). 없으면 null. 승인을 '그때 그 산출물'에 묶는 데 쓴다. */
export async function fileHash(file) {
  try {
    return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  } catch {
    return null;
  }
}

export async function resolveApproval(id, { decision, by, reason }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('decision 은 approved | rejected');
  if (!by || !reason) throw new Error('승인·반려에는 by(행위자)와 reason(사유)이 필요합니다.');
  const a = await approvalLock(async () => {
    const q = await loadApprovals();
    const found = q.approvals.find((x) => x.id === id);
    if (!found) throw new Error(`승인 요청 ${id} 없음`);
    if (found.status !== 'pending') throw new Error(`이미 처리됨: ${found.status}`);
    // 승인은 요청 때의 산출물에 묶는다 — 그 뒤 파일이 바뀌었으면 이번 승인은 받지 않고 지문을 지금 것으로 바꿔 둔다
    // (다시 확인하고 한 번 더 누르면 승인된다). 반려는 내용과 상관없이 받는다.
    let approvedHash = '';
    if (decision === 'approved' && found.payload?.artifact_hash && found.payload?.output) {
      const now = await fileHash(absData(found.payload.output));
      if (!now) throw Object.assign(new Error(`산출물 파일이 없어 승인할 수 없습니다: ${found.payload.output}`), { code: 'artifact_missing' });
      if (now !== found.payload.artifact_hash) {
        found.payload = { ...found.payload, artifact_hash: now, changed_at: nowIso(), changed_from: found.payload.artifact_hash };
        await writeJson(p('approvals.json'), q);
        throw Object.assign(new Error('승인 요청 뒤 산출물이 바뀌었습니다. 바뀐 내용을 확인한 뒤 다시 승인하세요(지문을 새 파일로 바꿔 두었습니다).'), { code: 'artifact_changed' });
      }
      approvedHash = now;
    }
    Object.assign(found, { status: decision, decided_by: by, decided_at: nowIso(), decision_reason: reason, ...(approvedHash ? { approved_hash: approvedHash } : {}) });
    await writeJson(p('approvals.json'), q);
    return { ...found };
  });
  await appendEvent({ kind: 'approval', id: a.id, task: a.task, status: decision, by });
  return a;
}

/** 승인 레코드 하나(없으면 null). */
export async function approvalRecord(id) {
  return (await loadApprovals()).approvals.find((x) => x.id === id) || null;
}

/** 승인이 날 때까지 기다린다. 타임아웃이면 'timeout'. 파일을 폴링하므로 서버 재시작 후에도 이어진다. */
export async function waitForApproval(id, { pollMs = 2000, timeoutMs = 0, onTick } = {}) {
  const started = Date.now();
  for (;;) {
    const q = await loadApprovals();
    const a = q.approvals.find((x) => x.id === id);
    if (!a) return 'missing';
    if (a.status !== 'pending') return a.status;
    if (timeoutMs && Date.now() - started > timeoutMs) return 'timeout';
    if (onTick) await onTick(a);
    await sleep(pollMs);
  }
}

export async function pendingApprovals() {
  const q = await loadApprovals();
  return q.approvals.filter((a) => a.status === 'pending');
}

// ── 메모리 ──
export async function readMemory(agent) {
  try { return await fs.readFile(p('memory', `${agent}.md`), 'utf8'); } catch { return ''; }
}

export async function appendMemory(agent, lines, { taskId } = {}) {
  const items = (Array.isArray(lines) ? lines : [lines]).map((s) => String(s || '').trim()).filter(Boolean).slice(0, 3);
  if (!items.length) return;
  const head = `\n## ${nowIso().slice(0, 10)}${taskId ? ` · ${taskId}` : ''}\n`;
  await appendLock(() => fs.appendFile(p('memory', `${agent}.md`), head + items.map((s) => `- ${s}`).join('\n') + '\n', 'utf8'));
}

// ── 현황판·미확정 ──
export async function writeBlackboard(md) {
  await fs.writeFile(p('blackboard.md'), md, 'utf8');
}

export async function readBlackboard() {
  try { return await fs.readFile(p('blackboard.md'), 'utf8'); } catch { return ''; }
}

export async function appendOpenItem({ item, why, meanwhile, source }) {
  const seq = await ledgerLock(async () => {
    const q = await loadTasks();
    q.openSeq = (q.openSeq || 0) + 1;
    await saveTasks(q);
    return q.openSeq;
  });
  const row = `| U-${String(seq).padStart(3, '0')} | ${item} | ${why || ''} | ${meanwhile || ''} | ${source || ''} |\n`;
  await appendLock(() => fs.appendFile(p('open_items.md'), row, 'utf8'));
}

// ── 사용량 ──
/** 작업 원장 밖에서 쓴 사용량(팀장 분해·상주 세션). tokens = {in,cw,cr,out}, usd 는 API 환산 참고값. */
export async function recordUsage({ agent, tokens, usd = 0, briefing, what }) {
  const t = tokens || { in: 0, cw: 0, cr: 0, out: 0 };
  if (!weighted(t) && !Number(usd)) return;
  await appendEvent({ kind: 'usage', agent, tokens: t, tokens_w: weighted(t), cost_usd: Number(Number(usd || 0).toFixed(4)), briefing, what });
}

/**
 * 사용량 합계 — 사용 토큰(tokens.mjs). 역할 실행은 담당에게, QA 판정은 고지표(go)에게, 원장 밖 사용(usage 이벤트)은 그 에이전트에게.
 * 토큰을 기록하기 전(금액만 남은) 작업은 토큰 합계에 넣지 못하므로 따로 센다(untracked). usd_ref 는 API 환산 참고 합계.
 */
export async function usageSummary({ qaAgent = 'go' } = {}) {
  const [ledger, events] = await Promise.all([loadTasks(), readAllEvents()]);
  const byAgent = {};
  const byDay = {};
  const byAgentDay = {};
  let total = 0;
  let parts = { in: 0, cw: 0, cr: 0, out: 0 };
  let partsToday = { in: 0, cw: 0, cr: 0, out: 0 };
  let usdRef = 0;
  let untracked = 0;
  const today = localDay();
  const add = (agent, tokens, usd, iso) => {
    const w = weighted(tokens);
    usdRef += Number(usd) || 0;
    if (!w) { if (Number(usd)) untracked += 1; return; }
    const day = localDay(iso);
    total += w;
    parts = addTokens(parts, tokens);
    if (day === today) partsToday = addTokens(partsToday, tokens);
    byAgent[agent] = (byAgent[agent] || 0) + w;
    byDay[day] = (byDay[day] || 0) + w;
    byAgentDay[agent] = byAgentDay[agent] || {};
    byAgentDay[agent][day] = (byAgentDay[agent][day] || 0) + w;
  };
  for (const t of ledger.tasks) {
    add(t.owner, t.tokens, t.cost_usd, t.cost_at || t.updated || t.created);
    if (t.qa) add(qaAgent, t.qa.tokens, t.qa.cost_usd, t.qa.at || t.updated || t.created);
  }
  for (const e of events) if (e.kind === 'usage') add(e.agent, e.tokens, e.cost_usd, e.ts);
  return {
    total, byAgent, byDay, byAgentDay, parts, parts_today: partsToday,
    usd_ref: Number(usdRef.toFixed(2)), untracked,
    note: '구독 사용 토큰(입력 + 캐시 생성 + 출력 + 캐시 읽기÷10). 금액(usd_ref)은 API 단가 환산 참고값이며 청구액이 아님',
  };
}

/** 대시보드·가상 사무실이 한 번에 읽는 스냅샷. */
export async function snapshot({ events = 40 } = {}) {
  const [ledger, q, ev] = await Promise.all([loadTasks(), loadApprovals(), readEvents(events)]);
  return {
    ts: nowIso(),
    tasks: ledger.tasks,
    approvals: q.approvals,
    pending: q.approvals.filter((a) => a.status === 'pending'),
    mail: ev.filter((e) => e.kind === 'mail'),
    events: ev,
  };
}
