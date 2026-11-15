// 제안서 작성 프로세스 — 결과 줄이 '제안서'인 브리핑은 팀장의 자유 분해 대신 이 표준 절차로 나눈다.
//
//   조사·근거표 → RFP 분석·Go/No-Go(재하 승인) → 전략·스토리·목차 → [UX·디자인 섹션] [성과 지표]
//   → 견적·인력 투입 계획(재하 승인 '수치확정') ∥ 장표 구성안·대응표 역채움(구조) → 본문 → [발표본·발표 노트] → 검수(정합, AI 검수)
// 담당 배분: 조사 김영업 · RFP·전략·본문 한도전 · 견적 정우선 · UX 섹션·장표 구성안 차도안 · KPI·검수 고지표 · 발표 노트 홍보라.
//   본문은 승인된 견적 단계의 값만 쓴다(견적이 승인되기 전에는 본문이 시작되지 않는다).
//   사내 제안 스킬의 운영 규칙을 일반 절차로 옮겼다(2026-11-15): 근거표(EV-nnn, 근거 상태 6종)는 조사 단계부터 만들고 뒤 단계는 이어 쓴다,
//   장표 단계는 요구·평가 대응표에 장표 id 를 역채운다, 견적 승인 전 장표는 수치를 「확정 필요」로만, 검수는 'AI 검수'이고 렌더·시각은 not_run.
//
// 견적 프로세스 — 결과 줄이 견적서·인력투입계획인 브리핑(제안서 없이 견적만)은 ESTIMATE_STEPS 로 나눈다.
//   범위·가정 정리 → 견적기준표·인력투입계획·견적서(안) → 견적 검수(재하 승인 '수치확정')
//   견적 단계의 표는 서버가 엑셀(.xlsx)로도 저장한다(task.export, server/xlsxExport.mjs).
//   한 사람이 하루 사용 한도를 혼자 넘기지 않게 나눈다(2026-11-14 실측: 한도전이 4단계를 맡자 같은 날 다른 과제와 합쳐 하루 한도를 넘겼다).
//   고객사 전용 제안 스킬은 제안 문서를 직접 쓰는 단계(client:true — RFP·전략·장표·본문)에 붙는다.
//
// 단계마다 담당·산출 폴더·스킬·완료 기준·승인을 여기서 정한다. 스킬은 'a|b' 규칙(skills.mjs) —
// 사내 제안 스킬(통합 스킬 wylie-proposal-master, 개별 wylie-proposal·-visual·-review 등)이 이 PC 에 있으면 그것을, 없으면 저장소의 공용 스킬을 쓴다.
// 고객사 전용 제안 스킬(사용자 스킬 폴더의 '<고객>-…-proposal')은 브리핑에 그 고객사가 나오면 한도전 단계에 붙는다.
// 사내·고객사 스킬은 공개 저장소에 두지 않는다(.gitignore) — 이 PC 에 있을 때 이름으로만 찾는다.
//
// 브리핑 process: 'proposal' 이면 항상, 'free' 면 쓰지 않는다. 값이 없으면 결과 줄로 판단한다.

import { findClientProposalSkills } from './skills.mjs';

const WRITE = 'wylie-proposal|proposal-writing';

// 와일리 제안서 통합 스킬(wylie-proposal-master — 사용자 스킬 폴더, 저장소에 두지 않음). 이 PC 에 있으면 단계마다 필요한 절만 넣고
// (skills.mjs sliceSections), 없으면 예전 개별 스킬로 대체한다. 절 번호: 1 우선순위·금지선 · 2 작업 모드 · 3 요구·근거 · 4 스토리 ·
// 5 분석 · 6 디자인 · 7 장표·문장 · 8 완성·발표본 · 9 시각 · 10 검수 · 12 견적 · 13 건별 이력(':match' — 브리핑에 나온 고객사 항목만).
// 14 세션 기록·15 자료 간 불일치는 넣지 않는다(다른 고객의 수치·인력이 섞여 있다).
// 'MASTER|X' 처럼 절 없이 한 번 더 적은 스펙은 통합 스킬이 이미 붙었으면 건너뛰고(이름 중복), 없을 때만 X 를 붙인다.
const MASTER = 'wylie-proposal-master';
const master = (secs, fallback) => `${MASTER}#${secs}|${fallback}`;

// 근거 상태 6종 — 근거표(EV-nnn)의 행마다 하나. 서버 검사(proposalCheck.mjs)가 이 값만 상태로 인정한다.
export const EV_STATES = ['verified_fact', 'source_claim', 'proposal', 'hypothesis', 'unresolved', 'placeholder'];
const EV_TABLE = `근거표(첫 칸 EV-001부터 이어지는 근거 id · 진술 · 상태(${EV_STATES.join('·')} 중 하나) · 근거 종류 · 출처 위치 · 기준일 · 적용 범위 · 확인 필요)`;
const EV_TABLE_EN = `an evidence table (first column an evidence id from EV-001 · statement · state (one of ${EV_STATES.join(', ')}) · kind · source location · as-of date · scope · needs checking)`;
// 앞 단계 근거표를 이어 쓰는 규칙 — 번호를 다시 쓰지 않고, 새 근거는 다음 번호로 이 산출물의 '근거표 추가분'에 덧붙인다.
const EV_CARRY = '근거는 앞 단계 근거표의 EV id 로 가리키고(새 id 를 지어내지 않음), 새 근거가 필요하면 다음 번호로 이 산출물 끝 \'근거표 추가분\' 표에 상태와 함께 덧붙인다';
const EV_CARRY_EN = 'cite evidence by the EV ids of earlier evidence tables (do not invent ids); new evidence gets the next number in an "evidence additions" table at the end, with its state';

// 견적 단계 — 제안서 프로세스와 견적 프로세스가 같이 쓴다. 'xlsx' 는 엑셀 스킬을 참고용(필요할 때 읽기)으로 붙인다.
const ESTIMATE = {
  key: 'estimate', timeout: 1.25, owner: 'jeong', stage: '03_proposal',
  ko: '견적·인력 투입 계획 — 견적기준표·인력투입계획·견적서(안)', en: 'Estimate and staffing — cost basis, staffing plan, draft quote',
  skills: ['proposal-estimate', master('1,12,13:match', 'proposal-estimate'), 'xlsx'],
  done: '견적기준표(업무 분류·수량·난이도·필요 인원·근거 요구 id), 인력투입계획(역할·등급·월별 M/M·합계, 한 사람 월 1.0 이하), 인력 카드(역할마다 이번 과업 역할 · 관련 도메인·기술 · 유사 과업에서 실제 담당한 일 · 입증 가능한 산출물·기간 · 예정 투입률·기간 · 상태 — 실명 없이 역할로, 경력 프로필만으로 배정·가용성을 확정하지 않음), 견적서(안)(업무구분·등급·인원·M/M·단가·금액·할인율·제안가·소계·합계·천 원 미만 절사·평단가·부가세 별도/포함), 기준안과 낮은안·높은안, 갭 분석(요구 id · RFP 요구 · 제안 범위 · 수행 가능 범위 · 차이 · 사전 협의 필요 여부), 정합 점검표, 가정·제외 범위. 확인 못 한 단가는 [확인 필요]. 표는 마크다운 표로(엑셀로 함께 저장됨), 제목은 「인력 카드」「갭 분석」을 그대로 쓴다',
  doneEn: 'Cost basis (work items, quantity, difficulty, headcount, requirement ids), staffing plan (role, grade, monthly man-months, totals, at most 1.0 per person per month), staffing cards (per role: role in this project · related domain and skills · what they actually did on similar work · provable outputs and period · planned allocation and period · state — roles, not names; a profile alone does not confirm assignment or availability), draft quote (work type, grade, headcount, man-months, unit price, amount, discount, offer, subtotals, total rounded down below 1,000 won, average rate, VAT excluded/included), base/low/high cases, a gap analysis (req id · RFP requirement · proposed scope · deliverable scope · gap · needs prior agreement), a consistency check table, assumptions and exclusions. Unconfirmed prices marked [to confirm]. Tables as markdown tables (also saved as Excel), with the headings "Staffing cards" and "Gap analysis"',
  export: ['xlsx'],
  // 서버 기계 검사(proposalCheck.mjs) — 제목(#)에 이 글이 있어야 한다('a|b' = 둘 중 하나, 영어 산출물용)
  sections: ['인력 카드|staffing card', '갭 분석|gap analysis'],
};

// checks — 서버 기계 검사(proposalCheck.mjs): ev_table(근거표) · ev_refs(EV id 이어 쓰기) · req_coverage(대응표 역채움) ·
//   unconfirmed_numbers(견적 승인 전 수치, 참고) · ai_label(AI 검수 표기) · render(렌더·시각 not_run, 참고). sections — 제목(#)에 있어야 할 글.
//   evOptional — EV 인용이 없어도 되는 단계(인용한 id 는 근거표에 있어야 한다).
export const PROPOSAL_STEPS = [
  {
    key: 'research', owner: 'kim', stage: '00_sales',
    ko: '제안 조사 — 고객·경쟁·페인포인트·근거표', en: 'Proposal research — client, competitors, pain points, evidence table',
    skills: ['competitor-benchmark', master('1,3,5,13:match', 'strategy-proposal-analyzer')],
    done: `고객 니즈 표, 경쟁·대체 서비스 비교표(O/X/△), 페인포인트 카드(유형·빈도·심각도), 현재 고객 여정, 발주처 확인 질문 목록, ${EV_TABLE}. 다른 표의 행은 근거 칸에 EV id 를 적는다. 자료에 적힌 주장은 직접 확인하기 전까지 source_claim, 해석·추정은 hypothesis, 출처가 없거나 서로 어긋나면 unresolved`,
    doneEn: `Client needs table, competitor/substitute comparison (O/X/△), pain-point cards (type, frequency, severity), current customer journey, questions for the client, and ${EV_TABLE_EN}. Other tables cite EV ids in their evidence column. Claims found in documents stay source_claim until checked directly, interpretations are hypothesis, missing or conflicting sources are unresolved`,
    deps: [],
    checks: ['ev_table'],
  },
  {
    key: 'rfp', timeout: 1.5, owner: 'han', stage: '01_rfp', client: true,
    ko: 'RFP 분석 — 요구·평가 대응표와 Go/No-Go', en: 'RFP analysis — requirement-scoring matrix and Go/No-Go',
    skills: ['rfp-analysis', master('1,2,3,13:match', WRITE)],
    done: `RFP 요구사항을 빠짐없이 옮긴 요구·평가 대응표(요구 id · 원문 인용 · 원문 위치 · 평가 항목 · 대응할 장 · 근거(EV id) · 충족 상태 · 공백)와 Go/No-Go 5축(적합성·승산·수익성·리스크·전략가치) 권고. 원문 인용은 RFP 문장을 「」 안에 글자 그대로(서버가 원문에서 다시 찾는다), 요구 id 는 원문 번호를 그대로 쓰고 겹치지 않게(원문 번호가 없으면 internal: 을 붙인 내부 id), 비기능 6축(성능·가용성·보안·접근성·호환성·감리)은 근거 요구가 없어도 「해당 없음」이 아니라 「근거 없음(missing)」으로 적는다. ${EV_CARRY}`,
    doneEn: `A requirement-scoring matrix that carries every RFP requirement (req id, verbatim quote, source location, scoring item, answering chapter, evidence (EV id), coverage, gap) and a 5-axis Go/No-Go recommendation (fit, win odds, margin, risk, strategic value). Quote the RFP sentence verbatim inside 「」 (the server searches the source for it), keep the source requirement ids and keep them unique (no source id: an internal id prefixed internal:), and cover all six non-functional axes (performance, availability, security, accessibility, compatibility, audit) — an axis without supporting requirements is "missing", not "n/a". ${EV_CARRY_EN}`,
    deps: ['research'], approval: 'Go/No-Go',
    checks: ['ev_refs'],
  },
  {
    key: 'strategy', owner: 'han', stage: '03_proposal', client: true,
    ko: '제안 전략 — 승부 메시지·스토리·목차', en: 'Proposal strategy — win theme, story and outline',
    skills: [master('1,4,5,7,13:match', WRITE), `${MASTER}|proposal-maker`],
    done: `승부 메시지 1개와 전략 2~4개(각각 받치는 EV id), 스토리 흐름(고객 문제 → 성공 조건 → 왜 우리인가 → 무엇을 어떻게 → 완수·검증 → 결정 요청), 평가 배점 순서에 맞춘 목차와 장별 핵심 메시지. ${EV_CARRY}`,
    doneEn: `One win theme with 2-4 strategies (each with its supporting EV ids), a story flow (client problem → success conditions → why us → what and how → delivery and proof → decision ask), an outline in scoring order with each chapter's key message. ${EV_CARRY_EN}`,
    deps: ['rfp'],
    checks: ['ev_refs'],
  },
  {
    key: 'design', owner: 'cha', stage: '03_proposal', when: 'design',
    ko: 'UX·디자인 제안 섹션', en: 'UX and design section',
    skills: [master('1,6,9', 'proposal-skills'), 'wylie-proposal-visual|ui-review'],
    // '3줄'·'한 문장'처럼 쓰면 QA 가 산출물 전체를 짧은 형식 요청으로 본다(qa.shortFormHint) — 분량 표현은 숫자+줄·문장을 피한다
    done: '디자인 목표(짧은 문장 셋), 원칙 5개, 비주얼 방향 2~3안, 핵심 화면 3~5개 명세(목적·KPI·구성·상태), 검증 계획',
    doneEn: 'Three-line design goal, five principles, 2-3 visual directions, specs for 3-5 key screens (purpose, KPI, sections, states), a validation plan',
    deps: ['strategy'],
  },
  {
    key: 'kpi', owner: 'go', stage: '03_proposal', when: 'kpi',
    ko: '성과 지표(KPI) 설계', en: 'Success metrics (KPI) design',
    skills: ['kpi-event-tracking'],
    done: 'KPI 카드(정의·산식·분모·기간·기준선 측정 방법). 측정 전 효과 수치는 "검증할 가설"로 표기',
    doneEn: 'KPI cards (definition, formula, denominator, period, how the baseline is measured). Effects not yet measured are written as hypotheses to test',
    deps: ['strategy'],
  },
  // 견적은 범위(RFP)와 전략이 정해지면 시작한다. 장표 구성안과 함께 돌고, 본문은 견적 승인 뒤에 시작한다.
  { ...ESTIMATE, deps: ['rfp', 'strategy'], approval: '수치확정' },
  {
    // 견적 승인 전에 돈다 — 금액·M/M·인원은 「확정 필요」로만(unconfirmed_numbers 는 참고 검사)
    key: 'slides', timeout: 1.25, owner: 'cha', stage: '03_proposal', client: true,
    ko: '장표 구성안·대응표 역채움(구조 단계)', en: 'Slide plan and requirement backfill (structure pass)',
    skills: [master('1,3,7,9,13:match', WRITE), 'wylie-proposal-visual|ui-review'],
    done: '장표마다 장표 id(SLIDE-001부터) · 평가자 질문 · 결론형 제목 · 근거 id(앞 단계 근거표의 EV id) · 도식 유형 · 담당 요구 id 를 적은 구성안. 근거표는 새로 만들지 않고 앞 단계 근거표를 이어 쓴다(빠진 근거만 다음 번호로 \'근거표 추가분\'에 보강). 「대응표 역채움」 표 — RFP 분석의 요구 id 하나하나에 제출 장표 id · 발표 장표 id · 백업 장표 id · 발표 제외 사유(장표가 없으면 \'공백\'이라고 적음, 요구 id 를 하나도 빼지 않음). 견적이 아직 승인되지 않았으므로 금액·M/M·인원 수치는 쓰지 않고 「확정 필요」로만 적는다. 제목만 이어 읽어도 주장이 이어져야 함',
    doneEn: 'A slide plan listing, per slide, a slide id (from SLIDE-001), the evaluator question, a conclusion-style title, evidence ids (EV ids from earlier evidence tables), diagram type and requirement ids. Do not build a new evidence table — carry the earlier one (only missing evidence gets the next number in an "evidence additions" table). A "requirement backfill" table: every requirement id from the RFP analysis with its submission, presentation and backup slide ids or the reason it is left out of the talk (write "gap" when no slide covers it; leave no id out). The estimate is not approved yet, so write price, man-months and headcount only as 「확정 필요」(to confirm), never as numbers. Reading only the titles must carry the argument',
    deps: ['strategy', 'design', 'kpi'],
    checks: ['ev_refs', 'req_coverage', 'unconfirmed_numbers'],
    sections: ['대응표 역채움|requirement backfill'],
  },
  {
    key: 'draft', timeout: 1.5, owner: 'han', stage: '03_proposal', client: true,
    ko: '제안서 본문(본문 단계)', en: 'Proposal body (content pass)',
    skills: [master('1,3,4,7,8,13:match', WRITE), `${MASTER}|proposal-maker`],
    done: `구성안 순서대로 쓴 제안서 본문. 금액·투입 M/M·인력 구성은 승인된 견적 단계 값만 쓰고(새 숫자를 만들지 않음), 주장마다 근거 EV id 를 괄호로 붙이며, 근거 없는 효과 수치와 상투어 금지, 확인 못 한 값은 "미확인". ${EV_CARRY}`,
    doneEn: `The proposal body in slide-plan order. Price, man-months and staffing come only from the approved estimate step (no new numbers); each claim carries its EV id in brackets; no unsupported effect numbers or clichés; unverified values marked "unverified". ${EV_CARRY_EN}`,
    deps: ['slides', 'estimate'],
    checks: ['ev_refs'],
  },
  {
    // 발표가 있는 과제만 — 한도전(RFP·전략·본문)의 하루 사용량을 넘기지 않게 고객 커뮤니케이션 담당 홍보라가 맡는다
    key: 'presentation', owner: 'hong', stage: '03_proposal', client: true, when: 'present',
    ko: '발표본·발표 노트', en: 'Presentation cut and speaker notes',
    skills: [master('1,7,8,13:match', WRITE)],
    done: '제출본(장표 구성안·본문)을 바탕으로 한 발표본 구성 표(장표 id · 역할(발표/백업/발표 제외) · 예상 초), 가용 설명 시간 계산(배정 시간 − 질의응답 − 시연 − 전환·여유, 모르는 값은 가정으로)과 발표 장표 예상 초 합계, 「발표 노트」(장마다 전달할 핵심 문장 · 근거 설명(EV id) · 다음 장으로의 연결 · 예상 질문·백업 장표 위치). 본문을 읽는 대본을 만들지 않고, 제출본의 논리·수치·번호를 바꾸지 않는다. 리허설을 하지 않았으므로 \'스크립트 검토\'라고 적고 \'리허설 완료\'라고 쓰지 않는다',
    doneEn: 'A presentation cut built from the submission (slide plan and body): a table of slide id · role (talk / backup / left out) · estimated seconds, the available talk time (allotted time − Q&A − demo − transitions and slack; unknown values as assumptions) against the total seconds, and "speaker notes" per slide (the one sentence to land · evidence explanation (EV id) · bridge to the next slide · expected questions and backup slide). Not a script that reads the body; do not change the submission\'s logic, numbers or ids. No rehearsal has happened, so write "script reviewed", never "rehearsed"',
    deps: ['draft'],
    checks: ['ev_refs'], evOptional: true,
    sections: ['발표 노트|speaker note'],
  },
  {
    key: 'review', owner: 'go', stage: '03_proposal',
    ko: '제안서 검수(정합 단계, AI 검수)', en: 'Proposal review (consistency pass, AI review)',
    skills: [master('1,10,13:match', 'wylie-proposal-review|proposal-review'), 'wylie-proposal-review|proposal-review'],
    done: '맨 위에 「AI 검수」라고 밝힌 검수 보고서(사람 검토를 받지 않았으므로 \'검토 완료\'라고 쓰지 않음). 필수 점검 항목별 결과(pass·fail·not_run)와 근거 위치 — 본문의 금액·M/M·인력이 승인된 견적과 같은지, 근거 상태 6종을 구분했는지, 인용한 EV id 가 근거표에 있는지, 대응표 역채움에서 빠진 요구가 없는지 포함. 평가 항목별 등급과 근거 — 실제 렌더링(글자 깨짐·넘침·겹침)과 도식·레이아웃·글꼴 같은 시각 항목은 이 단계에서 확인할 수 없으므로 not_run 으로 두고 점수로 채우지 않으며 \'시각 미평가\'라고 적는다. 먼저 고칠 것 1~3개, 최종 판정(내용 기준 제출 준비 / 수정 필요 — fail 이나 중요한 not_run 이 하나라도 있으면 제출 준비가 아님, 제출 준비여도 \'렌더 검수 전\'을 함께 적음)',
    doneEn: 'A review report that says "AI review" at the top (no human review happened, so never write "review complete"). Each required check with its result (pass, fail, not_run) and location — including whether price, man-months and staffing in the body match the approved estimate, whether the six evidence states are kept apart, whether every cited EV id is in an evidence table, and whether the requirement backfill misses any requirement. A grade with evidence per scoring item — actual rendering (broken glyphs, overflow, overlap) and visual items such as diagrams, layout and type cannot be checked at this step, so leave them not_run, do not fill them with a score, and write "visuals not assessed". The 1-3 fixes to make first and a verdict (ready to submit on content / needs work — any fail or important not_run means not ready; even when ready, add "before render check")',
    deps: ['draft', 'presentation'],
    checks: ['ai_label', 'render'],
  },
];

export const ESTIMATE_STEPS = [
  {
    key: 'scope', owner: 'jeong', stage: '03_proposal',
    ko: '견적 범위·가정 정리', en: 'Estimate scope and assumptions',
    skills: ['proposal-estimate', 'rfp-analysis', master('1,3,12,13:match', 'proposal-estimate')],
    done: '업무 분류(구분·상세)와 수량·난이도, 행마다 근거(요구 id·원문 위치·가정 번호), 사업 기간과 단계별 개월 수, 가정·제외 범위 목록, 발주처에 확인할 질문',
    doneEn: 'Work breakdown (category, detail) with quantity and difficulty, the basis of every row (requirement id, source location, assumption no.), project duration and months per phase, assumptions and exclusions, questions for the client',
    deps: [],
  },
  { ...ESTIMATE, deps: ['scope'] },
  {
    key: 'estimate_review', owner: 'go', stage: '03_proposal',
    ko: '견적 검수 — M/M·금액·단수처리 정합(AI 검수)', en: 'Estimate review — man-months, amounts and rounding (AI review)',
    skills: ['proposal-estimate', master('1,10,12', 'proposal-estimate')],
    done: '맨 위에 「AI 검수」라고 밝힌 검수 보고서(\'검토 완료\'라고 쓰지 않음). 정합 점검표(인력투입계획 M/M 합계 = 견적서 수량, 금액 = 단가 × 수량, 소계·합계, 천 원 미만 절사, 평단가, 부가세, 한 사람 월 1.0 초과 여부, 단가 근거 표시, 인력 카드가 인력투입계획의 역할과 맞는지, 갭 분석의 사전 협의 필요 항목이 가정·제외 범위에 올랐는지)의 결과 pass·fail·not_run 과 위치, 고칠 것, 판정(승인 요청 가능 / 수정 필요)',
    doneEn: 'A review report that says "AI review" at the top (never "review complete"). A consistency check table (staffing man-months = quote quantity, amount = unit price × quantity, subtotals and total, rounding below 1,000 won, average rate, VAT, no one above 1.0 per month, price sources shown, staffing cards match the roles in the staffing plan, gap items needing prior agreement appear in assumptions and exclusions) with pass, fail or not_run and locations, fixes, and a verdict (ready for approval / needs work)',
    deps: ['estimate'], approval: '수치확정',
    checks: ['ai_label'],
  },
];

const RESULT_RE = /제안서|제안\s?발표|제안\s?자료|proposal|pitch\s?deck/i;
const REVIEW_ONLY_RE = /검수|리뷰|review/i;
const WRITE_RE = /작성|초안|만들|제작|draft|write|prepare/i;

/** 표준 제안 절차를 쓸 브리핑인지. '제안서 검수'처럼 이미 있는 제안서를 보는 일은 아니다. */
export function isProposalBriefing(b) {
  if (b.process === 'free') return false;
  if (b.process === 'proposal') return true;
  if (!RESULT_RE.test(`${b.title}\n${b.result}`)) return false;
  if (REVIEW_ONLY_RE.test(b.result) && !WRITE_RE.test(b.result)) return false;
  return true;
}

const ESTIMATE_RE = /견적|가견적|인력\s?투입|투입\s?계획|M\/?M\s?산정|estimate|quotation|\bquote\b|staffing\s?plan/i;

/** 견적만 내는 브리핑인지(제안서 브리핑은 제안 프로세스 안에 견적 단계가 있으므로 아니다). */
export function isEstimateBriefing(b) {
  if (b.process === 'free' || b.process === 'proposal') return false;
  if (b.process === 'estimate') return true;
  if (isProposalBriefing(b)) return false;
  return ESTIMATE_RE.test(`${b.title}\n${b.result}`);
}

const PRESENT_RE = /발표|\bPT\b|프레젠테이션|presentation|pitch/i;

/** 저장된 작업(process·step)의 단계 정의 — 서버 검사(proposalCheck.mjs)가 checks·sections 를 찾는다. 없으면 null. */
export function stepDef(process, key) {
  const steps = process === 'proposal' ? PROPOSAL_STEPS : process === 'estimate' ? ESTIMATE_STEPS : null;
  return (steps && steps.find((s) => s.key === key)) || null;
}

const briefText = (b) => `${b.title}\n${b.result}\n${b.context || ''}\n${(b.constraints || []).join('\n')}`;

/** 단계 정의 → 작업 목록(depends_on 은 순번). 고객사 전용 스킬은 client:true 단계에만 붙인다. */
function buildTasks(steps, { process, client = [], lang }) {
  const index = new Map(steps.map((s, i) => [s.key, i]));
  const en = lang === 'en';
  return steps.map((s) => {
    const deps = s.deps.map((k) => index.get(k)).filter((i) => i !== undefined);
    const approval = s.approval || '';
    return {
      title: en ? s.en : s.ko,
      owner: s.owner,
      stage: s.stage,
      input: deps.length ? (en ? 'Earlier step outputs · briefing · attachments' : '앞 단계 산출물 · 브리핑 · 첨부') : (en ? 'Briefing · attachments (RFP)' : '브리핑 · 첨부(RFP)'),
      done_when: en ? s.doneEn : s.done,
      depends_on: deps,
      needs_approval: Boolean(approval),
      approval_reason: approval,
      // 고객사 전용 스킬은 제안 문서를 쓰는 단계(RFP·전략·장표·본문)에만 — 조사·UX 섹션·KPI·견적·검수에는 섞지 않는다
      skills: s.client ? [...s.skills, ...client] : [...s.skills],
      ...(s.export ? { export: [...s.export] } : {}),
      // 무거운 단계(큰 RFP 를 읽거나 긴 본문을 쓰는 단계)는 역할 실행 시간 제한(설정 task_timeout_min)에 이 배수를 곱한다
      ...(s.timeout ? { timeout_factor: s.timeout } : {}),
      process,
      step: s.key,
    };
  });
}

/**
 * 브리핑 → 표준 제안 작업 목록. 제안 브리핑이 아니면 null.
 *   UX·디자인 섹션은 화면·서비스 과제일 때, KPI 는 성과·지표 언급이 있을 때만 넣는다.
 *   RFP 분석은 항상 'Go/No-Go', 견적은 항상 '수치확정' 승인(재하가 결정하기 전에는 그 뒤 단계가 시작되지 않는다).
 */
export async function proposalPlan(b, { lang = 'ko' } = {}) {
  if (!isProposalBriefing(b)) return null;
  const text = briefText(b);
  const want = {
    design: /UX|UI|디자인|화면|앱|웹|모바일|사이트|플랫폼|키오스크|design|app|web|mobile|site|platform/i.test(text),
    kpi: /KPI|지표|성과|효과|전환|데이터|metric|conversion|data/i.test(text),
    // 발표본은 재하가 결과·제약에서 발표를 말했을 때만 — 맥락(RFP 요약)에는 '발표 평가'가 흔해 매번 붙게 된다
    present: PRESENT_RE.test([b.title, b.result, ...(b.constraints || [])].join(' ')),
  };
  const client = await findClientProposalSkills(text);
  const steps = PROPOSAL_STEPS.filter((s) => !s.when || want[s.when]);
  const tasks = buildTasks(steps, { process: 'proposal', client, lang });
  const en = lang === 'en';
  const skipped = PROPOSAL_STEPS.filter((s) => s.when && !want[s.when]).map((s) => (en ? s.en : s.ko));
  const summary = en
    ? `Standard proposal process, ${tasks.length} steps${skipped.length ? ` (skipped: ${skipped.join(', ')})` : ''}`
    : `표준 제안 프로세스 ${tasks.length}단계${skipped.length ? `(제외: ${skipped.join(', ')})` : ''}`;
  return { tasks, client, summary };
}

/** 브리핑 → 견적 프로세스 작업 목록(범위 → 견적 → 검수·승인). 견적 브리핑이 아니면 null. */
export async function estimatePlan(b, { lang = 'ko' } = {}) {
  if (!isEstimateBriefing(b)) return null;
  const tasks = buildTasks(ESTIMATE_STEPS, { process: 'estimate', lang });
  const summary = lang === 'en' ? `Estimate process, ${tasks.length} steps` : `견적 프로세스 ${tasks.length}단계`;
  return { tasks, client: [], summary };
}
