// Clubschool AX Office — 설치형 앱(Electron) main 프로세스. (0.17 전 이름: Wylie AX Office)
//
// 하는 일
//   1) office-server 를 자식 프로세스로 띄운다(Electron 내장 Node, ELECTRON_RUN_AS_NODE=1). PowerShell 이 필요 없다.
//      - 127.0.0.1 에만 바인딩, OFFICE_MODE=claude_code(환경 변수로 mock 지정 가능)
//      - 데이터는 문서\Clubschool AX Office\hive · 산출물 (설치 폴더는 쓰기 권한이 없다). 예전 이름 폴더가 있으면 처음 켤 때 새 이름으로 옮긴다
//   2) 창에서 http://127.0.0.1:<포트>/?view=virtual-office&shell=app 을 연다(화면·API 같은 주소)
//   3) 단일 실행(두 번째 실행은 기존 창을 앞으로), 창 닫기 = 트레이로 숨김(작업은 계속 진행)
//   4) 트레이: 열기 / 산출물 폴더 열기 / Windows 시작 시 실행 / 종료
//      종료 시 서버와 claude 자식 프로세스를 pid 트리로 모두 정리한다(이름으로 죽이지 않는다).
//   5) `Clubschool AX Office.exe --quit` — 실행 중인 앱에 트레이 '종료'와 같은 종료를 전달한다(스크립트·제거 전 정리용).
//   6) 트레이·알림·오류 문구는 화면 언어(한국어 기본·영어)를 따른다 — hive/settings.json 의 lang, 실행 중에는 /api/settings.

'use strict';

const { app, BrowserWindow, Tray, Menu, shell, dialog, nativeImage, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');

const APP_NAME = 'Clubschool AX Office';
// 예전 제품 이름 — 데이터 폴더(문서\…)·Electron 사용자 폴더를 이어받을 때만 쓴다
const LEGACY_NAME = 'Wylie AX Office';
// 앱 식별자는 바꾸지 않는다 — 바꾸면 설치 프로그램이 다른 앱으로 보고 예전 앱 옆에 따로 깔린다(업그레이드가 아니라 두 벌)
const APP_ID = 'com.wylie.ax-office';
const BASE_PORT = 8787;

app.setName(APP_NAME);
// Electron 사용자 폴더(화면의 localStorage·단일 실행 잠금)는 예전 이름 폴더가 있으면 그대로 쓴다 — 이름을 바꿔도 화면 설정이 남게
{
  const legacyUserData = path.join(app.getPath('appData'), LEGACY_NAME);
  if (fs.existsSync(legacyUserData) && !fs.existsSync(path.join(app.getPath('appData'), APP_NAME))) app.setPath('userData', legacyUserData);
}
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
let lang = 'ko'; // 'ko' | 'en' — 화면에서 바꾸면 트레이 메뉴도 따라 바뀐다

const TEXT = {
  ko: {
    open: '열기', outputs: '산출물 폴더 열기', atLogin: 'Windows 시작 시 실행', atLoginDev: 'Windows 시작 시 실행 (설치본에서만)', quit: '종료',
    hint: '창을 닫아도 트레이에서 계속 실행됩니다. 끝내려면 트레이 아이콘 → 종료.',
    stopped: 'AX Office 서버가 멈췄습니다.', stoppedDetail: (f) => `기록: ${f}\n앱을 다시 실행해 주세요.`,
    noDist: (d) => `화면 빌드(dist)가 없습니다.\n저장소에서 npm run build 후 다시 실행하세요.\n\n${d}`,
    startFail: (m, f) => `AX Office 서버를 시작하지 못했습니다.\n${m}\n\n기록: ${f}`,
  },
  en: {
    open: 'Open', outputs: 'Open deliverables folder', atLogin: 'Start with Windows', atLoginDev: 'Start with Windows (installed app only)', quit: 'Quit',
    hint: 'AX Office keeps running in the tray when you close the window. To quit: tray icon → Quit.',
    stopped: 'The AX Office server stopped.', stoppedDetail: (f) => `Log: ${f}\nPlease start the app again.`,
    noDist: (d) => `The screen build (dist) is missing.\nRun npm run build in the repository and start again.\n\n${d}`,
    startFail: (m, f) => `Could not start the AX Office server.\n${m}\n\nLog: ${f}`,
  },
};
const T = () => TEXT[lang] || TEXT.ko;

/** 시작 전(서버가 뜨기 전)에는 hive/settings.json 에서 언어를 읽는다. 없으면 한국어. */
function readSavedLang() {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(hiveDir, 'settings.json'), 'utf8'));
    if (s.lang === 'en' || s.lang === 'ko') lang = s.lang;
  } catch { /* 처음 실행 — 기본값 */ }
}

/** 화면에서 언어를 바꾸면 트레이 메뉴를 다시 만든다(5초마다 확인). */
function watchLang() {
  const iv = setInterval(async () => {
    if (quitting) { clearInterval(iv); return; }
    try {
      const s = await getJson(`http://127.0.0.1:${port}/api/settings`);
      if ((s.lang === 'en' || s.lang === 'ko') && s.lang !== lang) {
        lang = s.lang;
        log(`언어 변경: ${lang}`);
        if (tray) tray.setContextMenu(buildTrayMenu());
      }
    } catch { /* 다음 주기 */ }
  }, 5000);
  iv.unref();
}

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
        message: T().stopped,
        detail: T().stoppedDetail(logFile),
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

/** 지금 쓰는 산출물 폴더 — 설정 화면에서 바꿨으면 hive/settings.json 의 deliverables_dir, 아니면 기본 위치. */
function currentOutDir() {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(hiveDir, 'settings.json'), 'utf8'));
    if (typeof s.deliverables_dir === 'string' && s.deliverables_dir && path.isAbsolute(s.deliverables_dir)) return s.deliverables_dir;
  } catch { /* 설정 파일이 없으면 기본 위치 */ }
  return outDir;
}

// 설정 화면의 [폴더 고르기] — 웹 화면은 전체 경로를 알 수 없어 메인 프로세스의 선택 창을 쓴다.
ipcMain.handle('axo:pick-folder', async (_e, defaultPath) => {
  const r = await dialog.showOpenDialog(win, {
    title: lang === 'en' ? 'Choose the deliverables folder' : '산출물 저장 폴더 고르기',
    defaultPath: (typeof defaultPath === 'string' && defaultPath) || currentOutDir(),
    properties: ['openDirectory', 'createDirectory'],
  });
  return r.canceled || !r.filePaths.length ? '' : r.filePaths[0];
});

function appUrl() {
  return `http://127.0.0.1:${port}/?view=virtual-office&shell=app`;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 960, minWidth: 1024, minHeight: 680,
    title: APP_NAME, icon: iconPath('icon.png'), backgroundColor: '#EFEAE0', show: false, autoHideMenuBar: true,
    // preload 는 설정 화면의 [폴더 고르기] 하나만 내보낸다(desktop/preload.cjs)
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
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
      tray.displayBalloon({ title: APP_NAME, content: T().hint, iconType: 'info' });
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
    { label: T().open, click: showWindow },
    {
      label: T().outputs,
      click: () => { const d = currentOutDir(); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); },
    },
    { type: 'separator' },
    {
      label: packaged ? T().atLogin : T().atLoginDev,
      type: 'checkbox', checked: atLogin, enabled: packaged,
      click: (item) => {
        // 시작 프로그램으로 켤 때는 창 없이 트레이로만 뜬다(--hidden).
        app.setLoginItemSettings({ openAtLogin: item.checked, args: loginItemArgs() });
        log(`Windows 시작 시 실행: ${item.checked ? '켜기' : '끄기'}`);
        tray.setContextMenu(buildTrayMenu());
      },
    },
    { type: 'separator' },
    { label: T().quit, click: quitApp },
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

/**
 * 데이터 폴더 — 문서\Clubschool AX Office. 예전 이름(문서\Wylie AX Office)만 있으면 처음 켤 때 새 이름으로 옮긴다(지우지 않고 폴더 이름만 바꿈).
 * 옮기지 못하면(파일이 열려 있는 등) 예전 폴더를 그대로 쓰고 다음에 다시 시도한다. 설정의 산출물 폴더가 예전 폴더 안을 가리키면 새 경로로 고친다.
 */
function migrateDataRoot() {
  const docs = app.getPath('documents');
  const next = path.join(docs, APP_NAME);
  const legacy = path.join(docs, LEGACY_NAME);
  if (fs.existsSync(next) || !fs.existsSync(legacy)) return next;
  try {
    fs.renameSync(legacy, next);
  } catch (e) {
    migrateNote = `예전 데이터 폴더를 새 이름으로 옮기지 못해 그대로 씀(${e.code || e.message}): ${legacy}`;
    return legacy;
  }
  migrateNote = `데이터 폴더 이름을 바꿈: ${legacy} → ${next}`;
  try {
    const f = path.join(next, 'hive', 'settings.json');
    const st = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (typeof st.deliverables_dir === 'string' && st.deliverables_dir.toLowerCase().startsWith(legacy.toLowerCase())) {
      st.deliverables_dir = next + st.deliverables_dir.slice(legacy.length);
      fs.writeFileSync(f, JSON.stringify(st, null, 2), 'utf8');
    }
  } catch { /* 설정 파일이 없거나 산출물 폴더를 따로 정하지 않음 */ }
  return next;
}
let migrateNote = '';

async function start() {
  dataRoot = migrateDataRoot();
  // 시험용으로 위치를 바꿀 수 있다(같은 이름의 환경 변수). 기본은 문서\Clubschool AX Office\…
  hiveDir = process.env.OFFICE_HIVE_DIR || path.join(dataRoot, 'hive');
  outDir = process.env.OFFICE_DELIVERABLES_DIR || path.join(dataRoot, '산출물');
  const logDir = path.join(dataRoot, 'logs');
  for (const d of [hiveDir, outDir, logDir]) fs.mkdirSync(d, { recursive: true });
  logFile = path.join(logDir, 'office-server.log');
  readSavedLang();
  log(`앱 시작 v${app.getVersion()} packaged=${app.isPackaged} hidden=${START_HIDDEN} lang=${lang}`);
  if (migrateNote) log(migrateNote);

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    dialog.showErrorBox(APP_NAME, T().noDist(DIST_DIR));
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
    dialog.showErrorBox(APP_NAME, T().startFail(e.message, logFile));
    app.quit();
    return;
  }

  createTray();
  createWindow();
  watchLang();
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
