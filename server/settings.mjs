// 앱 설정 — hive/settings.json. 화면 언어(한·영), 작업당 비용 상한, 에이전트별 하루 예산, QA 반려 시 자동 보완, 동시 작업 수,
// 산출물 폴더(storage.mjs 가 검사한 뒤에만 바꾼다), 팀장 상주 세션 id.
// 환경 변수(OFFICE_MAX_USD 등)는 기본값이고, 화면(모니터 탭·언어 전환)에서 바꾼 값이 이 파일에 남아 우선한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';

const FILE = path.join(HIVE_DIR, 'settings.json');

export const DEFAULTS = {
  lang: 'ko', // 'ko' | 'en' — 화면 언어. 'en' 이면 팀장·역할 에이전트에게 영어로 쓰라고 덧붙인다
  max_task_usd: Number(process.env.OFFICE_MAX_USD || 2), // 작업 1건 비용 상한(달러 환산 추정). 넘으면 멈추고 승인 카드
  agent_daily_usd: Number(process.env.OFFICE_AGENT_DAILY_USD || 5), // 에이전트 1명의 하루 예산. 80% 제한, 100% 중지
  auto_revise: true, // QA FAIL 이면 같은 담당에게 지적을 붙여 1회만 다시 실행하고 다시 판정(orchestrator.mjs)
  concurrency: Math.max(1, Math.min(3, Math.floor(Number(process.env.OFFICE_CONCURRENCY || 2)) || 2)), // 브리핑 안에서 동시에 도는 작업 수(1~3). 새 브리핑부터 적용
  deliverables_dir: '', // 산출물 폴더(절대경로). 빈 값이면 기본 위치(OFFICE_DELIVERABLES_DIR)
  leader_session_id: '', // 팀장 상주 세션(claude --resume) id
};

let cache = null;
let tail = Promise.resolve();

export async function getSettings() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(await fs.readFile(FILE, 'utf8')) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

const clampNum = (v, lo, hi, fb) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};

/** 허용된 키만 바꾼다. 범위를 벗어난 값은 잘라 낸다. */
export function updateSettings(patch) {
  const run = tail.then(async () => {
    const cur = await getSettings();
    const next = { ...cur };
    if (patch.lang === 'ko' || patch.lang === 'en') next.lang = patch.lang;
    if (patch.max_task_usd !== undefined) next.max_task_usd = clampNum(patch.max_task_usd, 0.05, 100, cur.max_task_usd);
    if (patch.agent_daily_usd !== undefined) next.agent_daily_usd = clampNum(patch.agent_daily_usd, 0.1, 1000, cur.agent_daily_usd);
    if (typeof patch.auto_revise === 'boolean') next.auto_revise = patch.auto_revise;
    if (patch.concurrency !== undefined) next.concurrency = Math.round(clampNum(patch.concurrency, 1, 3, cur.concurrency));
    if (typeof patch.deliverables_dir === 'string') next.deliverables_dir = patch.deliverables_dir;
    if (typeof patch.leader_session_id === 'string') next.leader_session_id = patch.leader_session_id;
    await fs.mkdir(HIVE_DIR, { recursive: true });
    await fs.writeFile(FILE + '.tmp', JSON.stringify(next, null, 2), 'utf8');
    await fs.rename(FILE + '.tmp', FILE);
    cache = next;
    return next;
  });
  tail = run.catch(() => {});
  return run;
}

/** 지금 쓸 동시 작업 수(1~3). */
export async function currentConcurrency() {
  const n = Number((await getSettings()).concurrency);
  return Number.isFinite(n) ? Math.max(1, Math.min(3, Math.round(n))) : DEFAULTS.concurrency;
}

/** 화면에 내보낼 값(세션 id 는 빼고). */
export function publicSettings(s) {
  const { leader_session_id: _id, ...rest } = s;
  return { ...rest, leader_session: Boolean(s.leader_session_id) };
}

/** 서버가 만들어 화면에 보내는 상태 문구(사무실 말풍선·팀장 요약). 작업 제목 같은 내용은 번역하지 않는다. */
const STATE_TEXT = {
  ko: {
    awaiting: (id) => `${id} 승인 대기`, qa: (id) => `${id} QA 중`, decompose: '브리핑 분해', report: '보고서 작성',
    summary: (r, p) => `작업 ${r}건 진행 · 승인 ${p}건`, leaderMsg: '상주 세션 — 메시지 처리 중',
  },
  en: {
    awaiting: (id) => `${id} awaiting approval`, qa: (id) => `${id} in QA`, decompose: 'Breaking down the briefing', report: 'Writing the report',
    summary: (r, p) => `${r} running · ${p} awaiting approval`, leaderMsg: 'Resident session — handling a message',
  },
};
export function stateText(s) {
  return STATE_TEXT[s?.lang === 'en' ? 'en' : 'ko'];
}

/** 영어 모드일 때 프롬프트 끝에 붙이는 한 줄. */
export function languageLine(s) {
  return s.lang === 'en' ? '\n\n# Language\nWrite every reply, file and heading in English.' : '';
}
