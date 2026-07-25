// 가상 사무실이 붙을 백엔드(server/ 오케스트레이터)의 위치를 런타임에 결정한다.
//
// 3가지 경우:
//  1) URL에 ?api=<baseUrl> 지정 → 그 백엔드에 연결(예: PC를 터널로 공개한 주소).
//     공개 정적 사이트(GitHub Pages)에서도 실제 실행 백엔드에 붙어 라이브로 볼 수 있게 하는 용도.
//  2) localhost/127.0.0.1(개발) → 같은 오리진 상대경로. vite dev 프록시가 server(8787)로 넘긴다.
//  3) 그 외(지정 없는 정적 배포) → 미연결(undefined). 오피스는 내부 데모만 돌고 지시는 다운로드로 폴백.
//
// ?api는 사장님이 직접 넣는 자신의 백엔드 주소다. 잘못된 값이면 폴링/전송이 실패하고
// 오피스는 자동으로 내부 데모로 폴백한다(VirtualOfficeView가 오류를 흡수).

export interface OfficeBackend {
  /** 상태 폴링 URL. 미지정 시 내부 데모만 동작. */
  stateUrl?: string;
  /** 지시 전송(POST) URL. 미지정 시 지시 콘솔은 복사/다운로드로 폴백. */
  instructUrl?: string;
}

function normalizeBase(raw: string): string | null {
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

export function resolveOfficeBackend(): OfficeBackend {
  if (typeof window === 'undefined') return {};

  const api = new URLSearchParams(window.location.search).get('api');
  if (api) {
    const base = normalizeBase(api);
    if (base) return { stateUrl: `${base}/office-state.json`, instructUrl: `${base}/api/instruct` };
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return { stateUrl: '/office-state.json', instructUrl: '/api/instruct' };
  }

  return {}; // 정적 공개 배포(지정 없음): 데모 전용
}
