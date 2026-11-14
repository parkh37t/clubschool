import { useState } from 'react';
import { usePolling } from './officeApi';
import type { MailMessage, MailResponse, RosterMember } from './officeApi';
import { PixelAvatar } from './PixelAvatar';
import { useOfficeLang } from './i18n';
import { INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE_DARK, WYLIE_TINT, BAD_FG, h2Style, smallMuted } from './officeTheme';

interface TalkTabProps {
  connected: boolean;
  apiBase?: string;
  selected: string | null;
  roster: RosterMember[] | null;
}

// 메시지 유형 칩 색 — 같은 의미는 다른 탭과 같은 색(질문=주황, 회신=초록, 승인 요청=짙은 주황).
const TYPE_COLOR: Record<string, { bg: string; fg: string }> = {
  assign: { bg: WYLIE_TINT, fg: WYLIE_DARK },
  result: { bg: '#DFF2E6', fg: OK_FG },
  question: { bg: '#FBEED6', fg: WARN_FG },
  answer: { bg: '#E6EEF8', fg: '#2F5A8C' },
  approval: { bg: '#FBE7D3', fg: '#B5621B' },
  report: { bg: '#F2EFE7', fg: INK },
};
const LONG = 220; // 이보다 길거나 5줄이 넘으면 접어서 보여 준다

/** 오늘이면 HH:MM, 다른 날이면 MM-DD HH:MM(이 PC 기준). */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const z = (n: number) => String(n).padStart(2, '0');
  const hm = `${z(d.getHours())}:${z(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? hm : `${z(d.getMonth() + 1)}-${z(d.getDate())} ${hm}`;
}

/**
 * 대화 탭 — 팀장·역할 에이전트·재하가 hive 메일함으로 주고받은 메시지를 메신저처럼 보여 준다(최신이 위).
 * 배정(지시)·회신·질문·답·승인 요청·보고. 재하가 보낸 것은 오른쪽에 붙는다. 선택된 사람이 있으면 그 사람 대화만.
 * 서버(/api/mail)가 본문을 앞 600자로 줄이고 자료 울타리 안(고객 원문 등)은 '(첨부 자료 생략)'으로 바꿔 보낸다.
 */
export function TalkTab({ connected, apiBase, selected, roster }: TalkTabProps) {
  const { t, name } = useOfficeLang();
  const url = connected ? `${apiBase}/api/mail?limit=80${selected ? `&agent=${encodeURIComponent(selected)}` : ''}` : undefined;
  const { data, error } = usePolling<MailResponse>(url, 4000);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!connected) return <p style={smallMuted}>{t('talk.offline')}</p>;
  const list: MailMessage[] = data?.messages ?? [];
  const lookOf = (id: string) => roster?.find((m) => m.id === id)?.look ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <h2 style={h2Style}>{t('talk.title', { n: list.length })}</h2>
        <p style={{ ...smallMuted, fontSize: 11, marginTop: 2 }}>{selected ? t('talk.filtered', { name: name(selected) }) : t('talk.all')}</p>
      </div>
      {error && !data && <p style={{ ...smallMuted, color: BAD_FG }}>{t('talk.fail')}</p>}
      {data && !list.length && <p style={smallMuted}>{t('talk.empty')}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {list.map((m) => {
          const mine = m.from === 'jaeha';
          const tc = TYPE_COLOR[m.type] ?? TYPE_COLOR.report;
          const long = m.body.length > LONG || m.body.split('\n').length > 5;
          const expanded = Boolean(open[m.id]);
          return (
            <li key={m.id} style={{ display: 'flex', gap: 7, flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <PixelAvatar id={m.from} size={28} look={lookOf(m.from)} />
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 11.5, justifyContent: mine ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                  <span style={{ fontWeight: 800, color: INK }}>{name(m.from)}</span>
                  <span style={{ color: MUTED }}>{t('talk.to')} {name(m.to)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, background: tc.bg, color: tc.fg, whiteSpace: 'nowrap' }}>{t(`talk.type.${m.type}`)}</span>
                  {m.task && <span style={{ fontFamily: MONO, fontSize: 10.5, color: WYLIE_DARK }}>{m.task}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED }}>{stamp(m.ts)}</span>
                </div>
                <div
                  style={{
                    marginTop: 3, maxWidth: '96%', boxSizing: 'border-box', padding: '6px 10px', fontSize: 12.5, lineHeight: 1.5, color: INK,
                    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: `1px solid ${mine ? '#C9B8E6' : LINE}`,
                    background: mine ? WYLIE_TINT : m.type === 'question' ? '#FFF8EA' : PAPER,
                    borderRadius: mine ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
                    ...(long && !expanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } : {}),
                  }}
                >
                  {m.body || '—'}
                </div>
                {(long || m.truncated) && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    {long && (
                      <button type="button" onClick={() => setOpen((o) => ({ ...o, [m.id]: !expanded }))} aria-expanded={expanded}
                        style={{ font: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', color: WYLIE_DARK, padding: 0 }}>
                        {expanded ? t('talk.less') : t('talk.more')}
                      </button>
                    )}
                    {m.truncated && expanded && <span style={{ fontSize: 10.5, color: MUTED, borderLeft: `1px solid ${LINE_SOFT}`, paddingLeft: 8 }}>{t('talk.cut')}</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
