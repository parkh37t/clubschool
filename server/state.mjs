// office-state.json 읽기/쓰기 — 오피스(VirtualOfficeView)가 폴링하는 요약 파일.
// 스키마는 components/VirtualOffice/officeSimulator.ts의 OfficeState와 동일:
//   { stage, phase, progress?, agents?, artifact?, hive?, question? }
// 지시가 아직 없으면 파일이 없다. 그때 서버는 hive 를 읽어 대기 상태를 만들어 돌려준다(office-server.mjs).
//
// 작업 풀이 여러 작업을 함께 돌리면서 상태를 동시에 쓰므로, 쓰기는 한 줄로 세우고(직렬화)
// 임시 파일 + rename 으로 교체해 화면이 반쯤 쓰인 JSON 을 읽지 않게 한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { STATE_FILE } from './paths.mjs';

let tail = Promise.resolve();

// 오케스트레이터가 페이즈마다 전체 OfficeState를 넘겨준다. ts를 붙여 no-store 폴링의 캐시를 무력화.
export function writeState(state) {
  const payload = { ...state, ts: Date.now() };
  const run = tail.then(async () => {
    await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
    const tmp = STATE_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
    for (let i = 0; ; i++) {
      try {
        await fs.rename(tmp, STATE_FILE);
        return;
      } catch (e) {
        if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        await new Promise((r) => setTimeout(r, 40 * (i + 1)));
      }
    }
  });
  tail = run.catch(() => {});
  return run;
}

// 없으면 null. 첫 브리핑 후부터 실제 상태를 반환.
export async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// 새 지시 시작 시 이전 실행 흔적을 지워 오피스를 초기화한다.
export function clearState() {
  const run = tail.then(() => fs.unlink(STATE_FILE).catch(() => {}));
  tail = run.catch(() => {});
  return run;
}

export { STATE_FILE };
