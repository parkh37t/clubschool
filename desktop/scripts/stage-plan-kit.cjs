// 설치 파일에 넣을 기획 에이전트 패키지 사본을 desktop/plan-kit/wylie-plan-agent 에 만든다(npm run desktop:build 가 부른다).
//
// 원본: OFFICE_PLAN_KIT_SRC → 이 PC 의 앱 설정(문서\Clubschool AX Office\hive\settings.json 의 plan_kit_dir, 예전 문서\Wylie AX Office)
// 넣는 것: 규격·린트·검증·골든·템플릿(core·scripts·prompts), 빈 팩 템플릿(packs/_template), Claude Code 용 설정(.claude), README·CLAUDE.md
// 빼는 것: 프로젝트 팩(packs 아래 _template 이 아닌 것 — 고객 화면·데모), 그 밖의 맨 위 문서(전략·소개 자료), __pycache__·.pyc
// 고치는 것: 이 PC 의 절대 경로('C:/Users/…/wylie-plan-agent') → '<이 패키지 폴더>', 규격 스킬의 출처 문장(특정 프로젝트 이름) → 일반 문구
// 원본이 없으면(다른 PC·클라우드 빌드) 빈 폴더와 안내만 남겨 설치 파일은 패키지 없이 만들어진다 — 빌드는 실패하지 않는다.
// 시험: OFFICE_PLAN_KIT_OUT 으로 출력 위치를 바꾼다.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const OUT_ROOT = process.env.OFFICE_PLAN_KIT_OUT || path.resolve(__dirname, '..', 'plan-kit');
const OUT = path.join(OUT_ROOT, 'wylie-plan-agent');
const KEEP_TOP = new Set(['core', 'scripts', 'prompts', 'packs', '.claude', 'README.md', 'CLAUDE.md']);
const NEED = ['scripts/new_screen.py', 'scripts/verify_page.py', 'packs/_template/pack.json', 'core/golden', 'core/template'];
const TEXT = /\.(md|txt|json|js|css|html|py|cjs|mjs|ya?ml)$/i;
// 드라이브 문자로 시작하는 사용자 폴더 경로(슬래시·역슬래시 모두)
const ABS_USER_PATH = /[A-Za-z]:[\\/](?:Users|사용자)[\\/][^\s`'"<>|)]*/g;

function sourceDir() {
  if (process.env.OFFICE_PLAN_KIT_SRC) return process.env.OFFICE_PLAN_KIT_SRC;
  const docs = path.join(os.homedir(), 'Documents');
  for (const name of ['Clubschool AX Office', 'Wylie AX Office']) {
    try {
      const st = JSON.parse(fs.readFileSync(path.join(docs, name, 'hive', 'settings.json'), 'utf8'));
      if (st.plan_kit_dir) return st.plan_kit_dir;
    } catch { /* 설정 없음 */ }
  }
  return '';
}

function isKit(dir) {
  return dir && NEED.every((n) => fs.existsSync(path.join(dir, n)));
}

function copyTree(src, dst, rel = '') {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (!rel && !KEEP_TOP.has(e.name)) continue;
    if (e.name === '__pycache__' || e.name.endsWith('.pyc')) continue;
    if (rel === 'packs' && e.isDirectory() && e.name !== '_template') continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTree(s, d, r); continue; }
    if (!e.isFile()) continue;
    fs.copyFileSync(s, d);
  }
}

function clean(dir, srcDir) {
  const changed = [];
  const srcFwd = srcDir.replace(/\\/g, '/');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!TEXT.test(e.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      let t = s.split(srcDir).join('<이 패키지 폴더>').split(srcFwd).join('<이 패키지 폴더>').replace(ABS_USER_PATH, '<이 패키지 폴더>');
      // 규격 스킬 출처 문장 — "<프로젝트> 재구축(1,234화면)에서 검증된 `<규격>` 규격을" → 프로젝트·규격 이름 없이
      t = t.replace(/\S+ 재구축\([\d,]+화면\)에서 검증된 `[^`]+` 규격을/g, '대규모 화면 재구축 프로젝트에서 검증된 규격을');
      if (t !== s) { fs.writeFileSync(p, t, 'utf8'); changed.push(path.relative(dir, p).replace(/\\/g, '/')); }
    }
  };
  walk(dir);
  return changed;
}

function main() {
  fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const src = sourceDir();
  if (!isKit(src)) {
    fs.writeFileSync(path.join(OUT_ROOT, 'README.txt'), '이 빌드에는 기획 에이전트 패키지가 들어 있지 않습니다(빌드한 PC 에 연결된 패키지가 없었음).\n', 'utf8');
    console.log(`[plan-kit] 넣을 패키지가 없음${src ? ` — 패키지 폴더가 아님: ${src}` : ''}. 패키지 없이 빌드합니다.`);
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  copyTree(src, OUT);
  const changed = clean(OUT, path.resolve(src));
  const left = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (TEXT.test(e.name) && ABS_USER_PATH.test(fs.readFileSync(p, 'utf8'))) left.push(path.relative(OUT, p));
      ABS_USER_PATH.lastIndex = 0;
    }
  };
  walk(OUT);
  if (left.length) throw new Error(`[plan-kit] 절대 경로가 남음: ${left.join(', ')}`);
  let files = 0;
  const count = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) count(path.join(d, e.name)); else files += 1; } };
  count(OUT);
  fs.writeFileSync(path.join(OUT_ROOT, 'STAGED.json'), JSON.stringify({ at: new Date().toISOString(), files, cleaned: changed }, null, 2), 'utf8');
  console.log(`[plan-kit] 패키지 사본 ${files}개 파일(고친 파일 ${changed.length}개) → ${OUT}`);
}

main();
