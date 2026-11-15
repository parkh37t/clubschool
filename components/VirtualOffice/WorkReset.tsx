import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { postJson } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, MONO, MUTED, OK_FG, WARN_FG, inputStyle } from './officeTheme';

interface WorkResetProps {
  apiBase: string;
  /** 도는 작업이 있으면 막는다(서버도 브리핑·대기열이 돌면 409) */
  busy: boolean;
}

type Msg = { ok: boolean; text: string; path?: string } | null;

/**
 * 작업판 초기화 — 작업판·승인·질문·대기열·편지·실시간 기록을 보관함(hive/_archive/reset-…)으로 옮기고 비운다(지우지 않음).
 * 확인 창에서 사유를 받아야 실행하고, 에이전트 기억은 고를 때만 함께 옮긴다. 서버: POST /api/work/reset.
 */
export function WorkReset({ apiBase, busy }: WorkResetProps) {
  const { t, owner } = useOfficeLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [memory, setMemory] = useState(false);
  const [going, setGoing] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const run = async () => {
    if (!reason.trim()) { setMsg({ ok: false, text: t('rs.needReason') }); return; }
    setGoing(true);
    setMsg(null);
    const r = await postJson(`${apiBase}/api/work/reset`, { confirm: true, by: owner, reason: reason.trim(), memory });
    setGoing(false);
    if (!r.ok) { setMsg({ ok: false, text: String(r.error) }); return; }
    const c = (r.data?.counts || {}) as Record<string, number>;
    setMsg({ ok: true, text: t('rs.done', { t: c.tasks ?? 0, a: c.approvals ?? 0, q: c.questions ?? 0, n: String(r.data?.archive || '') }), path: typeof r.data?.path === 'string' ? r.data.path : undefined });
    setOpen(false);
    setReason('');
    setMemory(false);
  };

  // 전역 버튼 최소 크기(44px)를 줄여 작업판 머리의 작은 칩으로 쓴다
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '3px 9px', borderRadius: 999, border: `1px solid ${LINE}`, background: '#fff', color: INK, whiteSpace: 'nowrap', minHeight: 26, minWidth: 0 } as const;

  return (
    <>
      <button type="button" style={{ ...btn, color: MUTED, opacity: busy ? 0.5 : 1 }} disabled={busy} title={busy ? t('rs.busy') : t('rs.title')} onClick={() => { setMsg(null); setOpen((v) => !v); }}>
        <RotateCcw size={12} aria-hidden />{t('rs.button')}
      </button>
      {(open || msg) && (
        <div style={{ flexBasis: '100%', order: 10 }}>
          {open && (
            <div role="alertdialog" aria-label={t('rs.title')} style={{ border: `1px solid ${WARN_FG}`, background: '#FBF3E3', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <strong style={{ fontSize: 12.5 }}>{t('rs.title')}</strong>
              <span style={{ fontSize: 12, lineHeight: 1.55 }}>{t('rs.body')}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} />{t('rs.memory')}
              </label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('rs.reasonPh')} aria-label={t('rs.reasonPh')} maxLength={300}
                onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim() && !going) void run(); }}
                style={{ ...inputStyle, marginTop: 0, fontSize: 12, resize: undefined }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={{ ...btn, borderRadius: 7, padding: '6px 11px', fontSize: 12, minHeight: 32, background: BAD_FG, borderColor: BAD_FG, color: '#fff', opacity: going || !reason.trim() ? 0.6 : 1 }} disabled={going || !reason.trim()} onClick={run}>
                  <RotateCcw size={13} aria-hidden />{going ? t('rs.going') : t('rs.go')}
                </button>
                <button type="button" style={{ ...btn, borderRadius: 7, padding: '6px 11px', fontSize: 12, minHeight: 32 }} onClick={() => setOpen(false)}>{t('rs.cancel')}</button>
              </div>
            </div>
          )}
          {msg && (
            <p role="status" style={{ fontSize: 12, fontWeight: 600, margin: open ? '6px 0 0' : 0, color: msg.ok ? OK_FG : BAD_FG, overflowWrap: 'anywhere' }}>
              {msg.text}
              {msg.path && <span style={{ display: 'block', fontFamily: MONO, fontSize: 11, fontWeight: 400, color: MUTED }}>{msg.path}</span>}
            </p>
          )}
        </div>
      )}
    </>
  );
}
