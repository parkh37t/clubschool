import { usePolling } from './officeApi';
import type { RosterMember } from './officeApi';
import { useOfficeLang } from './i18n';
import { AGENT_ORDER, BAD_FG, INK, LINE, PAPER, inputStyle, smallMuted } from './officeTheme';

interface MemoryTabProps {
  connected: boolean;
  apiBase?: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  roster: RosterMember[] | null;
}

/** 기억 탭 — 에이전트의 memory/<id>.md. 작업이 끝날 때 쌓이고 다음 작업 시작 때 읽힌다(hive 규칙). */
export function MemoryTab({ connected, apiBase, selected, onSelect, roster }: MemoryTabProps) {
  const { t, name } = useOfficeLang();
  const url = connected && selected ? `${apiBase}/api/memory/${encodeURIComponent(selected)}` : undefined;
  const { data, error } = usePolling<{ agent: string; content: string }>(url, 10000);
  if (!connected) return <p style={smallMuted}>{t('mem.offline')}</p>;
  const ids = roster ? roster.map((m) => m.id) : AGENT_ORDER;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: INK }}>
        {t('mem.agent')}
        <select value={selected ?? ''} onChange={(e) => onSelect(e.target.value || null)} style={{ ...inputStyle, marginTop: 0, width: 'auto', padding: '5px 8px', fontSize: 12.5 }}>
          <option value="">{t('mem.choose')}</option>
          {ids.map((id) => <option key={id} value={id}>{name(id)}</option>)}
        </select>
      </label>
      {!selected && <p style={smallMuted}>{t('mem.pick')}</p>}
      {selected && error && <p style={{ ...smallMuted, color: BAD_FG }}>{t('mem.fail')}</p>}
      {selected && data && (data.content.trim()
        ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.6, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 9, padding: '10px 12px' }}>{data.content.trim()}</pre>
        : <p style={smallMuted}>{t('mem.empty', { name: name(selected) })}</p>)}
    </div>
  );
}
