// 제안서 작성 프로세스 — 결과 줄이 '제안서'인 브리핑은 팀장의 자유 분해 대신 이 표준 절차로 나눈다.
//
//   조사 → RFP 분석·Go/No-Go(재하 승인) → 전략·스토리·목차 → [UX·디자인 섹션] [성과 지표]
//   → 장표 구성안·근거표(구조) → 본문 → 검수(정합)
//
// 단계마다 담당·산출 폴더·스킬·완료 기준·승인을 여기서 정한다. 스킬은 'a|b' 규칙(skills.mjs) —
// 사내 제안 스킬(wylie-proposal·-visual·-review 등)이 이 PC 에 있으면 그것을, 없으면 저장소의 공용 스킬을 쓴다.
// 고객사 전용 제안 스킬(사용자 스킬 폴더의 '<고객>-…-proposal')은 브리핑에 그 고객사가 나오면 한도전 단계에 붙는다.
// 사내·고객사 스킬은 공개 저장소에 두지 않는다(.gitignore) — 이 PC 에 있을 때 이름으로만 찾는다.
//
// 브리핑 process: 'proposal' 이면 항상, 'free' 면 쓰지 않는다. 값이 없으면 결과 줄로 판단한다.

import { findClientProposalSkills } from './skills.mjs';

const WRITE = 'wylie-proposal|proposal-writing';

export const PROPOSAL_STEPS = [
  {
    key: 'research', owner: 'kim', stage: '00_sales',
    ko: '제안 조사 — 고객·경쟁·페인포인트', en: 'Proposal research — client, competitors, pain points',
    skills: ['competitor-benchmark', 'strategy-proposal-analyzer'],
    done: '고객 니즈 표, 경쟁·대체 서비스 비교표(O/X/△), 페인포인트 카드(유형·빈도·심각도), 현재 고객 여정, 발주처 확인 질문 목록. 행마다 근거(출처·추정·가정)를 표시',
    doneEn: 'Client needs table, competitor/substitute comparison (O/X/△), pain-point cards (type, frequency, severity), current customer journey, questions for the client. Mark the basis of every row (source, estimate, assumption)',
    deps: [],
  },
  {
    key: 'rfp', owner: 'han', stage: '01_rfp',
    ko: 'RFP 분석 — 요구·평가 대응표와 Go/No-Go', en: 'RFP analysis — requirement-scoring matrix and Go/No-Go',
    skills: ['rfp-analysis', WRITE],
    done: 'RFP 요구사항을 빠짐없이 옮긴 요구·평가 대응표(요구 id · 원문 위치 · 평가 항목 · 대응할 장 · 근거 · 충족 상태 · 공백)와 Go/No-Go 5축(적합성·승산·수익성·리스크·전략가치) 권고',
    doneEn: 'A requirement-scoring matrix that carries every RFP requirement (req id, source location, scoring item, answering chapter, evidence, coverage, gap) and a 5-axis Go/No-Go recommendation (fit, win odds, margin, risk, strategic value)',
    deps: ['research'], approval: 'Go/No-Go',
  },
  {
    key: 'strategy', owner: 'han', stage: '03_proposal',
    ko: '제안 전략 — 승부 메시지·스토리·목차', en: 'Proposal strategy — win theme, story and outline',
    skills: [WRITE, 'proposal-maker'],
    done: '승부 메시지 1개와 전략 2~4개, 스토리 흐름(고객 문제 → 성공 조건 → 왜 우리인가 → 무엇을 어떻게 → 완수·검증 → 결정 요청), 평가 배점 순서에 맞춘 목차와 장별 핵심 메시지',
    doneEn: 'One win theme with 2-4 strategies, a story flow (client problem → success conditions → why us → what and how → delivery and proof → decision ask), an outline in scoring order with each chapter\'s key message',
    deps: ['rfp'],
  },
  {
    key: 'design', owner: 'cha', stage: '03_proposal', when: 'design',
    ko: 'UX·디자인 제안 섹션', en: 'UX and design section',
    skills: ['proposal-skills', 'wylie-proposal-visual|ui-review'],
    done: '디자인 목표 3줄, 원칙 5개, 비주얼 방향 2~3안, 핵심 화면 3~5개 명세(목적·KPI·구성·상태), 검증 계획',
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
  {
    key: 'slides', owner: 'han', stage: '03_proposal',
    ko: '장표 구성안·근거표(구조 단계)', en: 'Slide plan and evidence table (structure pass)',
    skills: [WRITE, 'wylie-proposal-visual'],
    done: '장표마다 평가자 질문·결론형 제목·근거 id·도식 유형·담당 요구 id 를 적은 구성안과 근거표. 제목만 이어 읽어도 주장이 이어져야 함',
    doneEn: 'A slide plan listing, per slide, the evaluator question, a conclusion-style title, evidence ids, diagram type and requirement ids, plus the evidence table. Reading only the titles must carry the argument',
    deps: ['strategy', 'design', 'kpi'],
  },
  {
    key: 'draft', owner: 'han', stage: '03_proposal',
    ko: '제안서 본문(본문 단계)', en: 'Proposal body (content pass)',
    skills: [WRITE, 'proposal-maker'],
    done: '구성안 순서대로 쓴 제안서 본문. 견적·투입 M/M 은 범위로만, 근거 없는 효과 수치와 상투어 금지, 확인 못 한 값은 "미확인"',
    doneEn: 'The proposal body in slide-plan order. Price and man-months as ranges only; no unsupported effect numbers or clichés; unverified values marked "unverified"',
    deps: ['slides'], approvalIf: 'numbers',
  },
  {
    key: 'review', owner: 'go', stage: '03_proposal',
    ko: '제안서 검수(정합 단계)', en: 'Proposal review (consistency pass)',
    skills: ['wylie-proposal-review|proposal-review'],
    done: '필수 점검 항목별 결과(pass·fail·not_run)와 근거 위치, 평가 항목별 등급과 근거, 먼저 고칠 것 1~3개, 최종 판정(제출 준비 / 수정 필요)',
    doneEn: 'Each required check with its result (pass, fail, not_run) and location, a grade with evidence per scoring item, the 1-3 fixes to make first, and a verdict (ready to submit / needs work)',
    deps: ['draft'],
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

/**
 * 브리핑 → 표준 제안 작업 목록(depends_on 은 순번). 제안 브리핑이 아니면 null.
 *   UX·디자인 섹션은 화면·서비스 과제일 때, KPI 는 성과·지표 언급이 있을 때만 넣는다.
 *   본문은 견적·인력 수치가 걸리면 '수치확정' 승인, RFP 분석은 항상 'Go/No-Go' 승인(재하가 결정하기 전에는 다음 단계가 시작되지 않는다).
 */
export async function proposalPlan(b, { lang = 'ko' } = {}) {
  if (!isProposalBriefing(b)) return null;
  const text = `${b.title}\n${b.result}\n${b.context}\n${(b.constraints || []).join('\n')}`;
  const want = {
    design: /UX|UI|디자인|화면|앱|웹|모바일|사이트|플랫폼|키오스크|design|app|web|mobile|site|platform/i.test(text),
    kpi: /KPI|지표|성과|효과|전환|데이터|metric|conversion|data/i.test(text),
    numbers: /견적|금액|예산|M\/?M|맨먼스|공수|투입\s?인력|단가|price|budget|man-?month|staffing/i.test(text),
  };
  const client = await findClientProposalSkills(text);
  const steps = PROPOSAL_STEPS.filter((s) => !s.when || want[s.when]);
  const index = new Map(steps.map((s, i) => [s.key, i]));
  const en = lang === 'en';
  const tasks = steps.map((s) => {
    const deps = s.deps.map((k) => index.get(k)).filter((i) => i !== undefined);
    const approval = s.approval || (s.approvalIf && want[s.approvalIf] ? '수치확정' : '');
    return {
      title: en ? s.en : s.ko,
      owner: s.owner,
      stage: s.stage,
      input: deps.length ? (en ? 'Earlier step outputs · briefing · attachments' : '앞 단계 산출물 · 브리핑 · 첨부') : (en ? 'Briefing · attachments (RFP)' : '브리핑 · 첨부(RFP)'),
      done_when: en ? s.doneEn : s.done,
      depends_on: deps,
      needs_approval: Boolean(approval),
      approval_reason: approval,
      // 고객사 전용 스킬은 한도전(RFP·전략·장표·본문) 단계에만 — 조사·디자인·KPI·검수에는 섞지 않는다
      skills: s.owner === 'han' ? [...s.skills, ...client] : [...s.skills],
      process: 'proposal',
      step: s.key,
    };
  });
  const skipped = PROPOSAL_STEPS.filter((s) => s.when && !want[s.when]).map((s) => (en ? s.en : s.ko));
  const summary = en
    ? `Standard proposal process, ${tasks.length} steps${skipped.length ? ` (skipped: ${skipped.join(', ')})` : ''}`
    : `표준 제안 프로세스 ${tasks.length}단계${skipped.length ? `(제외: ${skipped.join(', ')})` : ''}`;
  return { tasks, client, summary };
}
