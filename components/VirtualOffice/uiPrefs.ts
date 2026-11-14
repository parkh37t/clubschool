// 가상 사무실 화면의 보는 사람별 편의 설정(에이전트 바 접기 등). 도메인 데이터가 아니므로 브라우저 저장소에만 둔다.
// 저장소를 못 쓰는 환경(사생활 보호 창·차단)에서도 화면이 깨지지 않게 실패는 조용히 기본값으로 돌린다.

const PREFIX = 'axo.';

export function loadPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // 저장하지 못해도 이번 화면에서는 바뀐 값으로 보인다
  }
}
