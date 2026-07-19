// office-state.json 읽기/쓰기 — 오피스(VirtualOfficeView)가 폴링하는 단일 진실 파일.
// 스키마는 components/VirtualOffice/officeSimulator.ts의 OfficeState와 동일:
//   { stage, phase, progress?, agents?, artifact? }
// 지시가 아직 없으면 파일이 없고, 그때 오피스는 자체 데모로 폴백한다(GET에서 404 처리).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(HERE, 'office-state.json');

// 오케스트레이터가 페이즈마다 전체 OfficeState를 넘겨준다. ts를 붙여 no-store 폴링의 캐시를 무력화.
export async function writeState(state) {
  const payload = { ...state, ts: Date.now() };
  await fs.writeFile(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

// 없으면 null(→ 서버가 404 → 오피스 데모 유지). 첫 지시 후부터 실제 상태를 반환.
export async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// 새 지시 시작 시 이전 실행 흔적을 지워 오피스를 초기화한다(선택적).
export async function clearState() {
  try {
    await fs.unlink(STATE_FILE);
  } catch {
    // 파일이 없으면 무시
  }
}

export { STATE_FILE };
