// 에이전트가 쓴 마크다운 산출물을 Word(.docx)로 변환한다 — 고객 제출·공유용 사본.
// Python 없이 Node만으로 동작(docx·marked). 패키지가 없으면 변환만 건너뛰고 파이프라인은 계속한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const FONT = 'Malgun Gothic'; // 한글 기본 서체(Windows 기본 탑재)
const MONO = 'Consolas';
const INK = '1F2933';
const ACCENT = '1F4E79';
const MUTED = '5F6B7A';
const LINE = 'C9CED6';
const HEAD_FILL = 'E8EEF6';
const CODE_FILL = 'F3F4F6';
const CONTENT_WIDTH = 9026; // A4 폭 11906 − 좌우 여백 1인치(1440)×2, 단위 DXA

let libs = null;
let warned = false;
let orderedInstance = 0; // 번호 목록마다 1부터 다시 시작하도록 인스턴스를 분리

async function loadLibs() {
  if (!libs) {
    const [docx, { marked }] = await Promise.all([import('docx'), import('marked')]);
    libs = { docx, marked };
  }
  return libs;
}

function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

// 표 열 너비 계산용 평문.
function plain(tokens) {
  return (tokens || []).map((t) => (t.tokens ? plain(t.tokens) : t.text || '')).join('');
}

function inlineRuns(tokens, base = {}) {
  const { TextRun, ShadingType } = libs.docx;
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'strong':
        out.push(...inlineRuns(t.tokens, { ...base, bold: true }));
        break;
      case 'em':
        out.push(...inlineRuns(t.tokens, { ...base, italics: true }));
        break;
      case 'del':
        out.push(...inlineRuns(t.tokens, { ...base, strike: true }));
        break;
      case 'link':
        out.push(...inlineRuns(t.tokens, { ...base, color: ACCENT, underline: {} }));
        break;
      case 'codespan':
        out.push(new TextRun({ ...base, text: decode(t.text), font: MONO, shading: { type: ShadingType.CLEAR, color: 'auto', fill: CODE_FILL } }));
        break;
      case 'br':
        out.push(new TextRun({ ...base, break: 1 }));
        break;
      case 'image':
        out.push(new TextRun({ ...base, text: `[이미지: ${t.text || t.href}]`, italics: true, color: MUTED }));
        break;
      case 'html': {
        // 표 안의 <br> 만 의미가 있다 — 줄바꿈으로 살리고 나머지 태그는 지운다.
        t.text.split(/<br\s*\/?>/i).forEach((part, i) => {
          if (i > 0) out.push(new TextRun({ ...base, break: 1 }));
          const s = decode(part.replace(/<[^>]+>/g, ''));
          if (s) out.push(new TextRun({ ...base, text: s }));
        });
        break;
      }
      default:
        if (t.tokens) out.push(...inlineRuns(t.tokens, base));
        else if (t.text) out.push(new TextRun({ ...base, text: decode(t.text.replace(/\n/g, ' ')) }));
    }
  }
  return out;
}

function quoteProps(ctx) {
  const { BorderStyle } = libs.docx;
  return ctx.quote
    ? { indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: LINE, space: 10 } } }
    : {};
}

function listParas(list, level, ctx) {
  const { Paragraph, TextRun } = libs.docx;
  const out = [];
  const instance = list.ordered ? ++orderedInstance : 0;
  for (const item of list.items) {
    // 항목 앞쪽의 글(text/paragraph)은 번호 붙은 한 문단으로, 그 뒤 블록(하위 목록 등)은 따로 그린다.
    const lead = [];
    const rest = [];
    for (const t of item.tokens) {
      if ((t.type === 'text' || t.type === 'paragraph') && rest.length === 0) lead.push(t);
      else rest.push(t);
    }
    const children = item.task ? [new TextRun({ text: item.checked ? '☑ ' : '☐ ' })] : [];
    lead.forEach((t, i) => {
      if (i > 0) children.push(new TextRun({ break: 1 }));
      children.push(...inlineRuns(t.tokens || [{ type: 'text', text: t.text }]));
    });
    const lvl = Math.min(level, 3);
    const numbering = list.ordered ? { reference: 'ordered', level: lvl, instance } : { reference: 'bullet', level: lvl };
    out.push(new Paragraph({ numbering, spacing: { after: 60 }, children }));
    for (const t of rest) {
      if (t.type === 'list') out.push(...listParas(t, level + 1, ctx));
      else out.push(...blocks([t], ctx));
    }
  }
  return out;
}

function table(t) {
  const { Table, TableRow, TableCell, Paragraph, WidthType, BorderStyle, ShadingType, AlignmentType } = libs.docx;
  const cols = t.header.length;
  // 글자 수에 비례해 열 너비를 나눈다(너무 좁거나 넓지 않게 4~40자로 제한).
  const weights = Array.from({ length: cols }, (_, c) => {
    const lens = [t.header[c], ...t.rows.map((r) => r[c])].filter(Boolean).map((cell) => [...plain(cell.tokens)].length);
    return Math.min(40, Math.max(4, ...lens));
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / sum) * CONTENT_WIDTH));
  const alignOf = (i) => ({ center: AlignmentType.CENTER, right: AlignmentType.RIGHT })[t.align?.[i]] || AlignmentType.LEFT;
  const edge = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: edge, bottom: edge, left: edge, right: edge };
  const cell = (c, i, head) => {
    const opts = {
      width: { size: widths[i], type: WidthType.DXA },
      borders,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: alignOf(i),
          spacing: { after: 0, line: 276 },
          children: inlineRuns(c ? c.tokens : [], head ? { size: 19, bold: true } : { size: 19 }),
        }),
      ],
    };
    if (head) opts.shading = { type: ShadingType.CLEAR, color: 'auto', fill: HEAD_FILL };
    return new TableCell(opts);
  };
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: t.header.map((c, i) => cell(c, i, true)) }),
      ...t.rows.map((r) => new TableRow({ children: Array.from({ length: cols }, (_, i) => cell(r[i], i, false)) })),
    ],
  });
}

function blocks(tokens, ctx) {
  const { Paragraph, TextRun, HeadingLevel, BorderStyle, ShadingType } = libs.docx;
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'space':
      case 'def':
        break;
      case 'heading': {
        const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
        out.push(new Paragraph({ heading: levels[Math.min(t.depth, 4) - 1], children: inlineRuns(t.tokens) }));
        break;
      }
      case 'paragraph':
      case 'text':
        out.push(
          new Paragraph({
            ...quoteProps(ctx),
            children: inlineRuns(t.tokens || [{ type: 'text', text: t.text }], ctx.quote ? { color: MUTED } : {}),
          }),
        );
        break;
      case 'list':
        out.push(...listParas(t, 0, ctx));
        break;
      case 'table':
        out.push(table(t), new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'blockquote':
        out.push(...blocks(t.tokens, { ...ctx, quote: true }));
        break;
      case 'code':
        for (const line of t.text.split('\n')) {
          out.push(
            new Paragraph({
              spacing: { after: 0, line: 260 },
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: CODE_FILL },
              children: [new TextRun({ text: line, font: MONO, size: 18 })],
            }),
          );
        }
        out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'hr':
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 } }, children: [] }));
        break;
      case 'html': {
        const s = decode(t.text.replace(/<[^>]+>/g, '').trim());
        if (s) out.push(new Paragraph({ children: [new TextRun(s)] }));
        break;
      }
      default:
        if (t.tokens) out.push(...blocks(t.tokens, ctx));
        else if (t.text) out.push(new Paragraph({ children: [new TextRun(decode(t.text))] }));
    }
  }
  return out;
}

function buildDoc(md, title) {
  const { Document, Footer, Paragraph, TextRun, AlignmentType, PageNumber, LevelFormat, BorderStyle } = libs.docx;
  orderedInstance = 0;
  const bulletChars = ['•', '◦', '▪', '–'];
  const indent = (lvl) => ({ left: 360 + lvl * 360, hanging: 260 });
  const heading = (id, name, run, paragraph) => ({ id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, bold: true, ...run }, paragraph });
  return new Document({
    creator: 'APEX 가상 사무실',
    title,
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 312, after: 120 } } } },
      paragraphStyles: [
        heading('Heading1', 'Heading 1', { size: 34, color: ACCENT }, { spacing: { before: 360, after: 160 } }),
        heading('Heading2', 'Heading 2', { size: 28, color: ACCENT }, {
          spacing: { before: 320, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
        }),
        heading('Heading3', 'Heading 3', { size: 24, color: INK }, { spacing: { before: 240, after: 100 } }),
        heading('Heading4', 'Heading 4', { size: 22, color: MUTED }, { spacing: { before: 200, after: 80 } }),
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullet',
          levels: [0, 1, 2, 3].map((l) => ({ level: l, format: LevelFormat.BULLET, text: bulletChars[l], alignment: AlignmentType.LEFT, style: { paragraph: { indent: indent(l) } } })),
        },
        {
          reference: 'ordered',
          levels: [0, 1, 2, 3].map((l) => ({
            level: l,
            format: l % 2 ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL,
            text: `%${l + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: indent(l) } },
          })),
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED })] })],
          }),
        },
        children: blocks(libs.marked.lexer(md), {}),
      },
    ],
  });
}

/** mdPath 옆에 같은 이름의 .docx를 만든다. 성공 시 경로, 실패·건너뜀 시 null. */
export async function exportDocx(mdPath, log) {
  try {
    await loadLibs();
  } catch {
    if (!warned) {
      warned = true;
      log('Word 변환 건너뜀 — server 폴더에서 npm install(Windows는 npm.cmd install)을 다시 실행하세요.');
    }
    return null;
  }
  try {
    const md = await fs.readFile(mdPath, 'utf8');
    const doc = buildDoc(md, path.basename(mdPath, path.extname(mdPath)));
    const out = mdPath.replace(/\.md$/i, '.docx');
    await fs.writeFile(out, await libs.docx.Packer.toBuffer(doc));
    return out;
  } catch (e) {
    log(`Word 변환 실패: ${path.basename(mdPath)} — ${e.message}`);
    return null;
  }
}
