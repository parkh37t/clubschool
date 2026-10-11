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
import { hasSkill } from './skills.mjs';
import { exportDocx } from './docxExport.mjs';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function slug(s) {
  return String(s || 'task').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'task';
}

const idleMap = (workers) => Object.fromEntries(workers.map((w) => [w.id, { state: 'idle', task: '' }]));
// current: 지금 실행 중인 작업 — 같은 사람이 여러 작업을 맡으면(G1 한도전 전략→검수) 현재 작업명을 보여준다.
const workingMap = (workers, current) => {
  const map = Object.fromEntries(workers.map((w) => [w.id, { state: 'working', task: w.task }]));
  if (current) map[current.id] = { state: 'working', task: current.task };
  return map;
};
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

  // 첨부 파일(_inbox 업로드본)을 과제 폴더로 복사하고, 에이전트가 읽을 상대경로 목록을 만든다.
  const repoRoot = path.dirname(deliverablesRoot);
  const attachmentPaths = [];
  if (Array.isArray(instruction.attachments) && instruction.attachments.length) {
    const attachDir = path.join(outDir, '_attachments');
    await fs.mkdir(attachDir, { recursive: true });
    for (const att of instruction.attachments) {
      if (!att || !att.path) continue;
      try {
        const src = path.resolve(repoRoot, att.path);
        // 안전장치: 소스는 반드시 DELIVERABLES 안(업로드 _inbox)이어야 한다.
        if (!src.startsWith(deliverablesRoot + path.sep)) { log(`첨부 무시(허용 경로 밖): ${att.path}`); continue; }
        const dest = path.join(attachDir, path.basename(att.path));
        await fs.copyFile(src, dest);
        attachmentPaths.push(path.relative(repoRoot, dest));
      } catch (e) {
        log(`첨부 처리 실패: ${att.name || att.path} — ${e.message}`);
      }
    }
    if (attachmentPaths.length) log(`첨부 ${attachmentPaths.length}건을 과제 폴더로 준비했습니다.`);
  }
  // 이후 단계는 첨부 경로가 붙은 인스트럭션을 사용한다(에이전트 프롬프트에서 Read).
  const inst = { ...instruction, attachmentPaths };

  await fs.writeFile(
    path.join(outDir, 'instruction.json'),
    JSON.stringify({ ...inst, mode }, null, 2),
    'utf8',
  );
  const indexLines = [`# ${instruction.title}`, '', `- 목표: ${instruction.goal || '(미지정)'}`, `- 모드: ${mode}`, '', '## 산출물', ''];
  log(`지시 접수: "${instruction.title}" — 게이트 ${gates.map((g) => 'G' + g.g).join(', ')} (${mode} 모드)`);

  const produced = []; // 지금까지 나온 산출물(저장소 기준 상대경로) — 뒤 작업자가 Read로 이어받는다
  let totalCost = 0;

  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    // 필수 스킬이 이 PC에 없는 작업(예: 와일리 검수)은 건너뛴다.
    const workers = [];
    for (const w of gate.workers) {
      if (w.requires && !(await hasSkill(w.requires))) {
        log(`G${gate.g} ${AGENT_NAME[w.id]}·${w.task}: '${w.requires}' 스킬이 이 PC에 없어 건너뜀`);
        continue;
      }
      workers.push(w);
    }

    // 1) 킥오프 회의 — 담당자 소집(오피스: 회의실 이동 안무)
    await setState({ stage: gate.stage, phase: 'meeting', progress: 0, agents: idleMap(workers) });
    log(`G${gate.g} ${gate.name}: 킥오프 (${[...new Set(workers.map((w) => AGENT_NAME[w.id]))].join(', ')})`);
    await delay(1600);

    // 2) 작업 — 워커를 순차 실행. 현재 작업자를 표시하고, 앞 산출물을 넘겨 이어받게 한다.
    const artifacts = [];
    for (let w = 0; w < workers.length; w++) {
      const progress = Math.max(0.05, Math.min(0.95, (w / workers.length) * 0.95));
      await setState({ stage: gate.stage, phase: 'working', progress, agents: workingMap(workers, workers[w]) });
      const r = await runWorker({ worker: workers[w], gate, instruction: inst, outDir, mode, log, priorFiles: [...produced] });
      totalCost += r.costUsd || 0;
      // 고객 제출·공유용 Word 사본(.docx)을 같은 폴더에 만든다.
      const docx = r.file.toLowerCase().endsWith('.md') ? await exportDocx(r.file, log) : null;
      artifacts.push({ worker: workers[w], ...r, docx });
      produced.push(path.relative(repoRoot, r.file));
    }
    for (const a of artifacts) {
      indexLines.push(`- **G${gate.g}** ${AGENT_NAME[a.worker.id]} · ${path.basename(a.file)}${a.docx ? ` (Word: ${path.basename(a.docx)})` : ''} — ${a.summary}`);
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

  if (totalCost > 0) {
    indexLines.push('', `- 예상 비용 합계: $${totalCost.toFixed(2)} (SDK 추정치, 청구서 아님)`);
    log(`이번 지시 예상 비용 합계: $${totalCost.toFixed(2)}`);
  }
  await fs.writeFile(path.join(outDir, '_index.md'), indexLines.join('\n') + '\n', 'utf8');
}
