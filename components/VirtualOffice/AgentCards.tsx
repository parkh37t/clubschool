import type { AgentStatus } from './officeApi';
import { PixelAvatar } from './PixelAvatar';
import { FONT, INK, LINE, MONO, MUTED, STATUS_COLOR, WYLIE, WYLIE_DARK, WYLIE_TINT, usd } from './officeTheme';

export interface AgentCardData {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  task: string;
  usd: number;
}

interface AgentCardsProps {
  members: AgentCardData[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** 서버 연결 여부(미연결이면 데모 상태라고 알린다) */
  connected: boolean;
}

const BAR: Record<AgentStatus, string> = { '대기': '#C9C2B0', '진행': '#2D8C4E', '검수': '#4A7DBF', '승인대기': '#E8A33D' };

/**
 * 하단 에이전트 바 — 팀장 + 12인 카드를 가로 한 줄로(Munder Difflin 의 하단 카드 자리).
 * 누르면 사무실 책상 강조 + 커맨드 센터의 기억·활동 탭이 그 사람으로 좁혀진다. 사용량은 CLI 추정 금액(청구서 아님).
 */
export function AgentCards({ members, selected, onSelect, connected }: AgentCardsProps) {
  return (
    <section aria-label="에이전트" className="axo-agents">
      {members.map((m) => {
        const on = selected === m.id;
        const lead = m.id === 'lead';
        const sc = STATUS_COLOR[m.status] ?? STATUS_COLOR['대기'];
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(on ? null : m.id)}
            title={`${m.name} · ${m.role}${m.task ? `\n${m.task}` : ''}${connected ? `\n누적 사용량 ${usd(m.usd)} (CLI 추정)` : ''}`}
            className="axo-agent"
            style={{
              fontFamily: FONT,
              borderColor: on ? WYLIE : lead ? '#C9B8E6' : LINE,
              boxShadow: on ? `0 0 0 2px ${WYLIE}` : lead ? 'inset 0 0 0 1px #E4D9F3' : 'none',
              background: on ? WYLIE_TINT : lead ? '#F8F4FC' : '#FFFDF8',
            }}
          >
            <PixelAvatar id={m.id} size={38} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: lead ? WYLIE_DARK : INK, whiteSpace: 'nowrap' }}>{m.name}</span>
                {lead && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: WYLIE, borderRadius: 3, padding: '0 4px' }}>팀장</span>}
                <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, border: `1px solid ${sc.fg}33`, background: sc.bg, color: sc.fg, whiteSpace: 'nowrap' }}>{m.status}</span>
              </span>
              <span style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 6, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role}</span>
                <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, whiteSpace: 'nowrap' }}>{connected ? usd(m.usd) : ''}</span>
              </span>
              <span style={{ fontSize: 11.5, color: m.task ? INK : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.task || (connected ? '대기 중' : '데모')}</span>
              <span aria-hidden style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: m.status === '대기' ? '#E5DECF' : BAR[m.status], opacity: m.status === '진행' ? (i % 2 ? 0.55 : 1) : 1 }} />
                ))}
              </span>
            </span>
          </button>
        );
      })}
      <button type="button" className="axo-agent axo-agent--add" disabled title="인원 추가 화면은 3차에서 만듭니다(roster.mjs 에 역할 추가)">
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 800, fontSize: 12.5 }}>인원 추가</span>
          <span style={{ fontSize: 10.5 }}>3차 예정</span>
        </span>
      </button>
    </section>
  );
}
