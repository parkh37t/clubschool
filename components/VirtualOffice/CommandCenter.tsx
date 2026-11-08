import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Brain, CalendarClock, Gauge, ListChecks, MessageCircleQuestion, Network, Sparkles, SquareTerminal, Stamp, Zap } from 'lucide-react';
import type { FeedItem, HiveState } from './officeSimulator';
import { usePolling } from './officeApi';
import type { AgentStatus, HiveEvent, Question, QueueResponse, RosterMember } from './officeApi';
import { BriefingConsole } from './BriefingConsole';
import { PixelAvatar } from './PixelAvatar';
import { QueueStrip } from './QueueStrip';
import { TasksTab } from './TasksTab';
import { ApprovalsTab } from './ApprovalsTab';
import { QuestionsTab } from './QuestionsTab';
import { MemoryTab } from './MemoryTab';
import { ActivityTab } from './ActivityTab';
import { SkillsTab } from './SkillsTab';
import { TerminalTab } from './TerminalTab';
import { MonitorTab } from './MonitorTab';
import { TriggersTab } from './TriggersTab';
import { GraphTab } from './GraphTab';
import { statusLabel, useOfficeLang } from './i18n';
import { INK, LINE, MONO, MUTED, STATUS_COLOR, WYLIE, WYLIE_DARK, WYLIE_TINT } from './officeTheme';

export type CommandTab = 'tasks' | 'approvals' | 'questions' | 'memory' | 'activity' | 'skills' | 'terminal' | 'monitor' | 'triggers' | 'graph';

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
  /** 입력창(패널 맨 아래) */
  instructUrl?: string;
  onSubmitted: (title: string) => void;
}

// 탭 격자 — Munder Difflin 의 COMMAND CENTER 탭 자리(5칸 × 2줄).
const TABS: { key: CommandTab; label: string; icon: LucideIcon }[] = [
  { key: 'tasks', label: 'tab.tasks', icon: ListChecks },
  { key: 'approvals', label: 'tab.approvals', icon: Stamp },
  { key: 'questions', label: 'tab.questions', icon: MessageCircleQuestion },
  { key: 'memory', label: 'tab.memory', icon: Brain },
  { key: 'activity', label: 'tab.activity', icon: Activity },
  { key: 'skills', label: 'tab.skills', icon: Sparkles },
  { key: 'terminal', label: 'tab.terminal', icon: SquareTerminal },
  { key: 'monitor', label: 'tab.monitor', icon: Gauge },
  { key: 'triggers', label: 'tab.triggers', icon: CalendarClock },
  { key: 'graph', label: 'tab.graph', icon: Network },
];

/**
 * 오른쪽 커맨드 센터 — 머리(팀장·상태·자동 진행) → 탭 격자 → 상태 줄 → 탭 내용 → 대기열 → 입력창.
 * 사무실 시계가 0.1초마다 다시 그리므로 memo 로 감싼다.
 */
export const CommandCenter = memo(function CommandCenter({ tab, onTab, hive, apiBase, selected, onSelect, roster, events, concurrency, mode, demo, instructUrl, onSubmitted }: CommandCenterProps) {
  const { t, lang, name } = useOfficeLang();
  const connected = apiBase !== undefined && hive !== null;
  const queue = usePolling<QueueResponse>(connected ? `${apiBase}/api/queue` : undefined, 2000);
  const questions = usePolling<{ questions: Question[] }>(connected ? `${apiBase}/api/questions` : undefined, 6000);
  const tasks = hive?.tasks ?? [];
  const pending = hive?.pending ?? [];
  const activeCount = tasks.filter((x) => ['진행', '검수', '승인대기'].includes(x.status)).length;
  const openQ = (questions.data?.questions ?? []).filter((q) => q.status === 'open').length;
  const leader = roster?.find((m) => m.id === 'lead');
  const leaderStatus: AgentStatus = leader?.status ?? '대기';
  const ls = STATUS_COLOR[leaderStatus] ?? STATUS_COLOR['대기'];
  const stopped = (roster ?? []).filter((m) => m.breaker?.level === 'stop').length;

  const badge = (key: CommandTab): { n: number; color: string } => {
    if (key === 'approvals') return { n: connected ? pending.length : demo.showApproval ? 1 : 0, color: '#E8A33D' };
    if (key === 'tasks') return { n: activeCount, color: WYLIE };
    if (key === 'questions') return { n: openQ, color: '#E8A33D' };
    if (key === 'monitor') return { n: stopped, color: '#B24A3A' };
    return { n: 0, color: WYLIE };
  };

  return (
    <section aria-label={t('cc.title')} className="axo-cc">
      {/* 머리 — 팀장과 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px 8px' }}>
        <PixelAvatar id="lead" size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5, letterSpacing: '.12em', color: INK }}>{t('cc.title')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: MUTED, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, background: ls.bg, color: ls.fg, border: `1px solid ${ls.fg}33`, whiteSpace: 'nowrap' }}>{statusLabel(lang, leaderStatus)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leader?.task || t('cc.leadIdle')}</span>
          </div>
        </div>
        <span title={t('cc.autoTitle')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: WYLIE_DARK, border: `1px solid ${LINE}`, background: '#fff', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>
          <Zap size={12} aria-hidden />{t('cc.auto')}
        </span>
      </div>

      {/* 탭 격자 */}
      <div role="tablist" aria-label={t('cc.title')} className="axo-tabs">
        {TABS.map((x) => {
          const Icon = x.icon;
          const on = tab === x.key;
          const b = badge(x.key);
          const label = t(x.label);
          return (
            <button
              key={x.label}
              role="tab"
              type="button"
              aria-selected={on}
              title={label}
              onClick={() => onTab(x.key)}
              className="axo-tab"
            >
              <Icon size={13} aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              {b.n > 0 && <span className="axo-tab-badge" style={{ background: b.color }}>{b.n}</span>}
            </button>
          );
        })}
      </div>

      {/* 상태 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 11, color: MUTED, borderBottom: `1px dashed ${LINE}` }}>
        <span aria-hidden style={{ width: 7, height: 7, flexShrink: 0, background: connected ? '#2D8C4E' : '#B9B2A2' }} />
        <span style={{ fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {connected ? `${t('cc.connected')} · ${mode ?? ''}${concurrency ? ` · ${t('top.concurrency', { r: concurrency.running, l: concurrency.limit })}` : ''}` : t('cc.demo')}
        </span>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} title={t('cc.clearSel')} style={{ marginLeft: 'auto', font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${WYLIE}`, background: WYLIE_TINT, color: WYLIE_DARK, borderRadius: 999, padding: '0 8px', whiteSpace: 'nowrap' }}>
            {name(selected)} ×
          </button>
        )}
      </div>

      {/* 탭 내용 */}
      <div role="tabpanel" style={{ flex: 1, minHeight: 90, overflowY: tab === 'terminal' || tab === 'graph' ? 'hidden' : 'auto', padding: '10px 12px 12px' }}>
        {tab === 'tasks' && <TasksTab connected={connected} hive={hive} selected={selected} concurrency={concurrency} />}
        {tab === 'approvals' && <ApprovalsTab connected={connected} apiBase={apiBase} tasks={tasks} pending={pending} approvals={hive?.approvals ?? []} demo={demo} />}
        {tab === 'questions' && <QuestionsTab connected={connected} apiBase={apiBase} selected={selected} />}
        {tab === 'memory' && <MemoryTab connected={connected} apiBase={apiBase} selected={selected} onSelect={onSelect} roster={roster} />}
        {tab === 'activity' && <ActivityTab connected={connected} events={events} selected={selected} feed={demo.feed} />}
        {tab === 'skills' && <SkillsTab connected={connected} roster={roster} selected={selected} />}
        {tab === 'terminal' && <TerminalTab connected={connected} apiBase={apiBase} selected={selected} roster={roster} />}
        {tab === 'monitor' && <MonitorTab connected={connected} apiBase={apiBase} roster={roster} selected={selected} />}
        {tab === 'triggers' && <TriggersTab connected={connected} apiBase={apiBase} />}
        {tab === 'graph' && <GraphTab connected={connected} apiBase={apiBase} currentBriefing={hive?.briefing} selected={selected} onSelect={onSelect} />}
      </div>

      <QueueStrip apiBase={apiBase} queue={queue.data} onChange={queue.refresh} />
      <BriefingConsole instructUrl={instructUrl} onSubmitted={onSubmitted} onQueued={queue.refresh} />
    </section>
  );
});
