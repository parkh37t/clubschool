import { useState } from 'react';
import { postJson, usePolling } from './officeApi';
import type { Question } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, clock, h2Style, inputStyle, smallMuted } from './officeTheme';

interface QuestionsTabProps {
  connected: boolean;
  apiBase?: string;
  selected: string | null;
}

/**
 * 질문 탭(ask me) — 에이전트·팀장이 재하에게 묻는 것. 작업은 멈추지 않고 가정으로 진행한다.
 * 답하면 역할 에이전트는 다음 작업 때 inbox 로 읽고(hive 규칙), 팀장은 상주 세션 대기열로 바로 받는다.
 */
export function QuestionsTab({ connected, apiBase, selected }: QuestionsTabProps) {
  const { t, lang, name } = useOfficeLang();
  const { data, refresh } = usePolling<{ questions: Question[] }>(connected ? `${apiBase}/api/questions` : undefined, 4000);
  const [by, setBy] = useState(lang === 'en' ? 'Jaeha' : '재하');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  if (!connected) return <p style={smallMuted}>{t('qs.offline')}</p>;
  const all = (data?.questions ?? []).filter((q) => !selected || q.from === selected);
  const open = all.filter((q) => q.status === 'open');
  const done = all.filter((q) => q.status === 'answered').slice(0, 20);

  const send = async (id: string) => {
    const answer = (answers[id] || '').trim();
    if (!answer || !by.trim()) { setFailed(true); setMsg(t('qs.need')); return; }
    const r = await postJson(`${apiBase}/api/questions/${encodeURIComponent(id)}/answer`, { answer, by: by.trim() });
    setFailed(!r.ok);
    setMsg(r.ok ? t('qs.sent', { id }) : String(r.error));
    if (r.ok) { setAnswers((a) => ({ ...a, [id]: '' })); refresh(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <h2 style={{ ...h2Style, color: open.length ? WARN_FG : MUTED }}>{open.length ? t('qs.open', { n: open.length }) : t('qs.none')}</h2>
      {open.length > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
          {t('qs.by')}
          <input value={by} onChange={(e) => setBy(e.target.value)} aria-label={t('qs.by')} style={{ ...inputStyle, marginTop: 0, width: 100, fontSize: 12, padding: '4px 8px', resize: undefined }} />
        </label>
      )}
      {open.map((q) => (
        <div key={q.id} style={{ border: '1px solid #E8A33D', background: '#FFF8EA', borderRadius: 9, padding: '8px 11px', fontSize: 12.5 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'baseline', marginBottom: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WARN_FG }}>{q.id}</span>
            <span style={{ fontWeight: 800 }}>{name(q.from)}</span>
            {q.task && <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{q.task}</span>}
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, color: MUTED }}>{clock(q.asked_at)}</span>
          </div>
          <div style={{ color: INK, lineHeight: 1.45 }}>{q.text}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') send(q.id); }}
              placeholder={t('qs.answerPh')}
              aria-label={t('qs.answerPh')}
              style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 12, padding: '5px 8px', resize: undefined }}
            />
            <button type="button" className="axo-iconbtn" onClick={() => send(q.id)}>{t('qs.send')}</button>
          </div>
        </div>
      ))}
      {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: failed ? BAD_FG : OK_FG }}>{msg}</p>}
      {done.length > 0 && (
        <div>
          <h2 style={{ ...h2Style, marginBottom: 5 }}>{t('qs.answered')}</h2>
          {done.map((q) => (
            <div key={q.id} style={{ borderBottom: `1px dashed ${LINE_SOFT}`, padding: '5px 0', fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED }}>{q.id}</span>
                <span style={{ fontWeight: 700 }}>{name(q.from)}</span>
                <span style={{ color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</span>
              </div>
              <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 6, padding: '3px 8px', marginTop: 3, color: OK_FG }}>{q.answer} <span style={{ color: MUTED }}>— {q.answered_by}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
