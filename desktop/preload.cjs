// 설치형 앱 화면에만 붙는 작은 다리 — 웹 화면은 폴더의 전체 경로를 알 수 없으므로, 설정 화면의 [폴더 고르기]만
// 메인 프로세스의 폴더 선택 창을 빌린다. 그 밖의 Node·Electron 기능은 내보내지 않는다(contextIsolation·sandbox 유지).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('axoDesktop', {
  /** 폴더 선택 창을 열어 고른 폴더의 전체 경로를 돌려준다. 취소하면 빈 문자열. */
  pickFolder: (defaultPath) => ipcRenderer.invoke('axo:pick-folder', typeof defaultPath === 'string' ? defaultPath : ''),
});
