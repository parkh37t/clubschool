import { deleteJson } from './officeApi';
import type { QueueResponse } from './officeApi';
import { useOfficeLang } from './i18n';
import { INK, LINE, MONO, MUTED, OK_FG, WARN_FG, WYLIE_DARK } from './officeTheme';

interface QueueStripProps {
  apiBase?: string;
  queue: QueueResponse | null;
  onChange: () => void;
}

/**
 * 대기열 띠(Munder Difflin QUEUE) — 팀장에게 보낸 메시지와 브리핑이 차례를 기다린다.
 * 아직 시작하지 않은 항목은 뺄 수 있다. 팀장 터미널이 열려 있으면 메시지 전달을 쉰다.
 */
export function QueueStrip({ apiBase, queue, onChange }: QueueStripProps) {
  const { t } = useOfficeLang();
  if (!queue) return null;
  const open = queue.items.filter((i) => i.status === 'queued' || i.status === 'running');
  if (!open.length && !queue.leader_terminal) return null;
  const cancel = async (id: string) => { await deleteJson(`${apiBase}/api/queue/${encodeURIComponent(id)}`); onChange(); };
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, padding: '6px 10px', fontSize: 11.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, letterSpacing: '.08em', color: INK }}>{t('queue.title')}</span>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 10.5, border: `1px solid ${LINE}`, borderRadius: 3, padding: '0 5px' }}>{open.length}</span>
        <span style={{ color: queue.leader_terminal ? WARN_FG : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{queue.leader_terminal ? t('queue.paused') : t('queue.hint')}</span>
      </div>
      {open.slice(0, 4).map((i, n) => (
        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: INK, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ color: MUTED }}>{n + 1}.</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: WYLIE_DARK }}>{i.id}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: i.kind === 'briefing' ? WYLIE_DARK : MUTED }}>{t(`queue.kind.${i.kind}`)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{i.title || i.text}</span>
          <span style={{ fontSize: 10.5, color: i.status === 'running' ? OK_FG : MUTED }}>{t(`queue.status.${i.status}`)}</span>
          {i.status === 'queued' && (
            <button type="button" onClick={() => cancel(i.id)} title={t('queue.cancel')} aria-label={`${i.id} ${t('queue.cancel')}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: MUTED, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}
