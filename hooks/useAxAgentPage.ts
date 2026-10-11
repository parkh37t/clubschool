import { useSyncExternalStore } from 'react';
import { AX_AGENT_DEFAULT_ROUTE, isAxAgentRoute } from '../constants/axAgentMenu';

// AX 기획 에이전트 화면의 현재 페이지(con-ai 해시 라우트)를 사이드바와 화면이 함께 쓰는 작은 저장소.
// URL 쿼리 ?agent=<route> 에 동기화해 북마크·공유가 된다. 도메인 데이터가 아니므로 useDataStore 에 두지 않는다.

const PARAM = 'agent';
const listeners = new Set<() => void>();

function readFromUrl(): string {
  try {
    const v = new URLSearchParams(window.location.search).get(PARAM);
    if (v && isAxAgentRoute(v)) return v;
  } catch {
    // URL 접근 불가 환경 방어
  }
  return AX_AGENT_DEFAULT_ROUTE;
}

let current = typeof window === 'undefined' ? AX_AGENT_DEFAULT_ROUTE : readFromUrl();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() { return current; }

/** 페이지를 바꾸고 URL 쿼리에 반영한다. 메뉴에 없는 라우트는 무시. */
export function setAxAgentPage(route: string): void {
  if (!isAxAgentRoute(route) || route === current) return;
  current = route;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, route);
    window.history.replaceState(null, '', url);
  } catch {
    // history 접근 불가 환경 방어
  }
  listeners.forEach((cb) => cb());
}

export function useAxAgentPage(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => AX_AGENT_DEFAULT_ROUTE);
}
