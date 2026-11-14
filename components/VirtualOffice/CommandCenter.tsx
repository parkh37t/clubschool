import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Brain, CalendarClock, ChevronDown, Gauge, Layers, LayoutTemplate, ListChecks, MessageCircleQuestion, MessagesSquare, MoreHorizontal, Network, Sparkles, SquareTerminal, Stamp, Zap } from 'lucide-react';
import type { FeedItem, HiveState } from './officeSimulator';
import { usePolling } from './officeApi';
import type { AgentStatus, BriefingPrefill, BriefingTemplate, HiveEvent, Question, QueueResponse, RosterMember } from './officeApi';
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
import { TalkTab } from './TalkTab';
import { TemplatesTab } from './TemplatesTab';
import { PlanTab } from './PlanTab';
import { statusLabel, useOfficeLang } from './i18n';
import { INK, LINE, MONO, MUTED, STATUS_COLOR, WYLIE, WYLIE_DARK, WYLIE_TINT } from './officeTheme';

export type CommandTab = 'tasks' | 'plan' | 'approvals' | 'questions' | 'memory' | 'activity' | 'skills' | 'terminal' | 'monitor' | 'triggers' | 'graph' | 'talk' | 'templates';

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
  /** 기획 탭의 [설정 열기] */
  onOpenSettings?: () => void;
  onSubmitted: (title: string) => void;
}

// 탭 — 자주 쓰는 여섯 개는 한 줄로 늘 보이고(아이콘 + 이름 + 건수), 나머지는 '더보기' 메뉴에 둔다(GitHub·Linear 의 탭 막대 방식).
const TAB_META: Record<CommandTab, { label: string; icon: LucideIcon }> = {
  tasks: { label: 'tab.tasks', icon: ListChecks },
  plan: { label: 'tab.plan', icon: Layers },
  approvals: { label: 'tab.approvals', icon: Stamp },
  questions: { label: 'tab.questions', icon: MessageCircleQuestion },
  talk: { label: 'tab.talk', icon: MessagesSquare },
  terminal: { label: 'tab.terminal', icon: SquareTerminal },
  monitor: { label: 'tab.monitor', icon: Gauge },
  templates: { label: 'tab.templates', icon: LayoutTemplate },
  triggers: { label: 'tab.triggers', icon: CalendarClock },
  memory: { label: 'tab.memory', icon: Brain },
  activity: { label: 'tab.activity', icon: Activity },
  graph: { label: 'tab.graph', icon: Network },
  skills: { label: 'tab.skills', icon: Sparkles },
};
const PRIMARY_TABS: CommandTab[] = ['tasks', 'plan', 'approvals', 'questions', 'talk', 'terminal'];
const MORE_TABS: CommandTab[] = ['monitor', 'templates', 'triggers', 'memory', 'activity', 'graph', 'skills'];

/**
 * 오른쪽 커맨드 센터 — 머리(팀장·상태·자동 진행) → 탭 막대(주 탭 다섯 + 더보기) → 상태 줄 → 탭 내용 → 대기열 → 입력창.
 * 사무실 시계가 0.1초마다 다시 그리므로 memo 로 감싼다.
 */
export const CommandCenter = memo(function CommandCenter({ tab, onTab, hive, apiBase, selected, onSelect, roster, events, concurrency, mode, demo, instructUrl, onSubmitted, onOpenSettings }: CommandCenterProps) {
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
  // 템플릿 탭 → 입력창 채우기. 고를 때마다 nonce 가 바뀌어 같은 템플릿을 다시 골라도 다시 채운다.
  const [prefill, setPrefill] = useState<BriefingPrefill | null>(null);
  const applyTemplate = useCallback((tpl: BriefingTemplate) => {
    setPrefill({ nonce: Date.now(), title: tpl.title, result: tpl.result, context: tpl.context, constraints: [...tpl.constraints] });
  }, []);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [moreOpen]);
  const pickTab = (k: CommandTab) => { onTab(k); setMoreOpen(false); };
  // 탭 목록 안에서 ←/→ 로 주 탭을 옮긴다(WAI-ARIA tabs 패턴)
  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PRIMARY_TABS.indexOf(tab);
    const next = PRIMARY_TABS[((i < 0 ? 0 : i) + (e.key === 'ArrowRight' ? 1 : PRIMARY_TABS.length - 1)) % PRIMARY_TABS.length];
    e.preventDefault();
    onTab(next);
    requestAnimationFrame(() => document.getElementById(`axo-tab-${next}`)?.focus());
  };

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

      {/* 탭 — 주 탭 다섯 + 더보기 */}
      <div role="tablist" aria-label={t('cc.title')} className="axo-tabbar" onKeyDown={onTabKey}>
        {PRIMARY_TABS.map((k) => {
          const { icon: Icon, label: lk } = TAB_META[k];
          const on = tab === k;
          const b = badge(k);
          const label = t(lk);
          return (
            <button key={k} id={`axo-tab-${k}`} role="tab" type="button" aria-selected={on} aria-controls="axo-tabpanel"
              tabIndex={on || (k === 'tasks' && !PRIMARY_TABS.includes(tab)) ? 0 : -1} title={label} onClick={() => pickTab(k)} className="axo-tabbar-item">
              <span className="axo-tabbar-icon"><Icon size={16} aria-hidden />{b.n > 0 && <span className="axo-tabbar-badge" style={{ background: b.color }}>{b.n > 99 ? '99+' : b.n}</span>}</span>
              <span className="axo-tabbar-label">{label}</span>
            </button>
          );
        })}
        <div ref={moreRef} className="axo-more">
          {(() => {
            const cur = MORE_TABS.includes(tab) ? TAB_META[tab] : null;
            const Icon = cur ? cur.icon : MoreHorizontal;
            const moreBadge = MORE_TABS.reduce((n, k) => n + (k === tab ? 0 : badge(k).n), 0);
            return (
              <button type="button" className="axo-tabbar-item" data-active={Boolean(cur)} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)} title={t('tab.more')}>
                <span className="axo-tabbar-icon"><Icon size={16} aria-hidden />{moreBadge > 0 && <span className="axo-tabbar-badge" style={{ background: '#B24A3A' }}>{moreBadge}</span>}</span>
                <span className="axo-tabbar-label">{cur ? t(cur.label) : t('tab.more')}<ChevronDown size={10} aria-hidden style={{ marginLeft: 1, verticalAlign: 'middle' }} /></span>
              </button>
            );
          })()}
          {moreOpen && (
            <div role="menu" aria-label={t('tab.more')} className="axo-more-menu">
              {MORE_TABS.map((k) => {
                const { icon: Icon, label: lk } = TAB_META[k];
                const b = badge(k);
                return (
                  <button key={k} type="button" role="menuitemradio" aria-checked={tab === k} className="axo-more-item" onClick={() => pickTab(k)}>
                    <Icon size={15} aria-hidden />
                    <span style={{ flex: 1 }}>{t(lk)}</span>
                    {b.n > 0 && <span className="axo-more-count" style={{ background: b.color }}>{b.n}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
      <div id="axo-tabpanel" role="tabpanel" style={{ flex: 1, minHeight: 90, overflowY: tab === 'terminal' || tab === 'graph' ? 'hidden' : 'auto', padding: '10px 12px 12px' }}>
        {tab === 'tasks' && <TasksTab connected={connected} hive={hive} selected={selected} concurrency={concurrency} apiBase={apiBase} />}
        {tab === 'approvals' && <ApprovalsTab connected={connected} apiBase={apiBase} tasks={tasks} pending={pending} approvals={hive?.approvals ?? []} demo={demo} />}
        {tab === 'questions' && <QuestionsTab connected={connected} apiBase={apiBase} selected={selected} />}
        {tab === 'memory' && <MemoryTab connected={connected} apiBase={apiBase} selected={selected} onSelect={onSelect} roster={roster} />}
        {tab === 'activity' && <ActivityTab connected={connected} events={events} selected={selected} feed={demo.feed} />}
        {tab === 'skills' && <SkillsTab connected={connected} apiBase={apiBase} roster={roster} selected={selected} />}
        {tab === 'terminal' && <TerminalTab connected={connected} apiBase={apiBase} selected={selected} roster={roster} />}
        {tab === 'monitor' && <MonitorTab connected={connected} apiBase={apiBase} roster={roster} selected={selected} />}
        {tab === 'triggers' && <TriggersTab connected={connected} apiBase={apiBase} />}
        {tab === 'graph' && <GraphTab connected={connected} apiBase={apiBase} currentBriefing={hive?.briefing} selected={selected} onSelect={onSelect} />}
        {tab === 'talk' && <TalkTab connected={connected} apiBase={apiBase} selected={selected} roster={roster} />}
        {tab === 'templates' && <TemplatesTab connected={connected} apiBase={apiBase} onUse={applyTemplate} />}
        {tab === 'plan' && <PlanTab connected={connected} apiBase={apiBase} onUse={applyTemplate} onOpenSettings={onOpenSettings} />}
      </div>

      <QueueStrip apiBase={apiBase} queue={queue.data} onChange={queue.refresh} />
      <BriefingConsole instructUrl={instructUrl} onSubmitted={onSubmitted} onQueued={queue.refresh} prefill={prefill} onOpenTemplates={() => onTab('templates')} />
    </section>
  );
});
