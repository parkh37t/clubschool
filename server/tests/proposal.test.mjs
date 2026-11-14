// 회귀 시험 — 제안·견적 프로세스의 단계 정의와 서버 기계 검사(proposalCheck.mjs). 모델 호출 없음.
// 실행: npm run test:server
// 고정하는 성질: 사내 제안 스킬의 운영 규칙(근거표 EV id 이어 쓰기·대응표 역채움·AI 검수 표기·렌더 not_run·변경 기록)이
// 단계 정의와 검사에서 빠지면 깨져야 한다. 단언을 약하게 바꿔 통과시키지 말 것.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-proposal-'));
process.env.OFFICE_HIVE_DIR = path.join(tmp, 'hive');
process.env.OFFICE_DELIVERABLES_DIR = path.join(tmp, 'out');
await fs.mkdir(process.env.OFFICE_HIVE_DIR, { recursive: true });
await fs.mkdir(process.env.OFFICE_DELIVERABLES_DIR, { recursive: true });

const { PROPOSAL_STEPS, ESTIMATE_STEPS, proposalPlan, stepDef, EV_STATES } = await import('../proposal.mjs');
const { proposalChecks, changeLogCheck, wantsChangeLog, evDefined, reqIds } = await import('../proposalCheck.mjs');
const { skillPriorityLines } = await import('../agentRunner.mjs');
const { shortFormHint } = await import('../qa.mjs');

const write = async (name, text) => { const f = path.join(tmp, name); await fs.writeFile(f, text, 'utf8'); return f; };
const byId = (r, id) => r.checks.find((c) => c.id === id);

const RESEARCH = `# 조사
## 근거표
| 근거 id | 진술 | 상태 | 출처 |
| --- | --- | --- | --- |
| EV-001 | 가입 단계 이탈이 큼 | source_claim | 고객 자료 3쪽 |
| EV-002 | 검색 불만이 많음 | hypothesis | 앱 리뷰 |
`;
const RFP = `# RFP 분석
| 요구 id | 원문 인용 | 근거 |
| --- | --- | --- |
| SFR-001 | 「회원 가입 절차를 간소화한다」 | EV-001 |
| SFR-002 | 「통합 검색을 제공한다」 | EV-002 |
| internal:REQ-9 | 내부 확인 항목 | EV-003 |
## 근거표 추가분
| 근거 id | 진술 | 상태 |
| --- | --- | --- |
| EV-003 | 검색 사용률 자료 없음 | unresolved |
`;

test('단계 정의: 근거표는 조사부터, 장표는 역채움·확정 필요, 발표 노트는 홍보라, 검수는 AI 검수', () => {
  const s = Object.fromEntries(PROPOSAL_STEPS.map((x) => [x.key, x]));
  assert.deepEqual(s.research.checks, ['ev_table']);
  assert.ok(s.research.done.includes('EV-001') && EV_STATES.every((st) => s.research.done.includes(st)), '조사 완료 기준에 근거표와 상태 6종');
  for (const k of ['rfp', 'strategy', 'slides', 'draft']) assert.ok(s[k].checks.includes('ev_refs'), `${k} 는 EV id 를 이어 쓴다`);
  assert.ok(s.slides.checks.includes('req_coverage') && s.slides.done.includes('대응표 역채움'));
  assert.ok(s.slides.done.includes('「확정 필요」') && !s.slides.deps.includes('estimate'), '장표는 견적 승인 전에 돌므로 수치는 확정 필요로만');
  assert.equal(s.presentation.owner, 'hong');
  assert.equal(s.presentation.when, 'present');
  assert.ok(s.presentation.done.includes('스크립트 검토'));
  assert.ok(s.review.deps.includes('presentation'));
  assert.deepEqual(s.review.checks, ['ai_label', 'render']);
  assert.ok(s.review.done.includes('시각 미평가') && s.review.done.includes('AI 검수'));
  assert.equal(PROPOSAL_STEPS.filter((x) => x.owner === 'han').length, 3, '한도전은 3단계 그대로(하루 한도 분산)');
  const est = stepDef('proposal', 'estimate');
  assert.deepEqual(est.sections, ['인력 카드|staffing card', '갭 분석|gap analysis']);
  assert.ok(est.done.includes('사전 협의 필요'));
  assert.ok(ESTIMATE_STEPS.find((x) => x.key === 'estimate_review').checks.includes('ai_label'));
  assert.equal(stepDef('free', 'research'), null);
});

test('단계 완료 기준이 짧은 형식 요청으로 읽히지 않는다(제목·분량 검사·변경 기록이 빠지지 않게)', () => {
  const brief = { result: '제안서 초안', constraints: [] };
  for (const s of [...PROPOSAL_STEPS, ...ESTIMATE_STEPS]) {
    assert.equal(shortFormHint({ title: s.ko, done_when: s.done }, brief), '', `${s.key}: ${shortFormHint({ title: s.ko, done_when: s.done }, brief)}`);
  }
});

test('발표본은 결과·제약에 발표가 있을 때만 — 맥락(RFP 요약)의 발표 평가로는 붙지 않는다', async () => {
  const withTalk = await proposalPlan({ title: '가상 제안서', result: '제안서 초안과 발표 자료', context: '', constraints: [] });
  assert.ok(withTalk.tasks.some((t) => t.step === 'presentation'));
  const review = withTalk.tasks.find((t) => t.step === 'review');
  const pIdx = withTalk.tasks.findIndex((t) => t.step === 'presentation');
  assert.ok(review.depends_on.includes(pIdx), '검수는 발표본 뒤');
  const noTalk = await proposalPlan({ title: '가상 제안서', result: '제안서 초안', context: '발표 평가 20분, PT 포함', constraints: [] });
  assert.ok(!noTalk.tasks.some((t) => t.step === 'presentation'));
  const ppt = await proposalPlan({ title: '가상 제안서', result: '제안서 초안(PPT)', context: '', constraints: [] });
  assert.ok(!ppt.tasks.some((t) => t.step === 'presentation'), "'PPT' 는 발표(PT)가 아니다");
});

test('ev_table·ev_refs: 상태 없는 근거, 근거표에 없는 id 를 잡는다', async () => {
  const research = await write('research.md', RESEARCH);
  const ok = await proposalChecks({ process: 'proposal', step: 'research' }, research);
  assert.equal(byId(ok, 'ev_table').status, 'pass');
  const noState = await write('research2.md', RESEARCH.replace('| hypothesis |', '| 추정 |'));
  const bad = await proposalChecks({ process: 'proposal', step: 'research' }, noState);
  assert.equal(byId(bad, 'ev_table').status, 'fail');
  assert.equal(bad.issues.length, 1);
  assert.equal((await proposalChecks({ process: 'proposal', step: 'research' }, await write('empty.md', '# 조사\n본문만 있음'))).checks[0].status, 'fail');

  const rfp = await write('rfp.md', RFP);
  const sib = [{ step: 'research', file: research }];
  assert.equal(byId(await proposalChecks({ process: 'proposal', step: 'rfp' }, rfp, { siblings: sib }), 'ev_refs').status, 'pass', '추가분에 덧붙인 EV-003 은 인정');
  const invented = await write('strategy.md', '# 전략\n승부 메시지 (EV-001, EV-077)\n');
  const r = await proposalChecks({ process: 'proposal', step: 'strategy' }, invented, { siblings: sib });
  assert.equal(byId(r, 'ev_refs').status, 'fail');
  assert.match(byId(r, 'ev_refs').evidence, /EV-077/);
  const none = await write('draft.md', '# 본문\n근거 표시 없이 씀\n');
  assert.equal(byId(await proposalChecks({ process: 'proposal', step: 'draft' }, none, { siblings: sib }), 'ev_refs').status, 'fail', '본문은 인용 필수');
  assert.equal(byId(await proposalChecks({ process: 'proposal', step: 'presentation' }, none, { siblings: sib }), 'ev_refs').status, 'pass', '발표 노트는 인용 선택');
  assert.equal(evDefined('| EV-7 | x | proposal |\n| --- | --- | --- |\n').get('EV-007'), 'proposal', '머리줄 없는 표, EV-7 = EV-007');
});

test('req_coverage·unconfirmed_numbers: 대응표 역채움에서 빠진 요구, 확정 필요 없는 수치', async () => {
  const research = await write('research.md', RESEARCH);
  const rfp = await write('rfp.md', RFP);
  assert.deepEqual(reqIds(RFP), ['SFR-001', 'SFR-002', 'REQ-9']);
  const slides = await write('slides.md', `# 장표 구성안
| 장표 id | 제목 | 근거 | 요구 |
| --- | --- | --- | --- |
| SLIDE-001 | 가입 단계를 줄인다 | EV-001 | SFR-001 |
## 대응표 역채움
| 요구 id | 제출 장표 | 발표 제외 사유 |
| --- | --- | --- |
| SFR-001 | SLIDE-001 | |
| REQ-9 | 공백 | 내부 확인 |
- 총 투입 12.5 M/M 으로 진행
- 금액은 「확정 필요」
- 사업 예산 5억 원(RFP)
`);
  const r = await proposalChecks({ process: 'proposal', step: 'slides' }, slides, { siblings: [{ step: 'research', file: research }, { step: 'rfp', file: rfp }] });
  assert.equal(byId(r, 'req_coverage').status, 'fail');
  assert.match(byId(r, 'req_coverage').evidence, /SFR-002/);
  assert.doesNotMatch(byId(r, 'req_coverage').evidence, /SFR-001|REQ-9/);
  const un = byId(r, 'unconfirmed_numbers');
  assert.equal(un.status, 'fail');
  assert.equal(un.required, false, '수치 검사는 참고');
  assert.match(un.evidence, /1줄/, '확정 필요·예산 줄은 세지 않음');
  assert.equal(byId(r, 'sections').status, 'pass');
  assert.equal(r.issues.length, 1, '판정에 드는 실패는 req_coverage 하나');
  const noRfp = await proposalChecks({ process: 'proposal', step: 'slides' }, slides, { siblings: [{ step: 'research', file: research }] });
  assert.equal(byId(noRfp, 'req_coverage').status, 'not_run', 'RFP 산출물이 없으면 통과로 적지 않는다');
});

test('ai_label·render·sections: AI 검수 표기, 검토 완료 주장, 렌더는 항상 not_run', async () => {
  const good = await write('review.md', '# 제안서 검수 — AI 검수\n- 사람 검토 완료 아님\n- 시각 미평가\n');
  const r = await proposalChecks({ process: 'proposal', step: 'review' }, good);
  assert.equal(byId(r, 'ai_label').status, 'pass');
  assert.equal(byId(r, 'render').status, 'not_run');
  assert.equal(byId(r, 'render').required, false);
  const claim = await write('review2.md', '# 제안서 검수 — AI 검수\n전체 검토 완료되었습니다.\n');
  assert.equal(byId(await proposalChecks({ process: 'proposal', step: 'review' }, claim), 'ai_label').status, 'fail');
  const nolabel = await write('review3.md', '# 제안서 검수\n점검 결과\n');
  assert.equal(byId(await proposalChecks({ process: 'estimate', step: 'estimate_review' }, nolabel), 'ai_label').status, 'fail');
  const est = await write('est.md', '# 견적\n## 인력 카드\n| 역할 |\n| --- |\n| PM |\n');
  const e = await proposalChecks({ process: 'estimate', step: 'estimate' }, est);
  assert.equal(byId(e, 'sections').status, 'fail');
  assert.match(byId(e, 'sections').evidence, /갭 분석/);
  const mock = await proposalChecks({ process: 'estimate', step: 'estimate' }, est, { required: false });
  assert.equal(byId(mock, 'sections').required, false, 'mock 은 참고로만');
  assert.equal(mock.issues.length, 0);
});

test('변경 기록: 보완 뒤 CHG 행을 세고, 짧은 형식·기획 화면에는 요구하지 않는다', async () => {
  const withLog = await write('rev.md', '# 보완본\n본문\n## 변경 기록\n| CHG id | 지적 | 변경 전 | 변경 후 | 영향 위치 |\n| --- | --- | --- | --- | --- |\n| CHG-01 | 수치 근거 없음 | 30% | 검증할 가설 | 3장 |\n');
  const c = (await changeLogCheck(withLog, 2)).checks[0];
  assert.equal(c.status, 'pass');
  assert.match(c.evidence, /CHG 1건/);
  assert.equal((await changeLogCheck(await write('rev2.md', '# 보완본\n본문\n'), 1)).checks[0].status, 'fail');
  assert.equal(wantsChangeLog({ process: 'proposal', title: '제안 전략' }, { result: '제안서 초안', constraints: [] }), true);
  assert.equal(wantsChangeLog({ process: 'free', title: '요약' }, { result: '3줄 요약', constraints: [] }), false);
  assert.equal(wantsChangeLog({ process: 'planning', title: '화면 생성' }, { result: '화면설계', constraints: [] }), false);
});

test('스킬 우선순위: 사내 스킬이 붙었을 때만, proposal-maker 는 목차 후보로만', () => {
  assert.deepEqual(skillPriorityLines([{ name: 'proposal-writing' }, { name: 'proposal-maker' }]), []);
  const lines = skillPriorityLines([{ name: 'wylie-proposal' }, { name: 'proposal-maker' }]);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /사내 스킬\(wylie-proposal\)/);
  assert.match(lines[1], /목차 후보/);
  assert.match(skillPriorityLines([{ name: 'wylie-proposal' }, { name: 'acme-app-proposal' }])[0], /고객사 전용 스킬\(acme-app-proposal\)/);
});
