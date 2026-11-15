// [다시 실행] — 임시 hive 에서 hive.rerunTask·loadBriefing(모델·CLI 호출 없음). npm run test:server
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const HIVE = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-rerun-'));
process.env.OFFICE_HIVE_DIR = HIVE; // paths.mjs 가 불러올 때 읽는다 — 다른 import 보다 먼저
const hive = await import('../hive.mjs');

const B = '20261115-1603_시험_제안';
const hold = (ids) => ({ summary: `선행 작업(${ids}) 미완료로 보류` });

test.before(async () => {
  await fs.mkdir(path.join(HIVE, 'briefings'), { recursive: true });
  await fs.writeFile(path.join(HIVE, 'briefings', `${B}.json`), JSON.stringify({ id: B, title: '시험 제안', result: '제안서 초안', outDir: '시험_제안' }));
  await fs.writeFile(path.join(HIVE, 'tasks.json'), JSON.stringify({ seq: 6, tasks: [
    { id: 'T-0001', briefing: B, owner: 'kim', status: '완료', gate: 'PASS', depends_on: [], output: '시험_제안/00_sales/T-0001.md' },
    { id: 'T-0002', briefing: B, owner: 'han', status: '실패', gate: 'FAIL', depends_on: ['T-0001'], output: '', qa: { summary: '실행 실패(timeout): 시간 안에 끝나지 않았습니다.' } },
    { id: 'T-0003', briefing: B, owner: 'han', status: '보류', gate: '미점검', depends_on: ['T-0002'], qa: hold('T-0002') },
    { id: 'T-0004', briefing: B, owner: 'cha', status: '보류', gate: '미점검', depends_on: ['T-0003'], qa: hold('T-0003') },
    { id: 'T-0005', briefing: B, owner: 'go', status: '보류', gate: '미점검', depends_on: ['T-0001'], qa: { summary: '반려 — 범위 다시' } },
    { id: 'T-0006', briefing: 'other', owner: 'han', status: '보류', gate: '미점검', depends_on: ['T-0002'], qa: hold('T-0002') },
  ] }));
});

test('실패 작업과 그 때문에 보류된 뒤 작업(직간접)만 대기로 — 완료·반려 보류·다른 브리핑은 그대로', async () => {
  const r = await hive.rerunTask('T-0002', { by: '시험' });
  assert.equal(r.briefing, B);
  assert.deepEqual(r.reset, ['T-0002', 'T-0003', 'T-0004']);
  const { tasks } = await hive.loadTasks();
  const by = Object.fromEntries(tasks.map((t) => [t.id, t]));
  assert.equal(by['T-0001'].status, '완료');
  assert.equal(by['T-0002'].status, '대기');
  assert.equal(by['T-0002'].rerun_count, 1);
  assert.match(by['T-0002'].prev_failure, /timeout/);
  assert.match(by['T-0002'].resume_note, /뼈대를 먼저/); // 앞 실행이 쓴 파일이 없었다
  assert.equal(by['T-0003'].status, '대기');
  assert.equal(by['T-0004'].status, '대기');
  assert.equal(by['T-0005'].status, '보류'); // 반려로 보류된 것은 되살리지 않는다
  assert.equal(by['T-0006'].status, '보류'); // 다른 브리핑
});

test('실패가 아닌 작업·없는 작업은 거절', async () => {
  await assert.rejects(hive.rerunTask('T-0001'), (e) => e.code === 'bad_status');
  await assert.rejects(hive.rerunTask('T-0099'), (e) => e.code === 'not_found');
});

test('쓴 파일이 있던 작업은 그 파일로 이어 쓰라는 안내', async () => {
  const L = await hive.loadTasks();
  Object.assign(L.tasks.find((t) => t.id === 'T-0002'), { status: '실패', output: '시험_제안/01_rfp/T-0002.md' });
  await fs.writeFile(path.join(HIVE, 'tasks.json'), JSON.stringify(L));
  await hive.rerunTask('T-0002');
  const t = (await hive.loadTasks()).tasks.find((x) => x.id === 'T-0002');
  assert.equal(t.rerun_count, 2);
  assert.match(t.resume_note, /T-0002\.md/);
});

test('브리핑 기록 읽기 — 이상한 id 는 읽지 않음', async () => {
  assert.equal((await hive.loadBriefing(B)).title, '시험 제안');
  assert.equal(await hive.loadBriefing('../settings'), null);
  assert.equal(await hive.loadBriefing('없는-브리핑'), null);
});
