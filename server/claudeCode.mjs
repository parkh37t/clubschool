// claude_code 어댑터 — 이 PC에 로그인된 Claude Code CLI 를 자식 프로세스로 부른다.
// con-ai(packages/model-adapter/src/claude-code-cli.ts)에서 검증된 패턴을 옮긴 것:
//   - API 키 없음. 구독 계정의 사용량으로 잡힌다. 자격 증명을 우리 코드가 보지 않는다.
//   - 구조화 출력은 `claude -p --output-format json --json-schema <schema>` 로 받는다.
//   - 팀장(분해)·QA(판정)처럼 도구가 필요 없는 호출은 `--bare --tools ""` 로 격리한다.
//   - 역할 에이전트(산출물 작성)는 Read/Write/Grep/Glob 만 허용하고 Bash 는 막는다.
//   - 실패는 코드로 분류해 돌려준다(cli_missing / not_logged_in / timeout / parse / error).
//     돌지 않은 호출을 성공처럼 꾸미지 않는다.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = process.env.CLAUDE_BIN || (process.platform === 'win32' ? 'claude.cmd' : 'claude');

/** CLI 가 PATH 에 있는지. 없으면 null 대신 버전 문자열을 돌려주지 않고 false. */
export async function claudeAvailable() {
  const r = await run([BIN, '--version'], { timeoutMs: 15000 });
  return r.code === 0 && !r.error ? r.stdout.trim() : false;
}

function run(argv, { cwd, stdin, timeoutMs = 300000, env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { cwd, env: { ...process.env, ...env }, shell: process.platform === 'win32', windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout, stderr, error: e });
      return;
    }
    const timer = setTimeout(() => { child.kill('SIGKILL'); stderr += '\n[timeout]'; }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr, error: e }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, error: null }); });
    if (stdin) child.stdin.end(stdin); else child.stdin.end();
  });
}

function classify(r) {
  if (r.error && r.error.code === 'ENOENT') return 'cli_missing';
  if (/\[timeout\]/.test(r.stderr)) return 'timeout';
  const text = (r.stdout + '\n' + r.stderr).toLowerCase();
  if (/not logged in|please run \/login|authentication error|invalid api key|log in/.test(text)) return 'not_logged_in';
  if (/rate limit|429|overloaded/.test(text)) return 'rate_limit';
  return 'error';
}

/** CLI 의 json 출력(마지막 result 객체)을 꺼낸다. stream 이 섞여도 마지막 JSON 줄을 찾는다. */
function parseResultJson(stdout) {
  const t = stdout.trim();
  try { return JSON.parse(t); } catch { /* 여러 줄일 수 있음 */ }
  const lines = t.split('\n').filter((l) => l.trim().startsWith('{'));
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch { /* 다음 줄 */ }
  }
  return null;
}

/** result 안에서 구조화 출력을 찾는다: structured_output 우선, 없으면 result 텍스트를 JSON 으로. */
function extractStructured(res) {
  if (res && res.structured_output && typeof res.structured_output === 'object') return res.structured_output;
  const text = typeof res?.result === 'string' ? res.result : '';
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* 코드펜스 안일 수 있음 */ }
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* 포기 */ } }
  const first = text.indexOf('{'); const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) { try { return JSON.parse(text.slice(first, last + 1)); } catch { /* 포기 */ } }
  return null;
}

/**
 * 도구 없는 구조화 호출(팀장 분해·QA 판정용).
 * @returns {Promise<{ok:true, data, costUsd, raw}|{ok:false, code, message, raw}>}
 */
export async function runStructured({ system, prompt, schema, model, timeoutMs = 240000, maxTurns = 3 }) {
  // 빈 임시 디렉터리에서 돌린다 — cwd 의 CLAUDE.md·훅·MCP 가 섞이지 않게(con-ai 와 같은 이유).
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-office-'));
  const argv = [
    BIN, '-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
    '--bare', '--tools', '', '--setting-sources', '', '--strict-mcp-config',
    '--no-session-persistence', '--max-turns', String(maxTurns),
  ];
  if (system) argv.push('--system-prompt', system);
  if (model) argv.push('--model', model);
  const r = await run(argv, { cwd, stdin: prompt, timeoutMs });
  await fs.rm(cwd, { recursive: true, force: true }).catch(() => {});
  const res = parseResultJson(r.stdout);
  if (r.code !== 0 || r.error || !res || res.is_error) {
    return { ok: false, code: classify(r), message: (res?.result || r.stderr || r.stdout || '').toString().slice(0, 600), raw: res };
  }
  const data = extractStructured(res);
  if (!data) return { ok: false, code: 'parse', message: '구조화 출력을 JSON 으로 읽지 못했습니다.', raw: res };
  return { ok: true, data, costUsd: Number(res.total_cost_usd || 0), raw: res };
}

/**
 * 파일을 읽고 쓰는 역할 에이전트 호출(산출물 작성용). cwd 는 저장소 루트.
 * 허용 도구: Read, Write, Grep, Glob. Bash·Skill 은 막는다(무인 실행에서 명령 실행 금지).
 * @returns {Promise<{ok:true, text, costUsd, raw}|{ok:false, code, message, raw}>}
 */
export async function runAgent({ system, prompt, cwd, model, timeoutMs = 600000, maxTurns = 40, addDirs = [] }) {
  const argv = [
    BIN, '-p', '--output-format', 'json',
    '--allowedTools', 'Read', 'Write', 'Edit', 'Grep', 'Glob',
    '--disallowedTools', 'Bash', 'Skill', 'WebFetch', 'WebSearch',
    '--permission-mode', 'acceptEdits',
    '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
    '--max-turns', String(maxTurns),
  ];
  for (const d of addDirs) argv.push('--add-dir', d);
  if (system) argv.push('--system-prompt', system);
  if (model) argv.push('--model', model);
  const r = await run(argv, { cwd, stdin: prompt, timeoutMs });
  const res = parseResultJson(r.stdout);
  if (r.code !== 0 || r.error || !res || res.is_error) {
    return { ok: false, code: classify(r), message: (res?.result || r.stderr || r.stdout || '').toString().slice(0, 600), raw: res };
  }
  return { ok: true, text: String(res.result || ''), costUsd: Number(res.total_cost_usd || 0), raw: res };
}
