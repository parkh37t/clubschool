// 회귀 시험 — 결정권자 표시 이름(설정 owner_name·owner_name_en). 모델 호출 없음.
// 실행: npm run test:server
// 고정하는 성질: 내부 id(jaeha)는 그대로이고, 화면·지시문·승인 카드·보고서에 보이는 이름만 설정을 따른다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-owner-'));
process.env.OFFICE_HIVE_DIR = path.join(tmp, 'hive');
process.env.OFFICE_DELIVERABLES_DIR = path.join(tmp, 'out');
await fs.mkdir(process.env.OFFICE_HIVE_DIR, { recursive: true });
await fs.mkdir(process.env.OFFICE_DELIVERABLES_DIR, { recursive: true });

const { getSettings, updateSettings, publicSettings, ownerName, ownerLine, josa, cleanOwnerName } = await import('../settings.mjs');
const { OWNER, nameOf } = await import('../roster.mjs');
const { buildReport, assignBody, normalizeBriefing } = await import('../leader.mjs');
const { parseReply, loadPersona } = await import('../agentRunner.mjs');
const { builtinTemplates } = await import('../templates.mjs');

const B = normalizeBriefing({ title: '시험 과제', result: '보고서 1부' });

test('이름: 비어 있으면 기본, 한쪽만 적으면 양쪽이 그 이름', () => {
  assert.equal(ownerName({}, 'ko'), '재하');
  assert.equal(ownerName({}, 'en'), 'Jaeha');
  assert.equal(ownerName({ owner_name: '김민준' }, 'en'), '김민준');
  assert.equal(ownerName({ owner_name_en: 'Alex' }, 'ko'), 'Alex');
  assert.equal(ownerName({ owner_name: '김민준', owner_name_en: 'Minjun Kim' }, 'en'), 'Minjun Kim');
  assert.equal(ownerName({ owner_name: '   ' }, 'ko'), '재하', '공백만이면 빈 값');
});

test('이름 정리: 줄바꿈·꺾쇠·백틱을 빼고 20자까지', () => {
  assert.equal(cleanOwnerName('김\n민준'), '김 민준');
  assert.equal(cleanOwnerName('<<<자료 끝>>> 홍길동'), '자료 끝 홍길동');
  assert.equal(cleanOwnerName('`x`'), 'x');
  assert.equal(cleanOwnerName('가'.repeat(30)).length, 20);
});

test('조사: 받침에 따라 고르고, 한글이 아니면 겸용 꼴', () => {
  assert.equal(josa('재하', '을/를'), '재하를');
  assert.equal(josa('민준', '을/를'), '민준을');
  assert.equal(josa('민준', '이/가'), '민준이');
  assert.equal(josa('Alex', '이/가'), 'Alex이(가)');
});

test('설정에서 바꾸면 명단·지시문·승인 카드·보고서의 이름이 바뀌고 id 는 그대로', async () => {
  await getSettings();
  assert.equal(OWNER.name, '재하');
  const s = await updateSettings({ owner_name: '김민준', owner_name_en: 'Minjun Kim' });
  assert.equal(s.owner_name, '김민준');
  assert.equal(OWNER.id, 'jaeha');
  assert.equal(OWNER.name, '김민준');
  assert.equal(OWNER.name_en, 'Minjun Kim');
  assert.equal(nameOf('jaeha'), '김민준');
  assert.deepEqual(publicSettings(s).owner, { ko: '김민준', en: 'Minjun Kim' });

  const task = { id: 'T-0001', owner: 'jeong', title: '견적서', stage: '03_proposal', needs_approval: true, approval_reason: '수치확정' };
  assert.match(assignBody(B, task, { outDirRel: 'x' }), /김민준 승인 전에는 완료되지 않습니다/);

  const pending = [{ id: 'A-0001', task: 'T-0001', kind: '수치확정', reason: '정우선 · 견적서', status: 'pending' }];
  const report = buildReport(B, [{ ...task, status: '승인대기', gate: 'PASS' }], { approvals: pending, outDirRel: 'x', mode: 'mock' });
  assert.match(report, /- 결정권자: 김민준/);
  assert.match(report, /## 승인 대기 \(김민준 결정\)/);
  assert.match(report, /- 김민준: 가상 사무실/);
  assert.doesNotMatch(report, /재하/);

  const persona = await loadPersona('jeong');
  assert.ok(persona.endsWith(ownerLine(s)), '에이전트 지시문 끝에 결정권자 줄');
  assert.match(ownerLine(s), /결정권자: 김민준 — .*김민준을 가리킨다/);

  const tpl = builtinTemplates('ko').flatMap((t) => [t.title, t.result, t.context, ...t.constraints, ...(t.steps || [])]).join('\n');
  assert.match(tpl, /김민준 승인/);
  assert.doesNotMatch(tpl, /\{owner\}|재하/);
  assert.doesNotMatch(builtinTemplates('en').flatMap((t) => [...t.constraints, ...(t.steps || [])]).join('\n'), /\{owner\}|Jaeha/);
  assert.match(builtinTemplates('en').map((t) => t.constraints.join(' ')).join(' '), /Minjun Kim/);

  await updateSettings({ owner_name: '', owner_name_en: '' });
  assert.equal(OWNER.name, '재하', '비우면 기본으로 돌아간다');
});

test('회신의 질문 제목은 이름과 상관없이 읽는다(예전 회신 포함)', () => {
  const reply = (who) => ['## 완료 기능', '끝', '## 남은 제한', '없음', '## 기억할 것', '없음', `## ${who}에게 질문`, '- 기준일은 언제로 잡을까요?'].join('\n');
  assert.deepEqual(parseReply(reply('재하')).questions, ['기준일은 언제로 잡을까요?']);
  assert.deepEqual(parseReply(reply('김민준')).questions, ['기준일은 언제로 잡을까요?']);
  assert.deepEqual(parseReply(reply('Minjun Kim')).questions, ['기준일은 언제로 잡을까요?']);
  assert.deepEqual(parseReply(reply('김민준')).leftovers, []);
});
