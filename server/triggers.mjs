// 예약(트리거) — 정해진 시각에 브리핑을 대기열에 넣는다(예: 매주 월요일 09:00 주간보고).
//
//   저장   hive/triggers.json. 재하가 화면(예약 탭)에서 만들고 켜고 끄고 지운다.
//   실행   앱(서버)이 켜져 있을 때만 돈다. 20초마다 시각이 된 예약을 찾아 브리핑 대기열에 넣는다(by=예약을 만든 사람, source=R-id).
//          꺼져 있던 동안 지난 예약은 뒤늦게 돌리지 않고 '놓침'으로 남긴 뒤 다음 시각으로 넘긴다(몰아서 비용이 나가지 않게).
//          같은 예약의 브리핑이 아직 대기 중이면 또 넣지 않고 놓침으로 남긴다.
//   제목   실행할 때 제목 끝에 날짜를 붙인다 — 매주 같은 제목이면 같은 과제 폴더를 덮어쓰기 때문.
//   시간   이 PC 의 현지 시각 기준.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';
import * as hive from './hive.mjs';
import { enqueue, loadQueue } from './leaderSession.mjs';
import { OWNER } from './roster.mjs';

const FILE = path.join(HIVE_DIR, 'triggers.json');
export const MAX_TRIGGERS = 20;
const TICK_MS = 20000;

let tail = Promise.resolve();
const lock = (fn) => { const run = tail.then(fn); tail = run.catch(() => {}); return run; };

async function load() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { seq: 0, triggers: [] }; }
}
async function save(d) {
  await fs.mkdir(HIVE_DIR, { recursive: true });
  await fs.writeFile(FILE + '.tmp', JSON.stringify(d, null, 2), 'utf8');
  await fs.rename(FILE + '.tmp', FILE);
}

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 다음 실행 시각(현지). 없으면 null(한 번짜리가 지났거나 잘못된 일정). */
export function nextRun(schedule, from = new Date()) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(schedule?.time || ''));
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const at = (base, addDays) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays, hh, mm, 0, 0);
  if (schedule.kind === 'once') {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(schedule.date || ''));
    if (!dm) return null;
    const d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), hh, mm, 0, 0);
    return d > from ? d : null;
  }
  if (schedule.kind === 'daily') {
    const today = at(from, 0);
    return today > from ? today : at(from, 1);
  }
  if (schedule.kind === 'weekly') {
    const days = Array.isArray(schedule.days) ? schedule.days : [];
    for (let i = 0; i <= 7; i += 1) {
      const c = at(from, i);
      if (days.includes(c.getDay()) && c > from) return c;
    }
  }
  return null;
}

/** 화면에서 받은 값을 검사·정리한다. 브리핑 4요소 중 결과가 없으면 받지 않는다(팀장이 나눌 수 없으므로). */
export function cleanTrigger(input) {
  const title = String(input?.title || '').trim().slice(0, 80);
  if (!title) return { error: '예약 이름이 필요합니다.' };
  const b = input?.briefing || {};
  const result = String(b.result || '').trim().slice(0, 2000);
  if (!result) return { error: '결과(끝나면 손에 쥘 것)가 필요합니다.' };
  const s = input?.schedule || {};
  const kind = ['weekly', 'daily', 'once'].includes(s.kind) ? s.kind : '';
  if (!kind) return { error: '반복 방식(매주·매일·한 번)을 고르세요.' };
  const tm = /^(\d{2}):(\d{2})$/.exec(String(s.time || ''));
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) return { error: '시각은 HH:MM 형식이어야 합니다.' };
  const schedule = { kind, time: s.time };
  if (kind === 'weekly') {
    const days = [...new Set((Array.isArray(s.days) ? s.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    if (!days.length) return { error: '요일을 하나 이상 고르세요.' };
    schedule.days = days;
  }
  if (kind === 'once') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.date || ''))) return { error: '날짜를 고르세요.' };
    schedule.date = s.date;
    if (!nextRun(schedule)) return { error: '한 번 실행할 시각이 이미 지났습니다.' };
  }
  const constraints = (Array.isArray(b.constraints) ? b.constraints : String(b.constraints || '').split('\n'))
    .map((x) => String(x).trim()).filter(Boolean).slice(0, 20).map((x) => x.slice(0, 300));
  return {
    value: {
      title,
      schedule,
      briefing: {
        title: String(b.title || title).trim().slice(0, 80) || title,
        result,
        context: String(b.context || '').trim().slice(0, 20000),
        constraints,
        question_policy: String(b.question_policy || '').trim().slice(0, 300) || '내 결정이 꼭 필요할 때만 물을 것',
      },
    },
  };
}

export async function listTriggers() {
  return (await load()).triggers;
}

export function addTrigger(input, by) {
  return lock(async () => {
    const c = cleanTrigger(input);
    if (c.error) throw new Error(c.error);
    const d = await load();
    if (d.triggers.length >= MAX_TRIGGERS) throw new Error(`예약은 ${MAX_TRIGGERS}개까지입니다.`);
    d.seq += 1;
    const next = nextRun(c.value.schedule);
    const t = {
      id: `R-${String(d.seq).padStart(4, '0')}`, ...c.value, enabled: true, by,
      created: hive.nowIso(), updated: hive.nowIso(),
      next_run: next ? next.toISOString() : null, last_run: null, last_item: '', runs: 0, last_missed: null,
    };
    d.triggers.push(t);
    await save(d);
    await hive.appendEvent({ kind: 'trigger', action: 'add', id: t.id, title: t.title, by });
    return t;
  });
}

/** 켜기·끄기만 바꾸거나({enabled}), 내용 전체를 바꾼다(title·schedule·briefing). */
export function updateTrigger(id, patch, by) {
  return lock(async () => {
    const d = await load();
    const t = d.triggers.find((x) => x.id === id);
    if (!t) throw new Error(`없는 예약: ${id}`);
    if (patch.title !== undefined || patch.schedule !== undefined || patch.briefing !== undefined) {
      const c = cleanTrigger({ title: patch.title ?? t.title, schedule: patch.schedule ?? t.schedule, briefing: patch.briefing ?? t.briefing });
      if (c.error) throw new Error(c.error);
      Object.assign(t, c.value);
    }
    if (typeof patch.enabled === 'boolean') t.enabled = patch.enabled;
    const next = t.enabled ? nextRun(t.schedule) : null;
    t.next_run = next ? next.toISOString() : null;
    t.updated = hive.nowIso();
    await save(d);
    await hive.appendEvent({ kind: 'trigger', action: typeof patch.enabled === 'boolean' && Object.keys(patch).length === 1 ? (t.enabled ? 'on' : 'off') : 'update', id, title: t.title, by });
    return t;
  });
}

export function removeTrigger(id, by) {
  return lock(async () => {
    const d = await load();
    const t = d.triggers.find((x) => x.id === id);
    if (!t) throw new Error(`없는 예약: ${id}`);
    d.triggers = d.triggers.filter((x) => x.id !== id);
    await save(d);
    await hive.appendEvent({ kind: 'trigger', action: 'delete', id, title: t.title, by });
    return t;
  });
}

/** 예약의 브리핑을 대기열에 넣는다. 같은 예약의 브리핑이 아직 대기 중이면 넣지 않는다. */
async function fire(t, now) {
  const q = await loadQueue();
  if (q.items.some((i) => i.kind === 'briefing' && i.status === 'queued' && i.source === t.id)) {
    return { skipped: true };
  }
  const briefing = { ...t.briefing, title: `${t.briefing.title} ${localDay(now)}`, trigger: t.id };
  const item = await enqueue({ kind: 'briefing', briefing, by: t.by || OWNER.id, source: t.id });
  return { item };
}

export function runTriggerNow(id, by) {
  return lock(async () => {
    const d = await load();
    const t = d.triggers.find((x) => x.id === id);
    if (!t) throw new Error(`없는 예약: ${id}`);
    const now = new Date();
    const r = await fire(t, now);
    if (r.skipped) throw new Error('이 예약의 브리핑이 아직 대기열에 있습니다.');
    t.last_run = now.toISOString();
    t.last_item = r.item.id;
    t.runs = (t.runs || 0) + 1;
    await save(d);
    await hive.appendEvent({ kind: 'trigger', action: 'run', id, title: t.title, item: r.item.id, why: 'manual', by });
    return { trigger: t, item: r.item };
  });
}

/** 서버 시작 시 1회. 꺼져 있던 동안 지난 예약은 놓침으로 남기고 다음 시각으로 넘긴 뒤, 20초마다 확인한다. */
export async function startTriggers({ log }) {
  await lock(async () => {
    const d = await load();
    const now = new Date();
    let changed = false;
    for (const t of d.triggers) {
      if (!t.enabled) continue;
      if (t.next_run && new Date(t.next_run) <= now) {
        t.last_missed = t.next_run;
        const next = nextRun(t.schedule, now);
        t.next_run = next ? next.toISOString() : null;
        if (!next) t.enabled = false; // 지나간 한 번짜리
        changed = true;
        log(`예약 놓침(앱이 꺼져 있었음): ${t.id} ${t.title} — ${t.last_missed}`);
        await hive.appendEvent({ kind: 'trigger', action: 'missed', id: t.id, title: t.title, at: t.last_missed });
      } else if (!t.next_run) {
        const next = nextRun(t.schedule, now);
        if (next) { t.next_run = next.toISOString(); changed = true; }
      }
    }
    if (changed) await save(d);
  });

  const tick = () => lock(async () => {
    const d = await load();
    const now = new Date();
    let changed = false;
    for (const t of d.triggers) {
      if (!t.enabled || !t.next_run || new Date(t.next_run) > now) continue;
      const due = t.next_run;
      const r = await fire(t, now);
      if (r.skipped) {
        t.last_missed = due;
        log(`예약 건너뜀: ${t.id} ${t.title} — 앞선 실행이 아직 대기열에 있음`);
        await hive.appendEvent({ kind: 'trigger', action: 'missed', id: t.id, title: t.title, at: due });
      } else {
        t.last_run = now.toISOString();
        t.last_item = r.item.id;
        t.runs = (t.runs || 0) + 1;
        log(`예약 실행: ${t.id} ${t.title} → 대기열 ${r.item.id}`);
        await hive.appendEvent({ kind: 'trigger', action: 'run', id: t.id, title: t.title, item: r.item.id, why: 'schedule' });
      }
      const next = nextRun(t.schedule, new Date(now.getTime() + 1000));
      t.next_run = next ? next.toISOString() : null;
      if (!next) t.enabled = false; // 한 번짜리는 실행 후 꺼진다
      changed = true;
    }
    if (changed) await save(d);
  }).catch((e) => log(`예약 확인 오류: ${e.message}`));

  setInterval(tick, TICK_MS).unref();
  tick();
}
