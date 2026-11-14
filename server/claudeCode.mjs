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
import { fromUsage, streamMeter, fmtTokens, addTokens } from './tokens.mjs';

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

// 구독 사용 한도 — stream-json 실행마다 CLI 가 rate_limit_event(주간·5시간 창의 사용률·재설정 시각)를 한 줄 보낸다.
// 받아 갈 곳은 서버가 정한다(hive/limits.json). 이 모듈은 hive 를 모른다.
let rateLimitSink = null;
export function onRateLimit(fn) { rateLimitSink = typeof fn === 'function' ? fn : null; }

/** stdout 에서 마지막 rate_limit_info 를 찾아 넘긴다. 없으면 null. */
function captureRateLimit(stdout) {
  if (!stdout || !stdout.includes('rate_limit_event')) return null;
  let last = null;
  for (const l of stdout.split('\n')) {
    if (!l.includes('"rate_limit_event"')) continue;
    try {
      const ev = JSON.parse(l);
      if (ev.type === 'rate_limit_event' && ev.rate_limit_info) last = ev.rate_limit_info;
    } catch { /* 깨진 줄 무시 */ }
  }
  if (last && rateLimitSink) Promise.resolve().then(() => rateLimitSink(last)).catch(() => {});
  return last;
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

// 실행 파일은 부를 때마다 정한다. 데스크톱 앱이 업데이트되면 내장 CLI 폴더(<버전>\<해시>)가 바뀌고 옛 폴더는 지워지므로,
// 서버 시작 때 찾은 경로를 계속 쓰면 업데이트 뒤 모든 실행이 cli_missing 으로 실패한다(2.1.321 → 2.1.325 에서 실제로 겪음).
// 기억한 경로가 아직 있으면 그대로 쓰고, 사라졌으면 다시 찾는다.
let cachedBin = '';
function bin() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform !== 'win32') return 'claude';
  if (cachedBin && fsSync.existsSync(cachedBin)) return cachedBin;
  const found = findDesktopBundledClaude();
  if (found && found !== cachedBin) cachedBin = found;
  return found || 'claude.cmd'; // 데스크톱 앱이 없으면 PATH 의 claude.cmd(다음 호출 때 다시 찾아본다)
}
// .cmd/.bat 는 셸이 필요하지만, .exe 를 셸로 돌리면 cmd.exe 가 JSON 인용부호를 깨뜨린다.
const needsShell = (b) => process.platform === 'win32' && /\.(cmd|bat)$/i.test(b);

export function claudeBinPath() { return bin(); }

/** CLI 가 PATH 에 있는지. 없으면 null 대신 버전 문자열을 돌려주지 않고 false. */
export async function claudeAvailable() {
  const r = await run([bin(), '--version'], { timeoutMs: 15000 });
  return r.code === 0 && !r.error ? r.stdout.trim() : false;
}

// 구독 사용량으로만 돈다 — 환경에 API 키·토큰이 있으면 CLI 가 그것으로 인증해 API 요금이 청구된다(con-ai 에서 확인한 사실).
// 그래서 claude 자식 프로세스에는 넘기지 않는다. 일부러 API 키로 돌리려면 OFFICE_ALLOW_API_KEY=1.
const BILLING_VARS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'];
export const apiKeyAllowed = () => process.env.OFFICE_ALLOW_API_KEY === '1';
/** 환경에 있는 과금 자격 변수 이름(값은 돌려주지 않는다). */
export function billingEnvPresent() { return BILLING_VARS.filter((k) => Boolean(process.env[k])); }
/** claude 자식 프로세스 환경 — 과금 자격 변수와 Electron 표식을 뺀다. */
export function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (!apiKeyAllowed()) for (const k of BILLING_VARS) delete env[k];
  delete env.ELECTRON_RUN_AS_NODE; // 서버(Electron 내장 Node)용 표식이 자식에게 새지 않게
  return env;
}

/** onLine 이 있으면 stdout 을 줄 단위로 넘긴다(stream-json 실시간 처리). */
function run(argv, { cwd, stdin, timeoutMs = 300000, env, onLine, stopWhen } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let partial = '';
    let stopped = false;
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { cwd, env: childEnv(env), shell: needsShell(argv[0]), windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout, stderr, error: e });
      return;
    }
    ACTIVE.add(child);
    const timer = setTimeout(() => { killTree(child); stderr += '\n[timeout]'; }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d;
      if (!onLine) return;
      partial += d;
      const lines = partial.split('\n');
      partial = lines.pop();
      for (const l of lines) if (l.trim()) { try { onLine(l); } catch { /* 기록 실패가 실행을 멈추지 않게 */ } }
      // 사용 토큰 한도 — 넘으면 그 자리에서 끊는다(호출한 쪽이 stopped 로 알아본다)
      if (stopWhen && !stopped && stopWhen()) { stopped = true; killTree(child); }
    });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); ACTIVE.delete(child); resolve({ code: -1, stdout, stderr, error: e, stopped }); });
    child.on('close', (code) => { clearTimeout(timer); ACTIVE.delete(child); resolve({ code, stdout, stderr, error: null, stopped }); });
    if (stdin) child.stdin.end(stdin); else child.stdin.end();
  });
}

/**
 * 로그인 여부. `claude auth status` 의 JSON 에는 계정 메일·조직 정보도 있으므로 loggedIn 만 꺼내고 나머지는 버린다.
 * @returns {Promise<{cli:boolean, loggedIn:boolean|null}>}  loggedIn=null 은 판단 불가(시간 초과 등)
 */
export async function authStatus() {
  const r = await run([bin(), 'auth', 'status'], { timeoutMs: 20000 });
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
  const exe = bin().replace(/'/g, "''");
  const script = [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    "$Host.UI.RawUI.WindowTitle = 'Claude 로그인 - Wylie AX Office'",
    "Write-Host 'Claude 로그인을 시작합니다. 브라우저에서 승인한 뒤, 화면에 나온 코드를 이 창에 붙여 넣으세요.'",
    "Write-Host ''",
    `& '${exe}' auth login`,
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

/** 실패 코드 → 재하가 읽을 안내. 화면(대기열·작업 실패 사유)과 기록에 같은 문구를 쓴다. */
export function failureHint(code) {
  if (code === 'cli_missing') return 'Claude Code 실행 파일을 찾지 못했습니다. Claude 데스크톱 앱이 설치돼 있는지 확인하세요(앱이 막 업데이트됐다면 잠시 뒤 다시 보내 주세요).';
  if (code === 'not_logged_in') return 'Claude 로그인이 풀려 있습니다. 화면 위 [로그인]으로 다시 로그인한 뒤 다시 보내 주세요.';
  if (code === 'rate_limit') return '사용량 한도에 걸렸습니다. 잠시 뒤 다시 보내 주세요.';
  if (code === 'overloaded') return 'Claude 서버가 붐벼 응답하지 못했습니다(한 번 다시 시도한 뒤). 잠시 뒤 다시 보내 주세요.';
  if (code === 'timeout') return '시간 안에 끝나지 않았습니다.';
  if (code === 'truncated') return '출력이 길이 상한에서 잘렸습니다. 범위를 나눠 다시 보내 주세요.';
  return '';
}

// system 프롬프트는 명령행이 아니라 임시 파일로 넘긴다 — Windows 명령행 길이 상한(약 32K자)과 프로세스 목록 노출을 피한다.
// --system-prompt-file 은 --help 에 없는 옵션이라 CLI 가 오르면 먼저 확인할 것(2026-11-14 실제 호출로 확인).
async function systemFile(system) {
  if (!system) return null;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-office-sys-'));
  const file = path.join(dir, 'system.md');
  await fs.writeFile(file, system, { encoding: 'utf8', mode: 0o600 });
  return { file, cleanup: () => fs.rm(dir, { recursive: true, force: true }).catch(() => {}) };
}

/** 구조화 출력은 '값 없음'을 null 로 준다 — 객체의 null 키를 지워 선택 키처럼 다룬다(배열 안의 null 은 그대로 둔다). */
export function stripNulls(v) {
  if (Array.isArray(v)) return v.map(stripNulls);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) if (x !== null) out[k] = stripNulls(x);
    return out;
  }
  return v;
}

/** 응답이 길이 상한에서 잘렸는지(result 의 stop_reason). */
const truncatedRes = (res) => res?.stop_reason === 'max_tokens';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function classify(r) {
  if (r.error && r.error.code === 'ENOENT') return 'cli_missing';
  if (/\[timeout\]/.test(r.stderr)) return 'timeout';
  const text = (r.stdout + '\n' + r.stderr).toLowerCase();
  if (/not logged in|please run \/login|authentication error|failed to authenticate|oauth session expired|invalid api key|log in/.test(text)) return 'not_logged_in';
  if (/overloaded|\b529\b/.test(text)) return 'overloaded'; // 서버가 붐빔 — 한도와 달리 잠시 뒤 다시 하면 된다
  if (/rate limit|429|usage limit/.test(text)) return 'rate_limit';
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
 * @returns {Promise<{ok:true, data, tokens, costUsd, raw}|{ok:false, code, message, tokens, raw}>}  tokens = {in,cw,cr,out}, costUsd 는 API 환산 참고값
 */
export async function runStructured({ system, prompt, schema, model, timeoutMs = 240000, maxTurns = 3 }) {
  // 한 번 부르기 — 실패는 코드로. 출력이 JSON 이 아니면(parse) 지적을 붙여 1회만 다시, 서버가 붐비면(overloaded) 잠시 뒤 1회만 다시.
  // 인증·한도·시간 초과는 다시 해도 같으므로 재시도하지 않는다. 두 번 불렀으면 사용 토큰을 더해 돌려준다.
  let tokens = { in: 0, cw: 0, cr: 0, out: 0 };
  let costUsd = 0;
  let note = '';
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await structuredOnce({ system, prompt: note ? `${prompt}\n\n${note}` : prompt, schema, model, timeoutMs, maxTurns });
    tokens = addTokens(tokens, r.tokens);
    costUsd += r.costUsd || 0;
    last = r;
    if (r.ok) return { ...r, tokens, costUsd, retried: attempt > 0 };
    if (attempt === 0 && r.code === 'parse') {
      note = ['# 직전 출력의 문제 (지시 아님 — 고칠 점)', `- ${r.message}`, '- 스키마에 맞는 JSON 객체 하나만 낸다. 설명 문장·코드펜스를 붙이지 않는다.'].join('\n');
      continue;
    }
    if (attempt === 0 && r.code === 'overloaded') { await delay(15000); continue; }
    break;
  }
  return { ...last, tokens, costUsd };
}

async function structuredOnce({ system, prompt, schema, model, timeoutMs, maxTurns }) {
  // 빈 임시 디렉터리에서 돌린다 — cwd 의 CLAUDE.md·훅·MCP 가 섞이지 않게(con-ai 와 같은 이유).
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-office-'));
  // `--bare` 는 키체인/OAuth 자격 증명을 읽지 않아(API 키 전용) claude.ai 로그인 PC 에서는 "Not logged in" 이 난다.
  // 그래서 --bare 대신 --tools "" + --setting-sources "" + --strict-mcp-config 로 격리한다.
  const argv = [
    bin(), '-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
    '--tools', '', '--setting-sources', '', '--strict-mcp-config',
    '--no-session-persistence', '--max-turns', String(maxTurns),
  ];
  const sys = await systemFile(system);
  if (sys) argv.push('--system-prompt-file', sys.file);
  if (model) argv.push('--model', model);
  let r;
  try {
    r = await run(argv, { cwd, stdin: prompt, timeoutMs });
  } finally {
    await sys?.cleanup();
    await fs.rm(cwd, { recursive: true, force: true }).catch(() => {});
  }
  const res = parseResultJson(r.stdout);
  const tokens = fromUsage(res?.usage);
  const costUsd = Number(res?.total_cost_usd || 0);
  if (r.code !== 0 || r.error || !res || res.is_error) {
    return { ok: false, code: classify(r), message: (res?.result || r.stderr || r.stdout || '').toString().slice(0, 600), tokens, costUsd, raw: res };
  }
  const data = extractStructured(res);
  if (!data) {
    if (truncatedRes(res)) return { ok: false, code: 'truncated', message: '출력이 길이 상한에서 잘려 JSON 으로 읽지 못했습니다.', tokens, costUsd, raw: res };
    return { ok: false, code: 'parse', message: '구조화 출력을 JSON 으로 읽지 못했습니다.', tokens, costUsd, raw: res };
  }
  return { ok: true, data: stripNulls(data), tokens, costUsd, raw: res };
}

/** stream-json 출력에서 마지막 result 이벤트와 마지막 assistant 글을 찾는다. */
function streamResult(stdout) {
  let res = null;
  let lastText = '';
  for (const l of stdout.split('\n')) {
    if (!l.trim().startsWith('{')) continue;
    let ev;
    try { ev = JSON.parse(l); } catch { continue; }
    if (ev.type === 'result') res = ev;
    else if (ev.type === 'assistant') {
      for (const c of ev.message?.content || []) if (c?.type === 'text' && c.text) lastText = c.text;
    }
  }
  return { res, lastText };
}

/**
 * 파일을 읽고 쓰는 역할 에이전트 호출(산출물 작성용).
 * 출력은 stream-json 으로 받아 onEvent 로 한 줄씩 넘긴다(가상 사무실 '터미널' 탭의 실시간 기록).
 * 허용 도구: Read, Write, Edit, Grep, Glob. Bash·Skill 은 막는다(무인 실행에서 명령 실행 금지).
 * tokenCap(사용 토큰)을 넘으면 앱이 스트림의 토큰을 세다가 그 자리에서 끊고 code:'budget' 으로 돌려준다(그때까지 쓴 토큰 포함)
 * — 호출한 쪽이 승인 카드로 올린다. CLI 의 금액 상한(--max-budget-usd)은 쓰지 않는다(구독 사용량은 금액이 아니다).
 * @returns {Promise<{ok:true, text, tokens, costUsd, raw}|{ok:false, code, message, tokens, costUsd, text, raw}>}
 */
export async function runAgent({ system, prompt, cwd, model, timeoutMs = 600000, maxTurns = 40, addDirs = [], tokenCap, onEvent }) {
  const argv = [
    bin(), '-p', '--output-format', 'stream-json', '--verbose',
    '--allowedTools', 'Read', 'Write', 'Edit', 'Grep', 'Glob',
    '--disallowedTools', 'Bash', 'Skill', 'WebFetch', 'WebSearch',
    '--permission-mode', 'acceptEdits',
    '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
    '--max-turns', String(maxTurns),
  ];
  for (const d of addDirs) argv.push('--add-dir', d);
  const sys = await systemFile(system);
  if (sys) argv.push('--system-prompt-file', sys.file);
  if (model) argv.push('--model', model);
  const meter = streamMeter();
  const onLine = (l) => {
    let ev;
    try { ev = JSON.parse(l); } catch { return; /* JSON 아닌 줄 무시 */ }
    meter.push(ev);
    if (onEvent) onEvent(ev);
  };
  const stopWhen = tokenCap > 0 ? () => meter.weighted() > tokenCap : undefined;
  let r;
  try {
    r = await run(argv, { cwd, stdin: prompt, timeoutMs, onLine, stopWhen });
  } finally {
    await sys?.cleanup();
  }
  captureRateLimit(r.stdout);
  const { res, lastText } = streamResult(r.stdout);
  const tokens = res?.usage ? fromUsage(res.usage) : meter.tokens();
  const costUsd = Number(res?.total_cost_usd || 0);
  if (r.stopped) {
    return { ok: false, code: 'budget', message: `사용 토큰 한도(${fmtTokens(tokenCap)}) 도달`, tokens, costUsd, text: lastText, raw: res };
  }
  if (r.code !== 0 || r.error || !res || res.is_error) {
    return { ok: false, code: res?.subtype === 'error_max_turns' ? 'max_turns' : classify(r), message: (res?.result || (res?.errors || []).join('; ') || r.stderr || r.stdout || '').toString().slice(0, 600), tokens, costUsd, text: lastText, raw: res };
  }
  // 성공이어도 마지막 응답이 길이 상한에서 잘렸으면 표시한다(회신 형식이 빠졌을 수 있다 — 호출한 쪽이 기록)
  return { ok: true, text: String(res.result || lastText || ''), tokens, costUsd, truncated: truncatedRes(res), raw: res };
}

/**
 * 팀장 상주 세션 1턴 — 같은 세션을 이어 가며(--session-id 로 시작, 이후 --resume) 재하의 메시지를 한 건씩 처리한다.
 * hive 를 읽기만 한다(Read·Grep·Glob). 답은 구조화 출력(schema)으로 받는다.
 * @returns {Promise<{ok:true, data, tokens, costUsd, sessionId}|{ok:false, code, message, tokens, costUsd}>}
 */
export async function runLeaderTurn({ system, prompt, schema, sessionId, resume, cwd, addDirs = [], model, onEvent, timeoutMs = 300000, maxTurns = 12 }) {
  const argv = [
    bin(), '-p', '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(schema),
    '--allowedTools', 'Read', 'Grep', 'Glob',
    '--disallowedTools', 'Bash', 'Write', 'Edit', 'Skill', 'WebFetch', 'WebSearch',
    '--setting-sources', '', '--strict-mcp-config', '--max-turns', String(maxTurns),
  ];
  argv.push(resume ? '--resume' : '--session-id', sessionId);
  for (const d of addDirs) argv.push('--add-dir', d);
  const sys = await systemFile(system);
  if (sys) argv.push('--system-prompt-file', sys.file);
  if (model) argv.push('--model', model);
  const onLine = onEvent ? (l) => { try { onEvent(JSON.parse(l)); } catch { /* 무시 */ } } : undefined;
  let r;
  try {
    r = await run(argv, { cwd, stdin: prompt, timeoutMs, onLine });
  } finally {
    await sys?.cleanup();
  }
  captureRateLimit(r.stdout);
  const { res } = streamResult(r.stdout);
  const costUsd = Number(res?.total_cost_usd || 0);
  const tokens = fromUsage(res?.usage);
  if (r.code !== 0 || r.error || !res || res.is_error) {
    return { ok: false, code: classify(r), message: (res?.result || (res?.errors || []).join('; ') || r.stderr || r.stdout || '').toString().slice(0, 600), tokens, costUsd };
  }
  const data = extractStructured(res);
  if (!data) return { ok: false, code: truncatedRes(res) ? 'truncated' : 'parse', message: '구조화 출력을 JSON 으로 읽지 못했습니다.', tokens, costUsd };
  return { ok: true, data: stripNulls(data), tokens, costUsd, sessionId: res.session_id || sessionId };
}

/**
 * 구독 사용 한도만 확인하는 가장 작은 호출 — 화면 위 사용량 막대의 [지금 확인].
 * 도구·설정·MCP 없이 빈 임시 폴더에서 1턴만 돈다. 이 호출도 구독 사용량이므로 쓴 토큰을 돌려준다(호출한 쪽이 기록).
 * @returns {Promise<{ok:boolean, code?:string, info:object|null, tokens, costUsd}>}
 */
export async function probeLimits({ timeoutMs = 90000 } = {}) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-office-'));
  const argv = [
    bin(), '-p', '--output-format', 'stream-json', '--verbose',
    '--tools', '', '--setting-sources', '', '--strict-mcp-config',
    '--no-session-persistence', '--max-turns', '1', '--system-prompt', 'Reply with the single word OK.',
  ];
  const r = await run(argv, { cwd, stdin: 'OK', timeoutMs });
  await fs.rm(cwd, { recursive: true, force: true }).catch(() => {});
  const info = captureRateLimit(r.stdout);
  const { res } = streamResult(r.stdout);
  const tokens = fromUsage(res?.usage);
  const costUsd = Number(res?.total_cost_usd || 0);
  if (r.code !== 0 || r.error) return { ok: false, code: classify(r), info, tokens, costUsd };
  return { ok: Boolean(info), code: info ? undefined : 'no_info', info, tokens, costUsd };
}

/** 대화형 터미널(node-pty)에서 띄울 실행 파일과 셸 필요 여부. */
export function interactiveCommand() {
  const b = bin();
  return { bin: b, needsShell: needsShell(b) };
}
