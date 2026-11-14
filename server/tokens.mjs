// 사용 토큰 — AX Office 는 이 PC 에 로그인된 Claude 구독으로 돈다. 쓴 양은 금액이 아니라 토큰으로 남기고 보여 준다.
//
//   기록   Claude Code 가 돌려주는 usage 그대로: 입력(in) · 캐시 생성(cw) · 캐시 읽기(cr) · 출력(out)
//   한도   한 숫자로 센다 — 사용 토큰 = 입력 + 캐시 생성 + 출력 + 캐시 읽기 ÷ 10
//          캐시에서 다시 읽은 토큰은 새로 처리하는 토큰보다 훨씬 가볍게 쳐진다(API 단가 비율 1/10 과 같다).
//          그냥 더하면 수백만 단위의 캐시 읽기가 한도를 다 먹어 '얼마나 일했나'와 동떨어진다.
//   금액   CLI 의 total_cost_usd 는 'API 단가로 쳤을 때'의 참고값일 뿐 청구액이 아니므로 화면에 앞세우지 않는다.

export const CACHE_READ_WEIGHT = 0.1;

const int = (v) => Math.max(0, Math.round(Number(v) || 0));

/** usage 객체(CLI result·assistant 메시지) → { in, cw, cr, out }. */
export function fromUsage(u) {
  if (!u || typeof u !== 'object') return { in: 0, cw: 0, cr: 0, out: 0 };
  return { in: int(u.input_tokens), cw: int(u.cache_creation_input_tokens), cr: int(u.cache_read_input_tokens), out: int(u.output_tokens) };
}

/** 두 기록을 더한다(없으면 0). */
export function addTokens(a, b) {
  const x = a || {};
  const y = b || {};
  return { in: int(x.in) + int(y.in), cw: int(x.cw) + int(y.cw), cr: int(x.cr) + int(y.cr), out: int(x.out) + int(y.out) };
}

/** 사용 토큰(한도·합계에 쓰는 한 숫자). */
export function weighted(t) {
  if (!t) return 0;
  return int(t.in) + int(t.cw) + int(t.out) + Math.round(int(t.cr) * CACHE_READ_WEIGHT);
}

/** 사람이 읽는 표기 — 1234 → 1.2천, 1234567 → 123만. 로그·승인 카드 문구용. */
/** 작업 1건의 사용 토큰 — 기록이 없거나 0 이면 null(모름). 실제 실행은 0 토큰일 수 없으므로 0 은 '돌지 않았거나 목업'이다. */
export function knownTokens(t) {
  const w = t ? weighted(t) : 0;
  return w > 0 ? w : null;
}

export function fmtTokens(n) {
  const v = int(n);
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000).toLocaleString('ko-KR')}만`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}천`;
  return String(v);
}

/**
 * 실행 중 스트림(stream-json)에서 토큰을 센다. assistant 이벤트는 같은 메시지가 내용 조각마다 여러 번 올 수 있어
 * message.id 로 묶고 마지막 값만 쓴다. result 이벤트가 오면 그 합계가 정답이다.
 */
export function streamMeter() {
  const byMsg = new Map();
  let final = null;
  return {
    push(ev) {
      if (!ev || typeof ev !== 'object') return;
      if (ev.type === 'result' && ev.usage) final = fromUsage(ev.usage);
      else if (ev.type === 'assistant' && ev.message?.usage) byMsg.set(ev.message.id || `m${byMsg.size}`, fromUsage(ev.message.usage));
    },
    tokens() {
      if (final) return final;
      let sum = { in: 0, cw: 0, cr: 0, out: 0 };
      for (const t of byMsg.values()) sum = addTokens(sum, t);
      return sum;
    },
    weighted() { return weighted(this.tokens()); },
  };
}
