// 산출물 저장 위치 — 설정 화면에서 바꾸고, 파일·폴더를 이 PC 의 탐색기·기본 앱으로 연다.
//
//   바꾸기  진행 중인 브리핑이 없을 때만. 새 폴더를 만들고 쓰기 시험을 한 뒤 paths.mjs 의 DELIVERABLES_DIR 를 바꾼다.
//           원장(tasks.json)의 산출물 경로는 이 폴더 기준 상대경로라서, '기존 산출물 복사'를 고르면 예전 폴더 내용을
//           새 폴더로 복사한다(덮어쓰지 않음). 예전 폴더의 파일은 지우지 않는다 — 삭제는 재하가 직접 한다.
//   열기    산출물 폴더 안의 문서·폴더만. 실행 파일은 열지 않는다(자료 안에 섞여 들어온 파일이 실행되지 않게).

import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { DELIVERABLES_DIR, DELIVERABLES_DEFAULT, HIVE_DIR, APP_ROOT, setDeliverablesDir, absData, isInside } from './paths.mjs';

const OPENABLE = new Set(['.md', '.docx', '.doc', '.pdf', '.pptx', '.ppt', '.xlsx', '.xls', '.csv', '.txt', '.html', '.htm', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.hwp', '.hwpx']);

const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * 새 산출물 폴더로 쓸 수 있는지 — 절대경로, hive·앱 폴더와 겹치지 않음, 만들고 쓸 수 있음.
 * @returns {Promise<{ok:boolean, dir?:string, error?:string}>}
 */
export async function checkDeliverablesDir(input) {
  const raw = String(input || '').trim().replace(/^"(.*)"$/, '$1');
  if (!raw) return { ok: false, error: '폴더 경로가 비어 있습니다.' };
  if (!path.isAbsolute(raw)) return { ok: false, error: '전체 경로를 적어 주세요(예: D:\\제안\\산출물).' };
  const dir = path.resolve(raw);
  if (samePath(dir, HIVE_DIR) || isInside(dir, HIVE_DIR) || isInside(HIVE_DIR, dir)) return { ok: false, error: '작업 기록(hive) 폴더와 겹치는 위치는 쓸 수 없습니다.' };
  if (samePath(dir, APP_ROOT) || isInside(dir, APP_ROOT)) return { ok: false, error: '앱 설치 폴더 안은 쓸 수 없습니다(업데이트 때 지워짐).' };
  if (samePath(dir, path.parse(dir).root)) return { ok: false, error: '드라이브 맨 위(예: C:\\)는 쓸 수 없습니다. 폴더를 하나 만들어 고르세요.' };
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.axo-write-test-${process.pid}`);
    await fs.writeFile(probe, 'ok');
    await fs.rm(probe, { force: true });
  } catch (e) {
    return { ok: false, error: `이 폴더에 쓸 수 없습니다: ${e.code || e.message}` };
  }
  return { ok: true, dir };
}

/**
 * 산출물 폴더를 바꾼다. 호출 전에 진행 중인 브리핑이 없는지 확인할 것.
 * @param {{dir?:string, reset?:boolean, copy?:boolean}} req  reset=true 면 기본 위치로
 * @returns {Promise<{ok:boolean, dir?:string, from?:string, copied?:boolean, error?:string}>}
 */
export async function changeDeliverablesDir({ dir, reset = false, copy = false }) {
  const from = DELIVERABLES_DIR;
  const target = reset ? await checkDeliverablesDir(DELIVERABLES_DEFAULT) : await checkDeliverablesDir(dir);
  if (!target.ok) return target;
  if (samePath(target.dir, from)) return { ok: true, dir: from, from, copied: false };
  let copied = false;
  if (copy) {
    // 한쪽이 다른 쪽 안에 있으면 자기 안으로 복사하게 되므로 막는다
    if (isInside(target.dir, from) || isInside(from, target.dir)) return { ok: false, error: '지금 폴더와 새 폴더가 서로 안에 들어 있어 복사할 수 없습니다. 복사 없이 바꾸거나 다른 위치를 고르세요.' };
    try {
      await fs.cp(from, target.dir, { recursive: true, force: false, errorOnExist: false });
      copied = true;
    } catch (e) {
      if (e.code !== 'ENOENT') return { ok: false, error: `기존 산출물 복사 실패: ${e.code || e.message} — 위치는 바꾸지 않았습니다.` };
    }
  }
  setDeliverablesDir(target.dir);
  return { ok: true, dir: target.dir, from, copied };
}

/**
 * 산출물 폴더 안의 파일·폴더를 이 PC 의 탐색기(기본 앱)로 연다.
 * @param {{target:'deliverables'|'hive'|'path', path?:string, select?:boolean}} req  path 는 산출물 폴더 기준 상대경로
 */
export async function openLocal({ target, path: rel = '', select = false }) {
  let abs;
  if (target === 'deliverables') abs = DELIVERABLES_DIR;
  else if (target === 'hive') abs = HIVE_DIR;
  else {
    abs = absData(rel);
    if (!abs) return { ok: false, error: '산출물 폴더 밖의 경로는 열 수 없습니다.' };
  }
  let st;
  try {
    st = await fs.stat(abs);
  } catch {
    return { ok: false, error: '파일이 없습니다. 산출물 폴더를 옮겼다면 예전 폴더에 남아 있을 수 있습니다.' };
  }
  if (st.isFile() && !select && !OPENABLE.has(path.extname(abs).toLowerCase())) return { ok: false, error: '문서·이미지 파일만 열 수 있습니다. [폴더]로 위치를 열어 확인하세요.' };
  const [cmd, args] = process.platform === 'win32'
    ? ['explorer.exe', select && st.isFile() ? [`/select,${abs}`] : [abs]]
    : process.platform === 'darwin'
      ? ['open', select && st.isFile() ? ['-R', abs] : [abs]]
      : ['xdg-open', [select && st.isFile() ? path.dirname(abs) : abs]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false });
    child.on('error', () => {});
    child.unref();
  } catch (e) {
    return { ok: false, error: `열기 실패: ${e.message}` };
  }
  return { ok: true };
}
