// 명단 — Wylie AX Office 의 팀장과 역할 에이전트.
// 기본 12인은 코드에 있고(이름·id 는 가상 사무실 officeSimulator.ts·gates.mjs 와 같다), '인원 추가'로 늘린 사람은
// hive/agents.json 에 저장한다(설치 폴더는 쓰기 불가). ROSTER·AGENT_IDS·ALL_MAIL_IDS 는 같은 배열을 제자리에서
// 고쳐 쓰므로, 이 값을 import 한 모듈도 추가·삭제를 그대로 본다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AGENT_NAME, AGENT_PERSONA } from './gates.mjs';
import { HIVE_DIR } from './paths.mjs';
import { templateById } from './agentTemplates.mjs';

export const LEADER = { id: 'lead', name: '팀장', name_en: 'Team Lead', persona: 'leader' };
export const OWNER = { id: 'jaeha', name: '재하', name_en: 'Jaeha' }; // 브리핑을 보내고 승인하는 사람. inbox/jaeha 에 보고가 쌓인다.

export const STAGES = ['00_sales', '01_rfp', '02_requirements', '03_proposal', '04_rebaseline', '05_plan', '06_design', '07_publish', '08_test_scenario', '09_test_run', '10_growth'];

const NAME_EN = {
  han: 'Han Dojeon', kim: 'Kim Youngeop', jeong: 'Jeong Useon', na: 'Na Gihoek', oh: 'Oh Saekgam', cha: 'Cha Doan',
  pyo: 'Pyo Junsu', lee: 'Lee Pungdeng', baek: 'Baek Yeondong', gu: 'Gu Dongmin', go: 'Go Jipyo', hong: 'Hong Bora',
};

// 'a|b' = a 가 있으면 a, 없으면 b (사내 스킬이 없는 PC 에서는 공용 스킬로 대체 — skills.mjs 규칙)
const BUILTIN = [
  { id: 'kim', dept: '영업', dept_en: 'Sales', role: '고객·시장·경쟁 조사, 페인포인트 정리', role_en: 'Customer, market and competitor research', skills: ['competitor-benchmark', 'strategy-proposal-analyzer'], stages: ['00_sales', '01_rfp'] },
  { id: 'han', dept: '영업', dept_en: 'Sales', role: 'RFP 분석·수주 판단(Go/No-Go 5축)·제안 전략·제안서 작성·제안 품질 검수', role_en: 'RFP analysis, go/no-go, proposal strategy and writing', skills: ['rfp-analysis', 'wylie-proposal|proposal-writing', 'wylie-proposal-visual', 'wylie-proposal-review|proposal-review', 'proposal-maker'], stages: ['01_rfp', '03_proposal'] },
  { id: 'jeong', dept: '기획', dept_en: 'Planning', role: '제품 전략·PRD·MVP 범위·기능 우선순위·요구사항 정의', role_en: 'Product strategy, PRD, MVP scope and priorities', skills: ['product-strategy', 'ba-agent'], stages: ['02_requirements', '04_rebaseline'] },
  { id: 'na', dept: '기획', dept_en: 'Planning', role: 'IA·사용자 플로우·화면설계서·정책·예외 케이스', role_en: 'IA, user flows, screen specs and policies', skills: ['ia-flow-design', 'service-planning'], stages: ['05_plan'] },
  { id: 'oh', dept: '디자인', dept_en: 'Design', role: '브랜드 콘셉트·키비주얼·컬러·톤앤매너', role_en: 'Brand concept, key visual, color and tone', skills: ['brand-guideline'], stages: ['06_design'] },
  { id: 'cha', dept: '디자인', dept_en: 'Design', role: '제품 UI 시안·디자인 시스템·컴포넌트', role_en: 'Product UI, design system and components', skills: ['design-system-build', 'ui-review', 'proposal-skills'], stages: ['06_design', '03_proposal'] },
  { id: 'pyo', dept: '퍼블리싱', dept_en: 'Publishing', role: '시맨틱 마크업·반응형·기본 접근성', role_en: 'Semantic markup, responsive layout, basic a11y', skills: [], stages: ['07_publish'] },
  { id: 'lee', dept: '퍼블리싱', dept_en: 'Publishing', role: '모션·인터랙션·접근성 심화', role_en: 'Motion, interaction and advanced a11y', skills: ['accessibility-audit'], stages: ['07_publish'] },
  { id: 'baek', dept: '개발', dept_en: 'Engineering', role: 'API·DB·인증·보안 설계', role_en: 'API, DB, auth and security design', skills: ['db-modeling', 'api-design'], stages: ['07_publish'] },
  { id: 'gu', dept: '개발', dept_en: 'Engineering', role: '프론트엔드 구현·상태·연동', role_en: 'Frontend build, state and integration', skills: ['frontend-implementation'], stages: ['07_publish'] },
  { id: 'go', dept: '데이터', dept_en: 'Data', role: 'KPI·이벤트 로그·QA 검증·테스트 시나리오. 모든 산출물의 게이트 판정(QA) 담당', role_en: 'KPIs, event logs, QA and test scenarios; gate review of every deliverable', skills: ['kpi-event-tracking', 'quality-gate'], stages: ['08_test_scenario', '09_test_run'] },
  { id: 'hong', dept: '마케팅', dept_en: 'Marketing', role: '세그먼트·포지셔닝·캠페인·카피', role_en: 'Segments, positioning, campaigns and copy', skills: ['landing-copywriting'], stages: ['10_growth'] },
].map((a) => ({ ...a, name: AGENT_NAME[a.id], name_en: NAME_EN[a.id], persona: AGENT_PERSONA[a.id], builtin: true }));

export const ROSTER = [...BUILTIN];
export const QA_AGENT = 'go';
export const AGENT_IDS = ROSTER.map((a) => a.id);
export const ALL_MAIL_IDS = [LEADER.id, OWNER.id, ...AGENT_IDS];

export const MAX_CUSTOM = 6; // 사무실 '확장 구역' 책상 수와 같다

const FILE = path.join(HIVE_DIR, 'agents.json');
let tail = Promise.resolve();

function syncArrays(custom) {
  ROSTER.splice(0, ROSTER.length, ...BUILTIN, ...custom);
  AGENT_IDS.splice(0, AGENT_IDS.length, ...ROSTER.map((a) => a.id));
  ALL_MAIL_IDS.splice(0, ALL_MAIL_IDS.length, LEADER.id, OWNER.id, ...AGENT_IDS);
}

async function readFile() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { seq: {}, agents: [] }; }
}

async function writeFile(data) {
  await fs.mkdir(HIVE_DIR, { recursive: true });
  await fs.writeFile(FILE + '.tmp', JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(FILE + '.tmp', FILE);
}

/** 서버 시작 시 1회 — 추가 인원을 명단에 붙인다. */
export async function loadCustomAgents() {
  const data = await readFile();
  syncArrays((data.agents || []).map((a) => ({ ...a, builtin: false })));
  return ROSTER;
}

/** 템플릿으로 인원 추가. 이름을 비우면 템플릿 기본 이름. */
export function addCustomAgent({ template, name, name_en }) {
  const run = tail.then(async () => {
    const t = templateById(template);
    if (!t) throw new Error(`없는 역할 템플릿: ${template}`);
    const data = await readFile();
    if ((data.agents || []).length >= MAX_CUSTOM) throw new Error(`추가 인원은 ${MAX_CUSTOM}명까지입니다(사무실 확장 구역 책상 수).`);
    data.seq = data.seq || {};
    data.seq[t.id] = (data.seq[t.id] || 0) + 1;
    let id = `${t.id}${data.seq[t.id]}`;
    while (ROSTER.some((a) => a.id === id) || id === LEADER.id || id === OWNER.id) { data.seq[t.id] += 1; id = `${t.id}${data.seq[t.id]}`; }
    const ko = String(name || '').trim().slice(0, 12) || t.name.ko;
    const agent = {
      id, template: t.id,
      name: ko, name_en: String(name_en || '').trim().slice(0, 24) || (ko === t.name.ko ? t.name.en : ko),
      dept: t.dept.ko, dept_en: t.dept.en, role: t.role.ko, role_en: t.role.en, goal: t.goal.ko, goal_en: t.goal.en,
      skills: [...t.skills], stages: [...t.stages], look: { ...t.look },
      persona_text: t.persona.replace(/^# \S+/, `# ${ko}`),
      created: new Date().toISOString(),
    };
    data.agents = [...(data.agents || []), agent];
    await writeFile(data);
    syncArrays(data.agents.map((a) => ({ ...a, builtin: false })));
    return agent;
  });
  tail = run.catch(() => {});
  return run;
}

/** 추가 인원 삭제(기본 12인은 지우지 않는다). 진행 중 작업 확인은 호출하는 쪽에서 한다. */
export function removeCustomAgent(id) {
  const run = tail.then(async () => {
    const data = await readFile();
    const before = (data.agents || []).length;
    data.agents = (data.agents || []).filter((a) => a.id !== id);
    if (data.agents.length === before) throw new Error(`추가 인원이 아니거나 없는 id: ${id}`);
    await writeFile(data);
    syncArrays(data.agents.map((a) => ({ ...a, builtin: false })));
    return true;
  });
  tail = run.catch(() => {});
  return run;
}

export function agentById(id) {
  if (id === LEADER.id) return LEADER;
  if (id === OWNER.id) return OWNER;
  return ROSTER.find((a) => a.id === id) || null;
}

export function nameOf(id) {
  return agentById(id)?.name || id;
}

/** 팀장 프롬프트에 넣는 명단 표(마크다운). 추가 인원도 같은 표에 들어간다. */
export function rosterTable() {
  const rows = ROSTER.map((a) => `| ${a.id} | ${a.name} | ${a.dept} | ${a.role} | ${a.stages.join(', ')} |`);
  return ['| id | 이름 | 부서 | 담당 | 산출물 폴더 |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}
