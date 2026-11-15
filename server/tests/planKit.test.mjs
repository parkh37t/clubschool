// 기획 에이전트 패키지 — 설치 파일에 넣을 사본 만들기(stage-plan-kit.cjs)와 처음 켤 때 자동 연결(planKitSeed.cjs). 모델·CLI 호출 없음.
// 가짜 패키지·가짜 경로만 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STAGE = path.join(ROOT, 'desktop', 'scripts', 'stage-plan-kit.cjs');
const { seedPlanKit } = createRequire(import.meta.url)(path.join(ROOT, 'desktop', 'planKitSeed.cjs'));

async function put(base, rel, text = 'x') {
  const p = path.join(base, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, text, 'utf8');
}

async function fakeKit(dir) {
  for (const f of ['core/golden/list.html', 'core/template/common.css', 'scripts/new_screen.py', 'scripts/verify_page.py', 'packs/_template/pack.json', 'prompts/01.md', 'README.md', 'CLAUDE.md']) await put(dir, f);
  await put(dir, 'packs/demo/pack.json', '{"client":"데모 고객"}');
  await put(dir, 'packs/project-a/screens/a.html', '<p>프로젝트 화면</p>');
  await put(dir, '전략_문서.md', '내부 전략');
  await put(dir, 'scripts/__pycache__/new_screen.cpython-312.pyc', 'bin');
  await put(dir, '.claude/agents/builder.md', '저장소 루트에서 작업한다: `cd "C:/Users/someone/Docs/kits/wylie-plan-agent"`. 끝.');
  await put(dir, '.claude/skills/spec/SKILL.md', '가나다 재구축(1,234화면)에서 검증된 `abc-spec-rework` 규격을 프로젝트 무관하게 일반화한 것이다.');
}

test('설치 파일용 사본 — 빈 팩 템플릿만, 맨 위 문서·캐시는 빼고, 절대 경로·출처 문장은 일반 문구로', async () => {
  const src = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-kitsrc-'));
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-kitout-'));
  await fakeKit(src);
  execFileSync(process.execPath, [STAGE], { env: { ...process.env, OFFICE_PLAN_KIT_SRC: src, OFFICE_PLAN_KIT_OUT: out }, stdio: 'pipe' });
  const kit = path.join(out, 'wylie-plan-agent');
  assert.deepEqual(await fs.readdir(path.join(kit, 'packs')), ['_template']);
  assert.equal(existsSync(path.join(kit, '전략_문서.md')), false);
  assert.equal(existsSync(path.join(kit, 'scripts', '__pycache__')), false);
  assert.ok(existsSync(path.join(kit, 'scripts', 'new_screen.py')));
  assert.match(await fs.readFile(path.join(kit, '.claude/agents/builder.md'), 'utf8'), /cd "<이 패키지 폴더>"/);
  const skill = await fs.readFile(path.join(kit, '.claude/skills/spec/SKILL.md'), 'utf8');
  assert.match(skill, /^대규모 화면 재구축 프로젝트에서 검증된 규격을/);
  assert.doesNotMatch(skill, /가나다|abc-spec/);
  assert.equal(JSON.parse(await fs.readFile(path.join(out, 'STAGED.json'), 'utf8')).cleaned.length, 2);
});

test('원본 패키지가 없으면 안내만 남기고 빌드를 막지 않는다', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-kitout-'));
  execFileSync(process.execPath, [STAGE], { env: { ...process.env, OFFICE_PLAN_KIT_SRC: path.join(out, '없는-폴더'), OFFICE_PLAN_KIT_OUT: out }, stdio: 'pipe' });
  assert.deepEqual(await fs.readdir(out), ['README.txt']);
});

test('처음 켤 때 — 사본을 문서 폴더로 복사해 연결, 두 번째는 건너뜀, 끊은 뒤에도 다시 연결하지 않음', async () => {
  const bundled = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-bundled-'));
  await fakeKit(path.join(bundled, 'wylie-plan-agent'));
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-data-'));
  const hive = path.join(data, 'hive');
  await put(hive, 'settings.json', JSON.stringify({ lang: 'ko', owner_name: '홍길동' }));

  const r1 = seedPlanKit({ bundledRoot: bundled, dataRoot: data, hiveDir: hive, version: '0.19.0' });
  assert.equal(r1.action, 'connected');
  assert.ok(existsSync(path.join(r1.dir, 'scripts', 'new_screen.py')));
  const st = JSON.parse(await fs.readFile(path.join(hive, 'settings.json'), 'utf8'));
  assert.equal(st.plan_kit_dir, r1.dir);
  assert.equal(st.plan_kit_seeded, '0.19.0');
  assert.equal(st.owner_name, '홍길동'); // 다른 설정은 그대로

  assert.equal(seedPlanKit({ bundledRoot: bundled, dataRoot: data, hiveDir: hive }).action, 'skip');
  await fs.writeFile(path.join(hive, 'settings.json'), JSON.stringify({ ...st, plan_kit_dir: '' }));
  assert.equal(seedPlanKit({ bundledRoot: bundled, dataRoot: data, hiveDir: hive }).action, 'skip');
});

test('이미 연결된 패키지가 있으면 그대로 두고, 사본이 없는 설치본이면 아무것도 안 함', async () => {
  const bundled = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-bundled-'));
  await fakeKit(path.join(bundled, 'wylie-plan-agent'));
  const own = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-ownkit-'));
  await fakeKit(own);
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-data-'));
  const hive = path.join(data, 'hive');
  await put(hive, 'settings.json', JSON.stringify({ plan_kit_dir: own }));
  const r = seedPlanKit({ bundledRoot: bundled, dataRoot: data, hiveDir: hive, version: '0.19.0' });
  assert.equal(r.action, 'kept');
  assert.equal(JSON.parse(await fs.readFile(path.join(hive, 'settings.json'), 'utf8')).plan_kit_dir, own);
  assert.equal(existsSync(path.join(data, '기획 에이전트 패키지')), false);

  const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-nokit-'));
  assert.equal(seedPlanKit({ bundledRoot: empty, dataRoot: data, hiveDir: path.join(data, 'hive2') }).action, 'none');
});
