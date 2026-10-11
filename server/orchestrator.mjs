// 오케스트레이터 — 브리핑 1건을 받아 팀장이 작업으로 나누고, 역할 에이전트에게 메시지로 배정하고,
// 산출물마다 QA 게이트를 거쳐, 승인이 필요한 작업은 재하가 결정할 때까지 멈춘다.
// 모든 상태는 server/hive/ 의 파일에 남고, office-state.json 은 그 파일을 요약해 가상 사무실에 보낸다.
//
// 흐름:  브리핑 접수 → 팀장 분해(tasks.json) → [선행 완료된 작업] assign 메시지 → 담당 실행 → result 메시지
//        → QA 판정(gate) → (승인 필요) approvals.json 대기 → 완료 → 다음 작업 … → 팀장 보고(blackboard·report 메시지)
//
// 구 지시(title·goal·gates)도 받는다: gates 는 "그 단계 전부" 로 해석한다(leader.mjs normalizeBriefing).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hive from './hive.mjs';
import { decompose, normalizeBriefing, assignBody, buildReport, LEADER, OWNER, QA_AGENT } from './leader.mjs';
import { runTask } from './agentRunner.mjs';
import { judge } from './qa.mjs';
import { exportDocx } from './docxExport.mjs';
import { nameOf, AGENT_IDS } from './roster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const APPROVAL_TIMEOUT_MS = Number(process.env.OFFICE_APPROVAL_TIMEOUT_MS || 0); // 0 = 재하가 누를 때까지 무한 대기

function slug(s) {
  return String(s || 'task').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'task';
}

// 산출물 단계 → 가상 사무실 게이트 보드(0~5). 보드는 G1 영업/평가 · G2 기획 · G3 디자인 · G4 구현 · G5 검증 · G6 그로스.
const STAGE_TO_BOARD = { '00_sales': 0, '01_rfp': 0, '03_proposal': 0, '02_requirements': 1, '04_rebaseline': 1, '05_plan': 1, '06_design': 2, '07_publish': 3, '08_test_scenario': 4, '09_test_run': 4, '10_growth': 5 };

/** 현재 hive 를 읽어 OfficeState 를 만든다. agents 는 작업 상태에서 유도한다. */
async function officeState({ briefingId, phase, current, extra }) {
  const snap = await hive.snapshot({ events: 40 });
  const tasks = snap.tasks.filter((t) => t.briefing === briefingId);
  const agents = Object.fromEntries(AGENT_IDS.map((id) => [id, { state: 'idle', task: '' }]));
  for (const t of tasks) {
    if (!agents[t.owner]) continue;
    if (t.status === '진행') agents[t.owner] = { state: 'working', task: `${t.id} ${t.title}` };
    else if (t.status === '승인대기') agents[t.owner] = { state: 'waiting', task: `${t.id} 승인 대기` };
    else if (t.status === '검수' && agents[t.owner].state === 'idle') agents[t.owner] = { state: 'waiting', task: `${t.id} QA 중` };
  }
  if (current && current.qa) agents[QA_AGENT] = { state: 'working', task: `QA ${current.qa}` };
  const done = tasks.filter((t) => t.status === '완료').length;
  const stage = current?.stage !== undefined ? current.stage : (tasks.length ? STAGE_TO_BOARD[tasks.at(-1).stage] ?? 0 : 0);
  return {
    stage,
    phase,
    progress: tasks.length ? done / tasks.length : 0,
    agents,
    ...extra,
    hive: {
      briefing: briefingId,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, owner: t.owner, status: t.status, gate: t.gate, output: t.output, needs_approval: t.needs_approval })),
      pending: snap.pending,
      approvals: snap.approvals.filter((a) => tasks.some((t) => t.id === a.task)).slice(-20),
      mail: snap.mail.slice(-30),
      leader: { id: LEADER.id, name: LEADER.name, state: phase === 'meeting' ? 'working' : 'idle', task: phase === 'meeting' ? '브리핑 분해' : '' },
    },
  };
}

/**
 * 브리핑 실행.
 * @param raw  { title, result|goal, context|brief, constraints, question_policy, deadline, gates?, attachments? }
 * @param deps { setState(OfficeState), deliverablesRoot, mode:'mock'|'claude_code'|'live', log(msg) }
 */
export async function runBriefing(raw, { setState, deliverablesRoot, mode, log }) {
  const b = normalizeBriefing(raw);
  if (!b.title) { log('브리핑에 제목이 없습니다.'); return; }
  await hive.ensureHive([LEADER.id, OWNER.id, ...AGENT_IDS]);

  // 첨부(_inbox 업로드본)를 과제 폴더로 복사한다 — 기존 규칙 그대로(허용 경로 밖 소스는 무시).
  const outDir = path.join(deliverablesRoot, slug(b.title));
  await fs.mkdir(outDir, { recursive: true });
  const outDirRel = path.relative(REPO_ROOT, outDir);
  if (Array.isArray(raw.attachments) && raw.attachments.length) {
    const attachDir = path.join(outDir, '_attachments');
    await fs.mkdir(attachDir, { recursive: true });
    for (const att of raw.attachments) {
      if (!att || !att.path) continue;
      const src = path.resolve(REPO_ROOT, att.path);
      if (!src.startsWith(deliverablesRoot + path.sep)) { log(`첨부 무시(허용 경로 밖): ${att.path}`); continue; }
      try {
        const dest = path.join(attachDir, path.basename(att.path));
        await fs.copyFile(src, dest);
        b.attachmentPaths.push(path.relative(REPO_ROOT, dest));
      } catch (e) { log(`첨부 처리 실패: ${att.name || att.path} — ${e.message}`); }
    }
  }

  const { id: briefingId } = await hive.saveBriefing({ ...b, mode, outDir: outDirRel });
  await fs.writeFile(path.join(outDir, 'briefing.json'), JSON.stringify({ ...b, mode, briefingId }, null, 2), 'utf8');
  log(`브리핑 접수: "${b.title}" (${mode} 모드) → ${briefingId}`);
  let costUsd = 0;
  const leftovers = [];

  // 1) 팀장 분해 — 회의실 소집 안무
  await setState(await officeState({ briefingId, phase: 'meeting', current: { stage: 0 } }));
  await delay(1200);
  const plan = await decompose(b, { mode, model: process.env.OFFICE_MODEL, log });
  costUsd += plan.costUsd || 0;
  if (!plan.tasks.length) {
    const q = plan.questions.join('\n- ');
    await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'question', task: '', body: `브리핑 "${b.title}" 을 작업으로 나누지 못했습니다.\n\n- ${q}\n\n결과 줄을 고쳐 다시 보내 주세요.` });
    await hive.routeMail();
    await hive.writeBlackboard(`# 현황판 — ${b.title}\n\n팀장이 되물었습니다:\n\n- ${q}\n`);
    log(`팀장 되물음: ${plan.questions[0]}`);
    await setState(await officeState({ briefingId, phase: 'awaiting', current: { stage: 0 }, extra: { question: plan.questions[0] } }));
    return;
  }
  const tasks = await hive.addTasks(briefingId, plan.tasks);
  log(`팀장 분해(${plan.via}): 작업 ${tasks.length}건 — ${tasks.map((t) => `${t.id} ${nameOf(t.owner)}·${t.title}`).join(' / ')}`);
  await hive.writeBlackboard(buildReport(b, tasks, { outDirRel, mode, costUsd }));

  // 2) 선행 완료된 작업부터 하나씩. 한 번에 1건(구독 사용량·경합 보호). 병렬은 2차.
  const produced = []; // 완료 산출물 상대경로(뒤 작업이 이어받는다)
  for (;;) {
    const all = await hive.tasksOf(briefingId);
    const ready = hive.readyTasks(all);
    if (!ready.length) {
      // 선행이 실패·보류로 막힌 대기 작업은 보류로 닫는다.
      const blocked = all.filter((t) => t.status === '대기');
      for (const t of blocked) {
        await hive.updateTask(t.id, { status: '보류', qa: { summary: `선행 작업(${t.depends_on.join(', ')}) 미완료로 보류` } });
        log(`${t.id} 보류 — 선행 작업 미완료`);
      }
      break;
    }
    const task = ready[0];
    const boardStage = STAGE_TO_BOARD[task.stage] ?? 0;

    // 2-1) 배정 — 팀장 → 담당 assign 메시지(봉투)
    await hive.updateTask(task.id, { status: '진행' });
    const prior = all.filter((t) => t.status === '완료' && task.depends_on.includes(t.id) && t.output).map((t) => t.output);
    const assign = await hive.sendMessage({ from: LEADER.id, to: task.owner, type: 'assign', task: task.id, stage: task.stage, due: b.deadline, body: assignBody(b, task, { priorFiles: prior.length ? prior : produced, outDirRel }) });
    await hive.routeMail();
    await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage } }));
    log(`배정: ${task.id} → ${nameOf(task.owner)} (${assign.id})`);

    // 2-2) 실행
    let r;
    try {
      r = await runTask({ task, briefing: b, outDir, assignText: assign.body, mode, log, priorFiles: prior.length ? prior : produced });
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
      await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage } }));
      continue;
    }
    const outRel = path.relative(REPO_ROOT, r.file);
    const docx = await exportDocx(r.file, log).catch(() => null);
    await hive.updateTask(task.id, { status: '검수', output: outRel, docx: docx ? path.relative(REPO_ROOT, docx) : '' });
    await hive.sendMessage({ from: task.owner, to: LEADER.id, type: 'result', task: task.id, stage: task.stage, body: r.reply || `산출물: ${outRel}` });
    await hive.routeMail();
    if (r.memory?.length) await hive.appendMemory(task.owner, r.memory, { taskId: task.id });
    for (const l of r.leftovers || []) leftovers.push(`${task.id} ${nameOf(task.owner)}: ${l}`);

    // 2-3) QA 게이트 — 고지표가 판정. 점수가 아니라 4값 검사 + PASS/CONDITIONAL/FAIL.
    await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage, qa: task.id } }));
    const verdict = await judge({ task, file: r.file, briefing: b, priorFiles: prior, mode, model: process.env.OFFICE_MODEL, log });
    costUsd += verdict.costUsd || 0;
    await hive.updateTask(task.id, { gate: verdict.gate, qa: { summary: verdict.summary, checks: verdict.checks, issues: verdict.issues, via: verdict.via } });
    log(`QA ${task.id}: ${verdict.gate} — ${verdict.checks.map((c) => `${c.id}:${c.status}`).join(' ')}`);
    if (verdict.gate === 'FAIL') {
      await hive.updateTask(task.id, { status: '실패' });
      await hive.sendMessage({ from: QA_AGENT, to: task.owner, type: 'answer', task: task.id, body: `게이트 FAIL\n\n${verdict.issues.map((i) => `- ${i}`).join('\n')}` });
      await hive.routeMail();
      leftovers.push(`${task.id} QA FAIL: ${verdict.issues[0] || verdict.summary}`);
      await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage } }));
      continue;
    }

    // 2-4) 승인 게이트 — 재하가 결정할 때까지 멈춘다.
    if (task.needs_approval) {
      const a = await hive.requestApproval({ task: task.id, kind: task.approval_reason || '산출물승인', reason: `${nameOf(task.owner)} · ${task.title} — ${task.approval_reason}`, payload: { output: outRel, gate: verdict.gate } });
      await hive.updateTask(task.id, { status: '승인대기' });
      await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'approval', task: task.id, body: `승인 요청 ${a.id}\n\n- 작업: ${task.id} ${task.title}\n- 사유: ${task.approval_reason}\n- 산출물: ${outRel}\n- 게이트: ${verdict.gate}\n\n가상 사무실 사장실 결재 카드 또는 POST /api/approve {id:"${a.id}", decision, by, reason}` });
      await hive.routeMail();
      log(`승인 대기: ${a.id} (${task.id}) — 재하 결정까지 멈춤`);
      await setState(await officeState({ briefingId, phase: 'awaiting', current: { stage: boardStage }, extra: { artifact: { file: path.basename(r.file), score: 0 } } }));
      const decision = await hive.waitForApproval(a.id, { pollMs: 2000, timeoutMs: APPROVAL_TIMEOUT_MS });
      if (decision === 'approved') {
        await hive.updateTask(task.id, { status: '완료' });
        produced.push(outRel);
        log(`승인 완료: ${a.id}`);
      } else {
        await hive.updateTask(task.id, { status: '보류', qa: { ...(verdict || {}), summary: `승인 ${decision}` } });
        leftovers.push(`${task.id}: 승인 ${decision}`);
        log(`승인 ${decision}: ${a.id} — ${task.id} 보류`);
      }
      await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage } }));
      continue;
    }

    await hive.updateTask(task.id, { status: '완료' });
    produced.push(outRel);
    await setState(await officeState({ briefingId, phase: 'working', current: { stage: boardStage }, extra: { artifact: { file: path.basename(r.file), score: 0 } } }));
    await delay(400);
  }

  // 3) 팀장 보고 — 현황판 + 보고 메시지 + 산출물 대장
  const finalTasks = await hive.tasksOf(briefingId);
  const approvals = (await hive.loadApprovals()).approvals.filter((a) => finalTasks.some((t) => t.id === a.task));
  const report = buildReport(b, finalTasks, { approvals, leftovers, outDirRel, mode, costUsd });
  await hive.writeBlackboard(report);
  await fs.writeFile(path.join(outDir, '_index.md'), report, 'utf8');
  await hive.sendMessage({ from: LEADER.id, to: OWNER.id, type: 'report', task: '', body: report });
  await hive.routeMail();
  log(`보고 완료 — 완료 ${finalTasks.filter((t) => t.status === '완료').length}/${finalTasks.length}, 산출물: ${outDirRel}`);
  await setState(await officeState({ briefingId, phase: 'done-all', current: { stage: 5 }, extra: { artifact: { file: '_index.md', score: 0 } } }));
}

// 구 호출명 호환(office-server.mjs). 지시(title·goal·gates·brief)를 브리핑으로 해석한다.
export const runInstruction = runBriefing;
