// APEX 가상 사무실 오케스트레이터 서버.
// 역할: (1) 오피스가 폴링하는 office-state.json 제공, (2) 지시 콘솔의 POST /api/instruct 수신 →
//       12 에이전트를 게이트 파이프라인으로 실행하며 상태/산출물 생성.
// 의존성 0(내장 http/fs)으로 mock 모드는 즉시 동작. live 모드에서만 Agent SDK를 lazy 로드.
//
// 실행:  node office-server.mjs        (기본 mock 모드, 키 불필요)
//        OFFICE_MODE=live ANTHROPIC_API_KEY=sk-... node office-server.mjs
// 포트:  PORT(기본 8787). Vite dev 프록시가 /office-state.json·/api → 이 서버로 전달(같은 오리진).

import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readState, writeState, clearState } from './state.mjs';
import { runInstruction } from './orchestrator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const DELIVERABLES_ROOT = path.join(REPO_ROOT, 'DELIVERABLES');
const INBOX_DIR = path.join(DELIVERABLES_ROOT, '_inbox'); // 첨부 파일 임시 저장(과제 실행 시 과제 폴더로 복사)
const MAX_UPLOAD = 25 * 1024 * 1024; // 파일 첨부 상한 25MB

const PORT = Number(process.env.PORT || 8787);
const MODE = process.env.OFFICE_MODE === 'live' ? 'live' : 'mock';

let running = false; // 한 번에 지시 1건만(비용/경합 방지)

const log = (msg) => console.log(`[office] ${msg}`);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');
}

function sendJson(res, code, obj) {
  cors(res);
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error('본문이 너무 큽니다.'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// 바이너리 안전 본문 수집(파일 업로드용). maxBytes 초과 시 거부.
function readBodyBuffer(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > maxBytes) { req.destroy(); reject(new Error('파일이 너무 큽니다(최대 25MB).')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// 파일명 정리 — 경로 조작(../, 절대경로) 차단. 업로드는 반드시 _inbox 안에만 저장된다.
function safeName(s) {
  return String(s || 'file')
    .replace(/[\\/]/g, '_')        // 경로 구분자 제거
    .replace(/\.\.+/g, '_')        // 상위 이동 방지
    .replace(/[:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'file';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // 오피스가 2초마다 폴링하는 상태. 지시 전(파일 없음)이면 404 → 오피스는 자체 데모 유지.
  if (req.method === 'GET' && url.pathname === '/office-state.json') {
    const state = await readState();
    if (!state) {
      sendJson(res, 404, { error: 'no active instruction' });
      return;
    }
    sendJson(res, 200, state);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, mode: MODE, running });
    return;
  }

  // 지시 콘솔 → 파이프라인 착수. 즉시 202 응답 후 백그라운드 실행(오피스가 상태 폴링).
  if (req.method === 'POST' && url.pathname === '/api/instruct') {
    let instruction;
    try {
      instruction = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { error: '잘못된 JSON' });
      return;
    }
    if (!instruction || !instruction.title) {
      sendJson(res, 400, { error: 'title이 필요합니다.' });
      return;
    }
    if (running) {
      sendJson(res, 409, { error: '이미 다른 지시를 실행 중입니다.' });
      return;
    }
    running = true;
    sendJson(res, 202, { accepted: true, title: instruction.title, mode: MODE });
    // 새 지시 → 이전 상태 초기화 후 실행.
    clearState()
      .then(() => runInstruction(instruction, { setState: writeState, deliverablesRoot: DELIVERABLES_ROOT, mode: MODE, log }))
      .catch((err) => log(`오케스트레이션 오류: ${err?.stack || err}`))
      .finally(() => { running = false; });
    return;
  }

  // 파일 첨부 업로드 → _inbox에 저장 후 상대경로 반환. 지시 전송 시 attachments로 함께 보낸다.
  // 바이트 그대로 body로 받고 파일명은 X-File-Name 헤더(URL 인코딩)로 전달.
  if (req.method === 'POST' && url.pathname === '/api/upload') {
    let buf;
    try {
      buf = await readBodyBuffer(req, MAX_UPLOAD);
    } catch (e) {
      sendJson(res, 413, { error: e.message });
      return;
    }
    if (!buf.length) { sendJson(res, 400, { error: '빈 파일입니다.' }); return; }
    let rawName = 'file';
    try { rawName = decodeURIComponent(req.headers['x-file-name'] || 'file'); } catch { /* 헤더 디코드 실패 시 기본명 */ }
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const stored = `${stamp}__${safeName(rawName)}`;
    try {
      await fs.mkdir(INBOX_DIR, { recursive: true });
      await fs.writeFile(path.join(INBOX_DIR, stored), buf); // safeName 보장 → _inbox 밖으로 못 나감
    } catch (e) {
      sendJson(res, 500, { error: `저장 실패: ${e.message}` });
      return;
    }
    const rel = path.relative(REPO_ROOT, path.join(INBOX_DIR, stored));
    log(`첨부 수신: ${rawName} (${(buf.length / 1024).toFixed(0)}KB) → ${rel}`);
    sendJson(res, 200, { ok: true, name: rawName, path: rel, size: buf.length });
    return;
  }

  cors(res);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, () => {
  log(`가동 — http://localhost:${PORT}  (모드: ${MODE})`);
  log(`상태: GET /office-state.json · 지시: POST /api/instruct`);
  if (MODE === 'mock') log('mock 모드: 키 없이 배선만 검증. 실제 산출물은 OFFICE_MODE=live로 실행하세요.');
  else if (!process.env.ANTHROPIC_API_KEY) log('경고: live 모드인데 ANTHROPIC_API_KEY가 없습니다.');
});
