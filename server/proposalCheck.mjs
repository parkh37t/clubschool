// 제안·견적 산출물의 기계 검사 — 사내 제안 스킬의 운영 규칙을 서버가 다시 본다(모델이 쓴 id·표기를 믿지 않는다).
//   ev_table             조사 단계 근거표: 첫 칸이 EV-nnn 인 행이 있고, 행마다 근거 상태 6종 가운데 하나가 있는가
//   ev_refs              뒤 단계가 인용한 EV id 가 앞 단계(또는 이 산출물의 '근거표 추가분') 근거표에 있는가 — 없는 id 는 지어낸 근거
//   req_coverage         장표 단계: RFP 분석의 요구 id 가 장표 구성안(대응표 역채움)에 모두 나오는가 — 빠진 id 를 나열
//   unconfirmed_numbers  장표 단계(견적 승인 전): 금액·M/M·인원 수치가 「확정 필요」 없이 쓰였는가(참고 — 판정에는 넣지 않는다)
//   ai_label             검수 보고서: 'AI 검수'라고 밝혔는가, 사람 검토를 받지 않았는데 '검토 완료'라고 쓰지 않았는가
//   render               검수 단계: 실제 렌더링·시각 항목은 앱이 돌리지 않는다 — 항상 not_run(참고). 통과로 적지 않는다
//   sections             단계 정의의 sections(예: 견적 '인력 카드'·'갭 분석')가 제목(#)으로 있는가
//   chg_log              QA 보완 재작업 뒤: 산출물 끝 '변경 기록' 표에 CHG-nn 행이 있는가(참고)
// 결과는 pass / fail / not_run. 판정에 넣는지(required)는 부르는 쪽이 정한다 — mock 산출물은 목업이라 참고로만 본다.
// 산출물·앞 산출물은 읽기만 한다.

import { promises as fs } from 'node:fs';
import { parseTables } from './xlsxExport.mjs';
import { ID_RE } from './rfpCheck.mjs';
import { stepDef, EV_STATES } from './proposal.mjs';
import { shortFormHint } from './qa.mjs';

const read = (f) => (f ? fs.readFile(f, 'utf8').catch(() => '') : Promise.resolve(''));
const cellText = (c) => String(c ?? '').replace(/[*`]/g, '').trim();
const EV_CELL = /^EV-(\d{1,5})$/i;
const EV_CITE = /(?<![A-Za-z0-9-])EV-(\d{1,5})(?!\d)/gi;
const evKey = (n) => `EV-${String(Number(n)).padStart(3, '0')}`; // EV-1 과 EV-001 은 같은 근거
// 머리줄 없이 첫 줄부터 데이터인 표(첫 칸이 id)도 센다
const rowsOf = (t, test) => (test(cellText(t.head?.[0])) ? [t.head, ...t.rows] : t.rows);
const sample = (arr, n = 6) => arr.slice(0, n).join(', ') + (arr.length > n ? ` 외 ${arr.length - n}개` : '');

/** 근거표 행(첫 칸 EV-nnn) → Map(id → 상태 또는 null). 상태는 행의 칸 가운데 근거 상태 6종 값. */
export function evDefined(md) {
  const out = new Map();
  for (const t of parseTables(md)) {
    for (const row of rowsOf(t, (c) => EV_CELL.test(c))) {
      const m = cellText(row[0]).match(EV_CELL);
      if (!m) continue;
      const state = row.slice(1).map((c) => cellText(c).toLowerCase()).map((c) => EV_STATES.find((s) => c === s || c.split(/[\s/,(]+/).includes(s))).find(Boolean) || null;
      out.set(evKey(m[1]), state);
    }
  }
  return out;
}

/** 산출물이 가리킨 EV id 전부(근거표 행 포함). */
export function evCited(md) {
  const out = new Set();
  for (const m of String(md || '').replace(/```[\s\S]*?```/g, ' ').matchAll(EV_CITE)) out.add(evKey(m[1]));
  return out;
}

function evTableCheck(md) {
  const defs = evDefined(md);
  if (!defs.size) return { id: 'ev_table', status: 'fail', evidence: '근거표가 없음 — 첫 칸이 EV-001 부터 이어지는 근거 id 인 표가 있어야 함', issue: 'ev_table: 근거표(첫 칸 EV-001…, 행마다 근거 상태 6종 가운데 하나)를 만들 것' };
  const noState = [...defs].filter(([, s]) => !s).map(([id]) => id);
  const counts = EV_STATES.map((s) => [s, [...defs.values()].filter((v) => v === s).length]).filter(([, n]) => n).map(([s, n]) => `${s} ${n}`).join(' · ');
  if (noState.length) return { id: 'ev_table', status: 'fail', evidence: `근거 ${defs.size}건 가운데 상태가 없는 행 ${noState.length}건(${sample(noState)})`, issue: `ev_table: 상태가 없는 근거 ${sample(noState)} — ${EV_STATES.join('·')} 가운데 하나를 적을 것` };
  return { id: 'ev_table', status: 'pass', evidence: `근거 ${defs.size}건 — ${counts}` };
}

function evRefsCheck(md, priorMds, { optional = false } = {}) {
  const prior = new Map();
  for (const p of priorMds) for (const [id, s] of evDefined(p)) if (!prior.has(id) || !prior.get(id)) prior.set(id, s);
  const own = evDefined(md);
  const cited = evCited(md);
  if (!prior.size && !own.size) {
    return { id: 'ev_refs', status: 'not_run', evidence: '앞 단계 근거표가 없음 — 대조할 수 없음', required: false };
  }
  const undefinedIds = [...cited].filter((id) => !prior.has(id) && !own.has(id));
  const ownNoState = [...own].filter(([, s]) => !s).map(([id]) => id);
  const added = [...own.keys()].filter((id) => !prior.has(id)).length;
  if (undefinedIds.length) return { id: 'ev_refs', status: 'fail', evidence: `근거표에 없는 EV id ${undefinedIds.length}개: ${sample(undefinedIds)}`, issue: `ev_refs: 근거표에 없는 근거 id ${sample(undefinedIds)} — 앞 단계 근거표의 id 를 쓰거나 '근거표 추가분'에 상태와 함께 덧붙일 것` };
  if (ownNoState.length) return { id: 'ev_refs', status: 'fail', evidence: `덧붙인 근거 가운데 상태가 없는 행: ${sample(ownNoState)}`, issue: `ev_refs: 덧붙인 근거 ${sample(ownNoState)} 에 근거 상태(${EV_STATES.join('·')})를 적을 것` };
  if (!cited.size) {
    return optional
      ? { id: 'ev_refs', status: 'pass', evidence: 'EV 인용 없음(이 단계는 인용이 선택)' }
      : { id: 'ev_refs', status: 'fail', evidence: '근거 id(EV-nnn)를 하나도 인용하지 않음', issue: 'ev_refs: 주장마다 앞 단계 근거표의 EV id 를 붙일 것' };
  }
  return { id: 'ev_refs', status: 'pass', evidence: `EV 인용 ${cited.size}개, 모두 근거표에 있음${added ? ` (덧붙인 근거 ${added}건)` : ''}` };
}

/** RFP 분석 산출물의 요구 id(표 첫 칸). 'internal:' 내부 id 도 접두어를 떼고 센다. */
export function reqIds(md) {
  const ids = [];
  const bare = (c) => cellText(c).replace(/^internal:\s*/i, '');
  for (const t of parseTables(md)) {
    for (const row of rowsOf(t, (c) => ID_RE.test(bare(c)))) {
      const c = bare(row[0]);
      if (ID_RE.test(c) && !ids.some((x) => x.toUpperCase() === c.toUpperCase())) ids.push(c);
    }
  }
  return ids;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function reqCoverageCheck(md, rfpMd) {
  const ids = reqIds(rfpMd);
  if (!ids.length) return { id: 'req_coverage', status: 'not_run', evidence: rfpMd ? 'RFP 분석 산출물의 표 첫 칸에서 요구 id 를 찾지 못함' : 'RFP 분석 산출물이 없음', required: false };
  const missing = ids.filter((id) => !new RegExp(`(?<![A-Za-z0-9-])${esc(id)}(?![A-Za-z0-9])`, 'i').test(md));
  if (missing.length) return { id: 'req_coverage', status: 'fail', evidence: `요구 ${ids.length}개 가운데 장표 구성안에 없는 ${missing.length}개: ${sample(missing, 8)}`, issue: `req_coverage: 대응표 역채움에서 빠진 요구 id ${sample(missing, 8)} — 장표 id 를 채우거나 '공백'·발표 제외 사유를 적을 것` };
  return { id: 'req_coverage', status: 'pass', evidence: `요구 ${ids.length}개가 모두 장표 구성안에 나옴` };
}

// 금액·M/M·인원 수치. '원칙'·'명확' 같은 낱말은 뺀다. 「확정 필요」·RFP 인용(「」)·예산 줄은 수치를 써도 된다.
const NUM_UNIT = /\d[\d,.]*\s*(?:억\s*원?|천만\s*원?|백만\s*원?|만\s*원|원|M\/M|MM|맨먼스|명)(?!칙|인|본|래|문|천|격|장|확|시|칭|세|령|료)/;
const NUM_OK = /확정\s*필요|to confirm|「|예산|RFP/i;

function unconfirmedNumbersCheck(md) {
  const lines = String(md || '').replace(/```[\s\S]*?```/g, ' ').split(/\r?\n/).filter((l) => !/^\s*\|?\s*:?-{3,}/.test(l));
  const hits = lines.filter((l) => NUM_UNIT.test(l) && !NUM_OK.test(l)).map((l) => l.trim().slice(0, 50));
  return hits.length
    ? { id: 'unconfirmed_numbers', status: 'fail', evidence: `견적 승인 전인데 금액·M/M·인원 수치가 「확정 필요」 없이 ${hits.length}줄(예: ${hits.slice(0, 2).join(' / ')})`, required: false }
    : { id: 'unconfirmed_numbers', status: 'pass', evidence: '금액·M/M·인원 수치는 「확정 필요」로만 씀', required: false };
}

// 사람 검토를 받지 않았는데 '검토 완료'라고 쓰는 것 — 바로 뒤에 부정·미래가 오면('검토 완료 아님', '검토 완료 전') 괜찮다.
const DONE_CLAIM = /(?<!미)검토\s*완료(?!\s*(?:아님|아니|전|않|필요|예정|X|×))|review(?:ed)?\s+complete(?!\s*(?:not|pending))/i;
const AI_LABEL = /AI\s*검수|AI\s*review/i;

function aiLabelCheck(md) {
  const label = AI_LABEL.test(md);
  const claim = (String(md || '').match(DONE_CLAIM) || [])[0];
  if (label && !claim) return { id: 'ai_label', status: 'pass', evidence: '\'AI 검수\' 표기 있음, \'검토 완료\' 주장 없음' };
  const why = [!label ? '\'AI 검수\' 표기가 없음' : '', claim ? `사람 검토 없이 '${claim}'라고 씀` : ''].filter(Boolean).join(' · ');
  return { id: 'ai_label', status: 'fail', evidence: why, issue: `ai_label: ${why} — 맨 위에 'AI 검수'라고 밝히고 '검토 완료'라고 쓰지 말 것` };
}

const RENDER = { id: 'render', status: 'not_run', evidence: '실제 렌더링(글자 깨짐·넘침·겹침)과 도식·레이아웃·글꼴 같은 시각 항목은 앱이 돌리지 않음 — PPTX·PDF 를 만든 뒤 사람이 확인', required: false };

function sectionsCheck(md, sections) {
  const heads = String(md || '').split(/\r?\n/).filter((l) => /^\s*#{1,6}\s/.test(l)).map((l) => l.toLowerCase());
  const missing = sections.filter((s) => !s.split('|').some((alt) => heads.some((h) => h.includes(alt.toLowerCase())))).map((s) => s.split('|')[0]);
  return missing.length
    ? { id: 'sections', status: 'fail', evidence: `제목이 없는 항목: ${missing.join(', ')}`, issue: `sections: ${missing.map((m) => `「${m}」`).join('·')} 제목(#)과 표를 넣을 것` }
    : { id: 'sections', status: 'pass', evidence: `제목 있음: ${sections.map((s) => s.split('|')[0]).join(', ')}` };
}

/**
 * 제안·견적 단계의 기계 검사. 단계 정의(proposal.mjs)의 checks·sections 를 따른다.
 * @param task      작업 레코드(process·step)
 * @param file      이 작업의 산출물 절대경로
 * @param opts.siblings  같은 브리핑의 앞 산출물 [{ step, file(절대경로) }]
 * @param opts.required  판정에 넣을지(mock 모드는 false)
 * @returns {Promise<{checks: object[], issues: string[]}>}
 */
export async function proposalChecks(task, file, { siblings = [], required = true } = {}) {
  const def = stepDef(task?.process, task?.step);
  if (!def || (!def.checks?.length && !def.sections?.length)) return { checks: [], issues: [] };
  const md = await read(file);
  const results = [];
  for (const id of def.checks || []) {
    if (id === 'ev_table') results.push(evTableCheck(md));
    else if (id === 'ev_refs') results.push(evRefsCheck(md, await Promise.all(siblings.map((s) => read(s.file))), { optional: Boolean(def.evOptional) }));
    else if (id === 'req_coverage') results.push(reqCoverageCheck(md, await read(siblings.find((s) => s.step === 'rfp')?.file)));
    else if (id === 'unconfirmed_numbers') results.push(unconfirmedNumbersCheck(md));
    else if (id === 'ai_label') results.push(aiLabelCheck(md));
    else if (id === 'render') results.push({ ...RENDER });
  }
  if (def.sections?.length) results.push(sectionsCheck(md, def.sections));
  const checks = [];
  const issues = [];
  for (const { issue, ...c } of results) {
    const reqd = c.required !== false && required;
    checks.push(reqd ? c : { ...c, required: false });
    if (reqd && c.status === 'fail' && issue) issues.push(issue);
  }
  return { checks, issues };
}

/** QA 보완 재작업에 '변경 기록' 표를 요구할지 — 짧은 형식 요청('3줄' 등)과 기획 팩 화면(형식 린트가 있음)은 빼고. */
export function wantsChangeLog(task, briefing) {
  return task?.process !== 'planning' && !shortFormHint(task, briefing);
}

/** 보완 재작업 뒤 산출물의 변경 기록(CHG-nn 행) 검사 — 참고(판정에는 넣지 않는다). */
export async function changeLogCheck(file, issueCount = 0) {
  const md = await read(file);
  let rows = 0;
  const chg = (c) => /^CHG-\d+$/i.test(cellText(c));
  for (const t of parseTables(md)) for (const row of rowsOf(t, chg)) if (chg(row[0])) rows += 1;
  const check = rows
    ? { id: 'chg_log', status: 'pass', evidence: `변경 기록 CHG ${rows}건(QA 지적 ${issueCount}건)`, required: false }
    : { id: 'chg_log', status: 'fail', evidence: `보완했는데 변경 기록(CHG-nn | 지적 | 변경 전 | 변경 후 | 영향 위치) 표가 없음(QA 지적 ${issueCount}건)`, required: false };
  return { checks: [check], issues: [] };
}
