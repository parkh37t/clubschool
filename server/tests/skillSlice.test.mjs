// 긴 통합 스킬의 절 나누기 — 단계마다 필요한 절만, 건별 이력은 브리핑 고객사 것만(모델·CLI 호출 없음). npm run test:server
// 시험 본문은 지어낸 회사 이름만 쓴다(실제 사내 스킬 내용을 저장소에 두지 않는다).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAlt, clientKeys, sliceSections } from '../skills.mjs';

const BODY = [
  '# 통합 스킬',
  '',
  '원천 표와 머리말 — 단계에는 넣지 않는다.',
  '',
  '## 1. 우선순위와 금지선',
  '- 고객 간 정보 혼합 금지.',
  '',
  '## 2. 작업 모드',
  '- 브리프부터.',
  '',
  '## 10. 검수',
  '- 게이트 G01~G10.',
  '',
  '## 13. 건별 이력',
  '',
  '각 항목은 해당 건에만 유효하다.',
  '',
  '### 가나다화재 콜센터 운영 제안(2027)',
  '- 가나다 전용 사실.',
  '',
  '### 라마바은행 기업뱅킹 차세대(라마바ONE 재구축)',
  '- 라마바 전용 사실.',
  '',
  '### 사아자손해보험 스마트 보장분석 시스템 고도화',
  '- 사아자 전용 사실.',
  '',
  '### 그 밖의 건',
  '- 여러 고객 메모.',
  '',
  '## 14. 세션 기록',
  '- 넣지 않는 절.',
].join('\n');

test('스펙 조각: 이름#절,절:match', () => {
  assert.deepEqual(parseAlt('wylie-proposal-master#1,10,13:match'), { name: 'wylie-proposal-master', sections: [{ n: 1, match: false }, { n: 10, match: false }, { n: 13, match: true }] });
  assert.deepEqual(parseAlt('proposal-writing'), { name: 'proposal-writing', sections: null });
  assert.deepEqual(parseAlt('x#abc'), { name: 'x', sections: null });
});

test('고객사 낱말: 일반 낱말·두 글자 약어는 빼고, 회사 끝말을 뗀 이름과 손보 줄임도 쓴다', () => {
  assert.deepEqual(clientKeys('가나다화재 콜센터 운영 제안(2027)').sort(), ['가나다', '가나다화재', '콜센터'].sort());
  assert.ok(clientKeys('사아자손해보험 스마트 보장분석 시스템 고도화').includes('사아자손보'));
  assert.deepEqual(clientKeys('KB 스타뱅킹·차세대 인터넷뱅킹(종료·실주)'), ['스타뱅킹']);
  assert.deepEqual(clientKeys('그 밖의 건'), []);
});

test('고른 절만 남기고, 넣지 않은 절(2·14)은 뺀다', () => {
  const out = sliceSections(BODY, [{ n: 1 }, { n: 10 }], '');
  assert.match(out, /^# 통합 스킬/);
  assert.match(out, /## 1\. 우선순위/);
  assert.match(out, /## 10\. 검수/);
  assert.doesNotMatch(out, /## 2\.|## 14\.|원천 표와 머리말|## 13\./);
});

test('건별 이력(:match)은 브리핑에 나온 고객사 항목만 — 다른 고객·그 밖의 건은 넣지 않는다', () => {
  const out = sliceSections(BODY, [{ n: 13, match: true }], '라마바은행 기업뱅킹 UI/UX 제안서');
  assert.match(out, /각 항목은 해당 건에만 유효하다/);
  assert.match(out, /라마바 전용 사실/);
  assert.doesNotMatch(out, /가나다 전용|사아자 전용|여러 고객 메모/);
});

test('줄임 이름(손보·끝말 뗀 이름)으로도 맞춘다', () => {
  assert.match(sliceSections(BODY, [{ n: 13, match: true }], '사아자손보 보장분석 개선'), /사아자 전용 사실/);
  assert.match(sliceSections(BODY, [{ n: 13, match: true }], '가나다 TM 운영 제안'), /가나다 전용 사실/);
});

test('맞는 고객사가 없으면 이력 없이 그렇다고만 적는다(일반 낱말로는 안 붙음)', () => {
  const out = sliceSections(BODY, [{ n: 1 }, { n: 13, match: true }], '중견 제조사 홈페이지 재구축 제안 — 시스템 고도화, DB 설계');
  assert.match(out, /고객사 항목이 없다/);
  assert.doesNotMatch(out, /전용 사실|여러 고객 메모/);
});

test('번호 절이 없는 본문은 그대로', () => {
  const plain = '# 짧은 스킬\n- 절차 하나';
  assert.equal(sliceSections(plain, [{ n: 1 }], ''), plain);
});
