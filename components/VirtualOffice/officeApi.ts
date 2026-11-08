// 커맨드 센터·에이전트 카드가 읽는 서버 API(server/office-server.mjs) 타입과 폴링 훅.
// apiBase: ''(같은 오리진) | 'https://…'(터널 주소) | undefined(미연결 — 훅은 아무것도 부르지 않는다)

import { useCallback, useEffect, useRef, useState } from 'react';

export type AgentStatus = '대기' | '진행' | '검수' | '승인대기';

export interface RosterSkill { spec: string; name: string | null; available: boolean; }
export interface RosterMember {
  id: string; name: string; dept: string; role: string; stages: string[];
  skills: RosterSkill[]; status: AgentStatus; task: string; usd: number;
}
export interface RosterResponse { members: RosterMember[]; running: boolean; mode: string; concurrency: number; }

/** events.log 한 줄. 종류(kind)마다 채워지는 필드가 다르다. */
export interface HiveEvent {
  ts: string; kind: string; id?: string; title?: string; owner?: string; status?: string; gate?: string;
  from?: string; to?: string; type?: string; task?: string; agent?: string; cost_usd?: number;
  by?: string; approval_kind?: string; note?: string; what?: string;
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
