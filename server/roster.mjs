// 명단 — Wylie AX Office 의 팀장과 역할 에이전트.
// 이름·id 는 가상 사무실(officeSimulator.ts)·gates.mjs 와 같다. 역할 설명과 기본 스킬은
// 팀장이 작업을 배정할 때 근거로 쓰고, 산출물 폴더(stage)는 SI Lifecycle 의 단계 폴더를 따른다.

import { AGENT_NAME, AGENT_PERSONA } from './gates.mjs';

export const LEADER = { id: 'lead', name: '팀장', persona: 'leader' };
export const OWNER = { id: 'jaeha', name: '재하' }; // 브리핑을 보내고 승인하는 사람. inbox/jaeha 에 보고가 쌓인다.

export const STAGES = ['00_sales', '01_rfp', '02_requirements', '03_proposal', '04_rebaseline', '05_plan', '06_design', '07_publish', '08_test_scenario', '09_test_run', '10_growth'];

// 'a|b' = a 가 있으면 a, 없으면 b (사내 스킬이 없는 PC 에서는 공용 스킬로 대체 — skills.mjs 규칙)
export const ROSTER = [
  { id: 'kim', dept: '영업', role: '고객·시장·경쟁 조사, 페인포인트 정리', skills: ['competitor-benchmark'], stages: ['00_sales', '01_rfp'] },
  { id: 'han', dept: '영업', role: 'RFP 분석·수주 판단(Go/No-Go 5축)·제안 전략·제안서 작성·제안 품질 검수', skills: ['rfp-analysis', 'wylie-proposal|proposal-writing', 'wylie-proposal-visual', 'wylie-proposal-review'], stages: ['01_rfp', '03_proposal'] },
  { id: 'jeong', dept: '기획', role: '제품 전략·PRD·MVP 범위·기능 우선순위·요구사항 정의', skills: ['product-strategy', 'ba-agent'], stages: ['02_requirements', '04_rebaseline'] },
  { id: 'na', dept: '기획', role: 'IA·사용자 플로우·화면설계서·정책·예외 케이스', skills: ['ia-flow-design', 'service-planning'], stages: ['05_plan'] },
  { id: 'oh', dept: '디자인', role: '브랜드 콘셉트·키비주얼·컬러·톤앤매너', skills: ['brand-guideline'], stages: ['06_design'] },
  { id: 'cha', dept: '디자인', role: '제품 UI 시안·디자인 시스템·컴포넌트', skills: ['design-system-build', 'ui-review'], stages: ['06_design'] },
  { id: 'pyo', dept: '퍼블리싱', role: '시맨틱 마크업·반응형·기본 접근성', skills: [], stages: ['07_publish'] },
  { id: 'lee', dept: '퍼블리싱', role: '모션·인터랙션·접근성 심화', skills: ['accessibility-audit'], stages: ['07_publish'] },
  { id: 'baek', dept: '개발', role: 'API·DB·인증·보안 설계', skills: ['db-modeling', 'api-design'], stages: ['07_publish'] },
  { id: 'gu', dept: '개발', role: '프론트엔드 구현·상태·연동', skills: ['frontend-implementation'], stages: ['07_publish'] },
  { id: 'go', dept: '데이터', role: 'KPI·이벤트 로그·QA 검증·테스트 시나리오. 모든 산출물의 게이트 판정(QA) 담당', skills: ['kpi-event-tracking', 'quality-gate'], stages: ['08_test_scenario', '09_test_run'] },
  { id: 'hong', dept: '마케팅', role: '세그먼트·포지셔닝·캠페인·카피', skills: ['landing-copywriting'], stages: ['10_growth'] },
].map((a) => ({ ...a, name: AGENT_NAME[a.id], persona: AGENT_PERSONA[a.id] }));

export const QA_AGENT = 'go';
export const AGENT_IDS = ROSTER.map((a) => a.id);
export const ALL_MAIL_IDS = [LEADER.id, OWNER.id, ...AGENT_IDS];

export function agentById(id) {
  if (id === LEADER.id) return LEADER;
  if (id === OWNER.id) return OWNER;
  return ROSTER.find((a) => a.id === id) || null;
}

export function nameOf(id) {
  return agentById(id)?.name || id;
}

/** 팀장 프롬프트에 넣는 명단 표(마크다운). */
export function rosterTable() {
  const rows = ROSTER.map((a) => `| ${a.id} | ${a.name} | ${a.dept} | ${a.role} | ${a.stages.join(', ')} |`);
  return ['| id | 이름 | 부서 | 담당 | 산출물 폴더 |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}
