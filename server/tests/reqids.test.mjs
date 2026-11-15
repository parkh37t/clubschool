// 요구 번호 읽기·대응표 대조·QA 분량 — 모델·CLI 호출 없음. npm run test:server
// 시험 표는 지어낸 내용만 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementIdCells, looksLikeReqId } from '../rfpCheck.mjs';
import { reqIds, proposalChecks } from '../proposalCheck.mjs';
import { qaExcerpt } from '../qa.mjs';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const RFP = [
  '## 3. 평가 기준',
  '| 평가 id | 항목 |', '| --- | --- |', '| EVAL-01 | 사업 이해 |',
  '',
  '## 4-1. 일반사항',
  '| 요구 id | 원문 인용 | 대응 장 |', '| --- | --- | --- |',
  '| Ⅰ-1-가 | 「가」 | 1장 |',
  '| Ⅰ-2-다-①-1 | 「나」 | 2장 |',
  '| Ⅱ-2-다-※ | 「다」 | 2장 |',
  '| internal:IF-01 | 내부 | 3장 |',
  '| 붙임1-인프라-1 | 「라」 | 4장 |',
  '| 소계 | | |',
  '',
  '## 일정',
  '| 2026-11 | 착수 |', '| --- | --- |', '| 2026-12 | 설계 |',
  '',
  '## 영문 번호 표(머리줄 없음)',
  '| SFR-001 | 화면 |', '| --- | --- |', '| SFR-002 | 연동 |',
].join('\n');

test('머리줄이 요구 id 인 표는 형식과 상관없이 첫 칸을 읽고, 평가 id·날짜·소계는 빼고, 영문 번호 표도 읽는다', () => {
  assert.deepEqual(requirementIdCells(RFP), ['Ⅰ-1-가', 'Ⅰ-2-다-①-1', 'Ⅱ-2-다-※', 'IF-01', '붙임1-인프라-1', 'SFR-001', 'SFR-002']);
});

test('형식만으로: RFP 목차식·영문 접두는 요구 번호, 연도·평가 번호는 아님', () => {
  for (const c of ['Ⅲ-4-나-②', 'Ⅰ-2-나-※2', '1-가-1', 'REQ-012', 'internal:REQ-3']) assert.equal(looksLikeReqId(c), true, c);
  for (const c of ['2026-11', 'EVAL-01', 'EV-003', '합계', '']) assert.equal(looksLikeReqId(c), false, c);
});

test('겹침 없이 모은다', () => {
  assert.deepEqual(reqIds(`${RFP}\n\n| 요구 id | 비고 |\n| --- | --- |\n| Ⅰ-1-가 | 다시 |`).filter((x) => x === 'Ⅰ-1-가').length, 1);
});

test('대응표 대조 — 하위 번호(Ⅰ-1-가-1)만 있으면 상위 번호(Ⅰ-1-가)는 빠진 것으로 본다', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axo-reqids-'));
  const rfpFile = path.join(dir, 'rfp.md');
  const slidesFile = path.join(dir, 'slides.md');
  await fs.writeFile(rfpFile, '| 요구 id | 인용 |\n| --- | --- |\n| Ⅰ-1-가 | 「가」 |\n| Ⅰ-1-나 | 「나」 |\n| 붙임1-인프라-1 | 「다」 |\n');
  await fs.writeFile(slidesFile, '| 장표 | 요구 id |\n| --- | --- |\n| SLIDE-001 | Ⅰ-1-가-1 |\n| SLIDE-002 | Ⅰ-1-나; 붙임1-인프라-1 |\n');
  const r = await proposalChecks({ process: 'proposal', step: 'slides' }, slidesFile, { siblings: [{ step: 'rfp', file: rfpFile }] });
  const cov = r.checks.find((c) => c.id === 'req_coverage');
  assert.equal(cov.status, 'fail');
  assert.match(cov.evidence, /요구 3개 가운데 장표 구성안에 없는 1개: Ⅰ-1-가$/);
});

test('QA 분량 — 10만 자까지는 전문, 넘으면 앞·끝만 넣고 생략을 밝힌다', () => {
  const short = 'x'.repeat(53000);
  assert.equal(qaExcerpt(short).body, short);
  assert.match(qaExcerpt(short).note, /전문/);
  const long = `${'a'.repeat(90000)}${'b'.repeat(30000)}`;
  const ex = qaExcerpt(long);
  assert.ok(ex.body.startsWith('a'.repeat(80000)));
  assert.ok(ex.body.endsWith('b'.repeat(20000)));
  assert.match(ex.body, /중간 20000자 생략/);
  assert.match(ex.note, /전체 120000자/);
});
