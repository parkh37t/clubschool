// 작업 초기화(보관) — 임시 hive 에서 archiveWork·listArchives·usageSummary(모델·CLI 호출 없음). npm run test:server
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const HIVE = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-reset-'));
process.env.OFFICE_HIVE_DIR = HIVE; // paths.mjs 가 불러올 때 읽는다 — 다른 import 보다 먼저
const hive = await import('../hive.mjs');

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
const w = (n) => ({ in: n, cw: 0, cr: 0, out: 0 });

async function seed() {
  await fs.writeFile(path.join(HIVE, 'tasks.json'), JSON.stringify({ seq: 7, msg_seq: 12, tasks: [
    { id: 'T-0006', owner: 'han', status: '실패', tokens: w(1000), cost_at: today, qa: { tokens: w(200), at: today } },
    { id: 'T-0007', owner: 'kim', status: '완료', tokens: w(500), cost_at: yesterday },
  ] }));
  await fs.writeFile(path.join(HIVE, 'approvals.json'), JSON.stringify({ seq: 3, approvals: [{ id: 'A-0003', status: 'pending' }] }));
  await fs.writeFile(path.join(HIVE, 'questions.json'), JSON.stringify({ seq: 2, questions: [{ id: 'Q-0002', status: 'open' }] }));
  await fs.writeFile(path.join(HIVE, 'queue.json'), JSON.stringify({ seq: 4, items: [{ id: 'L-0004', status: 'done' }] }));
  await fs.writeFile(path.join(HIVE, 'blackboard.md'), '# 현황판\n');
  await fs.writeFile(path.join(HIVE, 'settings.json'), JSON.stringify({ lang: 'ko' }));
  for (const d of ['inbox/han', 'outbox', 'briefings', 'live', 'memory']) await fs.mkdir(path.join(HIVE, d), { recursive: true });
  await fs.writeFile(path.join(HIVE, 'inbox', 'han', 'M-0001.json'), '{}');
  await fs.writeFile(path.join(HIVE, 'memory', 'han.md'), '- 고객 선호');
}

test('보관 뒤 빈 작업판 — 번호는 남기고, 옮긴 것은 보관함에 그대로', async () => {
  await seed();
  const before = await hive.usageSummary({ qaAgent: 'go' });
  const r = await hive.archiveWork({ by: '시험', reason: '단위 시험' });
  assert.deepEqual(r.counts, { tasks: 2, approvals: 1, questions: 1, queue: 1 });
  const ledger = JSON.parse(await fs.readFile(path.join(HIVE, 'tasks.json'), 'utf8'));
  assert.deepEqual(ledger, { seq: 7, msg_seq: 12, tasks: [] });
  assert.equal(JSON.parse(await fs.readFile(path.join(HIVE, 'approvals.json'), 'utf8')).seq, 3);
  const arch = path.join(HIVE, '_archive', r.name);
  assert.equal(JSON.parse(await fs.readFile(path.join(arch, 'tasks.json'), 'utf8')).tasks.length, 2);
  await fs.access(path.join(arch, 'inbox', 'han', 'M-0001.json'));
  await fs.access(path.join(arch, 'blackboard.md'));
  await assert.rejects(fs.access(path.join(HIVE, 'inbox')));
  // 기억·설정은 그대로
  await fs.access(path.join(HIVE, 'memory', 'han.md'));
  await fs.access(path.join(HIVE, 'settings.json'));
  // 사용량은 원래 날짜로 그대로(오늘 사용량·하루 한도가 풀리지 않음)
  const after = await hive.usageSummary({ qaAgent: 'go' });
  assert.equal(after.total, before.total);
  assert.deepEqual(after.byAgentDay, before.byAgentDay);
  assert.equal(after.byAgent.go, 200);
});

test('기억도 고르면 함께 옮기고, 보관함 목록은 최근 것부터', async () => {
  await new Promise((res) => setTimeout(res, 1100)); // 보관함 이름(초 단위)이 겹치지 않게
  const r = await hive.archiveWork({ memory: true, by: '시험', reason: '기억까지' });
  await assert.rejects(fs.access(path.join(HIVE, 'memory')));
  await fs.access(path.join(HIVE, '_archive', r.name, 'memory', 'han.md'));
  const list = await hive.listArchives();
  assert.equal(list.length, 2);
  assert.equal(list[0].name, r.name);
  assert.equal(list[0].memory, true);
  assert.equal(list[1].counts.tasks, 2);
  // 두 번째 초기화 때는 옮길 작업이 없었다 — 사용량은 여전히 첫 보관분만
  const u = await hive.usageSummary({ qaAgent: 'go' });
  assert.equal(u.total, 1700);
});

test('초기화 이벤트를 남긴다(메일 등 개인 정보 없음)', async () => {
  const log = await fs.readFile(path.join(HIVE, 'events.log'), 'utf8');
  const ev = log.trim().split('\n').map((l) => JSON.parse(l)).filter((e) => e.kind === 'reset');
  assert.equal(ev.length, 2);
  assert.equal(ev[0].reason, '단위 시험');
});
