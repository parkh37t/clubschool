// 워커(에이전트) 1명이 한 게이트에서 자기 작업을 수행하고 산출물 파일을 남긴다.
// 모드 두 가지:
//   - mock (기본): API 키·SDK 없이 즉시 동작. 타이밍만 흉내내고 플레이스홀더 산출물을 쓴다.
//                  → 배선(지시→오피스→산출물 폴더)과 스킬 연결을 키 없이 눈으로 검증하는 용도.
//   - live: Claude Agent SDK로 실제 .claude/agents 페르소나를 구동해 진짜 산출물을 생성.
//           ANTHROPIC_API_KEY(서버 환경변수)와 @anthropic-ai/claude-agent-sdk 설치가 필요.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_NAME, AGENT_PERSONA } from './gates.mjs';
import { resolveSkills } from './skills.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');

// 작업 1건당 안전장치 — 에이전트가 헤매도 요금·시간이 무한정 늘지 않게 한다(환경변수로 조정).
const MAX_TURNS = Number(process.env.OFFICE_MAX_TURNS || 40);
const MAX_USD = Number(process.env.OFFICE_MAX_USD || 2); // 작업 1건 예상 비용 상한(달러)

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 파일명에 못 쓰는 문자 정리(작업/과제명 → 안전한 파일명 조각).
function safe(s) {
  return String(s || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 40) || 'untitled';
}

// .claude/agents/<name>.md에서 YAML 프론트매터를 제거한 본문(페르소나)만 추출.
async function loadPersona(agentId) {
  const file = path.join(AGENTS_DIR, AGENT_PERSONA[agentId] + '.md');
  const raw = await fs.readFile(file, 'utf8');
  return raw.replace(/^---[\s\S]*?---\s*/, '').trim();
}

/**
 * 워커 1명 실행. 성공 시 { file, summary, costUsd } 반환.
 * priorFiles: 같은 과제에서 앞 사람들이 낸 산출물(저장소 기준 상대경로) — 이어받아 일관되게 쓰게 한다.
 */
export async function runWorker({ worker, gate, instruction, outDir, mode, log, priorFiles = [] }) {
  const name = AGENT_NAME[worker.id];
  const skills = await resolveSkills(worker.skills);
  const used = skills.applied.map((s) => s.name);
  log(`${name}: G${gate.g} · ${worker.task} 착수${used.length ? ` — 스킬 ${used.join(', ')}` : ''}`);
  if (skills.missing.length) log(`${name}: 이 PC에 없는 스킬은 건너뜀 — ${skills.missing.join(', ')}`);
  const ctx = { worker, gate, instruction, outDir, log, skills, priorFiles };
  const result = mode === 'live' ? await runLive(ctx) : await runMock(ctx);
  const cost = result.costUsd ? ` (예상 비용 $${result.costUsd.toFixed(2)})` : '';
  log(`${name}: ${path.basename(result.file)} 산출${cost}`);
  return result;
}

// ── mock: 키 없이 배선·스킬 연결 검증 ──
async function runMock({ worker, gate, instruction, outDir, skills, priorFiles }) {
  await delay(1100 + Math.floor(Math.random() * 900));
  const name = AGENT_NAME[worker.id];
  const file = path.join(outDir, `G${gate.g}_${worker.id}_${safe(worker.task)}.md`);
  const md = [
    `# [목업] ${worker.task}`,
    '',
    `- 담당: ${name} (${worker.id}) · 게이트 G${gate.g} ${gate.name}`,
    `- 과제: ${instruction.title}`,
    `- 목표: ${instruction.goal || '(미지정)'}`,
    `- 발주 자료(RFP): ${instruction.brief ? `수신됨(${instruction.brief.length}자)` : '없음'}`,
    `- 첨부 파일: ${instruction.attachmentPaths?.length ? instruction.attachmentPaths.join(', ') : '없음'}`,
    `- 적용 스킬: ${skills.applied.length ? skills.applied.map((s) => s.name).join(', ') : '없음'}`,
    ...(skills.missing.length ? [`- 이 PC에 없어 건너뛴 스킬: ${skills.missing.join(', ')}`] : []),
    `- 이어받은 앞 산출물: ${priorFiles.length ? priorFiles.join(', ') : '없음'}`,
    '',
    '> 이 파일은 **목업 산출물**입니다. `OFFICE_MODE=live` + `ANTHROPIC_API_KEY`로 실행하면',
    `> 실제 ${name} 에이전트가 위 스킬 지침대로 진짜 산출물을 작성합니다.`,
    '',
  ].join('\n');
  await fs.writeFile(file, md, 'utf8');
  return { file, summary: `[목업] ${worker.task}`, costUsd: 0 };
}

/** 라이브 에이전트에게 줄 지시문. 검토·테스트를 위해 따로 분리해 둔다. */
export function buildLivePrompt({ worker, gate, instruction, outDir, skills, priorFiles = [] }) {
  const rel = path.relative(REPO_ROOT, outDir) || '.';
  const brief = String(instruction.brief || '').trim(); // 지시 콘솔에서 붙여넣은 RFP·자료 전문
  const attach = Array.isArray(instruction.attachmentPaths) ? instruction.attachmentPaths : []; // 첨부 파일(상대경로)
  const applied = skills?.applied || [];
  const hasSource = brief || attach.length > 0;
  return [
    `# 과제: ${instruction.title}`,
    `목표: ${instruction.goal || '(자유 판단)'}`,
    // 발주 자료(RFP)가 있으면 모든 게이트의 에이전트가 이 내용을 사실 근거로 사용한다.
    ...(brief ? ['', '# 발주 자료 (RFP·요구사항) — 아래 내용을 사실 근거로 사용하세요', brief] : []),
    // 첨부 파일이 있으면 Read 도구로 직접 열어 근거로 삼는다(PDF·텍스트 등).
    ...(attach.length ? ['', '# 첨부 파일 — 반드시 Read 도구로 아래 파일을 먼저 열어 내용을 사실 근거로 사용하세요', ...attach.map((p) => `- ${p}`)] : []),
    // 앞 사람 산출물을 이어받아야 결정·수치·용어가 게이트를 넘어 일관된다(handoff.md의 파일 기반 인계).
    ...(priorFiles.length
      ? ['', '# 앞 단계 산출물 — 먼저 Read 도구로 읽고, 결정·수치·용어를 그대로 이어받아 작성하세요', ...priorFiles.map((p) => `- ${p}`)]
      : []),
    '',
    `# 당신(${AGENT_NAME[worker.id]})의 이번 게이트 작업 — G${gate.g} ${gate.name}`,
    worker.task,
    ...(applied.length
      ? [
          '',
          '# 업무 지침(스킬) — 아래 <skill> 안의 절차·형식·금지선을 따르세요',
          '- 지침에 이 저장소(프로젝트 관리 대시보드) 전용 언급(VIEW_NAMES·components/ui·useDataStore 등)이 있으면 무시하고 이번 고객 과제 기준으로 적용합니다.',
          '- 지침이 PPTX·엑셀 제작, 코드 실행, 다른 스킬 호출을 요구해도 이번 단계에서는 하지 않습니다. 그 내용(장표 계획·표 구조 등)은 마크다운 문서 안에 기술합니다.',
          '- 지침이 사용자에게 질문하라고 해도 이번 실행은 무인 진행입니다. 질문 대신 "가정"·"미해결"로 표시하고 계속합니다.',
          ...applied.flatMap((s) => [
            '',
            `<skill name="${s.name}">`,
            ...(s.refs ? [`(참고자료 폴더: ${s.refs} — 필요하면 Read)`] : []),
            s.body,
            '</skill>',
          ]),
        ]
      : []),
    '',
    '## 지시',
    ...(attach.length ? ['- 작업 시작 전, 위 첨부 파일을 Read 도구로 모두 읽으세요.'] : []),
    `- 산출물을 '${rel}/' 폴더에 마크다운 파일 1개로 저장하세요(Write 도구 사용). Word 변환은 서버가 자동으로 합니다.`,
    '- 한국어로, 근거와 함께 실무 수준으로 작성합니다.',
    hasSource
      ? '- 위 발주 자료·첨부를 최우선 근거로 삼고, 자료에 없는 값만 "가정"으로 명시합니다(지어내지 않기).'
      : '- 확정되지 않은 가정은 "미해결"로 명시하고 임의로 지어내지 않습니다(정직성).',
    '- 마지막 줄에 한 줄 요약을 출력하세요.',
  ].join('\n');
}

// ── live: Claude Agent SDK로 실제 에이전트 구동 ──
// SDK는 라이브 모드에서만 lazy import(미설치여도 mock은 동작).
// 참고 API: query({prompt, options}) → async iterable. 최종 결과는 type==='result' 메시지(.result, .total_cost_usd).
// 무인 파일 쓰기: permissionMode='acceptEdits' + allowedTools에 Write 포함. .claude 규칙 로드: settingSources=['project'].
async function runLive(ctx) {
  const { worker, gate, outDir, log } = ctx;
  const name = AGENT_NAME[worker.id];
  let query;
  try {
    ({ query } = await import('@anthropic-ai/claude-agent-sdk'));
  } catch {
    throw new Error("라이브 모드에는 SDK가 필요합니다. server/ 에서 'npm install' 후 다시 실행하세요.");
  }
  const persona = await loadPersona(worker.id);
  const prompt = buildLivePrompt(ctx);

  // 실행 전/후 폴더 스냅샷 → 에이전트가 새로 만든 파일을 산출물로 인식.
  const before = new Set(await listDir(outDir));
  const options = {
    cwd: REPO_ROOT,
    systemPrompt: persona,
    allowedTools: ['Read', 'Write', 'Grep', 'Glob'],
    // 무인 실행에서 PC 명령 실행은 막는다(문서 작성만). 스킬 지침은 지시문에 이미 넣었으므로 Skill 도구 재호출도 막는다.
    disallowedTools: ['Bash', 'Skill'],
    permissionMode: 'acceptEdits', // 파일 편집/생성만 무인 승인(전체 우회 아님)
    settingSources: ['project'], // CLAUDE.md·.claude 규칙 로드
    maxTurns: MAX_TURNS,
    maxBudgetUsd: MAX_USD,
  };
  if (process.env.OFFICE_MODEL) options.model = process.env.OFFICE_MODEL; // 선택: 모델 지정

  let finalText = '';
  let costUsd = 0;
  try {
    for await (const msg of query({ prompt, options })) {
      if (msg?.type === 'assistant') {
        const parts = msg.message?.content ?? [];
        for (const p of parts) if (p?.type === 'text' && p.text) finalText = p.text;
      } else if (msg?.type === 'result') {
        if (typeof msg.total_cost_usd === 'number') costUsd = msg.total_cost_usd;
        if (msg.subtype === 'success' && msg.result) finalText = msg.result;
        else if (msg.subtype === 'error_max_budget_usd') log(`${name}: 비용 상한($${MAX_USD}) 도달로 중단 — 그때까지 쓴 내용으로 산출`);
        else if (msg.subtype === 'error_max_turns') log(`${name}: 최대 턴(${MAX_TURNS}) 도달로 중단 — 그때까지 쓴 내용으로 산출`);
      }
    }
  } catch (err) {
    // 단발 query는 에러 result 후 throw할 수 있음 → 여기서 흡수하고 폴백 파일로 산출.
    log(`${name}: 실행 경고 — ${err?.message || err}`);
  }

  // 새로 생성된 .md 파일 탐지. 없으면 최종 텍스트를 폴백 파일로 저장(항상 산출물 1개 보장).
  const after = await listDir(outDir);
  const created = after.find((f) => !before.has(f) && f.toLowerCase().endsWith('.md'));
  if (created) {
    return { file: path.join(outDir, created), summary: firstLine(finalText) || worker.task, costUsd };
  }
  const fallback = path.join(outDir, `G${gate.g}_${worker.id}_${safe(worker.task)}.md`);
  await fs.writeFile(fallback, (finalText || `# ${worker.task}\n(산출 텍스트 없음)`) + '\n', 'utf8');
  return { file: fallback, summary: firstLine(finalText) || worker.task, costUsd };
}

async function listDir(dir) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function firstLine(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const line = t.split('\n').find((l) => l.trim()) || '';
  return line.replace(/^#+\s*/, '').slice(0, 60);
}
