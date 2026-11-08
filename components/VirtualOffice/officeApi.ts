// 커맨드 센터·에이전트 카드가 읽는 서버 API(server/office-server.mjs) 타입과 폴링 훅.
// apiBase: ''(같은 오리진) | 'https://…'(터널 주소) | undefined(미연결 — 훅은 아무것도 부르지 않는다)

import { useCallback, useEffect, useRef, useState } from 'react';

export type AgentStatus = '대기' | '진행' | '검수' | '승인대기';

export interface RosterSkill { spec: string; name: string | null; available: boolean; }
export type BreakerLevel = 'normal' | 'steer' | 'constrain' | 'stop';
/** 서킷 브레이커 — 연속 문제·하루 예산으로 정한 단계(server/breaker.mjs) */
export interface BreakerInfo { level: BreakerLevel; reason: string; reason_code?: string; reason_detail?: string; ratio: number; used_today: number; budget: number; failures: number; }
export interface AgentLookLite { hair: string; skin: string; shirt: string; style: string; glasses?: boolean; }
export interface RosterMember {
  id: string; name: string; name_en?: string; dept: string; dept_en?: string; role: string; role_en?: string; stages: string[];
  skills: RosterSkill[]; status: AgentStatus; task: string; usd: number;
  custom?: boolean; template?: string; look?: AgentLookLite | null; breaker?: BreakerInfo | null;
}
export interface RosterResponse { members: RosterMember[]; running: boolean; mode: string; concurrency: number; max_custom?: number; }

/** 대기열 — 팀장에게 보낸 메시지와 브리핑(server/leaderSession.mjs) */
export interface QueueItem {
  id: string; kind: 'message' | 'briefing'; title: string; text: string; by: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'; created: string; started: string | null; finished: string | null; reply: string; error: string; briefing_id?: string; cost_usd?: number;
}
export interface QueueResponse { items: QueueItem[]; leader_terminal: boolean; running: boolean; }

/** 질문(ask me) — 에이전트가 재하에게 묻는 것 */
export interface Question {
  id: string; from: string; task: string; text: string; status: 'open' | 'answered';
  asked_at: string; answer: string | null; answered_by: string | null; answered_at: string | null;
}

export interface UsageTask { id: string; owner: string; title: string; status: string; gate: string; cost_usd: number; qa_usd: number; cap_usd: number; at: string; }
export interface UsageResponse {
  total: number; byAgent: Record<string, number>; byDay: Record<string, number>; byAgentDay: Record<string, Record<string, number>>;
  tasks: UsageTask[]; max_task_usd: number; agent_daily_usd: number;
}

export interface AgentTemplate {
  id: string; name: { ko: string; en: string }; dept: { ko: string; en: string }; role: { ko: string; en: string }; goal: { ko: string; en: string };
  stages: string[]; skills: string[]; look: AgentLookLite;
}

/** 실시간 기록 한 줄(server/live.mjs) */
export interface LiveLine {
  ts: string; k: string; text?: string; tool?: string; size?: number; error?: boolean; status?: string;
  cost?: number; turns?: number; cap?: number; level?: string; gate?: string; agent?: string; task?: string;
}

export interface OfficeSettings { lang: 'ko' | 'en'; max_task_usd: number; agent_daily_usd: number; leader_session: boolean; }

/** events.log 한 줄. 종류(kind)마다 채워지는 필드가 다르다. */
export interface HiveEvent {
  ts: string; kind: string; id?: string; title?: string; owner?: string; status?: string; gate?: string;
  from?: string; to?: string; type?: string; task?: string; agent?: string; cost_usd?: number;
  by?: string; approval_kind?: string; note?: string; what?: string;
  level?: string; reason?: string; reason_code?: string; reason_detail?: string; item_kind?: string; action?: string; count?: number; template?: string;
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
