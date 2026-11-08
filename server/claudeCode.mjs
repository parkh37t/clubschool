// claude_code 어댑터 — 이 PC에 로그인된 Claude Code CLI 를 자식 프로세스로 부른다.
// con-ai(packages/model-adapter/src/claude-code-cli.ts)에서 검증된 패턴을 옮긴 것:
//   - API 키 없음. 구독 계정의 사용량으로 잡힌다. 자격 증명을 우리 코드가 보지 않는다.
//   - 구조화 출력은 `claude -p --output-format json --json-schema <schema>` 로 받는다.
//   - 팀장(분해)·QA(판정)처럼 도구가 필요 없는 호출은 `--tools "" --setting-sources ""` 로 격리한다(--bare 는 API 키 전용).
//   - 역할 에이전트(산출물 작성)는 Read/Write/Grep/Glob 만 허용하고 Bash 는 막는다.
//   - 실패는 코드로 분류해 돌려준다(cli_missing / not_logged_in / timeout / parse / error).
//     돌지 않은 호출을 성공처럼 꾸미지 않는다.

import { spawn, spawnSync } from 'node:child_process';
import fsSync, { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 지금 돌고 있는 claude 자식 프로세스. 서버가 꺼질 때 남기지 않고 정리한다(이름이 아니라 pid 로).
const ACTIVE = new Set();

/** 프로세스 트리 강제 종료. Windows 는 claude.exe 가 띄운 손자 프로세스까지 taskkill /T 로 함께 닫는다. */
function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else {
    try { child.kill('SIGKILL'); } catch { /* 이미 끝남 */ }
  }
}

/** 서버 종료 시 호출 — 돌고 있는 claude 자식 프로세스를 모두 닫는다. 닫은 개수를 돌려준다. */
export function killAllChildren() {
  const list = [...ACTIVE];
  for (const c of list) killTree(c);
  ACTIVE.clear();
  return list.length;
}

export function activeChildCount() {
  return ACTIVE.size;
}

// 실행 파일 결정 순서: CLAUDE_BIN → PATH 의 claude → (Windows) Claude 데스크톱 앱이 내장한 claude.exe.
// 데스크톱 앱(%APPDATA%\Claude\claude-code\<버전>\<해시>\claude.exe)으로만 Claude Code 를 쓰는 PC 가 있어서 그 경로를 찾아 준다.
function findDesktopBundledClaude() {
  if (process.platform !== 'win32' || !process.env.APPDATA) return null;
  const root = path.join(process.env.APPDATA, 'Claude', 'claude-code');
  try {
    const hits = [];
    for (const ver of fsSync.readdirSync(root)) {
      const vdir = path.join(root, ver);
      if (!fsSync.statSync(vdir).isDirectory()) continue;
      for (const h of fsSync.readdirSync(vdir)) {
        const exe = path.join(vdir, h, 'claude.exe');
        if (fsSync.existsSync(exe)) hits.push({ exe, mtime: fsSync.statSync(exe).mtimeMs });
      }
    }
    hits.sort((a, b) => b.mtime - a.mtime);
    return hits[0]?.exe || null;
  } catch { return null; }
}

const BIN = process.env.CLAUDE_BIN
  || (process.platform === 'win32' ? (findDesktopBundledClaude() || 'claude.cmd') : 'claude');
// .cmd/.bat 는 셸이 필요하지만, .exe 를 셸로 돌리면 cmd.exe 가 JSON 인용부호를 깨뜨린다.
const NEEDS_SHELL = process.platform === 'win32' && /\.(cmd|bat)$/i.test(BIN);

export function claudeBinPath() { return BIN; }

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
      child = spawn(argv[0], argv.slice(1), { cwd, env: { ...process.env, ...env }, shell: NEEDS_SHELL, windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout, stderr, error: e });
      return;
    }
    ACTIVE.add(child);
    const timer = setTimeout(() => { killTree(child); stderr += '\n[timeout]'; }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); ACTIVE.delete(child); resolve({ code: -1, stdout, stderr, error: e }); });
    child.on('close', (code) => { clearTimeout(timer); ACTIVE.delete(child); resolve({ code, stdout, stderr, error: null }); });
    if (stdin) child.stdin.end(stdin); else child.stdin.end();
  });
}

/**
 * 로그인 여부. `claude auth status` 의 JSON 에는 계정 메일·조직 정보도 있으므로 loggedIn 만 꺼내고 나머지는 버린다.
 * @returns {Promise<{cli:boolean, loggedIn:boolean|null}>}  loggedIn=null 은 판단 불가(시간 초과 등)
 */
export async function authStatus() {
  const r = await run([BIN, 'auth', 'status'], { timeoutMs: 20000 });
  if (r.error && r.error.code === 'ENOENT') return { cli: false, loggedIn: null };
  if (r.error) return { cli: false, loggedIn: null };
  const res = parseResultJson(r.stdout);
  if (res && typeof res.loggedIn === 'boolean') return { cli: true, loggedIn: res.loggedIn };
  if (classify(r) === 'not_logged_in') return { cli: true, loggedIn: false };
  return { cli: true, loggedIn: null };
}

/**
 * 새 PowerShell 창에서 `claude auth login` 을 연다. 브라우저 승인 뒤 코드를 같은 창에 붙여 넣는 대화형이라
 * 서버 안에서 돌리지 않고 창을 따로 띄운다. Windows 전용.
 */
export async function openLoginWindow() {
  if (process.platform !== 'win32') return { ok: false, message: 'Windows 에서만 창을 띄웁니다. 터미널에서 claude auth login 을 실행하세요.' };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-office-login-'));
  const ps1 = path.join(dir, 'claude-login.ps1');
  const bin = BIN.replace(/'/g, "''");
  const script = [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    "$Host.UI.RawUI.WindowTitle = 'Claude 로그인 - Wylie AX Office'",
    "Write-Host 'Claude 로그인을 시작합니다. 브라우저에서 승인한 뒤, 화면에 나온 코드를 이 창에 붙여 넣으세요.'",
    "Write-Host ''",
    `& '${bin}' auth login`,
    "Write-Host ''",
    "Write-Host '끝났으면 이 창을 닫아도 됩니다. AX Office 화면의 로그인 배너는 잠시 뒤 사라집니다.'",
  ].join('\r\n');
  // PowerShell 5.1 은 BOM 없는 .ps1 을 ANSI(CP949)로 읽어 한글이 깨지므로 BOM 을 붙인다.
  await fs.writeFile(ps1, '﻿' + script, 'utf8');
  // detached 만으로는 콘솔 창이 생기지 않으므로 cmd 의 start 로 새 창을 연다. 인용부호를 그대로 넘기려고 verbatim.
  const child = spawn('cmd.exe', ['/d', '/c', `start "Claude 로그인" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "${ps1}"`], {
    windowsVerbatimArguments: true, detached: true, stdio: 'ignore', windowsHide: true,
  });
  child.on('error', () => {});
  child.unref();
  return { ok: true };
}

function classify(r) {
  if (r.error && r.error.code === 'ENOENT') return 'cli_missing';
  if (/\[timeout\]/.test(r.stderr)) return 'timeout';
  const text = (r.stdout + '\n' + r.stderr).toLowerCase();
  if (/not logged in|please run \/login|authentication error|failed to authenticate|oauth session expired|invalid api key|log in/.test(text)) return 'not_logged_in';
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
  // `--bare` 는 키체인/OAuth 자격 증명을 읽지 않아(API 키 전용) claude.ai 로그인 PC 에서는 "Not logged in" 이 난다.
  // 그래서 --bare 대신 --tools "" + --setting-sources "" + --strict-mcp-config 로 격리한다.
  const argv = [
    BIN, '-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
    '--tools', '', '--setting-sources', '', '--strict-mcp-config',
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
