// Claude 계정 — 앱 안 로그인과 Claude Code 설치(새 PC).
//
// 로그인: 창을 띄우지 않고 `claude auth login --claudeai` 를 보이지 않는 가상 터미널(node-pty)에서 돌린다.
//   CLI 가 브라우저를 열고, 승인하면 바로 끝나거나(Login successful) 브라우저에 나온 코드를 붙여 넣으라고 한다.
//   그 코드는 설정 창의 입력 칸에서 받아 가상 터미널에 넘긴다. 로그인 주소에는 메일(login_hint)이 들어 있으므로
//   이 PC 화면에만 보내고(office-server), 기록·로그에는 남기지 않는다. 구독 로그인(--claudeai)만 쓴다(Console 은 API 요금).
//   node-pty 가 없으면 호출한 쪽이 예전 방식(새 PowerShell 창, claudeCode.openLoginWindow)으로 대신한다.
//
// 설치: Claude Code 가 없는 PC 에서 [Claude Code 설치]를 누르면 Anthropic 공식 설치 스크립트(claude.ai/install.ps1)를
//   창 없이 돌린다. 사용자 폴더(%USERPROFILE%\.local\bin)에 설치되고 관리자 권한이 필요 없다. 끝나면 실행 파일을 다시 찾는다.
//   시험에서는 OFFICE_CLI_INSTALL_CMD(JSON 배열)로 설치 명령을 바꾼다 — 실제 설치를 돌리지 않는다.

import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { loadPty } from './pty.mjs';
import { interactiveCommand, childEnv, validLoginEmail, claudeAvailable, forgetBin } from './claudeCode.mjs';

const LOGIN_TIMEOUT_MS = Number(process.env.OFFICE_LOGIN_TIMEOUT_MS) || 10 * 60 * 1000;
const KEEP = 8 * 1024; // 화면에 보이지 않는 출력 — 상태 판단용으로 끝부분만 둔다

// ConPTY 는 공백을 커서 이동(ESC[nC)으로 보내기도 해서, 지우기 전에 공백으로 바꾼다.
// OSC 8 하이퍼링크(ESC]8;;주소BEL)는 주소를 따로 꺼내 둔 뒤 지운다.
export function plainText(raw) {
  return String(raw)
    .replace(/\x1b\[(\d*)C/g, (_, n) => ' '.repeat(Math.min(Number(n) || 1, 200)))
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    .replace(/\x1b[=>78]/g, '')
    .replace(/\r/g, '');
}

const URL_RE = /https:\/\/[^\s"'<>\x1b\x07]+\/oauth\/authorize\?[^\s"'<>\x1b\x07]+/;
const OSC8_RE = /\x1b\]8;[^;]*;(https:\/\/[^\x07\x1b]+\/oauth\/authorize\?[^\x07\x1b]+)(?:\x07|\x1b\\)/;
const SUCCESS_RE = /login successful|successfully logged in|logged in as/i;
const CODE_RE = /paste code/i;
const CODE_OK = /^[A-Za-z0-9._~#+/=-]{8,512}$/;

/** CLI 출력(ANSI 섞임)에서 로그인 주소를 꺼낸다. 없으면 ''. */
export function extractLoginUrl(raw) {
  const m = String(raw).match(OSC8_RE) || plainText(raw).match(URL_RE);
  return m ? (m[1] || m[0]).replace(/[).,]+$/, '') : '';
}

/** 붙여 넣은 인증 코드 형식 — 줄바꿈·공백·셸 문자가 없는 토큰만 받는다. */
export const validLoginCode = (c) => CODE_OK.test(String(c || '').trim());

let cur = null; // { pty, state, url, needsCode, message, startedAt, raw, timer, onDone }

function killPid(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else { try { process.kill(pid, 'SIGKILL'); } catch { /* 이미 끝남 */ } }
}

function killPty(s) {
  const p = s.pty;
  if (!p || s.exited !== null) return;
  try { p.kill(); } catch { /* 이미 끝남 */ }
  killPid(p.pid);
}

function finish(state, message = '') {
  if (!cur || ['success', 'failed', 'cancelled', 'expired'].includes(cur.state)) return;
  const s = cur;
  s.state = state;
  s.message = message;
  s.endedAt = new Date().toISOString();
  clearTimeout(s.timer);
  const notify = () => {
    if (s.notified) return;
    s.notified = true;
    if (s.onDone) Promise.resolve().then(() => s.onDone(state === 'success')).catch(() => {});
  };
  if (state === 'success' && s.exited === null) {
    // 성공 문구 뒤에 CLI 가 자격 증명을 저장하고 스스로 끝난다 — 끊지 않고 기다린다(15초가 지나도 남아 있으면 닫는다)
    s.afterExit = notify;
    const t = setTimeout(() => { killPty(s); notify(); }, 15000);
    t.unref?.();
    return;
  }
  killPty(s);
  notify();
}

/** 화면에 보낼 상태. withUrl=false 면 로그인 주소(메일 포함)를 뺀다. */
export function loginState({ withUrl = true } = {}) {
  if (!cur) return { state: 'idle' };
  return {
    state: cur.state,
    needs_code: cur.needsCode,
    message: cur.message,
    started_at: cur.startedAt,
    ended_at: cur.endedAt || '',
    ...(withUrl && cur.url ? { url: cur.url } : {}),
  };
}

const active = () => cur && ['starting', 'waiting'].includes(cur.state);

/**
 * 앱 안 로그인 시작. 이미 진행 중이면 그 상태를 그대로 돌려준다(두 번 누르기).
 * @returns {Promise<{ok:boolean, code?:'no_pty'|'bad_email'|'spawn', message?:string, state?:object}>}
 */
export async function startLogin({ email = '', onDone } = {}) {
  if (email && !validLoginEmail(email)) return { ok: false, code: 'bad_email', message: '이메일 형식이 아닙니다.' };
  if (active()) return { ok: true, state: loginState() };
  let pty;
  try { pty = await loadPty(); } catch (e) { return { ok: false, code: 'no_pty', message: String(e?.message || e) }; }
  const { bin, needsShell } = interactiveCommand();
  const args = ['auth', 'login', '--claudeai', ...(email ? ['--email', email] : [])];
  const file = needsShell ? 'cmd.exe' : bin;
  const argv = needsShell ? ['/d', '/c', bin, ...args] : args;
  let p;
  try {
    // 넓은 화면(cols)으로 열어 로그인 주소가 줄바꿈으로 끊기지 않게 한다
    p = pty.spawn(file, argv, { name: 'xterm-256color', cols: 2000, rows: 40, cwd: os.homedir(), env: childEnv() });
  } catch (e) {
    return { ok: false, code: 'spawn', message: String(e?.message || e) };
  }
  const s = { pty: p, state: 'starting', url: '', needsCode: false, message: '', startedAt: new Date().toISOString(), raw: '', exited: null, onDone };
  cur = s;
  s.timer = setTimeout(() => { if (cur === s) finish('expired', '10분 안에 승인하지 않아 로그인을 멈췄습니다. 다시 눌러 주세요.'); }, LOGIN_TIMEOUT_MS);
  s.timer.unref?.();
  p.onData((d) => {
    if (cur !== s) return;
    s.raw = (s.raw + d).slice(-KEEP);
    if (!s.url) {
      const u = extractLoginUrl(s.raw);
      if (u) { s.url = u; if (s.state === 'starting') s.state = 'waiting'; }
    }
    const text = plainText(s.raw);
    if (CODE_RE.test(text)) { s.needsCode = true; if (s.state === 'starting') s.state = 'waiting'; }
    if (SUCCESS_RE.test(text)) finish('success');
  });
  p.onExit(({ exitCode }) => {
    s.exited = exitCode;
    if (s.afterExit) { s.afterExit(); return; }
    if (cur !== s || !active()) return;
    // 안내 줄(주소·코드 입력 줄 — 붙여 넣은 코드가 함께 찍힌다)은 빼고 끝 줄들만 보여 준다
    const tail = plainText(s.raw).split('\n').map((l) => l.trim()).filter((l) => l && !CODE_RE.test(l) && !URL_RE.test(l) && !/opening browser/i.test(l)).slice(-3).join(' / ').slice(0, 300);
    if (SUCCESS_RE.test(plainText(s.raw))) finish('success');
    else if (exitCode === 0) finish('success'); // 성공 문구 없이 끝났다 — 호출한 쪽이 auth status 로 다시 확인한다
    else finish('failed', tail || `로그인이 끝나지 않았습니다(종료 코드 ${exitCode}).`);
  });
  return { ok: true, state: loginState() };
}

/** 브라우저에 나온 코드를 가상 터미널에 넘긴다. */
export function submitLoginCode(code) {
  const c = String(code || '').trim();
  if (!validLoginCode(c)) return { ok: false, message: '코드 형식이 아닙니다. 브라우저에 나온 코드를 그대로 붙여 넣으세요.' };
  if (!active() || !cur.pty) return { ok: false, message: '진행 중인 로그인이 없습니다. [로그인]을 다시 눌러 주세요.' };
  try { cur.pty.write(c + '\r'); } catch (e) { return { ok: false, message: String(e?.message || e) }; }
  cur.needsCode = false;
  return { ok: true };
}

export function cancelLogin() {
  if (!active()) return { ok: false, message: '진행 중인 로그인이 없습니다.' };
  finish('cancelled', '로그인을 취소했습니다.');
  return { ok: true };
}

/** 서버 종료 때 — 남은 로그인 가상 터미널을 닫는다. */
export function stopLogin() { if (active()) finish('cancelled', '서버 종료'); }

// ── Claude Code 설치 ──────────────────────────────────────────────

let inst = null; // { state, lines, startedAt, endedAt, message, version }

function installArgv() {
  if (process.env.OFFICE_CLI_INSTALL_CMD) {
    try { const a = JSON.parse(process.env.OFFICE_CLI_INSTALL_CMD); if (Array.isArray(a) && a.length) return a.map(String); } catch { /* 아래 기본값 */ }
  }
  return ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://claude.ai/install.ps1 | iex'];
}

export function installState() {
  if (!inst) return { state: 'idle' };
  return { state: inst.state, log: inst.lines.slice(-12), started_at: inst.startedAt, ended_at: inst.endedAt || '', message: inst.message || '', version: inst.version || '' };
}

/**
 * 공식 설치 스크립트를 창 없이 돌린다(Windows). 이미 설치 중이면 그 상태를 돌려준다.
 * @returns {{ok:boolean, message?:string, state?:object}}
 */
export function startInstall({ onDone } = {}) {
  if (process.platform !== 'win32' && !process.env.OFFICE_CLI_INSTALL_CMD) return { ok: false, message: 'Windows 에서만 설치 버튼을 씁니다. 터미널에서 공식 설치 명령을 실행하세요.' };
  if (inst?.state === 'running') return { ok: true, state: installState() };
  const argv = installArgv();
  const s = { state: 'running', lines: [], startedAt: new Date().toISOString(), message: '' };
  inst = s;
  let child;
  try {
    child = spawn(argv[0], argv.slice(1), { cwd: os.homedir(), env: childEnv(), windowsHide: true, shell: /\.(cmd|bat)$/i.test(argv[0]) });
  } catch (e) {
    s.state = 'failed';
    s.message = String(e?.message || e);
    return { ok: false, message: s.message };
  }
  const push = (d) => {
    for (const l of plainText(d).split('\n')) { const t = l.trim(); if (t) s.lines.push(t.slice(0, 200)); }
    if (s.lines.length > 60) s.lines = s.lines.slice(-60);
  };
  child.stdout.on('data', push);
  child.stderr.on('data', push);
  const timer = setTimeout(() => { killPid(child.pid); s.message = '10분 안에 끝나지 않아 멈췄습니다.'; }, 10 * 60 * 1000);
  const end = async (code, err) => {
    clearTimeout(timer);
    if (s.state !== 'running') return;
    forgetBin(); // 새로 설치된 실행 파일을 다시 찾게
    const v = await claudeAvailable().catch(() => false);
    s.endedAt = new Date().toISOString();
    if (v) { s.state = 'success'; s.version = String(v).slice(0, 80); }
    else {
      s.state = 'failed';
      s.message = s.message || (err ? String(err.message || err) : code === 0 ? '설치는 끝났지만 실행 파일을 찾지 못했습니다. 앱을 다시 켜 보세요.' : `설치가 실패했습니다(종료 코드 ${code}).`);
    }
    if (onDone) Promise.resolve().then(() => onDone(s.state === 'success')).catch(() => {});
  };
  child.on('error', (e) => end(-1, e));
  child.on('close', (code) => end(code, null));
  return { ok: true, state: installState() };
}
