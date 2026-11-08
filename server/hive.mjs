// hive — Wylie AX Office 의 공유 작업 공간(평문 파일).
// 팀장·역할 에이전트·대시보드가 전부 이 폴더의 파일만 읽고 쓴다. 메모리 상태는 두지 않는다.
//
//   <HIVE_DIR>/            기본 server/hive, OFFICE_HIVE_DIR 로 바꿀 수 있다(설치형 앱: 문서\Wylie AX Office\hive)
//     briefings/           재하가 보낸 브리핑 원문 (YYYYMMDD-HHmm_<제목>.json)
//     tasks.json           작업 원장: 작업(status)과 산출물 판정(gate)은 별도 필드
//     approvals.json       승인 대기 큐: 재하가 approve/reject 할 때까지 해당 작업은 멈춘다
//     inbox/<agent>/       받은 메시지 1건 = md 1파일 (front matter + 본문)
//     outbox/<agent>/      보낼 메시지. routeMail()이 수신자 inbox로 옮긴다
//     memory/<agent>.md    에이전트별 장기 기억(결정·배운 것·고객 선호), 작업 끝날 때 3줄 이내 추가
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

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';

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
export async function resolveApproval(id, { decision, by, reason }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('decision 은 approved | rejected');
  if (!by || !reason) throw new Error('승인·반려에는 by(행위자)와 reason(사유)이 필요합니다.');
  const a = await approvalLock(async () => {
    const q = await loadApprovals();
    const found = q.approvals.find((x) => x.id === id);
    if (!found) throw new Error(`승인 요청 ${id} 없음`);
    if (found.status !== 'pending') throw new Error(`이미 처리됨: ${found.status}`);
    Object.assign(found, { status: decision, decided_by: by, decided_at: nowIso(), decision_reason: reason });
    await writeJson(p('approvals.json'), q);
    return { ...found };
  });
  await appendEvent({ kind: 'approval', id: a.id, task: a.task, status: decision, by });
  return a;
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
/** 팀장 분해처럼 작업 레코드에 붙지 않는 호출 비용은 이벤트로 남긴다. */
export async function recordUsage({ agent, usd, briefing, what }) {
  if (!usd) return;
  await appendEvent({ kind: 'usage', agent, cost_usd: Number(Number(usd).toFixed(4)), briefing, what });
}

/**
 * 사용량 합계(달러 환산 추정치). 역할 실행 cost_usd 는 담당에게, QA cost_usd 는 고지표(go)에게,
 * usage 이벤트(팀장 분해)는 그 에이전트에게 더한다. 날짜는 이 PC 기준.
 */
export async function usageSummary({ qaAgent = 'go' } = {}) {
  const [ledger, events] = await Promise.all([loadTasks(), readAllEvents()]);
  const byAgent = {};
  const byDay = {};
  const byAgentDay = {};
  let total = 0;
  const add = (agent, usd, iso) => {
    const v = Number(usd) || 0;
    if (!v) return;
    const day = localDay(iso);
    total += v;
    byAgent[agent] = (byAgent[agent] || 0) + v;
    byDay[day] = (byDay[day] || 0) + v;
    byAgentDay[agent] = byAgentDay[agent] || {};
    byAgentDay[agent][day] = (byAgentDay[agent][day] || 0) + v;
  };
  for (const t of ledger.tasks) {
    add(t.owner, t.cost_usd, t.cost_at || t.updated || t.created);
    if (t.qa) add(qaAgent, t.qa.cost_usd, t.qa.at || t.updated || t.created);
  }
  for (const e of events) if (e.kind === 'usage') add(e.agent, e.cost_usd, e.ts);
  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v.toFixed(4))]));
  return {
    total: Number(total.toFixed(4)),
    byAgent: round(byAgent),
    byDay: round(byDay),
    byAgentDay: Object.fromEntries(Object.entries(byAgentDay).map(([k, v]) => [k, round(v)])),
    note: 'CLI 가 알려 준 추정 금액(구독 사용량 환산)이며 청구서가 아님',
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
