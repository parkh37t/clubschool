// 오케스트레이터 — 지시 1건을 받아 선택된 게이트를 순서대로 실행하고,
// 각 페이즈 전이마다 office-state.json을 갱신한다(오피스가 폴링해 시각화).
//
// 페이즈 흐름(게이트마다): meeting(킥오프) → working(작업·산출) → awaiting(결재 대기) → 다음 게이트.
// office-state.json의 stage 규칙(officeSimulator.applyOfficeState와의 계약):
//   - 화면상 활성 게이트 = clamp(stage, 0, 5)
//   - stage가 직전보다 "커질 때" artifact를 산출물 패널에 적재(= 이전 게이트 결재 완료).
//   따라서 게이트 완료 시 raw stage=g(=stage+1)로 올려 해당 게이트 산출물을 기록한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pickGates, AGENT_NAME } from './gates.mjs';
import { runWorker } from './agentRunner.mjs';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function slug(s) {
  return String(s || 'task').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'task';
}

const idleMap = (workers) => Object.fromEntries(workers.map((w) => [w.id, { state: 'idle', task: '' }]));
const workingMap = (workers) => Object.fromEntries(workers.map((w) => [w.id, { state: 'working', task: w.task }]));
const waitingMap = (workers) => Object.fromEntries(workers.map((w) => [w.id, { state: 'waiting', task: '' }]));

/**
 * 지시 실행.
 * @param instruction { title, goal, gates:['G1'..], ts }
 * @param deps { setState(OfficeState), deliverablesRoot, mode:'mock'|'live', log(msg) }
 */
export async function runInstruction(instruction, { setState, deliverablesRoot, mode, log }) {
  const gates = pickGates(instruction.gates);
  if (gates.length === 0) {
    log('실행할 게이트가 없습니다.');
    return;
  }
  const outDir = path.join(deliverablesRoot, slug(instruction.title));
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'instruction.json'),
    JSON.stringify({ ...instruction, mode }, null, 2),
    'utf8',
  );
  const indexLines = [`# ${instruction.title}`, '', `- 목표: ${instruction.goal || '(미지정)'}`, `- 모드: ${mode}`, '', '## 산출물', ''];
  log(`지시 접수: "${instruction.title}" — 게이트 ${gates.map((g) => 'G' + g.g).join(', ')} (${mode} 모드)`);

  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    const workers = gate.workers;

    // 1) 킥오프 회의 — 담당자 소집(오피스: 회의실 이동 안무)
    await setState({ stage: gate.stage, phase: 'meeting', progress: 0, agents: idleMap(workers) });
    log(`G${gate.g} ${gate.name}: 킥오프 (${workers.map((w) => AGENT_NAME[w.id]).join(', ')})`);
    await delay(1600);

    // 2) 작업 — 워커를 순차 실행하며 진행률을 올린다
    await setState({ stage: gate.stage, phase: 'working', progress: 0.05, agents: workingMap(workers) });
    const artifacts = [];
    for (let w = 0; w < workers.length; w++) {
      const r = await runWorker({ worker: workers[w], gate, instruction, outDir, mode, log });
      artifacts.push({ worker: workers[w], ...r });
      const p = Math.min(0.95, ((w + 1) / workers.length) * 0.95);
      await setState({ stage: gate.stage, phase: 'working', progress: p, agents: workingMap(workers) });
    }
    for (const a of artifacts) {
      indexLines.push(`- **G${gate.g}** ${AGENT_NAME[a.worker.id]} · ${path.basename(a.file)} — ${a.summary}`);
    }

    // 3) 결재 대기 — 검수 통과, 사장 결재 요청
    await setState({ stage: gate.stage, phase: 'awaiting', progress: 1, agents: waitingMap(workers) });
    log(`G${gate.g} ${gate.name}: 검수 통과 (${gate.artifact.score}점) — 결재 대기`);
    await delay(1400);

    // 4) 결재 완료 → 다음 게이트로. raw stage=gate.g로 올려 이 게이트 산출물을 오피스에 적재.
    const isLast = i === gates.length - 1;
    if (isLast) {
      await setState({ stage: gate.g, phase: 'done-all', progress: 1, artifact: gate.artifact });
      log(`G${gate.g} 결재 완료 — 전 게이트 종료. 산출물: ${outDir}`);
    } else {
      const next = gates[i + 1];
      // 연속 게이트면 gate.g === next.stage 라 자연스럽게 다음 게이트 킥오프로 이어진다.
      await setState({ stage: gate.g, phase: 'meeting', progress: 0, artifact: gate.artifact, agents: idleMap(next.workers) });
      log(`G${gate.g} 결재 완료 — 다음 게이트로`);
      await delay(400);
    }
  }

  await fs.writeFile(path.join(outDir, '_index.md'), indexLines.join('\n') + '\n', 'utf8');
}
