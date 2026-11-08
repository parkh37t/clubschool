import type { AgentLookLite, AgentStatus, BreakerLevel } from './officeApi';
import { PixelAvatar } from './PixelAvatar';
import { statusLabel, useOfficeLang } from './i18n';
import { BREAKER_COLOR, FONT, INK, LINE, MONO, MUTED, STATUS_COLOR, WYLIE, WYLIE_DARK, WYLIE_TINT, usd } from './officeTheme';

export interface AgentCardData {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  task: string;
  usd: number;
  custom?: boolean;
  look?: AgentLookLite | null;
  level?: BreakerLevel;
  levelReason?: string;
}

interface AgentCardsProps {
  members: AgentCardData[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** 서버 연결 여부(미연결이면 데모 상태라고 알린다) */
  connected: boolean;
  /** 인원 추가 창 열기. 없으면 버튼을 끈다(서버 미연결). */
  onAdd?: () => void;
  canAdd: boolean;
}

const BAR: Record<AgentStatus, string> = { '대기': '#C9C2B0', '진행': '#2D8C4E', '검수': '#4A7DBF', '승인대기': '#E8A33D' };

/**
 * 하단 에이전트 바 — 팀장 + 역할 에이전트(추가 인원 포함) 카드를 가로 한 줄로(Munder Difflin 의 하단 카드 자리).
 * 누르면 사무실 책상 강조 + 커맨드 센터의 기억·활동·터미널이 그 사람으로 좁혀진다. 사용량은 CLI 추정 금액(청구서 아님).
 */
export function AgentCards({ members, selected, onSelect, connected, onAdd, canAdd }: AgentCardsProps) {
  const { t, lang } = useOfficeLang();
  return (
    <section aria-label={t('ag.aria')} className="axo-agents">
      {members.map((m) => {
        const on = selected === m.id;
        const lead = m.id === 'lead';
        const sc = STATUS_COLOR[m.status] ?? STATUS_COLOR['대기'];
        const lv = m.level && m.level !== 'normal' ? m.level : null;
        const bc = lv ? BREAKER_COLOR[lv] : null;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(on ? null : m.id)}
            title={`${m.name} · ${m.role}${m.task ? `\n${m.task}` : ''}${lv ? `\n${t(`lv.${lv}`)}: ${m.levelReason ?? ''}` : ''}${connected ? `\n${t('ag.usage', { v: usd(m.usd) })}` : ''}`}
            className="axo-agent"
            style={{
              fontFamily: FONT,
              borderColor: on ? WYLIE : lv === 'stop' ? '#D9A49A' : lead ? '#C9B8E6' : LINE,
              boxShadow: on ? `0 0 0 2px ${WYLIE}` : lead ? 'inset 0 0 0 1px #E4D9F3' : 'none',
              background: on ? WYLIE_TINT : lead ? '#F8F4FC' : '#FFFDF8',
            }}
          >
            <PixelAvatar id={m.id} look={m.look} size={38} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: lead ? WYLIE_DARK : INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                {lead && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: WYLIE, borderRadius: 3, padding: '0 4px' }}>{t('ag.leadBadge')}</span>}
                {m.custom && <span title={t('ag.custom')} style={{ fontSize: 9.5, fontWeight: 800, color: WYLIE_DARK, border: `1px solid ${WYLIE}`, borderRadius: 3, padding: '0 3px' }}>+</span>}
                <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, border: `1px solid ${sc.fg}33`, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>{statusLabel(lang, m.status)}</span>
              </span>
              <span style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 6, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role}</span>
                {lv && bc && <span style={{ fontSize: 10, fontWeight: 800, color: bc.fg, background: bc.bg, borderRadius: 3, padding: '0 4px', whiteSpace: 'nowrap' }}>{t(`lv.${lv}`)}</span>}
                <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, whiteSpace: 'nowrap' }}>{connected ? usd(m.usd) : ''}</span>
              </span>
              <span style={{ fontSize: 11.5, color: m.task ? INK : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.task || (connected ? t('ag.idle') : t('ag.demo'))}</span>
              <span aria-hidden style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: m.status === '대기' ? '#E5DECF' : BAR[m.status], opacity: m.status === '진행' ? (i % 2 ? 0.55 : 1) : 1 }} />
                ))}
              </span>
            </span>
          </button>
        );
      })}
      <button type="button" className={`axo-agent axo-agent--add${canAdd && onAdd ? ' axo-agent--add-on' : ''}`} disabled={!canAdd || !onAdd} onClick={onAdd} title={t('ag.addHint')}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 800, fontSize: 12.5 }}>{t('ag.add')}</span>
          <span style={{ fontSize: 10.5 }}>{canAdd ? t('ag.addHint') : t('ag.full')}</span>
        </span>
      </button>
    </section>
  );
}
