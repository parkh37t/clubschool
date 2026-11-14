import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { deleteJson, postJson } from './officeApi';
import type { LiveLine, RosterMember } from './officeApi';
import { useOfficeLang } from './i18n';
import type { TFn } from './i18n';
import { BAD_FG, INK, MONO, MUTED, WYLIE, WYLIE_DARK, inputStyle, smallMuted } from './officeTheme';

interface TerminalTabProps {
  connected: boolean;
  apiBase?: string;
  selected: string | null;
  roster: RosterMember[] | null;
}

const C = { dim: '\x1b[90m', cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[35m', pink: '\x1b[95m', white: '\x1b[37m', reset: '\x1b[0m' };

function hhmmss(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const z = (n: number) => String(n).padStart(2, '0');
  return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

/** 실시간 기록 1줄 → 색을 입힌 터미널 줄. */
function formatLine(l: LiveLine, t: TFn): string {
  const time = `${C.dim}${hhmmss(l.ts)}${C.reset} `;
  const label = (color: string, key: string) => `${color}${t(`tl.${key}`)}${C.reset}`;
  const body = (s?: string) => String(s ?? '').replace(/\r?\n/g, '\r\n          ');
  switch (l.k) {
    case 'start': return `${time}${label(C.dim, 'start')} ${C.dim}${l.text ?? ''}${C.reset}`;
    case 'assign': return `${time}${C.magenta}◆ ${t('tl.assign')}${C.reset} ${t('tl.assignText', { msg: l.text ?? '', cap: Number(l.cap ?? 0).toFixed(2), level: l.level && l.level !== 'normal' ? ` · ${t(`lv.${l.level}`)}` : '' })}`;
    case 'tool': return `${time}${C.cyan}▶ ${l.tool}${C.reset} ${l.text ?? ''}`;
    case 'tool_result': return `${time}${l.error ? C.red : C.dim}  ↳ ${t('tl.resultText', { size: Number(l.size ?? 0).toLocaleString(), err: l.error ? ' ✗' : '' })}${C.reset}`;
    case 'text': return `${time}${C.white}${body(l.text)}${C.reset}`;
    case 'note': return `${time}${C.dim}· ${body(l.text)}${C.reset}`;
    case 'end': return `${time}${l.status === 'success' ? C.green : C.red}■ ${t('tl.endText', { status: l.status ?? '', cost: Number(l.cost ?? 0).toFixed(2), turns: l.turns ?? 0 })}${C.reset}`;
    case 'qa_start': return `${time}${C.yellow}◇ ${t('tl.qaStart')}${C.reset}`;
    case 'qa': return `${time}${l.gate === 'FAIL' ? C.red : l.gate === 'PASS' ? C.green : C.yellow}◇ ${t('tl.qa')} ${l.gate}${C.reset} ${C.dim}${body(l.text).slice(0, 200)}${C.reset}`;
    case 'approval': return `${time}${C.yellow}◆ ${t('tl.approval')} ${l.text ?? ''}${C.reset}`;
    case 'approval_done': return `${time}${l.text === 'approved' ? C.green : C.red}◆ ${t('tl.approval_done')} ${l.text ?? ''}${C.reset}`;
    case 'budget_stop': return `${time}${C.red}■ ${t('tl.budgetText', { cap: Number(l.cap ?? 0).toFixed(2), msg: l.text ?? '' })}${C.reset}`;
    case 'revise': return `${time}${C.yellow}↻ ${t('tl.revise')}${C.reset} ${C.dim}${body(l.text).slice(0, 200)}${C.reset}`;
    case 'done': return `${time}${C.green}✓ ${t('tl.done')}${C.reset}`;
    case 'user_msg': return `${time}${C.pink}${t('tl.user_msg')} ›${C.reset} ${body(l.text)}`;
    case 'briefing_queued': return `${time}${C.magenta}◆ ${t('tl.briefing_queued')} ${l.text ?? ''}${C.reset}`;
    case 'session_new': return `${time}${C.dim}· ${t('tl.session_new')}${C.reset}`;
    case 'error': return `${time}${C.red}✗ ${body(l.text)}${C.reset}`;
    default: return `${time}${C.dim}${l.k} ${l.text ?? ''}${C.reset}`;
  }
}

/**
 * 터미널 탭 — 책상별 실시간 기록(역할 실행 stream-json 요약)과 대화형 터미널(node-pty).
 * 기록: 고른 사람의 가장 최근 작업(팀장은 상주 세션)을 1초마다 이어 받는다.
 * 대화형: [터미널 열기] → 그 사람의 과제 폴더에서 Claude Code 대화형 세션. 직접 입력하며 구독 사용량을 쓴다.
 */
export function TerminalTab({ connected, apiBase, selected, roster }: TerminalTabProps) {
  const { t, name } = useOfficeLang();
  const [desk, setDesk] = useState<string>(selected || 'lead');
  // agent: 이 기록이 어느 책상 것인지 — 책상을 바꾼 직후 이전 책상의 기록을 받아 오지 않게 한다.
  const [stream, setStream] = useState<{ id: string; title: string; agent: string } | null>(null);
  const [mode, setMode] = useState<'live' | 'pty'>('live');
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  // 언어·명단이 바뀌어도 기록을 처음부터 다시 그리지 않게 최신 함수는 ref 로 읽는다.
  const tRef = useRef(t);
  tRef.current = t;
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => { if (selected) setDesk(selected); }, [selected]);

  // xterm 1회 생성 — 크기는 패널에 맞춘다.
  useEffect(() => {
    if (!boxRef.current) return;
    const term = new Terminal({
      fontFamily: MONO, fontSize: 12, lineHeight: 1.15, cursorBlink: false, convertEol: false, scrollback: 3000,
      theme: { background: '#1B1F2E', foreground: '#E8E2D0', cursor: '#B79CE8', selectionBackground: '#43306B' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(boxRef.current);
    try { fit.fit(); } catch { /* 숨겨진 상태 */ }
    termRef.current = term;
    fitRef.current = fit;
    const ro = new ResizeObserver(() => { try { fit.fit(); } catch { /* 무시 */ } });
    ro.observe(boxRef.current);
    return () => { ro.disconnect(); term.dispose(); termRef.current = null; };
  }, []);

  // 기록 대상 — 팀장은 상주 세션, 나머지는 가장 최근 작업(5초마다 새 작업 확인).
  useEffect(() => {
    if (!connected) return;
    if (desk === 'lead') { setStream({ id: 'lead', title: tRef.current('tm.leadLog'), agent: 'lead' }); return; }
    let alive = true;
    const find = async () => {
      try {
        const r = await fetch(`${apiBase}/api/live/latest?agent=${encodeURIComponent(desk)}`, { cache: 'no-store' });
        const d = (await r.json()) as { task: { id: string; title: string } | null };
        if (!alive) return;
        setStream((cur) => (d.task ? (cur?.id === d.task.id && cur.agent === desk ? cur : { id: d.task.id, title: d.task.title, agent: desk }) : null));
      } catch { /* 다음 주기 */ }
    };
    find();
    const iv = setInterval(find, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [connected, apiBase, desk]);

  // 실시간 기록 이어 받기
  useEffect(() => {
    const term = termRef.current;
    if (!connected || mode !== 'live' || !term) return;
    if (stream && stream.agent !== desk) return; // 새 책상의 기록 대상을 찾는 중
    // reset() 은 대기 중인 쓰기보다 먼저 실행돼 이전 기록이 남을 수 있다 — 지우기도 쓰기 순서에 넣는다(RIS).
    term.write('\x1bc');
    if (!stream) { term.writeln(`${C.dim}${tRef.current('tm.noTask', { name: nameRef.current(desk) })}${C.reset}`); return; }
    term.writeln(`${C.magenta}${stream.id === 'lead' ? stream.title : tRef.current('tm.task', { id: stream.id, title: stream.title })}${C.reset}`);
    let next = 0;
    let alive = true;
    const pull = async () => {
      try {
        const q = stream.id === 'lead' ? `stream=lead` : `task=${encodeURIComponent(stream.id)}`;
        const r = await fetch(`${apiBase}/api/live?${q}&after=${next}`, { cache: 'no-store' });
        const d = (await r.json()) as { lines: LiveLine[]; next: number };
        if (!alive || !d.lines) return;
        for (const l of d.lines) term.writeln(formatLine(l, tRef.current));
        next = d.next;
      } catch { /* 다음 주기 */ }
    };
    pull();
    const iv = setInterval(pull, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, [connected, apiBase, mode, stream, desk]);

  // 대화형 터미널 — WebSocket 으로 입출력
  useEffect(() => {
    const term = termRef.current;
    if (mode !== 'pty' || !ptyId || !term) return;
    term.write('\x1bc');
    term.writeln(`${C.dim}${tRef.current('tm.connecting')}${C.reset}`);
    const base = apiBase ? new URL(apiBase) : new URL(window.location.href);
    const ws = new WebSocket(`${base.protocol === 'https:' ? 'wss' : 'ws'}://${base.host}/api/pty/ws?id=${encodeURIComponent(ptyId)}`);
    const sendSize = () => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'resize', c: term.cols, r: term.rows })); };
    ws.onopen = () => { term.write('\x1bc'); sendSize(); term.focus(); };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(String(ev.data)) as { t: string; d?: string; code?: number };
        if (m.t === 'out' && m.d) term.write(m.d);
        else if (m.t === 'exit') term.writeln(`\r\n${C.dim}${tRef.current('tm.exited', { code: m.code ?? '' })}${C.reset}`);
      } catch { /* 무시 */ }
    };
    const sub = term.onData((d) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'in', d })); });
    const rs = term.onResize(sendSize);
    return () => { sub.dispose(); rs.dispose(); ws.close(); };
  }, [mode, ptyId, apiBase]);

  const openPty = async () => {
    setMsg('');
    const term = termRef.current;
    const r = await postJson(`${apiBase}/api/pty`, { agent: desk, cols: term?.cols ?? 100, rows: term?.rows ?? 30 });
    if (!r.ok || !r.data?.id) { setMsg(t('tm.openFailed', { e: r.error ?? '' })); return; }
    setPtyId(String(r.data.id));
    setMode('pty');
  };
  const closePty = async () => {
    if (ptyId) await deleteJson(`${apiBase}/api/pty/${encodeURIComponent(ptyId)}`);
    setPtyId(null);
    setMode('live');
  };

  const ids = ['lead', ...((roster ?? []).filter((m) => m.id !== 'lead').map((m) => m.id))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minHeight: 260 }}>
      {!connected && <p style={smallMuted}>{t('tm.offline')}</p>}
      {connected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: INK }}>
            {t('tm.desk')}
            <select value={desk} disabled={mode === 'pty'} onChange={(e) => setDesk(e.target.value)} style={{ ...inputStyle, marginTop: 0, width: 'auto', padding: '3px 6px', fontSize: 12 }}>
              {ids.map((id) => <option key={id} value={id}>{name(id)}</option>)}
            </select>
          </label>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 80px' }}>
            {mode === 'pty' ? t('tm.ptyNote') : (stream ? (stream.id === 'lead' ? stream.title : `${stream.id}`) : '')}
          </span>
          {mode === 'live'
            ? <button type="button" className="axo-iconbtn" onClick={openPty} style={{ borderColor: WYLIE, color: WYLIE_DARK }}>{t('tm.open')}</button>
            : <button type="button" className="axo-iconbtn" onClick={closePty} style={{ color: BAD_FG }}>{t('tm.close')}</button>}
        </div>
      )}
      {connected && desk === 'lead' && mode === 'pty' && <p style={{ ...smallMuted, fontSize: 11 }}>{t('tm.leadPause')}</p>}
      {msg && <p style={{ ...smallMuted, color: BAD_FG }}>{msg}</p>}
      <div ref={boxRef} style={{ flex: 1, minHeight: 200, background: '#1B1F2E', borderRadius: 6, padding: 6, overflow: 'hidden', visibility: connected ? 'visible' : 'hidden' }} />
    </div>
  );
}
