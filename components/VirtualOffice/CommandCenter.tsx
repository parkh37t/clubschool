import { memo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Brain, CalendarClock, Gauge, ListChecks, Network, Sparkles, SquareTerminal, Stamp, Zap } from 'lucide-react';
import type { FeedItem, HiveApproval, HiveState, HiveTask } from './officeSimulator';
import { postJson, usePolling } from './officeApi';
import type { AgentStatus, HiveEvent, RosterMember } from './officeApi';
import { BriefingConsole } from './BriefingConsole';
import { PixelAvatar } from './PixelAvatar';
import {
  AGENT_ORDER, BAD_FG, GATE_COLOR, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, STATUS_COLOR, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT,
  clock, h2Style, inputStyle, nameOf, usd,
} from './officeTheme';

export type CommandTab = 'tasks' | 'approvals' | 'memory' | 'activity' | 'skills';

interface DemoProps {
  feed: FeedItem[];
  showApproval: boolean;
  approvalDesc: string;
  approvalFile: string;
  approvalScore: string;
  onApprove: () => void;
}

interface CommandCenterProps {
  tab: CommandTab;
  onTab: (t: CommandTab) => void;
  hive: HiveState | null;
  /** ''=같은 오리진, 'https://…'=원격 서버, undefined=미연결 */
  apiBase?: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  roster: RosterMember[] | null;
  events: HiveEvent[];
  concurrency?: { limit: number; running: number };
  mode?: string;
  demo: DemoProps;
  /** 브리핑 콘솔(패널 맨 아래 메시지 입력) */
  instructUrl?: string;
  onSubmitted: (title: string) => void;
}

// 탭 격자 — 1차는 작업·승인·기억·활동·스킬. 2·3차 탭은 자리만 잡아 두고 비활성으로 보인다(작업 지시서 1장 표).
const TABS: { key: CommandTab | null; label: string; icon: LucideIcon; phase?: string }[] = [
  { key: 'tasks', label: '작업', icon: ListChecks },
  { key: 'approvals', label: '승인', icon: Stamp },
  { key: 'memory', label: '기억', icon: Brain },
  { key: 'activity', label: '활동', icon: Activity },
  { key: 'skills', label: '스킬', icon: Sparkles },
  { key: null, label: '터미널', icon: SquareTerminal, phase: '2차' },
  { key: null, label: '모니터', icon: Gauge, phase: '2차' },
  { key: null, label: '예약', icon: CalendarClock, phase: '3차' },
  { key: null, label: '관계도', icon: Network, phase: '3차' },
];

const MAIL_LABEL: Record<string, string> = { assign: '작업 배정', result: '산출물 회신', approval: '승인 요청', question: '질문', answer: '답변', report: '보고' };

const smallMuted = { fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.55 } as const;

/** 이벤트 1건 → 사람이 읽는 한 줄. */
function describe(e: HiveEvent): { who: string; text: string; color: string } {
  switch (e.kind) {
    case 'briefing':
      return { who: '재하', text: `브리핑 접수 — ${e.title ?? ''}`, color: WYLIE_DARK };
    case 'task': {
      const gate = e.gate && e.gate !== '미점검' ? ` · 게이트 ${e.gate}` : '';
      const color = e.status === '실패' ? BAD_FG : e.status === '승인대기' ? WARN_FG : e.status === '완료' ? OK_FG : INK;
      return { who: nameOf(e.owner), text: `${e.id} ${e.title ?? ''} → ${e.status}${gate}${e.note ? ` (${e.note})` : ''}`, color };
    }
    case 'mail':
      return { who: nameOf(e.from), text: `→ ${nameOf(e.to)} ${MAIL_LABEL[e.type ?? ''] ?? e.type}${e.task ? ` (${e.task})` : ''}`, color: INK };
    case 'approval':
      if (e.status === 'pending') return { who: '팀장', text: `승인 요청 ${e.id} · ${e.task} · ${e.approval_kind ?? ''}`, color: WARN_FG };
      return { who: e.by || '재하', text: `${e.id} ${e.status === 'approved' ? '승인' : '반려'} (${e.task})`, color: e.status === 'approved' ? OK_FG : BAD_FG };
    case 'usage':
      return { who: nameOf(e.agent), text: `${e.what || '호출'} 사용량 ${usd(e.cost_usd)}`, color: MUTED };
    default:
      return { who: e.kind, text: e.title || e.id || '', color: MUTED };
  }
}

function involves(e: HiveEvent, id: string): boolean {
  return e.owner === id || e.from === id || e.to === id || e.agent === id;
}

/**
 * 오른쪽 커맨드 센터 — Munder Difflin 의 COMMAND CENTER 자리.
 * 머리(팀장·상태) → 탭 격자 → 상태 줄 → 탭 내용 → 대기열 → 브리핑 입력. 사무실 시계가 0.1초마다 다시 그리므로 memo 로 감싼다.
 */
export const CommandCenter = memo(function CommandCenter({ tab, onTab, hive, apiBase, selected, onSelect, roster, events, concurrency, mode, demo, instructUrl, onSubmitted }: CommandCenterProps) {
  const connected = apiBase !== undefined && hive !== null;
  const tasks = hive?.tasks ?? [];
  const pending = hive?.pending ?? [];
  const activeCount = tasks.filter((t) => ['진행', '검수', '승인대기'].includes(t.status)).length;
  const queue = tasks.filter((t) => t.status === '대기');
  const leader = roster?.find((m) => m.id === 'lead');
  const leaderStatus: AgentStatus = leader?.status ?? '대기';
  const ls = STATUS_COLOR[leaderStatus] ?? STATUS_COLOR['대기'];

  const badge = (key: CommandTab | null): number => (key === 'approvals' ? (connected ? pending.length : demo.showApproval ? 1 : 0) : key === 'tasks' ? activeCount : 0);

  return (
    <section aria-label="커맨드 센터" className="axo-cc">
      {/* 머리 — 팀장과 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px 8px' }}>
        <PixelAvatar id="lead" size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5, letterSpacing: '.12em', color: INK }}>커맨드 센터</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: MUTED, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, background: ls.bg, color: ls.fg, border: `1px solid ${ls.fg}33`, whiteSpace: 'nowrap' }}>{leaderStatus}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leader?.task || '팀장이 사무실을 운영 중'}</span>
          </div>
        </div>
        <span title="브리핑을 받으면 팀장이 나눠 자동으로 진행합니다. 외부 발송·비용·삭제·범위 변경·수치 확정만 승인 카드로 멈춥니다." style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: WYLIE_DARK, border: `1px solid ${LINE}`, background: '#fff', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>
          <Zap size={12} aria-hidden />자동 진행
        </span>
      </div>

      {/* 탭 격자 */}
      <div role="tablist" aria-label="커맨드 센터 탭" className="axo-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.key !== null && tab === t.key;
          const n = badge(t.key);
          return (
            <button
              key={t.label}
              role="tab"
              type="button"
              aria-selected={on}
              disabled={t.key === null}
              title={t.phase ? `${t.label} — ${t.phase}에서 만듭니다` : t.label}
              onClick={() => { if (t.key) onTab(t.key); }}
              className="axo-tab"
            >
              <Icon size={14} aria-hidden />
              <span>{t.label}</span>
              {t.phase && <span style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{t.phase}</span>}
              {n > 0 && <span className="axo-tab-badge" style={{ background: t.key === 'approvals' ? '#E8A33D' : WYLIE }}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* 상태 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 11, color: MUTED, borderBottom: `1px dashed ${LINE}` }}>
        <span aria-hidden style={{ width: 7, height: 7, flexShrink: 0, background: connected ? '#2D8C4E' : '#B9B2A2' }} />
        <span style={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {connected ? `hive 연결 · ${mode ?? ''}${concurrency ? ` · 동시 ${concurrency.running}/${concurrency.limit}` : ''}` : '서버 미연결 · 데모'}
        </span>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} title="선택 해제" style={{ marginLeft: 'auto', font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${WYLIE}`, background: WYLIE_TINT, color: WYLIE_DARK, borderRadius: 999, padding: '0 8px', whiteSpace: 'nowrap' }}>
            {nameOf(selected)} ×
          </button>
        )}
      </div>

      {/* 탭 내용 */}
      <div role="tabpanel" style={{ flex: 1, minHeight: 90, overflowY: 'auto', padding: '10px 12px 12px' }}>
        {tab === 'tasks' && <TasksTab connected={connected} hive={hive} selected={selected} concurrency={concurrency} />}
        {tab === 'approvals' && <ApprovalsTab connected={connected} apiBase={apiBase} tasks={tasks} pending={pending} approvals={hive?.approvals ?? []} demo={demo} />}
        {tab === 'memory' && <MemoryTab connected={connected} apiBase={apiBase} selected={selected} onSelect={onSelect} />}
        {tab === 'activity' && <ActivityTab connected={connected} events={events} selected={selected} feed={demo.feed} />}
        {tab === 'skills' && <SkillsTab connected={connected} roster={roster} selected={selected} />}
      </div>

      {/* 대기열 — 선행 작업을 기다리는 작업 */}
      {connected && queue.length > 0 && (
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '6px 10px', fontSize: 11.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, letterSpacing: '.08em', color: INK }}>대기열</span>
            <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 10.5, border: `1px solid ${LINE}`, borderRadius: 3, padding: '0 5px' }}>{queue.length}</span>
            <span style={{ color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>선행 작업이 끝나면 담당이 겹치지 않게 차례로 시작</span>
          </div>
          {queue.slice(0, 3).map((t, i) => (
            <div key={t.id} style={{ display: 'flex', gap: 6, color: INK, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ color: MUTED }}>{i + 1}.</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: WYLIE_DARK }}>{t.id}</span>
              <span style={{ fontWeight: 700 }}>{nameOf(t.owner)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
              {t.depends_on && t.depends_on.length > 0 && <span style={{ color: MUTED, fontFamily: MONO, fontSize: 10.5 }}>← {t.depends_on.join(', ')}</span>}
            </div>
          ))}
        </div>
      )}

      <BriefingConsole instructUrl={instructUrl} onSubmitted={onSubmitted} />
    </section>
  );
});

// ── 작업 ──
function TasksTab({ connected, hive, selected, concurrency }: { connected: boolean; hive: HiveState | null; selected: string | null; concurrency?: { limit: number; running: number } }) {
  if (!connected || !hive) return <p style={smallMuted}>서버에 연결하면 팀장이 나눈 작업 원장이 여기에 보입니다. 지금은 데모 시나리오가 돕니다.</p>;
  const tasks = hive.tasks;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={h2Style}>작업판</h2>
        {hive.briefing && <span style={{ fontSize: 11.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={hive.briefing}>{hive.briefing}</span>}
        {concurrency && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}`, borderRadius: 999, padding: '1px 8px' }}>동시 {concurrency.running}/{concurrency.limit}</span>}
      </div>
      {!tasks.length && <p style={smallMuted}>브리핑을 보내면 팀장이 나눈 작업이 여기에 쌓입니다. 선행 작업이 없는 작업은 담당이 겹치지 않는 한 동시에 시작합니다.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {tasks.map((t) => <TaskCard key={t.id} t={t} dim={Boolean(selected) && t.owner !== selected && !(selected === 'go' && t.status === '검수')} />)}
      </div>
    </div>
  );
}

function TaskCard({ t, dim }: { t: HiveTask; dim: boolean }) {
  const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR['대기'];
  const file = t.output ? t.output.split('/').pop() : '';
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: PAPER, fontSize: 12.5, opacity: dim ? 0.42 : 1, transition: 'opacity .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WYLIE_DARK }}>{t.id}</span>
        <span style={{ fontWeight: 700 }}>{nameOf(t.owner)}</span>
        {t.stage && <span style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO }}>{t.stage}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: sc.bg, color: sc.fg }}>{t.status}</span>
      </div>
      <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{t.title}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: MUTED, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, color: GATE_COLOR[t.gate] ?? MUTED, whiteSpace: 'nowrap' }}>게이트 {t.gate}</span>
        {t.needs_approval && <span style={{ whiteSpace: 'nowrap', color: WARN_FG, fontWeight: 700 }}>승인 필요</span>}
        {t.depends_on && t.depends_on.length > 0 && <span style={{ whiteSpace: 'nowrap', fontFamily: MONO }}>← {t.depends_on.join(', ')}</span>}
        {Boolean(t.cost_usd) && <span style={{ whiteSpace: 'nowrap' }}>{usd(t.cost_usd)}</span>}
        {file && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 120px' }} title={t.output}>{file}</span>}
      </div>
      {t.qa_summary && ['실패', '보류'].includes(t.status) && <div style={{ fontSize: 11, color: t.status === '실패' ? BAD_FG : MUTED, marginTop: 3, lineHeight: 1.4 }}>{t.qa_summary}</div>}
    </div>
  );
}

// ── 승인 ──
function ApprovalsTab({ connected, apiBase, tasks, pending, approvals, demo }: { connected: boolean; apiBase?: string; tasks: HiveTask[]; pending: HiveApproval[]; approvals: HiveApproval[]; demo: DemoProps }) {
  const [by, setBy] = useState('재하');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!connected) {
    if (!demo.showApproval) return <p style={smallMuted}>데모: 결재 대기가 생기면 여기에 카드가 뜹니다.</p>;
    return (
      <div style={{ background: '#FBEED6', border: '1px solid #E8A33D', borderRadius: 10, padding: '10px 12px' }}>
        <p style={{ fontSize: 13, color: WARN_FG, fontWeight: 700, margin: 0 }}>{demo.approvalDesc}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', margin: '8px 0 10px', fontSize: 13, fontWeight: 700 }}>
          <span>{demo.approvalFile}</span><span style={{ color: OK_FG }}>{demo.approvalScore}</span>
        </div>
        <button type="button" className="apex-btn--approve" onClick={demo.onApprove}>결재하기(데모)</button>
      </div>
    );
  }

  const taskOf = (id: string) => tasks.find((t) => t.id === id);
  const decided = approvals.filter((a) => a.status !== 'pending').slice().reverse();

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    if (!reason.trim()) { setMsg('사유를 적어야 기록됩니다.'); return; }
    setBusy(true);
    const r = await postJson(`${apiBase}/api/approve`, { id, decision, by: by.trim() || '재하', reason: reason.trim() });
    setBusy(false);
    setMsg(r.ok ? `${id} ${decision === 'approved' ? '승인' : '반려'} 기록됨` : `실패: ${r.error}`);
    if (r.ok) setReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ ...h2Style, color: pending.length ? WARN_FG : MUTED }}>{pending.length ? `승인 대기 ${pending.length}건 — 해당 작업만 멈춤` : '승인 대기 없음'}</h2>
      </div>
      {pending.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="행위자" aria-label="행위자" style={{ ...inputStyle, marginTop: 0, width: 84, fontSize: 12.5, resize: undefined }} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (필수 — 없으면 기록되지 않음)" aria-label="사유" style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 12.5, resize: undefined }} />
          </div>
          {pending.map((a) => {
            const t = taskOf(a.task);
            return (
              <div key={a.id} style={{ background: '#FFF8EA', border: '1px solid #E8A33D', borderRadius: 9, padding: '9px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WARN_FG }}>{a.id}</span>
                  <span style={{ fontWeight: 700 }}>{a.kind}</span>
                  {a.payload?.gate && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: GATE_COLOR[a.payload.gate] ?? MUTED }}>QA {a.payload.gate}</span>}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{t ? `${t.id} ${nameOf(t.owner)} · ${t.title}` : a.reason || a.task}</div>
                {a.payload?.output && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.payload.output}>{a.payload.output}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button type="button" className="apex-btn--approve" style={{ flex: 1, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => decide(a.id, 'approved')}>승인</button>
                  <button type="button" className="apex-btn apex-btn--ghost" style={{ flex: 1, color: BAD_FG }} disabled={busy} onClick={() => decide(a.id, 'rejected')}>반려</button>
                </div>
              </div>
            );
          })}
        </>
      )}
      {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: /^(실패|사유)/.test(msg) ? BAD_FG : OK_FG }}>{msg}</p>}
      {decided.length > 0 && (
        <div>
          <h2 style={{ ...h2Style, marginBottom: 6 }}>결정 기록</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {decided.map((a) => (
              <li key={a.id} style={{ fontSize: 12, borderBottom: `1px dashed ${LINE_SOFT}`, padding: '4px 0', display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: MUTED }}>{a.id}</span>
                <span style={{ fontWeight: 800, color: a.status === 'approved' ? OK_FG : BAD_FG }}>{a.status === 'approved' ? '승인' : '반려'}</span>
                <span>{a.task}</span>
                <span style={{ color: MUTED }}>{a.decided_by} · {a.decision_reason}</span>
                <span style={{ marginLeft: 'auto', color: MUTED, fontFamily: MONO, fontSize: 11 }}>{clock(a.decided_at ?? undefined)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 기억 ──
function MemoryTab({ connected, apiBase, selected, onSelect }: { connected: boolean; apiBase?: string; selected: string | null; onSelect: (id: string | null) => void }) {
  const url = connected && selected ? `${apiBase}/api/memory/${encodeURIComponent(selected)}` : undefined;
  const { data, error } = usePolling<{ agent: string; content: string }>(url, 10000);
  if (!connected) return <p style={smallMuted}>서버에 연결하면 에이전트별 기억(hive/memory)이 보입니다.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: INK }}>
        에이전트
        <select value={selected ?? ''} onChange={(e) => onSelect(e.target.value || null)} style={{ ...inputStyle, marginTop: 0, width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
          <option value="">선택…</option>
          {AGENT_ORDER.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
        </select>
      </label>
      {!selected && <p style={smallMuted}>아래 에이전트 카드를 누르거나 위에서 고르면 그 사람의 기억 파일을 보여 줍니다.</p>}
      {selected && error && <p style={{ ...smallMuted, color: BAD_FG }}>기억 파일을 읽지 못했습니다.</p>}
      {selected && data && (data.content.trim()
        ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.6, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 9, padding: '10px 12px' }}>{data.content.trim()}</pre>
        : <p style={smallMuted}>{`${nameOf(selected)}의 기억이 아직 없습니다. 작업이 끝날 때 회신의 '기억할 것'이 3줄 이내로 쌓입니다.`}</p>)}
    </div>
  );
}

// ── 활동 ──
function ActivityTab({ connected, events, selected, feed }: { connected: boolean; events: HiveEvent[]; selected: string | null; feed: FeedItem[] }) {
  if (!connected) {
    if (!feed.length) return <p style={smallMuted}>데모 활동이 여기에 기록됩니다.</p>;
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {feed.map((f, i) => (
          <li key={f.t + f.who + i} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: `1px dashed ${LINE_SOFT}`, display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, whiteSpace: 'nowrap' }}>{f.t}</span>
            <span style={{ fontWeight: 800, color: f.whoColor, whiteSpace: 'nowrap' }}>{f.who}</span>
            <span>{f.msg}</span>
          </li>
        ))}
      </ul>
    );
  }
  const list = (selected ? events.filter((e) => involves(e, selected)) : events).slice().reverse().slice(0, 200);
  return (
    <div>
      <p style={{ ...smallMuted, marginBottom: 6 }}>{selected ? `${nameOf(selected)} 관련 활동만 보입니다.` : 'hive 이벤트 로그(events.log)를 3초마다 이어 받습니다.'}</p>
      {!list.length && <p style={smallMuted}>아직 기록된 활동이 없습니다.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.map((e, i) => {
          const d = describe(e);
          return (
            <li key={`${e.ts}-${i}`} style={{ fontSize: 12.5, padding: '4px 0', borderBottom: `1px dashed ${LINE_SOFT}`, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, whiteSpace: 'nowrap' }}>{clock(e.ts)}</span>
              <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{d.who}</span>
              <span style={{ color: d.color, minWidth: 0, overflowWrap: 'anywhere' }}>{d.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── 스킬 ──
function SkillsTab({ connected, roster, selected }: { connected: boolean; roster: RosterMember[] | null; selected: string | null }) {
  if (!connected || !roster) return <p style={smallMuted}>서버에 연결하면 역할별 스킬(업무 지침서)과 이 PC 에서 쓸 수 있는지가 보입니다.</p>;
  if (selected === 'lead') return <p style={smallMuted}>팀장은 스킬 없이 브리핑 분해·배정·추적·보고만 합니다(.claude/agents/leader.md).</p>;
  const members = roster.filter((m) => m.id !== 'lead' && (!selected || m.id === selected));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={smallMuted}>작업마다 서버가 스킬 지침을 찾아 에이전트 지시문에 넣습니다. 이 PC 에 없는 사내 스킬은 공용 스킬로 대체되거나 건너뜁니다.</p>
      {members.map((m) => (
        <div key={m.id} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: PAPER }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{m.name}</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>{m.role}</span>
          </div>
          {!m.skills.length && <span style={{ fontSize: 12, color: MUTED }}>연결된 스킬 없음 — 페르소나만으로 작업</span>}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {m.skills.map((s) => (
              <span key={s.spec} title={s.available ? `사용: ${s.name}` : `이 PC 에 없음: ${s.spec}`} style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, padding: '2px 8px', borderRadius: 999, border: `1px solid ${s.available ? '#9FD3B1' : LINE}`, background: s.available ? '#EEF8F1' : '#F2EFE7', color: s.available ? OK_FG : MUTED, textDecoration: s.available ? 'none' : 'line-through' }}>
                {s.name ?? s.spec}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
