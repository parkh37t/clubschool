// 가상 사무실이 붙을 백엔드(server/ 오케스트레이터)의 위치를 런타임에 결정한다.
//
// 4가지 경우(위에서부터 우선):
//  1) URL에 ?api=<baseUrl> 지정 → 그 백엔드에 연결하고 브라우저(localStorage)에 기억한다.
//     공개 정적 사이트(GitHub Pages)에서 PC 에 띄운 서버(터널로 공개한 주소)에 붙어 라이브로 보는 용도.
//     ?api=off 를 주면 기억을 지운다.
//  2) localhost/127.0.0.1(개발) → 같은 오리진 상대경로. vite dev 프록시가 server(8787)로 넘긴다.
//  3) 기억해 둔 주소가 있으면 그것(공개 사이트에서 다음 방문부터 ?api 없이도 연결).
//  4) 그 외(지정 없는 정적 배포) → 미연결(undefined). 오피스는 내부 데모만 돌고 지시는 다운로드로 폴백.
//
// ?api는 사장님이 직접 넣는 자신의 백엔드 주소다. 잘못된 값이면 폴링/전송이 실패하고
// 오피스는 자동으로 내부 데모로 폴백한다(VirtualOfficeView가 오류를 흡수).

export interface OfficeBackend {
  /** 상태 폴링 URL. 미지정 시 내부 데모만 동작. */
  stateUrl?: string;
  /** 지시 전송(POST) URL. 미지정 시 지시 콘솔은 복사/다운로드로 폴백. */
  instructUrl?: string;
  /** 연결에 쓴 백엔드 기준 주소(표시용). 같은 오리진이면 '' */
  base?: string;
  /** 'query' | 'saved' | 'local' | 'none' — 어디서 정해졌는지(표시용) */
  source: 'query' | 'saved' | 'local' | 'none';
}

const STORAGE_KEY = 'axoffice.api';

export function normalizeBase(raw: string): string | null {
  const base = raw.trim().replace(/\/+$/, ''); // 끝 슬래시 제거
  try {
    const u = new URL(base);
    // http(s)만 허용(파일/기타 스킴 차단).
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return base;
  } catch {
    return null; // 절대 URL이 아니면 무시
  }
}

function readSaved(): string | null {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

/** 백엔드 주소를 기억한다(빈 값이면 지운다). 저장 불가 환경이면 조용히 넘어간다. */
export function saveOfficeBackend(base: string | null): void {
  try {
    if (base) window.localStorage.setItem(STORAGE_KEY, base);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 사생활 보호 모드 등 저장 불가 — 이번 방문에만 쓰이고 끝
  }
}

function fromBase(base: string, source: OfficeBackend['source']): OfficeBackend {
  return { stateUrl: `${base}/office-state.json`, instructUrl: `${base}/api/instruct`, base, source };
}

export function resolveOfficeBackend(): OfficeBackend {
  if (typeof window === 'undefined') return { source: 'none' };

  const api = new URLSearchParams(window.location.search).get('api');
  if (api === 'off') {
    saveOfficeBackend(null);
  } else if (api) {
    const base = normalizeBase(api);
    if (base) {
      saveOfficeBackend(base);
      return fromBase(base, 'query');
    }
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return { stateUrl: '/office-state.json', instructUrl: '/api/instruct', base: '', source: 'local' };
  }

  const saved = readSaved();
  if (saved) {
    const base = normalizeBase(saved);
    if (base) return fromBase(base, 'saved');
  }

  return { source: 'none' }; // 정적 공개 배포(지정 없음): 데모 전용
}
