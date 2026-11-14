// 커맨드 센터·에이전트 카드가 읽는 서버 API(server/office-server.mjs) 타입과 폴링 훅.
// apiBase: ''(같은 오리진) | 'https://…'(터널 주소) | undefined(미연결 — 훅은 아무것도 부르지 않는다)

import { useCallback, useEffect, useRef, useState } from 'react';

export type AgentStatus = '대기' | '진행' | '검수' | '승인대기';

export interface RosterSkill { spec: string; name: string | null; available: boolean; }
export type BreakerLevel = 'normal' | 'steer' | 'constrain' | 'stop';
/** 서킷 브레이커 — 연속 문제·하루 사용 토큰 한도로 정한 단계(server/breaker.mjs) */
export interface BreakerInfo { level: BreakerLevel; reason: string; reason_code?: string; reason_detail?: string; ratio: number; used_today: number; budget: number; failures: number; }
export interface AgentLookLite { hair: string; skin: string; shirt: string; style: string; glasses?: boolean; }
export interface RosterMember {
  id: string; name: string; name_en?: string; dept: string; dept_en?: string; role: string; role_en?: string; stages: string[];
  skills: RosterSkill[]; status: AgentStatus; task: string; tokens: number; // 사용 토큰(누적)
  custom?: boolean; template?: string; look?: AgentLookLite | null; breaker?: BreakerInfo | null;
}
export interface RosterResponse { members: RosterMember[]; running: boolean; mode: string; concurrency: number; max_custom?: number; }

/** 대기열 — 팀장에게 보낸 메시지와 브리핑(server/leaderSession.mjs) */
export interface QueueItem {
  id: string; kind: 'message' | 'briefing'; title: string; text: string; by: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'; created: string; started: string | null; finished: string | null; reply: string; error: string; briefing_id?: string; tokens?: { in: number; cw: number; cr: number; out: number } | null;
}
export interface QueueResponse { items: QueueItem[]; leader_terminal: boolean; running: boolean; }

/** 질문(ask me) — 에이전트가 재하에게 묻는 것 */
export interface Question {
  id: string; from: string; task: string; text: string; status: 'open' | 'answered';
  asked_at: string; answer: string | null; answered_by: string | null; answered_at: string | null;
}

export interface UsageTask { id: string; owner: string; title: string; status: string; gate: string; tokens: number; qa_tokens: number; parts: { in: number; cw: number; cr: number; out: number } | null; cap_tokens: number; at: string; }
export interface UsageResponse {
  total: number; byAgent: Record<string, number>; byDay: Record<string, number>; byAgentDay: Record<string, Record<string, number>>;
  tasks: UsageTask[]; max_task_tokens: number; agent_daily_tokens: number;
  /** 네 갈래 합계(전체·오늘), API 환산 참고 금액(청구 아님), 토큰 기록 전이라 합계에서 빠진 기록 수 */
  parts: { in: number; cw: number; cr: number; out: number }; parts_today: { in: number; cw: number; cr: number; out: number }; usd_ref: number; untracked: number;
}

export interface AgentTemplate {
  id: string; name: { ko: string; en: string }; dept: { ko: string; en: string }; role: { ko: string; en: string }; goal: { ko: string; en: string };
  stages: string[]; skills: string[]; look: AgentLookLite;
}

/** 실시간 기록 한 줄(server/live.mjs) */
export interface LiveLine {
  ts: string; k: string; text?: string; tool?: string; size?: number; error?: boolean; status?: string;
  tokens?: number; turns?: number; cap?: number; level?: string; gate?: string; agent?: string; task?: string; // tokens·cap = 사용 토큰
}

/** auto_revise — QA FAIL 이면 같은 담당에게 지적을 붙여 1회만 다시 실행하고 다시 판정(server/orchestrator.mjs) */
/** 설정(GET /api/settings) — 저장된 값 + 지금 쓰는 산출물·hive 위치(이 PC 화면이 아니면 사용자 폴더는 ~). running=브리핑 진행 중 */
export interface OfficeSettings {
  lang: 'ko' | 'en'; max_task_tokens: number; agent_daily_tokens: number; auto_revise: boolean; leader_session: boolean; concurrency: number;
  deliverables_dir: string; deliverables_default: string; deliverables_custom: boolean; hive_dir: string; mode: string; desktop: boolean; running: boolean;
  plan_kit_dir: string; plan_kit: { ok: boolean; error: string };
}

/** 기획 탭 — 기획 에이전트 패키지의 프로젝트 팩(GET /api/plan/packs, /api/plan/packs/:id[?verify=1]). 계층 상태 none|draft|confirmed */
export interface PlanPackSummary { id: string; name: string; prefix: string; status: string; version: string; layers: Record<string, string>; screens: number; portals: string[]; }
export interface PlanPacksResponse { kit: { ok: boolean; dir: string; error?: string }; packs: PlanPackSummary[]; }
export interface PlanScreen { id: string; title?: string; type?: string; portal?: string; menu?: string; req?: string[]; status?: string; hidden?: boolean; file: string; exists: boolean; }
export interface PlanCheckItem { code: string; msg: string; }
export interface PlanVerify { ok: boolean; violations: PlanCheckItem[]; warnings: PlanCheckItem[]; }
export interface PlanPackDetail {
  ok: boolean; error?: string; index: string;
  pack: { id: string; name: string; brand: string; prefix: string; status: string; version: string; layers: Record<string, string>; portals: Record<string, unknown>; note: string };
  screens: PlanScreen[];
  verify: Record<string, PlanVerify> | { _error: string } | null;
}

/** 대화 탭 — 에이전트끼리 주고받은 메시지(GET /api/mail). 본문은 앞 600자, 자료 울타리 안은 '(첨부 자료 생략)'. 최신순 */
export interface MailMessage { id: string; from: string; to: string; type: string; task: string; ts: string; body: string; truncated: boolean; }
export interface MailResponse { messages: MailMessage[]; agent: string; limit: number; }

/** 브리핑 템플릿 — 기본 6개(server/templates.mjs, 한·영) + 사용자 저장(hive/templates.json, 최대 30개) */
export interface BriefingTemplate { id: string; title: string; result: string; context: string; constraints: string[]; builtin: boolean; by?: string; created?: string; steps?: string[]; }
export interface TemplatesResponse { templates: BriefingTemplate[]; max: number; lang: string; }
/** 입력창 채우기 — nonce 가 바뀔 때마다 브리핑 양식에 한 번 채운다(보내기는 사람이 누른다) */
export interface BriefingPrefill { nonce: number; title: string; result: string; context: string; constraints: string[]; }

/** 환경 점검(GET /api/env) — 계정 정보 없이 CLI 유무·버전·실행 파일(사용자 폴더는 ~)·로그인 여부만. loggedIn=null 은 확인 불가 */
export interface EnvState { mode: string; cli: { found: boolean; version: string | null; path: string }; loggedIn: boolean | null; checked_at: string; }

/** 예약(트리거) — 시각이 되면 브리핑을 대기열에 넣는다. 요일 0=일 … 6=토. 시각은 PC 현지 시각. */
export interface TriggerSchedule { kind: 'weekly' | 'daily' | 'once'; time: string; days?: number[]; date?: string; }
export interface TriggerBriefing { title: string; result: string; context: string; constraints: string[]; question_policy: string; }
export interface Trigger {
  id: string; title: string; schedule: TriggerSchedule; briefing: TriggerBriefing; enabled: boolean; by: string;
  created: string; updated: string; next_run: string | null; last_run: string | null; last_item: string; runs: number; last_missed: string | null;
}
export interface TriggersResponse { triggers: Trigger[]; now: string; max: number; }
/** /api/hive 의 작업 원장 한 줄(관계도용으로 쓰는 필드만). */
export interface LedgerTask { id: string; title: string; owner: string; status: string; gate: string; briefing: string; depends_on?: string[]; created?: string; }

/** events.log 한 줄. 종류(kind)마다 채워지는 필드가 다르다. */
export interface HiveEvent {
  ts: string; kind: string; id?: string; title?: string; owner?: string; status?: string; gate?: string;
  from?: string; to?: string; type?: string; task?: string; agent?: string; tokens_w?: number;
  by?: string; approval_kind?: string; note?: string; what?: string;
  level?: string; reason?: string; reason_code?: string; reason_detail?: string; item_kind?: string; action?: string; count?: number; template?: string; item?: string; why?: string; at?: string;
}

export interface AuthState { loggedIn: boolean | null; cli: boolean; checked_at?: string; mode?: string; }

/** url 을 ms 마다 GET 해 JSON 을 돌려준다. url 이 없으면 멈춘다. refresh() 로 즉시 다시 읽는다. */
export function usePolling<T>(url: string | undefined, ms: number): { data: T | null; error: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) { setData(null); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as T;
        if (alive) { setData(json); setError(false); }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const iv = setInterval(load, ms);
    return () => { alive = false; clearInterval(iv); };
  }, [url, ms, tick]);

  return { data, error, refresh };
}

/** /api/events 를 since 기준으로 이어 받아 최근 max 건을 유지한다. */
export function useEventStream(apiBase: string | undefined, ms = 3000, max = 400): HiveEvent[] {
  const [events, setEvents] = useState<HiveEvent[]>([]);
  const sinceRef = useRef('');

  useEffect(() => {
    if (apiBase === undefined) { setEvents([]); return; }
    let alive = true;
    sinceRef.current = '';
    const load = async () => {
      try {
        const q = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : '';
        const res = await fetch(`${apiBase}/api/events${q}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { events: HiveEvent[]; last: string };
        if (!alive || !json.events?.length) return;
        sinceRef.current = json.last || sinceRef.current;
        setEvents((prev) => [...prev, ...json.events].slice(-max));
      } catch {
        // 일시 오류는 다음 주기에 다시 읽는다
      }
    };
    load();
    const iv = setInterval(load, ms);
    return () => { alive = false; clearInterval(iv); };
  }, [apiBase, ms, max]);

  return events;
}

/** POST JSON. 성공이면 { ok:true, data }, 실패면 { ok:false, error }. */
export async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: String(data.error || res.status) };
    return { ok: true, data };
  } catch {
    return { ok: false, error: '서버에 연결하지 못했습니다.' };
  }
}

/** DELETE. 성공이면 { ok:true }, 실패면 { ok:false, error }. */
export async function deleteJson(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: 'DELETE' });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return res.ok ? { ok: true } : { ok: false, error: String(data.error || res.status) };
  } catch {
    return { ok: false, error: '서버에 연결하지 못했습니다.' };
  }
}
