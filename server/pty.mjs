// 대화형 터미널 — '터미널' 탭의 [터미널 열기]. node-pty 로 Claude Code 대화형 세션을 띄우고 WebSocket 으로 화면(xterm.js)과 잇는다.
//   역할 에이전트: 그 담당의 최근 작업 과제 폴더에서, 페르소나를 덧붙여(--append-system-prompt-file) 연다
//   팀장: hive 폴더에서 상주 세션을 이어서(--resume) 연다 — 열려 있는 동안 대기열의 메시지 줄은 쉰다
// 모듈(@lydell/node-pty·ws)은 처음 쓸 때 불러온다. 없으면 서버는 그대로 돌고 터미널만 쓸 수 없다고 알린다.
// 이 PC 화면(Origin 이 localhost·127.0.0.1)에서 온 요청만 받는다. 서버 종료 시 pid 트리로 닫는다.

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HIVE_DIR } from './paths.mjs';
import { interactiveCommand, childEnv } from './claudeCode.mjs';

const SESSIONS = new Map(); // id → { pty, agent, cwd, title, buf, clients:Set, exited, created }
const MAX_BUF = 256 * 1024; // 다시 붙을 때 보여 줄 최근 출력

let ptyMod = null;
async function loadPty() {
  if (ptyMod) return ptyMod;
  const m = await import('@lydell/node-pty');
  ptyMod = m.default || m;
  return ptyMod;
}

export async function ptyAvailable() {
  try { await loadPty(); return true; } catch { return false; }
}

/**
 * 터미널을 연다. persona 가 있으면 파일로 써서 --append-system-prompt-file 로 넘긴다(여러 줄 인자를 피하려고).
 * @returns {Promise<{id, title}>}
 */
export async function openPty({ agent, cwd, title, persona, resumeId, cols = 110, rows = 32 }) {
  const pty = await loadPty();
  const { bin, needsShell } = interactiveCommand();
  const id = crypto.randomUUID().slice(0, 8);
  const args = [];
  if (resumeId) args.push('--resume', resumeId);
  if (persona) {
    const dir = path.join(HIVE_DIR, 'pty');
    await fs.mkdir(dir, { recursive: true });
    const f = path.join(dir, `${id}_${agent}.md`);
    await fs.writeFile(f, persona, 'utf8');
    args.push('--append-system-prompt-file', f);
  }
  // API 키·토큰을 빼고 넘긴다(구독 사용량으로만) — claudeCode.mjs childEnv
  const env = childEnv();
  const file = needsShell ? 'cmd.exe' : bin;
  const argv = needsShell ? ['/d', '/c', bin, ...args] : args;
  const p = pty.spawn(file, argv, { name: 'xterm-256color', cols, rows, cwd, env });
  const s = { id, pty: p, agent, cwd, title, buf: '', clients: new Set(), exited: null, created: new Date().toISOString() };
  p.onData((d) => {
    s.buf = (s.buf + d).slice(-MAX_BUF);
    for (const ws of s.clients) { try { ws.send(JSON.stringify({ t: 'out', d })); } catch { /* 끊긴 연결 */ } }
  });
  p.onExit(({ exitCode }) => {
    s.exited = exitCode;
    for (const ws of s.clients) { try { ws.send(JSON.stringify({ t: 'exit', code: exitCode })); } catch { /* 무시 */ } }
  });
  SESSIONS.set(id, s);
  return { id, title };
}

export function listPty() {
  return [...SESSIONS.values()].map((s) => ({ id: s.id, agent: s.agent, title: s.title, cwd: s.cwd, created: s.created, exited: s.exited }));
}

export function isAgentPtyOpen(agent) {
  return [...SESSIONS.values()].some((s) => s.agent === agent && s.exited === null);
}

function killTreePid(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else { try { process.kill(pid, 'SIGKILL'); } catch { /* 이미 끝남 */ } }
}

/**
 * 터미널 닫기. 평소에는 node-pty 가 콘솔에 붙은 프로세스를 먼저 정리하게 둔다 — 트리를 먼저 죽이면
 * node-pty 의 콘솔 목록 보조 프로세스가 이미 없는 콘솔에 붙으려다 "AttachConsole failed" 를 낸다.
 * 6초 뒤에도 안 끝났으면(콘솔 밖으로 떨어진 손자 프로세스 등) 트리째 정리한다.
 * now=true(서버 종료)면 기다릴 수 없으므로 바로 트리째 정리한다.
 */
export function killPty(id, { now = false } = {}) {
  const s = SESSIONS.get(id);
  if (!s) return false;
  if (s.exited === null) {
    const pid = s.pty.pid;
    if (now) killTreePid(pid);
    else {
      try { s.pty.kill(); } catch { /* 이미 끝남 */ }
      setTimeout(() => { if (s.exited === null) killTreePid(pid); }, 6000).unref();
    }
  }
  for (const ws of s.clients) { try { ws.close(); } catch { /* 무시 */ } }
  SESSIONS.delete(id);
  return true;
}

export function killAllPty() {
  const ids = [...SESSIONS.keys()];
  for (const id of ids) killPty(id, { now: true });
  return ids.length;
}

/** http 서버에 WebSocket 업그레이드(/api/pty/ws?id=…)를 붙인다. allow(req) 가 false 면 거절. */
export async function attachPtySocket(server, { allow, log }) {
  let WebSocketServer;
  try { ({ WebSocketServer } = await import('ws')); } catch { log('터미널: ws 모듈이 없어 대화형 터미널을 쓸 수 없습니다(server 에서 npm install).'); return false; }
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/pty/ws') return; // 다른 업그레이드는 건드리지 않는다
    const s = SESSIONS.get(url.searchParams.get('id') || '');
    if (!s || !allow(req)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      s.clients.add(ws);
      if (s.buf) ws.send(JSON.stringify({ t: 'out', d: s.buf }));
      if (s.exited !== null) ws.send(JSON.stringify({ t: 'exit', code: s.exited }));
      ws.on('message', (raw) => {
        let m;
        try { m = JSON.parse(String(raw)); } catch { return; }
        if (s.exited !== null) return;
        if (m.t === 'in' && typeof m.d === 'string') s.pty.write(m.d);
        else if (m.t === 'resize' && m.c > 0 && m.r > 0) { try { s.pty.resize(Math.min(400, m.c | 0), Math.min(200, m.r | 0)); } catch { /* 무시 */ } }
      });
      ws.on('close', () => s.clients.delete(ws));
    });
  });
  return true;
}
