// 실시간 기록 — Claude Code stream-json 이벤트를 '터미널' 탭에 보일 짧은 줄로 바꿔 hive/live/<stream>.jsonl 에 남긴다.
// 원문(파일 내용·긴 응답)은 저장하지 않는다. 읽은 파일·쓴 파일·도구 호출·글 앞부분·끝 상태만 남긴다.
//
// 줄 종류(k): start | text | tool | tool_result | note | end | error
// 화면(TerminalTab)이 k 를 보고 색과 머리말을 붙인다(언어 전환도 화면에서).

import path from 'node:path';
import { appendLive } from './hive.mjs';

function shortPath(p, cwd) {
  const s = String(p || '');
  if (!s) return '';
  if (cwd && path.isAbsolute(s)) {
    const rel = path.relative(cwd, s);
    if (rel && !rel.startsWith('..')) return rel.split(path.sep).join('/');
  }
  return s.length > 90 ? '…' + s.slice(-88) : s;
}

function toolSummary(name, input = {}, cwd) {
  switch (name) {
    case 'Read': return shortPath(input.file_path, cwd);
    case 'Write': return `${shortPath(input.file_path, cwd)} (${String(input.content || '').length.toLocaleString()}자)`;
    case 'Edit': case 'MultiEdit': case 'NotebookEdit': return shortPath(input.file_path || input.notebook_path, cwd);
    case 'Grep': return `"${String(input.pattern || '').slice(0, 60)}"${input.path ? ` · ${shortPath(input.path, cwd)}` : ''}`;
    case 'Glob': return String(input.pattern || '').slice(0, 80);
    default: return Object.keys(input).slice(0, 3).join(', ');
  }
}

function resultSize(content) {
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) return content.reduce((n, c) => n + (typeof c?.text === 'string' ? c.text.length : 0), 0);
  return 0;
}

/** 이벤트 1개 → 기록 줄 0개 이상. */
export function liveEntries(ev, { cwd } = {}) {
  if (!ev || typeof ev !== 'object') return [];
  switch (ev.type) {
    case 'system':
      if (ev.subtype === 'init') return [{ k: 'start', text: shortPath(ev.cwd, '') }];
      if (ev.subtype === 'post_turn_summary' && ev.status_detail) return [{ k: 'note', text: String(ev.status_detail).slice(0, 200) }];
      return [];
    case 'assistant': {
      const out = [];
      for (const c of ev.message?.content || []) {
        if (c?.type === 'text' && c.text?.trim()) out.push({ k: 'text', text: c.text.trim().slice(0, 600) });
        else if (c?.type === 'tool_use') out.push({ k: 'tool', tool: c.name, text: toolSummary(c.name, c.input, cwd) });
      }
      return out;
    }
    case 'user': {
      const out = [];
      for (const c of ev.message?.content || []) {
        if (c?.type === 'tool_result') out.push({ k: 'tool_result', error: Boolean(c.is_error), size: resultSize(c.content) });
      }
      return out;
    }
    case 'result':
      return [{ k: 'end', status: ev.subtype || (ev.is_error ? 'error' : 'success'), cost: Number(ev.total_cost_usd || 0), turns: ev.num_turns || 0 }];
    default:
      return [];
  }
}

/** 실행 1건의 기록기 — onEvent 로 넘기면 줄마다 hive 에 쓴다. meta 는 줄마다 붙는다(agent·task). */
export function liveSink(stream, meta = {}, { cwd } = {}) {
  return (ev) => {
    for (const e of liveEntries(ev, { cwd })) appendLive(stream, { ...meta, ...e }).catch(() => {});
  };
}

/** 서버가 직접 남기는 줄(배정·QA·승인 등 흐름 표시). */
export function liveNote(stream, meta, text, k = 'note') {
  return appendLive(stream, { ...meta, k, text }).catch(() => {});
}
