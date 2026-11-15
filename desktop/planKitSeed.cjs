// 기획 에이전트 패키지 자동 연결 — 설치 파일에 든 사본(resources/plan-kit/wylie-plan-agent)을 처음 켤 때
// 문서\Clubschool AX Office\기획 에이전트 패키지\wylie-plan-agent 로 복사하고 설정(hive/settings.json 의 plan_kit_dir)에 연결한다.
//   - 한 번만 한다(plan_kit_seeded). 사용자가 설정에서 [끄기]로 끊은 뒤에는 다시 연결하지 않는다.
//   - 이미 연결된 패키지 폴더가 있으면(이 PC 의 원본 등) 그것을 그대로 두고 표시만 남긴다.
//   - 복사할 곳에 패키지가 이미 있으면(다시 설치) 덮어쓰지 않는다 — 앱이 그 안에 프로젝트 팩(packs/<팩>)을 만들어 쓰기 때문.
// main.cjs 가 서버를 띄우기 전에 부른다(서버가 설정을 읽기 전에 써 두려고).
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NEED = ['scripts/new_screen.py', 'scripts/verify_page.py', 'packs/_template/pack.json', 'core/golden', 'core/template'];
const isKit = (dir) => Boolean(dir) && NEED.every((n) => fs.existsSync(path.join(dir, n)));

// fs.cpSync 는 Windows 에서 한글 경로('기획 에이전트 패키지')로 복사하다 프로세스가 통째로 죽었다(0xC0000409) — 파일 하나씩 복사한다.
// 이미 있는 파일은 덮어쓰지 않는다(앱이 그 안에 만든 프로젝트 팩을 지키려고).
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile() && !fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

function writeSettings(file, st) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(st, null, 2), 'utf8');
  fs.renameSync(file + '.tmp', file);
}

/**
 * @param o.bundledRoot  설치 파일의 plan-kit 폴더(안에 wylie-plan-agent)
 * @param o.dataRoot     데이터 폴더(문서\Clubschool AX Office)
 * @param o.hiveDir      hive 폴더(settings.json 이 있는 곳)
 * @param o.version      앱 버전(표시용)
 * @returns {{ action: 'none'|'skip'|'kept'|'connected', dir?: string, reason?: string }}
 */
function seedPlanKit({ bundledRoot, dataRoot, hiveDir, version = '' }) {
  const bundled = path.join(bundledRoot, 'wylie-plan-agent');
  if (!isKit(bundled)) return { action: 'none', reason: 'no-bundled' };
  const file = path.join(hiveDir, 'settings.json');
  let st = {};
  try { st = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* 처음 켬 */ }
  if (st.plan_kit_seeded) return { action: 'skip', reason: 'already-seeded' };
  if (st.plan_kit_dir && isKit(st.plan_kit_dir)) {
    writeSettings(file, { ...st, plan_kit_seeded: `kept@${version}` });
    return { action: 'kept', dir: st.plan_kit_dir };
  }
  const dest = path.join(dataRoot, '기획 에이전트 패키지', 'wylie-plan-agent');
  if (!isKit(dest)) copyDir(bundled, dest);
  writeSettings(file, { ...st, plan_kit_dir: dest, plan_kit_seeded: version || 'yes' });
  return { action: 'connected', dir: dest };
}

module.exports = { seedPlanKit, isKit };
