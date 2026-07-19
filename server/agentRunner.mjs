// 워커(에이전트) 1명이 한 게이트에서 자기 작업을 수행하고 산출물 파일을 남긴다.
// 모드 두 가지:
//   - mock (기본): API 키·SDK 없이 즉시 동작. 타이밍만 흉내내고 플레이스홀더 산출물을 쓴다.
//                  → 배선(지시→오피스→산출물 폴더)을 키 없이 눈으로 검증하는 용도.
//   - live: Claude Agent SDK로 실제 .claude/agents 페르소나를 구동해 진짜 산출물을 생성.
//           ANTHROPIC_API_KEY(서버 환경변수)와 @anthropic-ai/claude-agent-sdk 설치가 필요.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_NAME, AGENT_PERSONA } from './gates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');

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

/** 워커 1명 실행. 성공 시 { file, summary } 반환. */
export async function runWorker({ worker, gate, instruction, outDir, mode, log }) {
  const name = AGENT_NAME[worker.id];
  log(`${name}: G${gate.g} · ${worker.task} 착수`);
  const result = mode === 'live'
    ? await runLive({ worker, gate, instruction, outDir, log })
    : await runMock({ worker, gate, instruction, outDir });
  log(`${name}: ${path.basename(result.file)} 산출`);
  return result;
}

// ── mock: 키 없이 배선 검증 ──
async function runMock({ worker, gate, instruction, outDir }) {
  await delay(1100 + Math.floor(Math.random() * 900));
  const name = AGENT_NAME[worker.id];
  const file = path.join(outDir, `G${gate.g}_${worker.id}_${safe(worker.task)}.md`);
  const md = [
    `# [목업] ${worker.task}`,
    '',
    `- 담당: ${name} (${worker.id}) · 게이트 G${gate.g} ${gate.name}`,
    `- 과제: ${instruction.title}`,
    `- 목표: ${instruction.goal || '(미지정)'}`,
    '',
    '> 이 파일은 **목업 산출물**입니다. `OFFICE_MODE=live` + `ANTHROPIC_API_KEY`로 실행하면',
    `> 실제 ${name} 에이전트가 스킬을 사용해 진짜 산출물로 대체합니다.`,
    '',
  ].join('\n');
  await fs.writeFile(file, md, 'utf8');
  return { file, summary: `[목업] ${worker.task}` };
}

// ── live: Claude Agent SDK로 실제 에이전트 구동 ──
// SDK는 라이브 모드에서만 lazy import(미설치여도 mock은 동작).
// 참고 API: query({prompt, options}) → async iterable. 최종 텍스트는 type==='result' && subtype==='success'의 .result.
// 무인 파일 쓰기: permissionMode='acceptEdits' + allowedTools에 Write 포함. .claude 규칙 로드: settingSources=['project'].
async function runLive({ worker, gate, instruction, outDir, log }) {
  let query;
  try {
    ({ query } = await import('@anthropic-ai/claude-agent-sdk'));
  } catch {
    throw new Error(
      "라이브 모드에는 SDK가 필요합니다. server/ 에서 'npm install' 후 다시 실행하세요.",
    );
  }
  const persona = await loadPersona(worker.id);
  const rel = path.relative(REPO_ROOT, outDir) || '.';
  const prompt = [
    `# 과제: ${instruction.title}`,
    `목표: ${instruction.goal || '(자유 판단)'}`,
    '',
    `# 당신(${AGENT_NAME[worker.id]})의 이번 게이트 작업 — G${gate.g} ${gate.name}`,
    worker.task,
    '',
    '## 지시',
    `- 산출물을 '${rel}/' 폴더에 마크다운 파일로 저장하세요(Write 도구 사용).`,
    '- 한국어로, 근거와 함께 실무 수준으로 작성합니다.',
    '- 확정되지 않은 가정은 "미해결"로 명시하고 임의로 지어내지 않습니다(정직성).',
    '- 마지막 줄에 한 줄 요약을 출력하세요.',
  ].join('\n');

  // 실행 전/후 폴더 스냅샷 → 에이전트가 새로 만든 파일을 산출물로 인식.
  const before = new Set(await listDir(outDir));
  const options = {
    cwd: REPO_ROOT,
    systemPrompt: persona,
    allowedTools: ['Read', 'Write', 'Grep', 'Glob'],
    permissionMode: 'acceptEdits', // 파일 편집/생성만 무인 승인(전체 우회 아님)
    settingSources: ['project'], // CLAUDE.md·.claude 규칙 로드
  };
  if (process.env.OFFICE_MODEL) options.model = process.env.OFFICE_MODEL; // 선택: 모델 지정

  let finalText = '';
  try {
    for await (const msg of query({ prompt, options })) {
      if (msg?.type === 'assistant') {
        const parts = msg.message?.content ?? [];
        for (const p of parts) if (p?.type === 'text' && p.text) finalText = p.text;
      } else if (msg?.type === 'result' && msg.subtype === 'success' && msg.result) {
        finalText = msg.result;
      }
    }
  } catch (err) {
    // 단발 query는 에러 result 후 throw할 수 있음 → 여기서 흡수하고 폴백 파일로 산출.
    log(`${AGENT_NAME[worker.id]}: 실행 경고 — ${err?.message || err}`);
  }

  // 새로 생성된 파일 탐지. 없으면 최종 텍스트를 폴백 파일로 저장(항상 산출물 1개 보장).
  const after = await listDir(outDir);
  const created = after.find((f) => !before.has(f));
  if (created) {
    return { file: path.join(outDir, created), summary: firstLine(finalText) || worker.task };
  }
  const fallback = path.join(outDir, `G${gate.g}_${worker.id}_${safe(worker.task)}.md`);
  await fs.writeFile(fallback, (finalText || `# ${worker.task}\n(산출 텍스트 없음)`) + '\n', 'utf8');
  return { file: fallback, summary: firstLine(finalText) || worker.task };
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
