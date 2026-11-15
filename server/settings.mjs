// 앱 설정 — hive/settings.json. 화면 언어(한·영), 작업당 사용 토큰 한도, 에이전트별 하루 사용 토큰 한도, QA 반려 시 자동 보완, 동시 작업 수,
// 산출물 폴더(storage.mjs 가 검사한 뒤에만 바꾼다), 결정권자 표시 이름, 팀장 상주 세션 id.
// 환경 변수(OFFICE_MAX_TOKENS 등)는 기본값이고, 화면(설정 창·모니터 탭·언어 전환)에서 바꾼 값이 이 파일에 남아 우선한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HIVE_DIR } from './paths.mjs';

const FILE = path.join(HIVE_DIR, 'settings.json');

export const DEFAULTS = {
  lang: 'ko', // 'ko' | 'en' — 화면 언어. 'en' 이면 팀장·역할 에이전트에게 영어로 쓰라고 덧붙인다
  // 사용 토큰(tokens.mjs: 입력 + 캐시 생성 + 출력 + 캐시 읽기÷10). 구독 사용량이라 금액으로 두지 않는다.
  // 기본값은 처음 실측(2026-11-14 제안·기획 실행) 전 추정치 — 모니터 탭의 작업별 사용 토큰을 보고 조정한다.
  max_task_tokens: Number(process.env.OFFICE_MAX_TOKENS || 400000), // 작업 1건 실행의 사용 토큰 한도. 넘으면 멈추고 '사용량' 승인 카드
  agent_daily_tokens: Number(process.env.OFFICE_AGENT_DAILY_TOKENS || 1200000), // 에이전트 1명의 하루 사용 토큰 한도. 80% 제한, 100% 중지
  auto_revise: true, // QA FAIL 이면 같은 담당에게 지적을 붙여 1회만 다시 실행하고 다시 판정(orchestrator.mjs)
  concurrency: Math.max(1, Math.min(3, Math.floor(Number(process.env.OFFICE_CONCURRENCY || 2)) || 2)), // 브리핑 안에서 동시에 도는 작업 수(1~3). 새 브리핑부터 적용
  // 역할 실행 1건의 시간 제한(분). 넘으면 끊고, 쓴 파일이 있으면 1회 이어 하기(orchestrator.mjs). 무거운 단계는 작업의 timeout_factor 를 곱한다
  // (예: 제안 RFP 분석·본문 1.5배). 10분으로 두었을 때 큰 RFP PDF 를 읽은 RFP 분석이 쓰는 도중에 끊긴 일이 있었다(2026-11-15).
  task_timeout_min: Math.max(5, Math.min(90, Math.floor(Number(process.env.OFFICE_TASK_TIMEOUT_MIN || 20)) || 20)),
  deliverables_dir: '', // 산출물 폴더(절대경로). 빈 값이면 기본 위치(OFFICE_DELIVERABLES_DIR)
  plan_kit_dir: '', // 기획 에이전트 패키지 폴더(절대경로) — 표준 기획 프로세스·기획 탭이 쓴다(planning.mjs). 빈 값이면 꺼짐
  // 결정권자(브리핑을 보내고 승인·반려하는 사람)의 표시 이름. 빈 값이면 기본 이름(OWNER_DEFAULT) — ownerName() 으로만 읽는다.
  // 내부 id('jaeha', inbox/jaeha, 이벤트 by)는 바꾸지 않는다. 사람마다 자기 PC 에서 자기 이름을 넣는다.
  owner_name: '',
  owner_name_en: '',
  leader_session_id: '', // 팀장 상주 세션(claude --resume) id
};

export const OWNER_DEFAULT = { ko: '재하', en: 'Jaeha' };
const OWNER_MAX = 20;

/** 이름 칸 정리 — 줄바꿈·제어 문자·꺾쇠·백틱(지시문·마크다운·자료 울타리를 깨뜨릴 수 있는 것)을 빼고 20자까지. */
export function cleanOwnerName(v) {
  // eslint-disable-next-line no-control-regex -- 제어 문자를 지우는 것이 목적
  return String(v ?? '').replace(/[\u0000-\u001f\u007f<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, OWNER_MAX);
}

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
    if (patch.max_task_tokens !== undefined) next.max_task_tokens = Math.round(clampNum(patch.max_task_tokens, 20000, 20000000, cur.max_task_tokens));
    if (patch.agent_daily_tokens !== undefined) next.agent_daily_tokens = Math.round(clampNum(patch.agent_daily_tokens, 50000, 200000000, cur.agent_daily_tokens));
    // 예전 금액 기준 값은 더 쓰지 않는다 — 파일에서도 지운다
    delete next.max_task_usd;
    delete next.agent_daily_usd;
    if (typeof patch.auto_revise === 'boolean') next.auto_revise = patch.auto_revise;
    if (patch.concurrency !== undefined) next.concurrency = Math.round(clampNum(patch.concurrency, 1, 3, cur.concurrency));
    if (patch.task_timeout_min !== undefined) next.task_timeout_min = Math.round(clampNum(patch.task_timeout_min, 5, 90, cur.task_timeout_min));
    if (typeof patch.deliverables_dir === 'string') next.deliverables_dir = patch.deliverables_dir;
    if (typeof patch.plan_kit_dir === 'string') next.plan_kit_dir = patch.plan_kit_dir;
    if (typeof patch.owner_name === 'string') next.owner_name = cleanOwnerName(patch.owner_name);
    if (typeof patch.owner_name_en === 'string') next.owner_name_en = cleanOwnerName(patch.owner_name_en);
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

/** 화면에 내보낼 값(세션 id 는 빼고). owner 는 빈 칸을 기본 이름으로 채운 표시 이름(ownerName) — 화면은 이 값을 쓴다. */
export function publicSettings(s) {
  const { leader_session_id: _id, max_task_usd: _u1, agent_daily_usd: _u2, ...rest } = s;
  return { ...rest, leader_session: Boolean(s.leader_session_id), owner: { ko: ownerName(s, 'ko'), en: ownerName(s, 'en') } };
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

/**
 * 결정권자 표시 이름 — 화면·지시문·승인 카드·보고서의 이름은 모두 여기서 받는다.
 * lang 은 그 문구의 언어(서버 문구는 대개 한국어라 기본 'ko'). 한쪽만 적었으면 다른 쪽도 그 이름을 쓰고, 둘 다 비면 기본 이름.
 * s 를 주지 않으면 마지막으로 읽은 설정(getSettings 캐시)을 쓴다 — 동기 함수에서도 부를 수 있게.
 */
export function ownerName(s, lang = 'ko') {
  const src = s || cache || DEFAULTS;
  const ko = cleanOwnerName(src.owner_name);
  const en = cleanOwnerName(src.owner_name_en);
  return lang === 'en' ? en || ko || OWNER_DEFAULT.en : ko || en || OWNER_DEFAULT.ko;
}

/** 한국어 조사 — 이름 끝 글자의 받침으로 고른다(pair 예: '이/가', '을/를', '은/는'). 한글이 아니면 '이(가)' 꼴. */
export function josa(name, pair) {
  const [withB, without] = pair.split('/');
  const code = String(name || '').trim().slice(-1).charCodeAt(0) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return `${name}${withB}(${without})`;
  return `${name}${code % 28 ? withB : without}`;
}

/**
 * 결정권자 줄 — 에이전트 정의(.claude/agents/*.md)·공용 스킬은 사람 이름 대신 '결정권자'로 쓰고,
 * 실행 때 이 줄을 지시문(system) 끝에 붙여 이름을 알려 준다. 공개 저장소에 개인 이름을 두지 않기 위해서다.
 */
export function ownerLine(s) {
  const ko = ownerName(s, 'ko');
  const en = ownerName(s, 'en');
  const lines = ['', '', '# 결정권자', `결정권자: ${ko} — 브리핑을 보내고 승인·반려하며 질문에 답하는 사람. 지침에 나오는 '결정권자'는 ${josa(ko, '을/를')} 가리킨다.`];
  if ((s || cache || DEFAULTS).lang === 'en' && en !== ko) lines.push(`In English output, call them ${en}.`);
  return lines.join('\n');
}
