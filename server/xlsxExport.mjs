// 에이전트가 쓴 마크다운 산출물의 표를 엑셀(.xlsx)로 저장한다 — 견적서·인력투입계획처럼 표가 본체인 산출물용.
// 표 하나 = 시트 하나(시트 이름 = 표 바로 위 제목). 숫자 칸은 숫자로(쉼표·원·₩·% 정리), 머리줄은 굵게·배경색, 소계·합계 행은 굵게.
// 에이전트는 명령을 실행하지 못하므로(엑셀 스킬의 스크립트를 못 돌림) 서버가 대신 만든다.
// Node 만으로 동작(jszip — docx 패키지와 함께 설치됨). 표가 없거나 패키지가 없으면 null 을 돌려주고 파이프라인은 계속한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const MAX_SHEETS = 40;
const MAX_ROWS = 5000;

const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes('-');

function clean(c) {
  return c.trim()
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2');
}

function cells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => clean(c.replace(/\\\|/g, '|')));
}

/** 마크다운 → [{ title, head, rows }] (코드 블록 안의 표는 건너뛴다) */
export function parseTables(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const tables = [];
  let heading = '';
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) { heading = clean(h[1]); continue; }
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && isRow(lines[j]) && rows.length < MAX_ROWS) { rows.push(cells(lines[j])); j++; }
      tables.push({ title: heading, head, rows });
      i = j - 1;
    }
  }
  return tables;
}

/** 칸 글자 → { v, kind: 'int'|'dec'|'pct'|'text' } */
export function cellValue(s) {
  const t = String(s ?? '').trim();
  const n = t.replace(/^₩\s*/, '').replace(/\s*원$/, '').replace(/−/g, '-');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(n) || /^-?\d+(\.\d+)?$/.test(n)) {
    // 0 으로 시작하는 긴 숫자(전화·코드)는 글자로 둔다
    if (/^-?0\d+$/.test(n)) return { v: t, kind: 'text' };
    const v = Number(n.replace(/,/g, ''));
    if (Number.isFinite(v)) return { v, kind: Number.isInteger(v) ? 'int' : 'dec' };
  }
  const p = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(n);
  if (p) return { v: Number(p[1]) / 100, kind: 'pct' };
  return { v: t, kind: 'text' };
}

const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g; // eslint-disable-line no-control-regex
const esc = (s) => String(s).replace(XML_BAD, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function colName(n) {
  let s = '';
  for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

// 화면 폭 — 한글·전각은 2칸
const width = (s) => Math.max(0, ...String(s).split(/\n/).map((l) => [...l].reduce((w, ch) => w + (/[\u1100-\u11FF\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/.test(ch) ? 2 : 1), 0)));

function sheetName(title, i, used) {
  let base = String(title || '').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || `표 ${i + 1}`;
  let name = base;
  for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base.slice(0, 31 - String(k).length - 3)} (${k})`;
  used.add(name.toLowerCase());
  return name;
}

const TOTAL_RE = /^(소계|합계|총계|총\s?합계|합\s계|subtotal|total|grand total)/i;
// 스타일 번호(styles.xml 의 cellXfs 순서와 같다)
const ST = { head: 1, text: 2, int: 3, dec: 4, pct: 5, tText: 6, tInt: 7, tDec: 8, tPct: 9 };

function sheetXml(table) {
  const all = [table.head, ...table.rows];
  const ncol = Math.max(...all.map((r) => r.length));
  const widths = Array.from({ length: ncol }, (_, c) => Math.min(60, Math.max(8, ...all.map((r) => width(r[c] ?? '') + 2))));
  const rowXml = all.map((r, ri) => {
    const total = ri > 0 && TOTAL_RE.test(String(r[0] ?? '').trim());
    const cellsXml = Array.from({ length: ncol }, (_, c) => {
      const ref = `${colName(c)}${ri + 1}`;
      const raw = r[c] ?? '';
      if (ri === 0) return `<c r="${ref}" t="inlineStr" s="${ST.head}"><is><t xml:space="preserve">${esc(raw)}</t></is></c>`;
      const { v, kind } = cellValue(raw);
      if (kind === 'text') {
        if (!v) return `<c r="${ref}" s="${total ? ST.tText : ST.text}"/>`;
        return `<c r="${ref}" t="inlineStr" s="${total ? ST.tText : ST.text}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      }
      const s = total ? { int: ST.tInt, dec: ST.tDec, pct: ST.tPct }[kind] : ST[kind];
      return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
    }).join('');
    return `<row r="${ri + 1}">${cellsXml}</row>`;
  }).join('');
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="16.5"/>'
    + `<cols>${cols}</cols><sheetData>${rowXml}</sheetData></worksheet>`;
}

const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.0#"/></numFmts>'
  + '<fonts count="2"><font><sz val="10"/><name val="Malgun Gothic"/><family val="2"/></font><font><b/><sz val="10"/><name val="Malgun Gothic"/><family val="2"/></font></fonts>'
  + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF6"/><bgColor indexed="64"/></patternFill></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FFC9CED6"/></left><right style="thin"><color rgb="FFC9CED6"/></right><top style="thin"><color rgb="FFC9CED6"/></top><bottom style="thin"><color rgb="FFC9CED6"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="10">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
  + '<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
  + '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="3" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>'
  + '<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>'
  + '<xf numFmtId="9" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>'
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/** 표 목록 → xlsx 바이트(Buffer). jszip 을 못 불러오면 throw. */
export async function buildXlsx(tables) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const used = new Set();
  const list = tables.slice(0, MAX_SHEETS).map((t, i) => ({ ...t, name: sheetName(t.title, i, used) }));
  const n = list.length;
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    + list.map((t, i) => `<sheet name="${esc(t.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
    + '</sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', STYLES);
  list.forEach((t, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(t)));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

let warned = false;

/**
 * 마크다운 파일의 표 → 같은 이름의 .xlsx. 표가 없으면 null(파일을 만들지 않음).
 * @returns {Promise<string|null>} 만든 파일 절대경로
 */
export async function exportXlsx(mdPath, log) {
  const md = await fs.readFile(mdPath, 'utf8');
  const tables = parseTables(md).filter((t) => t.head.length && (t.rows.length || t.head.some(Boolean)));
  if (!tables.length) { log?.(`엑셀 변환 건너뜀 — 표 없음: ${path.basename(mdPath)}`); return null; }
  let buf;
  try {
    buf = await buildXlsx(tables);
  } catch (e) {
    if (!warned) { warned = true; log?.(`엑셀 변환 불가(${e.code || e.message}) — 마크다운만 남김`); }
    return null;
  }
  const out = mdPath.replace(/\.md$/i, '') + '.xlsx';
  await fs.writeFile(out, buf);
  log?.(`엑셀 저장: ${path.basename(out)} (표 ${Math.min(tables.length, MAX_SHEETS)}개)`);
  return out;
}
