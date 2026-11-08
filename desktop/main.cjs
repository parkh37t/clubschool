// Wylie AX Office — 설치형 앱(Electron) main 프로세스.
//
// 하는 일
//   1) office-server 를 자식 프로세스로 띄운다(Electron 내장 Node, ELECTRON_RUN_AS_NODE=1). PowerShell 이 필요 없다.
//      - 127.0.0.1 에만 바인딩, OFFICE_MODE=claude_code(환경 변수로 mock 지정 가능)
//      - 데이터는 문서\Wylie AX Office\hive · 산출물 (설치 폴더는 쓰기 권한이 없다)
//   2) 창에서 http://127.0.0.1:<포트>/?view=virtual-office&shell=app 을 연다(화면·API 같은 주소)
//   3) 단일 실행(두 번째 실행은 기존 창을 앞으로), 창 닫기 = 트레이로 숨김(작업은 계속 진행)
//   4) 트레이: 열기 / 산출물 폴더 열기 / Windows 시작 시 실행 / 종료
//      종료 시 서버와 claude 자식 프로세스를 pid 트리로 모두 정리한다(이름으로 죽이지 않는다).
//   5) `Wylie AX Office.exe --quit` — 실행 중인 앱에 트레이 '종료'와 같은 종료를 전달한다(스크립트·제거 전 정리용).

'use strict';

const { app, BrowserWindow, Tray, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');

const APP_NAME = 'Wylie AX Office';
const APP_ID = 'com.wylie.ax-office';
const BASE_PORT = 8787;

app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

// 설치본: resources/{server,dist,.claude} · 개발: 저장소 루트
const RES = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
const SERVER_DIR = path.join(RES, 'server');
const DIST_DIR = path.join(RES, 'dist');
const START_HIDDEN = process.argv.includes('--hidden');
const QUIT_ONLY = process.argv.includes('--quit');

let dataRoot = '';
let hiveDir = '';
let outDir = '';
let logFile = '';
let win = null;
let tray = null;
let server = null;
let serverStopped = false; // 트레이 종료와 before-quit 이 겹쳐도 한 번만 정리한다
let port = 0;
let quitting = false;
let hintShown = false;

function log(line) {
  const text = `[${new Date().toISOString()}] [desktop] ${line}\n`;
  try { fs.appendFileSync(logFile, text, 'utf8'); } catch { /* 로그 실패는 무시 */ }
}

function iconPath(name) {
  return path.join(__dirname, 'assets', name);
}

/** BASE_PORT 부터 비어 있는 포트를 찾는다(개발 서버가 8787 을 쓰고 있을 수 있다). */
function findPort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (p) => {
      if (p > start + 12) { reject(new Error('8787~8799 포트가 모두 사용 중입니다.')); return; }
      const probe = net.createServer();
      probe.once('error', () => tryPort(p + 1));
      probe.once('listening', () => probe.close(() => resolve(p)));
      probe.listen(p, '127.0.0.1');
    };
    tryPort(start);
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

async function waitForHealth(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (server && server.exitCode !== null) throw new Error(`서버가 바로 종료됐습니다(코드 ${server.exitCode}).`);
    try {
      const h = await getJson(`http://127.0.0.1:${port}/api/health`);
      if (h && h.ok) return h;
    } catch { /* 아직 안 떴다 */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('서버가 20초 안에 응답하지 않았습니다.');
}

function startServer() {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    OFFICE_MODE: process.env.OFFICE_MODE || 'claude_code',
    PORT: String(port),
    OFFICE_HOST: '127.0.0.1',
    OFFICE_HIVE_DIR: hiveDir,
    OFFICE_DELIVERABLES_DIR: outDir,
    OFFICE_DIST_DIR: DIST_DIR,
    OFFICE_DESKTOP: '1',
    OFFICE_EXIT_ON_STDIN_CLOSE: '1', // 앱이 비정상 종료되면 서버도 내려간다
  };
  server = spawn(process.execPath, [path.join(SERVER_DIR, 'office-server.mjs')], {
    cwd: SERVER_DIR, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  });
  const out = fs.createWriteStream(logFile, { flags: 'a' });
  server.stdout.pipe(out, { end: false });
  server.stderr.pipe(out, { end: false });
  log(`서버 시작 pid=${server.pid} port=${port} mode=${env.OFFICE_MODE}`);
  server.on('exit', (code, signal) => {
    log(`서버 종료 code=${code} signal=${signal}`);
    if (!quitting) {
      dialog.showMessageBox({
        type: 'error', title: APP_NAME,
        message: 'AX Office 서버가 멈췄습니다.',
        detail: `기록: ${logFile}\n앱을 다시 실행해 주세요.`,
      }).finally(() => quitApp());
    }
  });
}

/** 서버와 그 아래 claude 자식·손자 프로세스를 pid 트리로 닫는다. */
function stopServer() {
  if (serverStopped || !server || server.exitCode !== null || !server.pid) return;
  serverStopped = true;
  const pid = server.pid;
  if (process.platform === 'win32') {
    const r = spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, encoding: 'utf8' });
    log(`서버 트리 종료 pid=${pid} → ${r.status === 0 ? '완료' : `실패(${(r.stderr || r.stdout || '').trim()})`}`);
  } else {
    try { process.kill(-pid, 'SIGKILL'); } catch { try { server.kill('SIGKILL'); } catch { /* 이미 끝남 */ } }
  }
}

function appUrl() {
  return `http://127.0.0.1:${port}/?view=virtual-office&shell=app`;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 960, minWidth: 1024, minHeight: 680,
    title: APP_NAME, icon: iconPath('icon.png'), backgroundColor: '#EFEAE0', show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu();
  // 웹 화면의 <title>(대시보드 이름)이 창 제목을 덮지 않게 앱 이름으로 고정한다.
  win.on('page-title-updated', (e) => e.preventDefault());
  win.loadURL(appUrl());
  win.once('ready-to-show', () => { if (!START_HIDDEN) win.show(); });
  // 같은 주소 밖으로 나가는 링크는 기본 브라우저로 연다.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
  });
  // 창 닫기 = 트레이로 숨김. 작업은 서버에서 계속 돈다.
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (!hintShown && tray && process.platform === 'win32') {
      hintShown = true;
      tray.displayBalloon({ title: APP_NAME, content: '창을 닫아도 트레이에서 계속 실행됩니다. 끝내려면 트레이 아이콘 → 종료.', iconType: 'info' });
    }
  });
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function loginItemArgs() {
  return ['--hidden'];
}

function buildTrayMenu() {
  const packaged = app.isPackaged;
  const atLogin = packaged ? app.getLoginItemSettings({ args: loginItemArgs() }).openAtLogin : false;
  return Menu.buildFromTemplate([
    { label: '열기', click: showWindow },
    {
      label: '산출물 폴더 열기',
      click: () => { fs.mkdirSync(outDir, { recursive: true }); shell.openPath(outDir); },
    },
    { type: 'separator' },
    {
      label: packaged ? 'Windows 시작 시 실행' : 'Windows 시작 시 실행 (설치본에서만)',
      type: 'checkbox', checked: atLogin, enabled: packaged,
      click: (item) => {
        // 시작 프로그램으로 켤 때는 창 없이 트레이로만 뜬다(--hidden).
        app.setLoginItemSettings({ openAtLogin: item.checked, args: loginItemArgs() });
        log(`Windows 시작 시 실행: ${item.checked ? '켜기' : '끄기'}`);
        tray.setContextMenu(buildTrayMenu());
      },
    },
    { type: 'separator' },
    { label: '종료', click: quitApp },
  ]);
}

function createTray() {
  const img = nativeImage.createFromPath(iconPath('tray.png'));
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 }));
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
}

function quitApp() {
  quitting = true;
  stopServer();
  if (tray) { tray.destroy(); tray = null; }
  app.quit();
}

async function start() {
  dataRoot = path.join(app.getPath('documents'), APP_NAME);
  // 시험용으로 위치를 바꿀 수 있다(같은 이름의 환경 변수). 기본은 문서\Wylie AX Office\…
  hiveDir = process.env.OFFICE_HIVE_DIR || path.join(dataRoot, 'hive');
  outDir = process.env.OFFICE_DELIVERABLES_DIR || path.join(dataRoot, '산출물');
  const logDir = path.join(dataRoot, 'logs');
  for (const d of [hiveDir, outDir, logDir]) fs.mkdirSync(d, { recursive: true });
  logFile = path.join(logDir, 'office-server.log');
  log(`앱 시작 v${app.getVersion()} packaged=${app.isPackaged} hidden=${START_HIDDEN}`);

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    dialog.showErrorBox(APP_NAME, `화면 빌드(dist)가 없습니다.\n저장소에서 npm run build 후 다시 실행하세요.\n\n${DIST_DIR}`);
    app.quit();
    return;
  }

  try {
    port = await findPort(BASE_PORT);
    startServer();
    await waitForHealth(20000);
  } catch (e) {
    log(`시작 실패: ${e.message}`);
    quitting = true;
    stopServer();
    dialog.showErrorBox(APP_NAME, `AX Office 서버를 시작하지 못했습니다.\n${e.message}\n\n기록: ${logFile}`);
    app.quit();
    return;
  }

  createTray();
  createWindow();
}

if (!app.requestSingleInstanceLock()) {
  app.quit(); // 이미 떠 있는 앱이 second-instance 로 받는다(--quit 이면 그쪽이 종료)
} else if (QUIT_ONLY) {
  app.quit(); // 끌 앱이 없다
} else {
  app.on('second-instance', (_e, argv) => {
    if (argv.includes('--quit')) { log('두 번째 실행에서 --quit 을 받음 — 종료'); quitApp(); } else showWindow();
  });
  app.whenReady().then(start);
  // 창은 닫지 않고 숨기므로 이 이벤트는 종료 과정에서만 온다. 기본 동작(종료)을 막고 quitApp 에 맡긴다.
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { quitting = true; stopServer(); });
}
