// 자료 울타리 — 브리핑 맥락·기억·받은 편지·산출물·지침처럼 모델에게 '자료'로 건네는 글을 감싼다(CLAUDE.md §8 자료 울타리).
// 안의 글이 울타리 표시(<<<자료 시작/끝>>>)를 흉내 내 울타리를 일찍 닫고 그 뒤에 지시를 끼워 넣지 못하게, 안쪽의 표시는 깨뜨려 둔다.
// 방어를 프롬프트 한 줄에만 걸지 않는다 — 울타리는 서버가 지키고, 회귀 시험(server/tests/fence.test.mjs)이 그 성질을 고정한다.

const MARK = /<{2,}\s*자료\s*(시작|끝)/g;

/** 글 안의 울타리 표시를 깨뜨린다('<<<자료 끝' → '<<·<자료 끝'). */
export function neutralizeFence(text) {
  return String(text ?? '').replace(MARK, '<<·<자료 $1');
}

/** 라벨이 붙은 자료 울타리. 여는 표시 한 번·닫는 표시 한 번만 생긴다. */
export function fence(label, text) {
  const safeLabel = String(label || '자료').replace(/[<>\n]/g, ' ').slice(0, 60);
  return [`<<<자료 시작: ${safeLabel}>>>`, neutralizeFence(text), '<<<자료 끝>>>'].join('\n');
}
