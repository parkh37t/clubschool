// 서킷 브레이커 — 에이전트가 헤매거나 예산을 넘기면 단계적으로 묶는다(Munder Difflin 의 steer → constrain → stop).
//
//   normal    평소
//   steer     조정 — 다음 배정 메시지에 지난 문제와 "범위를 줄이고 지정 파일 1개만" 지시를 덧붙인다
//   constrain 제한 — 다음 작업의 최대 턴·비용 상한을 절반으로
//   stop      중지 — 새 작업을 받지 않는다. '재개' 승인 카드가 올라가고, 재하가 승인하면 normal 로 돌아간다
//
// 단계는 두 가지 중 높은 쪽이다.
//   ① 연속 문제 횟수: 실행 실패·QA FAIL·비용 상한 초과가 이어지면 1회 steer, 2회 constrain, 3회 stop. 정상 완료 1번이면 0으로
//   ② 하루 예산: 오늘 사용량이 에이전트 하루 예산의 80% 이상이면 constrain, 100% 이상이면 stop
// 상태는 hive/breakers.json 에 남는다(서버를 다시 켜도 이어진다).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';
import { appendEvent, nowIso, localDay, usageSummary } from './hive.mjs';
import { getSettings } from './settings.mjs';

const FILE = path.join(HIVE_DIR, 'breakers.json');
export const LEVELS = ['normal', 'steer', 'constrain', 'stop'];
const rank = (l) => Math.max(0, LEVELS.indexOf(l));

let tail = Promise.resolve();
const lock = (fn) => { const run = tail.then(fn); tail = run.catch(() => {}); return run; };

async function load() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { agents: {} }; }
}
async function save(data) {
  await fs.mkdir(HIVE_DIR, { recursive: true });
  await fs.writeFile(FILE + '.tmp', JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(FILE + '.tmp', FILE);
}

const levelFromFailures = (n) => (n >= 3 ? 'stop' : n === 2 ? 'constrain' : n === 1 ? 'steer' : 'normal');

/** 작업 결과를 반영한다. outcome: ok | fail | qa_fail | cap */
export function recordOutcome(agent, outcome, detail = '') {
  return lock(async () => {
    const data = await load();
    const cur = data.agents[agent] || { failures: 0, level: 'normal', reason: '', manual_reset_at: null };
    const before = cur.level;
    if (outcome === 'ok') cur.failures = 0;
    else cur.failures = (cur.failures || 0) + 1;
    const fromFail = levelFromFailures(cur.failures);
    // 중지는 재하가 재개해야 풀린다 — 정상 완료가 있어도 stop 에서 바로 내려오지 않는다.
    cur.level = before === 'stop' ? 'stop' : fromFail;
    // reason 은 에이전트 프롬프트(조정 메모)에 쓰는 한국어 문장, reason_code·reason_detail 은 화면이 언어에 맞게 풀어 쓴다.
    if (outcome !== 'ok') {
      cur.reason_code = outcome === 'cap' || outcome === 'qa_fail' ? outcome : 'fail';
      cur.reason_detail = detail ? String(detail).slice(0, 120) : '';
      cur.reason = `${outcome === 'cap' ? '비용 상한 초과' : outcome === 'qa_fail' ? 'QA FAIL' : '실행 실패'}${cur.reason_detail ? ` — ${cur.reason_detail}` : ''}`;
    } else if (cur.level === 'normal') { cur.reason = ''; cur.reason_code = ''; cur.reason_detail = ''; }
    cur.updated = nowIso();
    data.agents[agent] = cur;
    await save(data);
    if (cur.level !== before) await appendEvent({ kind: 'breaker', agent, level: cur.level, reason: cur.reason, reason_code: cur.reason_code, reason_detail: cur.reason_detail });
    return cur;
  });
}

/** 재하가 '재개'를 승인했을 때 — 연속 문제 횟수를 비우고 normal 로. */
export function resetBreaker(agent, by) {
  return lock(async () => {
    const data = await load();
    data.agents[agent] = { failures: 0, level: 'normal', reason: '', manual_reset_at: nowIso(), reset_by: by, updated: nowIso() };
    await save(data);
    await appendEvent({ kind: 'breaker', agent, level: 'normal', reason: `재개(${by})`, reason_code: 'reset', reason_detail: by });
    return data.agents[agent];
  });
}

/**
 * 지금 이 에이전트에 걸린 단계와 그 효과. 예산은 매번 사용량으로 다시 계산한다.
 * 재개 승인 뒤에는 그날 남은 예산 판정을 건너뛴다(재하가 알고 풀어 준 것이므로).
 */
export async function effective(agent, { usage } = {}) {
  const [data, s] = await Promise.all([load(), getSettings()]);
  const cur = data.agents[agent] || { failures: 0, level: 'normal', reason: '' };
  const u = usage || (await usageSummary());
  const today = localDay();
  const used = u.byAgentDay?.[agent]?.[today] || 0;
  const budget = s.agent_daily_usd;
  const ratio = budget > 0 ? used / budget : 0;
  const resetToday = cur.manual_reset_at && localDay(cur.manual_reset_at) === today;
  let budgetLevel = 'normal';
  if (!resetToday) budgetLevel = ratio >= 1 ? 'stop' : ratio >= 0.8 ? 'constrain' : 'normal';
  const level = rank(budgetLevel) > rank(cur.level) ? budgetLevel : cur.level;
  const byBudget = rank(budgetLevel) > rank(cur.level);
  const reason = byBudget ? `하루 예산 ${Math.round(ratio * 100)}% 사용($${used.toFixed(2)} / $${budget.toFixed(2)})` : cur.reason;
  const reason_code = byBudget ? 'budget' : cur.reason_code || '';
  const reason_detail = byBudget ? `${Math.round(ratio * 100)}% ($${used.toFixed(2)} / $${budget.toFixed(2)})` : cur.reason_detail || '';
  return {
    agent, level, reason, reason_code, reason_detail, failures: cur.failures || 0, used_today: Number(used.toFixed(4)), budget, ratio: Number(ratio.toFixed(3)),
    steerNote: level === 'steer' || level === 'constrain' ? reason : '',
    factor: level === 'constrain' ? 0.5 : 1, // 최대 턴·비용 상한에 곱한다
    blocked: level === 'stop',
  };
}

/** 모니터 탭 — 에이전트 전원의 단계. */
export async function allBreakers(agentIds) {
  const usage = await usageSummary();
  const out = {};
  for (const id of agentIds) out[id] = await effective(id, { usage });
  return out;
}
