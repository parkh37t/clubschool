// 오케스트레이터 — 브리핑 1건을 받아 팀장이 작업으로 나누고, 역할 에이전트에게 메시지로 배정하고,
// 산출물마다 QA 게이트를 거쳐, 승인이 필요한 작업은 재하가 결정할 때까지 멈춘다.
// 모든 상태는 hive 의 파일에 남고, office-state.json 은 그 파일을 요약해 가상 사무실에 보낸다.
//
// 흐름:  브리핑 접수 → 팀장 분해(tasks.json) → [선행 완료된 작업] assign 메시지 → 담당 실행 → result 메시지
//        → QA 판정(gate) → (승인 필요) approvals.json 대기 → 완료 → … → 팀장 보고(blackboard·report 메시지)
//
// 작업 풀: 선행이 끝난 작업을 OFFICE_CONCURRENCY 건(기본 2, 최대 3)까지 동시에 돌린다.
//   - 같은 담당자의 작업은 동시에 돌리지 않는다(한 사람이 두 책상에 앉지 않는다).
//   - 승인 대기는 풀 자리를 차지하지 않는다. 그 작업만 멈추고 다른 작업은 계속 돈다.
//   - 선행 작업이 실패·보류로 끝나면 뒤 작업은 그 자리에서 보류로 닫는다.
//
// 구 지시(title·goal·gates)도 받는다: gates 는 "그 단계 전부" 로 해석한다(leader.mjs normalizeBriefing).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as hive from './hive.mjs';
import { decompose, normalizeBriefing, assignBody, buildReport, LEADER, OWNER, QA_AGENT } from './leader.mjs';
import { runTask } from './agentRunner.mjs';
import { judge } from './qa.mjs';
import { exportDocx } from './docxExport.mjs';
import { nameOf, AGENT_IDS } from './roster.mjs';
import { DELIVERABLES_DIR, relData, absData } from './paths.mjs';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const APPROVAL_TIMEOUT_MS = Number(process.env.OFFICE_APPROVAL_TIMEOUT_MS || 0); // 0 = 재하가 누를 때까지 무한 대기
export const CONCURRENCY = Math.max(1, Math.min(3, Math.floor(Number(process.env.OFFICE_CONCURRENCY || 2)) || 2));

function slug(s) {
  return String(s || 'task').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'task';
}

// 산출물 단계 → 가상 사무실 게이트 보드(0~5). 보드는 G1 영업/평가 · G2 기획 · G3 디자인 · G4 구현 · G5 검증 · G6 그로스.
const STAGE_TO_BOARD = { '00_sales': 0, '01_rfp': 0, '03_proposal': 0, '02_requirements': 1, '04_rebaseline': 1, '05_plan': 1, '06_design': 2, '07_publish': 3, '08_test_scenario': 4, '09_test_run': 4, '10_growth': 5 };
const boardOf = (t) => STAGE_TO_BOARD[t.stage] ?? 0;

/**
 * 현재 hive 를 읽어 OfficeState 를 만든다. 여러 작업이 동시에 돌 수 있으므로 agents·stage·phase 를
 * 전부 작업 원장에서 유도한다(메모리 상태 없음).
 *   agents  진행 → working, 검수 → 담당은 waiting(QA 중) · 고지표는 working(QA), 승인대기 → waiting
 *   stage   진행 중인 작업들 중 가장 앞 단계(보드에서 아직 열려 있는 곳)
 *   phase   돌고 있는 작업 없이 승인만 남으면 awaiting
 */
export async function officeState({ briefingId, phase, extra }) {
  const snap = await hive.snapshot({ events: 40 });
  const tasks = snap.tasks.filter((t) => t.briefing === briefingId);
  const agents = Object.fromEntries(AGENT_IDS.map((id) => [id, { state: 'idle', task: '' }]));
  for (const t of tasks) {
    if (!agents[t.owner]) continue;
    if (t.status === '진행') agents[t.owner] = { state: 'working', task: `${t.id} ${t.title}` };
    else if (t.status === '승인대기' && agents[t.owner].state === 'idle') agents[t.owner] = { state: 'waiting', task: `${t.id} 승인 대기` };
    else if (t.status === '검수' && agents[t.owner].state === 'idle') agents[t.owner] = { state: 'waiting', task: `${t.id} QA 중` };
  }
  const inQa = tasks.filter((t) => t.status === '검수');
  if (inQa.length && agents[QA_AGENT]?.state !== 'working') agents[QA_AGENT] = { state: 'working', task: `QA ${inQa.map((t) => t.id).join('·')}` };

  const running = tasks.filter((t) => t.status === '진행' || t.status === '검수');
  const active = tasks.filter((t) => hive.ACTIVE_STATUS.includes(t.status));
  const waitingTasks = tasks.filter((t) => t.status === '대기');
  const pending = snap.pending.filter((a) => tasks.some((t) => t.id === a.task));
  const done = tasks.filter((t) => t.status === '완료').length;
  const front = active.length ? active : waitingTasks;
  const stage = extra?.stage !== undefined ? extra.stage : (front.length ? Math.min(...front.map(boardOf)) : (tasks.length ? boardOf(tasks.at(-1)) : 0));
  const effPhase = phase === 'working' && !running.length && pending.length ? 'awaiting' : phase;

  // 게이트 보드(G1~G6)별 집계 — 여러 단계가 동시에 돌 수 있으므로 stage 하나로 '앞은 완료'라고 그리지 않게 한다.
  const boards = Array.from({ length: 6 }, (_, i) => {
    const mine = tasks.filter((t) => boardOf(t) === i);
    return {
      total: mine.length,
      done: mine.filter((t) => t.status === '완료').length,
      active: mine.filter((t) => t.status === '진행' || t.status === '검수').length,
      awaiting: mine.filter((t) => t.status === '승인대기').length,
      closed: mine.filter((t) => ['보류', '실패'].includes(t.status)).length,
    };
  });
  const leaderTask = phase === 'meeting' ? '브리핑 분해' : phase === 'reporting' ? '보고서 작성' : active.length ? `작업 ${running.length}건 진행 · 승인 ${pending.length}건` : '';
  const rest = { ...(extra || {}) };
  delete rest.stage; // stage 는 위에서 따로 계산했다
  return {
    stage,
    phase: effPhase === 'reporting' ? 'working' : effPhase,
    progress: tasks.length ? done / tasks.length : 0,
    agents,
    concurrency: { limit: CONCURRENCY, running: running.length },
    boards,
    ...rest,
    hive: {
      briefing: briefingId,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, owner: t.owner, stage: t.stage, status: t.status, gate: t.gate, output: t.output, needs_approval: t.needs_approval, depends_on: t.depends_on, cost_usd: t.cost_usd || 0, qa_summary: t.qa?.summary || '' })),
      pending,
      approvals: snap.approvals.filter((a) => tasks.some((t) => t.id === a.task)).slice(-20),
      mail: snap.mail.slice(-30),
      leader: { id: LEADER.id, name: LEADER.name, state: leaderTask ? 'working' : 'idle', task: leaderTask },
    },
  };
}

/** 첨부 경로(업로드 응답)를 산출물 폴더 안의 절대경로로. 예전 형식('DELIVERABLES/_inbox/…')도 받는다. */
function resolveAttachment(p) {
  const rel = String(p || '').replace(/\\/g, '/').replace(/^DELIVERABLES\//, '');
  return absData(rel);
}

/**
 * 브리핑 실행.
 * @param raw  { title, result|goal, context|brief, constraints, question_policy, deadline, gates?, attachments? }
 * @param deps { setState(OfficeState), deliverablesRoot?, mode:'mock'|'claude_code'|'live', log(msg) }
 */
export async function runBriefing(raw, { setState, deliverablesRoot = DELIVERABLES_DIR, mode, log }) {
  const b = normalizeBriefing(raw);
  if (!b.title) { log('브리핑에 제목이 없습니다.'); return; }
  await hive.ensureHive([LEADER.id, OWNER.id, ...AGENT_IDS]);

  // 첨부(_inbox 업로드본)를 과제 폴더로 복사한다 — 산출물 폴더 밖을 가리키는 경로는 무시한다.
  const outDir = path.join(deliverablesRoot, slug(b.title));
  await fs.mkdir(outDir, { recursive: true });
  const outDirRel = relData(outDir);
  if (Array.isArray(raw.attachments) && raw.attachments.length) {
    const attachDir = path.join(outDir, '_attachments');
    await fs.mkdir(attachDir, { recursive: true });
    for (const att of raw.attachments) {
      if (!att || !att.path) continue;
      const src = resolveAttachment(att.path);
      if (!src) { log(`첨부 무시(허용 경로 밖): ${att.path}`); continue; }
      try {
        const dest = path.join(attachDir, path.basename(src));
        await fs.copyFile(src, dest);
        b.attachmentPaths.push(relData(dest));
      } catch (e) { log(`첨부 처리 실패: ${att.name || att.path} — ${e.message}`); }
    }
  }

  const { id: briefingId } = await hive.saveBriefing({ ...b, mode, outDir: outDirRel });
  await fs.writeFile(path.join(outDir, 'briefing.json'), JSON.stringify({ ...b, mode, briefingId }, null, 2), 'utf8');
  log(`브리핑 접수: "${b.title}" (${mode} 모드, 동시 ${CONCURRENCY}건) → ${briefingId}`);
  let costUsd = 0;
  const leftovers = [];

  // 상태 쓰기는 한 줄로 — 계산(스냅샷)과 쓰기 사이에 다른 작업의 더 새 상태가 끼어들어 옛 상태로 덮이지 않게.
  let publishTail = Promise.resolve();
  const publish = (phase = 'working', extra) => {
    const run = publishTail.then(async () => setState(await officeState({ briefingId, phase, extra })));
    publishTail = run.catch((e) => log(`상태 갱신 실패: ${e.message}`));
    return publishTail;
  };

  // 1) 팀장 분해 — 회의실 소집 안무
  await publish('meeting', { stage: 0 });
  await delay(1200);
  const plan = await decompose(b, { mode, model: process.env.OFFICE_MODEL, log });
  costUsd += plan.costUsd || 0;
  await hive.recordUsage({ agent: LEADER.id, usd: plan.costUsd, briefing: briefingId, what: '브리핑 분해' });
  log(`팀장 분해: 작업 ${plan.tasks.length}건 · 되물음 ${plan.questions?.length || 0}건 (${plan.via}, 비용 $${(plan.costUsd || 0).toFixed(2)})`);
  if (!plan.tasks.length) {
    const q = plan.questions.join('\n- ');
    await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'question', task: '', body: `브리핑 "${b.title}" 을 작업으로 나누지 못했습니다.\n\n- ${q}\n\n결과 줄을 고쳐 다시 보내 주세요.` });
    await hive.routeMail();
    await hive.writeBlackboard(`# 현황판 — ${b.title}\n\n팀장이 되물었습니다:\n\n- ${q}\n`);
    log(`팀장 되물음: ${plan.questions[0]}`);
    await publish('awaiting', { stage: 0, question: plan.questions[0] });
    return;
  }
  const tasks = await hive.addTasks(briefingId, plan.tasks);
  log(`팀장 분해(${plan.via}): 작업 ${tasks.length}건 — ${tasks.map((t) => `${t.id} ${nameOf(t.owner)}·${t.title}`).join(' / ')}`);
  await hive.writeBlackboard(buildReport(b, tasks, { outDirRel, mode, costUsd }));

  const produced = []; // 완료 산출물(산출물 폴더 기준 상대경로). 선행이 없는 뒤 작업이 이어받는다.

  // 2-4) 승인 게이트 — 그 작업만 재하 결정까지 멈춘다. 풀 자리는 차지하지 않는다.
  async function awaitDecision(task, a, outRel, verdict) {
    const decision = await hive.waitForApproval(a.id, { pollMs: 2000, timeoutMs: APPROVAL_TIMEOUT_MS });
    if (decision === 'approved') {
      await hive.updateTask(task.id, { status: '완료' });
      produced.push(outRel);
      log(`승인 완료: ${a.id} (${task.id})`);
    } else {
      await hive.updateTask(task.id, { status: '보류', qa: { ...(verdict || {}), summary: `승인 ${decision}` } });
      leftovers.push(`${task.id}: 승인 ${decision}`);
      log(`승인 ${decision}: ${a.id} — ${task.id} 보류`);
    }
    await publish();
  }

  // 작업 1건: 배정 → 실행 → QA → (승인 요청 | 완료). 승인 대기는 waiting 으로 넘기고 돌아온다.
  const working = new Map(); // taskId → { owner, promise }
  const waiting = new Map(); // taskId → promise(승인 대기)

  async function runOne(task) {
    // 2-1) 배정 — 팀장 → 담당 assign 메시지(봉투)
    const all = await hive.tasksOf(briefingId);
    const prior = all.filter((t) => t.status === '완료' && task.depends_on.includes(t.id) && t.output).map((t) => t.output);
    const priorFiles = prior.length ? prior : [...produced];
    const assign = await hive.sendMessage({ from: LEADER.id, to: task.owner, type: 'assign', task: task.id, stage: task.stage, due: b.deadline, body: assignBody(b, task, { priorFiles, outDirRel }) });
    await hive.routeMail();
    await publish();
    log(`배정: ${task.id} → ${nameOf(task.owner)} (${assign.id})`);

    // 2-2) 실행
    let r;
    try {
      r = await runTask({ task, briefing: b, outDir, assignText: assign.body, mode, log, priorFiles });
    } catch (e) {
      r = { file: null, summary: '', costUsd: 0, reply: '', leftovers: [`실행 예외: ${e.message}`], memory: [], failure: 'exception' };
    }
    costUsd += r.costUsd || 0;
    if (!r.file) {
      await hive.updateTask(task.id, { status: '실패', gate: 'FAIL', qa: { summary: r.leftovers?.[0] || '산출물 없음' } });
      await hive.sendMessage({ from: task.owner, to: LEADER.id, type: 'result', task: task.id, body: `실패: ${r.leftovers?.[0] || '산출물 없음'}` });
      await hive.routeMail();
      leftovers.push(`${task.id} ${nameOf(task.owner)}: ${r.leftovers?.[0] || '산출물 없음'}`);
      log(`${task.id} 실패`);
      await publish();
      return;
    }
    const outRel = relData(r.file);
    const docx = await exportDocx(r.file, log).catch(() => null);
    await hive.updateTask(task.id, { status: '검수', output: outRel, docx: docx ? relData(docx) : '', cost_usd: Number((r.costUsd || 0).toFixed(4)), cost_at: hive.nowIso() });
    await hive.sendMessage({ from: task.owner, to: LEADER.id, type: 'result', task: task.id, stage: task.stage, body: r.reply || `산출물: ${outRel}` });
    await hive.routeMail();
    if (r.memory?.length) await hive.appendMemory(task.owner, r.memory, { taskId: task.id });
    for (const l of r.leftovers || []) leftovers.push(`${task.id} ${nameOf(task.owner)}: ${l}`);

    // 2-3) QA 게이트 — 고지표가 판정. 점수가 아니라 4값 검사 + PASS/CONDITIONAL/FAIL.
    await publish();
    const verdict = await judge({ task, file: r.file, briefing: b, priorFiles: prior, mode, model: process.env.OFFICE_MODEL, log });
    costUsd += verdict.costUsd || 0;
    await hive.updateTask(task.id, { gate: verdict.gate, qa: { summary: verdict.summary, checks: verdict.checks, issues: verdict.issues, via: verdict.via, cost_usd: Number((verdict.costUsd || 0).toFixed(4)), at: hive.nowIso() } });
    log(`QA ${task.id}: ${verdict.gate} — ${verdict.checks.map((c) => `${c.id}:${c.status}`).join(' ')} (QA 비용 $${(verdict.costUsd || 0).toFixed(2)})`);
    if (verdict.gate === 'FAIL') {
      await hive.updateTask(task.id, { status: '실패' });
      await hive.sendMessage({ from: QA_AGENT, to: task.owner, type: 'answer', task: task.id, body: `게이트 FAIL\n\n${verdict.issues.map((i) => `- ${i}`).join('\n')}` });
      await hive.routeMail();
      leftovers.push(`${task.id} QA FAIL: ${verdict.issues[0] || verdict.summary}`);
      await publish();
      return;
    }

    if (task.needs_approval) {
      const a = await hive.requestApproval({ task: task.id, kind: task.approval_reason || '산출물승인', reason: `${nameOf(task.owner)} · ${task.title} — ${task.approval_reason}`, payload: { output: outRel, gate: verdict.gate } });
      await hive.updateTask(task.id, { status: '승인대기' });
      await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'approval', task: task.id, body: `승인 요청 ${a.id}\n\n- 작업: ${task.id} ${task.title}\n- 사유: ${task.approval_reason}\n- 산출물: ${outRel}\n- 게이트: ${verdict.gate}\n\n가상 사무실 커맨드 센터 '승인' 탭 또는 POST /api/approve {id:"${a.id}", decision, by, reason}` });
      await hive.routeMail();
      log(`승인 대기: ${a.id} (${task.id}) — 이 작업만 재하 결정까지 멈춤`);
      await publish('working', { artifact: { file: path.basename(r.file), score: 0, gate: verdict.gate } });
      const wait = awaitDecision(task, a, outRel, verdict).catch((e) => log(`승인 대기 오류(${task.id}): ${e.message}`)).finally(() => waiting.delete(task.id));
      waiting.set(task.id, wait);
      return;
    }

    await hive.updateTask(task.id, { status: '완료' });
    produced.push(outRel);
    await publish('working', { artifact: { file: path.basename(r.file), score: 0, gate: verdict.gate } });
  }

  // 2) 작업 풀 — 선행 완료·담당 비어 있음·자리 남음 조건을 만족하는 작업을 채워 넣고, 하나가 끝날 때마다 다시 본다.
  for (;;) {
    const all = await hive.tasksOf(briefingId);
    const byId = new Map(all.map((t) => [t.id, t]));

    // 선행이 실패·보류로 끝난 대기 작업은 기다려도 시작할 수 없으므로 바로 보류로 닫는다.
    for (const t of all.filter((x) => x.status === '대기')) {
      const dead = t.depends_on.filter((d) => ['실패', '보류'].includes(byId.get(d)?.status));
      if (!dead.length) continue;
      await hive.updateTask(t.id, { status: '보류', qa: { summary: `선행 작업(${dead.join(', ')}) 미완료로 보류` } });
      log(`${t.id} 보류 — 선행 작업 ${dead.join(', ')} 미완료`);
    }

    const busy = new Set([...working.values()].map((w) => w.owner));
    const ready = hive.readyTasks(await hive.tasksOf(briefingId));
    for (const t of ready) {
      if (working.size >= CONCURRENCY) break;
      if (busy.has(t.owner) || working.has(t.id)) continue;
      busy.add(t.owner);
      await hive.updateTask(t.id, { status: '진행' });
      const promise = runOne(t)
        .catch(async (e) => {
          log(`${t.id} 처리 중 오류: ${e?.stack || e}`);
          await hive.updateTask(t.id, { status: '실패', qa: { summary: `오케스트레이터 오류: ${e?.message || e}` } }).catch(() => {});
          leftovers.push(`${t.id}: 오케스트레이터 오류 — ${e?.message || e}`);
        })
        .finally(() => working.delete(t.id));
      working.set(t.id, { owner: t.owner, promise });
      log(`풀: ${t.id} ${nameOf(t.owner)} 시작 (동시 ${working.size}/${CONCURRENCY})`);
    }

    if (!working.size && !waiting.size) {
      // 돌 것도 기다릴 것도 없다. 남은 대기 작업은 선행이 순환하거나 끝나지 않은 것 — 보류로 닫는다.
      const blocked = (await hive.tasksOf(briefingId)).filter((t) => t.status === '대기');
      if (hive.readyTasks(blocked).length) continue; // 방금 풀린 작업이 있으면 한 번 더 돈다
      for (const t of blocked) {
        await hive.updateTask(t.id, { status: '보류', qa: { summary: `선행 작업(${t.depends_on.join(', ')}) 미완료로 보류` } });
        log(`${t.id} 보류 — 선행 작업 미완료`);
      }
      break;
    }
    await Promise.race([...[...working.values()].map((w) => w.promise), ...waiting.values()]);
  }

  // 3) 팀장 보고 — 현황판 + 보고 메시지 + 산출물 대장
  await publish('reporting');
  const finalTasks = await hive.tasksOf(briefingId);
  const approvals = (await hive.loadApprovals()).approvals.filter((a) => finalTasks.some((t) => t.id === a.task));
  const report = buildReport(b, finalTasks, { approvals, leftovers, outDirRel, mode, costUsd });
  await hive.writeBlackboard(report);
  await fs.writeFile(path.join(outDir, '_index.md'), report, 'utf8');
  await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'report', task: '', body: report });
  await hive.routeMail();
  log(`보고 완료 — 완료 ${finalTasks.filter((t) => t.status === '완료').length}/${finalTasks.length}, 산출물: ${outDirRel}`);
  await publish('done-all', { stage: 5, artifact: { file: '_index.md', score: 0 } });
}

/**
 * 서버를 다시 켰을 때 남아 있는 승인 대기 작업을 이어서 지켜본다. 재하가 결정하면 작업 상태를 마감한다.
 * (브리핑 루프는 서버와 함께 사라졌으므로 보고서는 다시 쓰지 않는다 — 원장과 승인 기록만 맞춘다.)
 */
export async function watchOrphanApprovals(log) {
  const [ledger, pending] = await Promise.all([hive.loadTasks(), hive.pendingApprovals()]);
  for (const a of pending) {
    const t = ledger.tasks.find((x) => x.id === a.task);
    if (!t || t.status !== '승인대기') continue;
    log(`재시작 후 승인 대기 이어 보기: ${a.id} (${t.id})`);
    hive.waitForApproval(a.id, { pollMs: 3000 }).then(async (decision) => {
      if (decision === 'approved') await hive.updateTask(t.id, { status: '완료' });
      else await hive.updateTask(t.id, { status: '보류', qa: { ...(t.qa || {}), summary: `승인 ${decision}` } });
      log(`승인 ${decision}: ${a.id} — ${t.id} 마감(재시작 후)`);
    }).catch((e) => log(`승인 이어 보기 오류(${a.id}): ${e.message}`));
  }
}

// 구 호출명 호환(office-server.mjs). 지시(title·goal·gates·brief)를 브리핑으로 해석한다.
export const runInstruction = runBriefing;
