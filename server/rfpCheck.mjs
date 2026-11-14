// RFP 분석 산출물의 기계 검사 — 모델이 쓴 인용·번호를 믿지 않고 서버가 다시 본다(con-ai RFP 엔진의 규칙을 옮김).
//   quote_verify  「」·“”·"" 안의 인용을 첨부 원문·브리핑 맥락에서 다시 찾는다: exact(그대로) · whitespace(공백·줄바꿈만 다름) · none(원문에 없음)
//                 원문에 없는 인용이 하나라도 있으면 fail. 읽을 수 있는 원문이 없으면(PDF·HWP 등) not_run — 통과로 적지 않는다.
//   req_ids       요구·평가 대응표의 요구 id 가 겹치면 fail(번호는 다시 쓰지 않는다)
//   nfr_axes      비기능 6축(성능·가용성·보안·접근성·호환성·감리)을 모두 다뤘는지(참고 — 금융권 기준이라 판정에는 넣지 않는다)
// 원문은 읽기만 하고 어디에도 다시 쓰지 않는다. 결과에는 인용 앞부분만 남긴다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { absData } from './paths.mjs';
import { parseTables } from './xlsxExport.mjs';

const MIN_QUOTE = 8; // 이보다 짧은 따옴표 안 글은 인용으로 보지 않는다(용어 강조 등)
const MAX_SOURCE = 4 * 1024 * 1024;
const AXES = ['성능', '가용성', '보안', '접근성', '호환성', '감리'];
const ID_RE = /^(?:REQ|FR|NFR|TR|OR|CR|SFR|PER|SER|INR|DAR|QUR|COR|PMR|PSR|ECR)[-_A-Z0-9]*\d+$/i;

const xmlText = (xml) => xml.replace(/<\/w:p>|<\/hp:p>|<\/a:p>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/** 첨부 하나 → 글자(못 읽으면 null). md·txt·csv·json·html 은 그대로, docx·hwpx·pptx 는 압축을 풀어 본문 XML 에서. PDF·HWP(바이너리)는 아직 못 읽는다. */
export async function readSourceText(abs) {
  const ext = path.extname(abs).toLowerCase();
  try {
    const st = await fs.stat(abs);
    if (!st.isFile() || st.size > MAX_SOURCE * 4) return null;
    if (['.md', '.markdown', '.txt', '.csv', '.json', '.xml'].includes(ext)) return (await fs.readFile(abs, 'utf8')).slice(0, MAX_SOURCE);
    if (['.html', '.htm'].includes(ext)) return xmlText(await fs.readFile(abs, 'utf8')).slice(0, MAX_SOURCE);
    if (['.docx', '.hwpx', '.pptx'].includes(ext)) {
      const { default: JSZip } = await import('jszip');
      const zip = await JSZip.loadAsync(await fs.readFile(abs));
      const names = Object.keys(zip.files).filter((n) => (ext === '.docx' ? /^word\/document\.xml$/ : ext === '.hwpx' ? /^Contents\/section\d+\.xml$/ : /^ppt\/slides\/slide\d+\.xml$/).test(n)).sort();
      let out = '';
      for (const n of names) out += xmlText(await zip.file(n).async('string')) + '\n';
      return out.slice(0, MAX_SOURCE) || null;
    }
  } catch {
    return null;
  }
  return null;
}

/** 산출물에서 인용 뽑기 — 「」『』“”"" 안의 글 가운데 MIN_QUOTE 자 이상. 코드 블록은 뺀다. */
export function extractQuotes(md) {
  const text = String(md || '').replace(/```[\s\S]*?```/g, ' ');
  const out = [];
  const re = /「([^」\n]{1,400})」|『([^』\n]{1,400})』|“([^”\n]{1,400})”|"([^"\n|]{1,400})"/g;
  let m;
  while ((m = re.exec(text))) {
    const q = (m[1] || m[2] || m[3] || m[4] || '').trim();
    if (q.replace(/\s/g, '').length >= MIN_QUOTE) out.push(q);
  }
  return [...new Set(out)];
}

const squash = (s) => String(s).replace(/\s+/g, '');
/** 인용 하나를 원문에서 찾는다 → exact | whitespace | none */
export function findQuote(q, sources) {
  if (sources.some((s) => s.includes(q))) return 'exact';
  const sq = squash(q);
  if (sq && sources.some((s) => squash(s).includes(sq))) return 'whitespace';
  return 'none';
}

/**
 * @param file      RFP 분석 산출물(md) 절대경로
 * @param briefing  normalizeBriefing 결과(attachmentPaths·context)
 * @param opts.required  판정에 넣을지(mock 모드는 false — 목업 산출물에는 인용이 없다)
 * @returns {Promise<{checks: object[], issues: string[]}>}
 */
export async function rfpChecks(file, briefing, { required = true } = {}) {
  const md = await fs.readFile(file, 'utf8').catch(() => '');
  const checks = [];
  const issues = [];
  const opt = required ? {} : { required: false };

  // 원문 — 첨부(읽을 수 있는 형식만)와 브리핑 맥락
  const sources = [];
  const unreadable = [];
  for (const rel of briefing.attachmentPaths || []) {
    const t = await readSourceText(absData(rel) || rel);
    if (t && t.trim()) sources.push(t); else unreadable.push(path.basename(String(rel)));
  }
  if (String(briefing.context || '').trim().length > 40) sources.push(String(briefing.context));

  const quotes = extractQuotes(md);
  if (!sources.length) {
    checks.push({ id: 'quote_verify', status: 'not_run', evidence: `읽을 수 있는 원문이 없음${unreadable.length ? ` — ${unreadable.slice(0, 3).join(', ')}(PDF·HWP 는 아직 못 읽음)` : ''}`, required: false });
  } else if (!quotes.length) {
    checks.push({ id: 'quote_verify', status: 'fail', evidence: '원문 인용이 없음 — 요구마다 RFP 문장을 「」 안에 그대로 옮겨야 함', ...opt });
    issues.push('quote_verify: 요구마다 RFP 원문 문장을 「」 안에 그대로 인용할 것');
  } else {
    const res = quotes.map((q) => ({ q, r: findQuote(q, sources) }));
    const none = res.filter((x) => x.r === 'none');
    const ws = res.filter((x) => x.r === 'whitespace').length;
    const exact = res.length - none.length - ws;
    const sample = none.slice(0, 3).map((x) => `「${x.q.slice(0, 40)}${x.q.length > 40 ? '…' : ''}」`).join(' ');
    checks.push({ id: 'quote_verify', status: none.length ? 'fail' : 'pass', evidence: `인용 ${res.length}건 — 원문 그대로 ${exact} · 공백만 다름 ${ws} · 원문에 없음 ${none.length}${sample ? ` (예: ${sample})` : ''}${unreadable.length ? ` · 못 읽은 첨부 ${unreadable.length}개` : ''}`, ...opt });
    if (none.length) issues.push(`quote_verify: 원문에 없는 인용 ${none.length}건 — ${sample}. 원문 문장을 그대로 옮기거나 인용 표시를 빼고 '해석'으로 적을 것`);
  }

  // 요구 id 중복 — 표의 첫 칸이 id 인 행
  const ids = [];
  for (const t of parseTables(md)) {
    for (const row of t.rows) {
      const c = String(row[0] || '').trim();
      if (ID_RE.test(c)) ids.push(c.toUpperCase());
    }
  }
  if (!ids.length) {
    checks.push({ id: 'req_ids', status: 'not_run', evidence: '표 첫 칸에서 요구 id 를 찾지 못함', required: false });
  } else {
    const seen = new Map();
    for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
    const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
    checks.push({ id: 'req_ids', status: dup.length ? 'fail' : 'pass', evidence: dup.length ? `겹치는 요구 id: ${dup.slice(0, 6).join(', ')}` : `요구 id ${seen.size}개, 겹침 없음`, ...opt });
    if (dup.length) issues.push(`req_ids: 겹치는 요구 id ${dup.slice(0, 6).join(', ')} — 번호는 다시 쓰지 않고 새 번호를 붙일 것`);
  }

  // 비기능 6축 — 근거 요구가 없는 축도 '해당 없음'이 아니라 '근거 없음(missing)'으로 적었는지(참고)
  const missingAxes = AXES.filter((a) => !md.includes(a));
  checks.push({ id: 'nfr_axes', status: missingAxes.length ? 'fail' : 'pass', evidence: missingAxes.length ? `다루지 않은 비기능 축: ${missingAxes.join(', ')} — 근거 요구가 없으면 '근거 없음(missing)'으로 적을 것` : '비기능 6축을 모두 다룸', required: false });
  return { checks, issues };
}
