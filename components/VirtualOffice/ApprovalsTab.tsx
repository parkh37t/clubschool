import { useState } from 'react';
import type { HiveApproval, HiveTask } from './officeSimulator';
import { postJson } from './officeApi';
import { gateLabel, kindLabel, useOfficeLang } from './i18n';
import { BAD_FG, GATE_COLOR, LINE, LINE_SOFT, MONO, MUTED, OK_FG, WARN_FG, clock, h2Style, inputStyle, smallMuted, tok } from './officeTheme';

interface DemoApproval {
  showApproval: boolean;
  approvalDesc: string;
  approvalFile: string;
  approvalScore: string;
  onApprove: () => void;
}

interface ApprovalsTabProps {
  connected: boolean;
  apiBase?: string;
  tasks: HiveTask[];
  pending: HiveApproval[];
  approvals: HiveApproval[];
  demo: DemoApproval;
}

/** 승인 탭 — 재하 결정 대기 카드(사유 필수)와 결정 기록. 사용 토큰 한도 초과('사용량')·재개(서킷 브레이커) 카드도 여기로 온다. */
export function ApprovalsTab({ connected, apiBase, tasks, pending, approvals, demo }: ApprovalsTabProps) {
  const { t, lang, name } = useOfficeLang();
  const [by, setBy] = useState(lang === 'en' ? 'Jaeha' : '재하');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!connected) {
    if (!demo.showApproval) return <p style={smallMuted}>{t('ap.demoNone')}</p>;
    return (
      <div style={{ background: '#FBEED6', border: '1px solid #E8A33D', borderRadius: 10, padding: '10px 12px' }}>
        <p style={{ fontSize: 13, color: WARN_FG, fontWeight: 700, margin: 0 }}>{demo.approvalDesc}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', margin: '8px 0 10px', fontSize: 13, fontWeight: 700 }}>
          <span>{demo.approvalFile}</span><span style={{ color: OK_FG }}>{demo.approvalScore}</span>
        </div>
        <button type="button" className="apex-btn--approve" onClick={demo.onApprove}>{t('ap.demoApprove')}</button>
      </div>
    );
  }

  const taskOf = (id: string) => tasks.find((x) => x.id === id);
  const decided = approvals.filter((a) => a.status !== 'pending').slice().reverse();

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    if (!reason.trim()) { setFailed(true); setMsg(t('ap.needReason')); return; }
    setBusy(true);
    const r = await postJson(`${apiBase}/api/approve`, { id, decision, by: by.trim() || '재하', reason: reason.trim() });
    setBusy(false);
    setFailed(!r.ok);
    setMsg(r.ok ? t('ap.done', { id, d: t(decision === 'approved' ? 'ap.approved' : 'ap.rejected') }) : t('ap.failed', { e: r.error ?? '' }));
    if (r.ok) setReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ ...h2Style, color: pending.length ? WARN_FG : MUTED }}>{pending.length ? t('ap.pending', { n: pending.length }) : t('ap.none')}</h2>
      {pending.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={by} onChange={(e) => setBy(e.target.value)} placeholder={t('ap.by')} aria-label={t('ap.by')} style={{ ...inputStyle, marginTop: 0, width: 84, fontSize: 12.5, resize: undefined }} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('ap.reason')} aria-label={t('ap.reason')} style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 12.5, resize: undefined }} />
          </div>
          {pending.map((a) => {
            const task = taskOf(a.task);
            // 사용량 카드(kind:'budget') — cap·used 는 사용 토큰. 예전 카드는 cost(금액)만 있을 수 있다
            const payload = (a.payload ?? {}) as { output?: string; gate?: string; kind?: string; cap?: number; used?: number; cost?: number };
            return (
              <div key={a.id} style={{ background: '#FFF8EA', border: '1px solid #E8A33D', borderRadius: 9, padding: '9px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WARN_FG }}>{a.id}</span>
                  <span style={{ fontWeight: 700 }}>{kindLabel(lang, a.kind)}</span>
                  {payload.gate && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: GATE_COLOR[payload.gate] ?? MUTED }}>QA {gateLabel(lang, payload.gate)}</span>}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{task ? `${task.id} ${name(task.owner)} · ${task.title}` : a.reason || a.task}</div>
                {payload.kind === 'budget' && <div style={{ fontSize: 11.5, color: WARN_FG, marginTop: 2 }}>{t('ap.budgetNote', { cap: tok(payload.cap), used: tok(payload.used ?? payload.cost) })}</div>}
                {payload.kind === 'resume' && <div style={{ fontSize: 11.5, color: BAD_FG, marginTop: 2 }}>{t('ap.resumeNote')} — {a.reason}</div>}
                {payload.output && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={payload.output}>{payload.output}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button type="button" className="apex-btn--approve" style={{ flex: 1, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => decide(a.id, 'approved')}>{t('ap.approve')}</button>
                  <button type="button" className="apex-btn apex-btn--ghost" style={{ flex: 1, color: BAD_FG }} disabled={busy} onClick={() => decide(a.id, 'rejected')}>{t('ap.reject')}</button>
                </div>
              </div>
            );
          })}
        </>
      )}
      {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: failed ? BAD_FG : OK_FG }}>{msg}</p>}
      {decided.length > 0 && (
        <div>
          <h2 style={{ ...h2Style, marginBottom: 6 }}>{t('ap.history')}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {decided.map((a) => (
              <li key={a.id} style={{ fontSize: 12, borderBottom: `1px dashed ${LINE_SOFT}`, padding: '4px 0', display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: MUTED }}>{a.id}</span>
                <span style={{ fontWeight: 800, color: a.status === 'approved' ? OK_FG : BAD_FG }}>{t(a.status === 'approved' ? 'ap.approved' : 'ap.rejected')}</span>
                <span>{kindLabel(lang, a.kind)} · {a.task}</span>
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
