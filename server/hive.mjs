// hive — Wylie AX Office 의 공유 작업 공간(평문 파일).
// 팀장·역할 에이전트·대시보드가 전부 이 폴더의 파일만 읽고 쓴다. 메모리 상태는 두지 않는다.
//
//   server/hive/
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

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HIVE_DIR = path.join(HERE, 'hive');

export const TASK_STATUS = ['대기', '진행', '검수', '승인대기', '완료', '보류', '실패'];
export const GATE_VALUES = ['미점검', 'PASS', 'CONDITIONAL', 'FAIL'];
export const MSG_TYPES = ['assign', 'result', 'question', 'answer', 'approval', 'report'];

const p = (...seg) => path.join(HIVE_DIR, ...seg);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, obj) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.rename(tmp, file); // 원자적 교체 — 대시보드가 반쯤 쓰인 파일을 읽지 않게
}

export function nowIso() {
  return new Date().toISOString();
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
export async function appendEvent(ev) {
  const line = JSON.stringify({ ts: nowIso(), ...ev });
  await fs.appendFile(p('events.log'), line + '\n', 'utf8');
}

export async function readEvents(limit = 60) {
  try {
    const raw = await fs.readFile(p('events.log'), 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
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
  const ledger = await loadTasks();
  const ids = [];
  const created = [];
  for (const d of drafts) {
    ledger.seq += 1;
    const id = `T-${String(ledger.seq).padStart(4, '0')}`;
    ids.push(id);
    created.push({
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
  // 순번 참조를 실제 id 로 바꾼다
  for (const t of created) {
    t.depends_on = (t._dep_refs || []).map((r) => (typeof r === 'number' ? ids[r] : r)).filter(Boolean);
    delete t._dep_refs;
  }
  ledger.tasks.push(...created);
  await saveTasks(ledger);
  for (const t of created) await appendEvent({ kind: 'task', id: t.id, owner: t.owner, title: t.title, status: t.status });
  return created;
}

export async function updateTask(id, patch) {
  const ledger = await loadTasks();
  const t = ledger.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`작업 ${id} 없음`);
  if (patch.status && !TASK_STATUS.includes(patch.status)) throw new Error(`상태 값 오류: ${patch.status}`);
  if (patch.gate && !GATE_VALUES.includes(patch.gate)) throw new Error(`gate 값 오류: ${patch.gate}`);
  Object.assign(t, patch, { updated: nowIso() });
  await saveTasks(ledger);
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

// ── 메시지(메일함) ──
async function nextMsgId() {
  const ledger = await loadTasks();
  ledger.msgSeq = (ledger.msgSeq || 0) + 1;
  await saveTasks(ledger);
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `M-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${String(ledger.msgSeq).padStart(4, '0')}`;
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
export async function routeMail() {
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
  const q = await loadApprovals();
  q.seq += 1;
  const a = {
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
  q.approvals.push(a);
  await writeJson(p('approvals.json'), q);
  await appendEvent({ kind: 'approval', id: a.id, task, status: 'pending', approval_kind: kind });
  return a;
}

/** 재하의 결정. by·reason 이 없으면 거부한다(행위자·사유 없는 승인은 기록하지 않는다). */
export async function resolveApproval(id, { decision, by, reason }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('decision 은 approved | rejected');
  if (!by || !reason) throw new Error('승인·반려에는 by(행위자)와 reason(사유)이 필요합니다.');
  const q = await loadApprovals();
  const a = q.approvals.find((x) => x.id === id);
  if (!a) throw new Error(`승인 요청 ${id} 없음`);
  if (a.status !== 'pending') throw new Error(`이미 처리됨: ${a.status}`);
  Object.assign(a, { status: decision, decided_by: by, decided_at: nowIso(), decision_reason: reason });
  await writeJson(p('approvals.json'), q);
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
    await new Promise((r) => setTimeout(r, pollMs));
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
  await fs.appendFile(p('memory', `${agent}.md`), head + items.map((s) => `- ${s}`).join('\n') + '\n', 'utf8');
}

// ── 현황판·미확정 ──
export async function writeBlackboard(md) {
  await fs.writeFile(p('blackboard.md'), md, 'utf8');
}

export async function appendOpenItem({ item, why, meanwhile, source }) {
  const q = await loadTasks();
  q.openSeq = (q.openSeq || 0) + 1;
  await saveTasks(q);
  const row = `| U-${String(q.openSeq).padStart(3, '0')} | ${item} | ${why || ''} | ${meanwhile || ''} | ${source || ''} |\n`;
  await fs.appendFile(p('open_items.md'), row, 'utf8');
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
