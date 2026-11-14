import type { FeedItem } from './officeSimulator';
import type { HiveEvent } from './officeApi';
import { breakerReason, gateLabel, kindLabel, statusLabel, useOfficeLang } from './i18n';
import type { TFn, Lang } from './i18n';
import { SIM_TEXT } from './simText';
import { BAD_FG, INK, LINE_SOFT, MONO, MUTED, OK_FG, WARN_FG, WYLIE_DARK, clock, smallMuted, tok } from './officeTheme';

interface ActivityTabProps {
  connected: boolean;
  events: HiveEvent[];
  selected: string | null;
  feed: FeedItem[];
}

/** 이벤트 1건 → 사람이 읽는 한 줄(한·영). */
function describe(e: HiveEvent, t: TFn, lang: Lang, name: (id?: string) => string): { who: string; text: string; color: string } {
  switch (e.kind) {
    case 'briefing':
      return { who: name('jaeha'), text: t('ev.briefing', { title: e.title ?? '' }), color: WYLIE_DARK };
    case 'task': {
      const gate = e.gate && e.gate !== '미점검' ? ` · ${t('tasks.gate', { g: gateLabel(lang, e.gate) })}` : '';
      const color = e.status === '실패' ? BAD_FG : e.status === '승인대기' ? WARN_FG : e.status === '완료' ? OK_FG : INK;
      return { who: name(e.owner), text: t('ev.task', { id: e.id ?? '', title: e.title ?? '', status: statusLabel(lang, e.status ?? ''), gate }) + (e.note ? ` (${e.note})` : ''), color };
    }
    case 'mail':
      return { who: name(e.from), text: t('ev.mail', { to: name(e.to), what: SIM_TEXT[lang].feed.mailType[e.type ?? ''] ?? e.type ?? '', task: e.task ? ` (${e.task})` : '' }), color: INK };
    case 'approval':
      if (e.status === 'pending') return { who: name('lead'), text: t('ev.approvalPending', { id: e.id ?? '', task: e.task ?? '', kind: kindLabel(lang, e.approval_kind ?? '') }), color: WARN_FG };
      return { who: e.by || name('jaeha'), text: t('ev.approvalDone', { id: e.id ?? '', d: t(e.status === 'approved' ? 'ap.approved' : 'ap.rejected'), task: e.task ?? '' }), color: e.status === 'approved' ? OK_FG : BAD_FG };
    case 'usage':
      return { who: name(e.agent), text: t('ev.usage', { what: e.what || '', v: tok(e.tokens_w) }), color: MUTED };
    case 'question':
      return e.status === 'answered'
        ? { who: e.by || name('jaeha'), text: t('ev.questionAnswered', { id: e.id ?? '' }), color: OK_FG }
        : { who: name(e.from), text: t('ev.question', { id: e.id ?? '', task: e.task ? ` (${e.task})` : '' }), color: WARN_FG };
    case 'queue':
      return { who: name(e.by === 'lead' ? 'lead' : 'jaeha'), text: t('ev.queue', { id: e.id ?? '', kind: t(`queue.kind.${e.item_kind}`), status: t(`queue.status.${e.status}`) }), color: MUTED };
    case 'breaker':
      return { who: name(e.agent), text: t('ev.breaker', { level: t(`lv.${e.level}`), reason: e.reason ? ` — ${breakerReason(lang, e)}` : '' }), color: e.level === 'normal' ? OK_FG : BAD_FG };
    case 'agent':
      return { who: name('jaeha'), text: t(e.action === 'remove' ? 'ev.agentRemove' : 'ev.agentAdd', { id: e.id ?? '' }), color: WYLIE_DARK };
    case 'leader_reply':
      return { who: name('lead'), text: t('ev.leaderReply', { id: e.id ?? '' }), color: WYLIE_DARK };
    case 'inbox_done':
      return { who: name(e.agent), text: t('ev.inboxDone', { n: e.count ?? 0 }), color: MUTED };
    case 'trigger': {
      // 예약 — 추가·켜기·끄기·변경·삭제·실행·놓침. 실행은 예약이 대기열에 넣은 브리핑(item)을 함께 적는다.
      const action = e.action ?? 'update';
      const who = action === 'missed' || (action === 'run' && e.why === 'schedule') ? t('ev.triggerWho') : name(e.by || 'jaeha');
      return { who, text: t(`ev.trigger_${action}`, { id: e.id ?? '', title: e.title ?? '', item: e.item ?? '' }), color: action === 'missed' ? BAD_FG : WYLIE_DARK };
    }
    case 'revise':
      // QA 반려 뒤 1회 자동 보완(orchestrator) — 같은 담당이 지적을 받아 다시 쓴다
      return { who: name(e.owner), text: t('ev.revise', { id: e.id ?? '', title: e.title ?? '', n: e.count ?? 0 }), color: WARN_FG };
    case 'template':
      return { who: name(e.by || 'jaeha'), text: t(e.action === 'remove' ? 'ev.template_remove' : 'ev.template_add', { id: e.id ?? '', title: e.title ?? '' }), color: WYLIE_DARK };
    default:
      return { who: e.kind, text: e.title || e.id || '', color: MUTED };
  }
}

function involves(e: HiveEvent, id: string): boolean {
  return e.owner === id || e.from === id || e.to === id || e.agent === id;
}

/** 활동 탭 — hive 이벤트 로그를 3초마다 이어 받는다. 서버가 없으면 데모 피드. */
export function ActivityTab({ connected, events, selected, feed }: ActivityTabProps) {
  const { t, lang, name } = useOfficeLang();
  if (!connected) {
    if (!feed.length) return <p style={smallMuted}>{t('act.demoEmpty')}</p>;
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
      <p style={{ ...smallMuted, marginBottom: 6 }}>{selected ? t('act.filtered', { name: name(selected) }) : t('act.all')}</p>
      {!list.length && <p style={smallMuted}>{t('act.empty')}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.map((e, i) => {
          const d = describe(e, t, lang, name);
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
