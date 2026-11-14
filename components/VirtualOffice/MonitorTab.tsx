import { useEffect, useState } from 'react';
import { postJson, usePolling } from './officeApi';
import type { OfficeSettings, RosterMember, UsageResponse } from './officeApi';
import { EnvCard } from './EnvCard';
import { breakerReason, statusLabel, useOfficeLang } from './i18n';
import { BAD_FG, BREAKER_COLOR, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WYLIE, WYLIE_DARK, h2Style, inputStyle, smallMuted, usd } from './officeTheme';

interface MonitorTabProps {
  connected: boolean;
  apiBase?: string;
  roster: RosterMember[] | null;
  selected: string | null;
}

function localDay(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/**
 * 모니터 탭 — 맨 위 환경 점검(CLI·로그인), 사용량(CLI 추정 금액) 에이전트별·일별, 작업별 비용과 상한,
 * 작업당 상한·하루 예산·QA 반려 시 자동 보완 설정, 서킷 브레이커 단계(조정·제한·중지)와 초기화.
 * 중지된 에이전트의 재개는 승인 탭 카드로 한다.
 */
export function MonitorTab({ connected, apiBase, roster, selected }: MonitorTabProps) {
  const { t, lang, name } = useOfficeLang();
  const { data, refresh } = usePolling<UsageResponse>(connected ? `${apiBase}/api/usage` : undefined, 5000);
  const settings = usePolling<OfficeSettings>(connected ? `${apiBase}/api/settings` : undefined, 10000);
  const [revise, setRevise] = useState<boolean | null>(null); // 방금 바꾼 값(서버 값을 다시 읽기 전까지 화면에 먼저 보인다)
  const [reviseMsg, setReviseMsg] = useState('');
  const [cap, setCap] = useState('');
  const [budget, setBudget] = useState('');
  const [saved, setSaved] = useState('');
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    if (data && cap === '' && budget === '') { setCap(String(data.max_task_usd)); setBudget(String(data.agent_daily_usd)); }
  }, [data, cap, budget]);

  if (!connected) return <p style={smallMuted}>{t('mo.offline')}</p>;
  if (!data) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><EnvCard apiBase={apiBase} /><p style={smallMuted}>…</p></div>;
  const autoRevise = revise ?? settings.data?.auto_revise ?? true;

  const today = localDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return localDay(d); });
  const dayMax = Math.max(0.01, ...days.map((d) => data.byDay[d] || 0));
  const members = (roster ?? []).filter((m) => !selected || m.id === selected);

  const save = async () => {
    const r = await postJson(`${apiBase}/api/settings`, { max_task_usd: Number(cap), agent_daily_usd: Number(budget) });
    setSaved(r.ok ? t('mo.saved') : String(r.error));
    if (r.ok) { setCap(String(r.data?.max_task_usd ?? cap)); setBudget(String(r.data?.agent_daily_usd ?? budget)); refresh(); }
  };
  const toggleRevise = async (next: boolean) => {
    setRevise(next);
    setReviseMsg('');
    const r = await postJson(`${apiBase}/api/settings`, { auto_revise: next });
    if (r.ok) { setReviseMsg(t('mo.saved')); settings.refresh(); }
    else { setRevise(!next); setReviseMsg(String(r.error)); }
  };
  const doReset = async (agent: string) => {
    if (!resetReason.trim()) { setResetMsg(t('mo.needReason')); return; }
    const r = await postJson(`${apiBase}/api/breakers/${encodeURIComponent(agent)}/reset`, { by: lang === 'en' ? 'Jaeha' : '재하', reason: resetReason.trim() });
    setResetMsg(r.ok ? '' : String(r.error));
    if (r.ok) { setResetFor(null); setResetReason(''); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EnvCard apiBase={apiBase} />
      <div>
        <h2 style={h2Style}>{t('mo.title')}</h2>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: MONO, fontSize: 13 }}>
          <span>{t('mo.total')} <b style={{ color: WYLIE_DARK }}>{usd(data.total)}</b></span>
          <span>{t('mo.today')} <b style={{ color: WYLIE_DARK }}>{usd(data.byDay[today])}</b></span>
        </div>
      </div>

      {/* 일별 막대 */}
      <div>
        <h2 style={{ ...h2Style, marginBottom: 6 }}>{t('mo.byDay')}</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
          {days.map((d) => {
            const v = data.byDay[d] || 0;
            return (
              <div key={d} title={`${d} ${usd(v)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', height: Math.max(2, (v / dayMax) * 52), background: d === today ? WYLIE : '#C9B8E6', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: 9.5, color: MUTED, fontFamily: MONO }}>{d.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 에이전트별 오늘 사용량 · 하루 예산 · 서킷 브레이커 */}
      <div>
        <h2 style={{ ...h2Style, marginBottom: 4 }}>{t('mo.byAgent')}</h2>
        <p style={{ ...smallMuted, fontSize: 11, marginBottom: 6 }}>{t('mo.breakerHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {members.map((m) => {
            const used = data.byAgentDay[m.id]?.[today] || 0;
            const ratio = data.agent_daily_usd > 0 ? used / data.agent_daily_usd : 0;
            const lv = m.breaker?.level ?? 'normal';
            const bc = BREAKER_COLOR[lv] ?? BREAKER_COLOR.normal;
            return (
              <div key={m.id} style={{ fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 86, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(m.id)}</span>
                  <div style={{ flex: 1, height: 8, background: '#EAE5D8', borderRadius: 4, overflow: 'hidden' }} title={`${usd(used)} / ${usd(data.agent_daily_usd)}`}>
                    <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: '100%', background: ratio >= 1 ? BAD_FG : ratio >= 0.8 ? '#E8A33D' : '#2D8C4E' }} />
                  </div>
                  <span style={{ width: 52, textAlign: 'right', fontFamily: MONO, fontSize: 11 }}>{usd(used)}</span>
                  {m.id !== 'lead' && (
                    <span title={breakerReason(lang, m.breaker)} style={{ fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, background: bc.bg, color: bc.fg, whiteSpace: 'nowrap' }}>{t(`lv.${lv}`)}</span>
                  )}
                  {m.id !== 'lead' && lv !== 'normal' && lv !== 'stop' && (
                    <button type="button" className="axo-iconbtn" style={{ padding: '0 6px', fontSize: 10.5 }} onClick={() => { setResetFor(resetFor === m.id ? null : m.id); setResetMsg(''); }}>{t('mo.reset')}</button>
                  )}
                </div>
                {m.breaker?.reason && lv !== 'normal' && <div style={{ fontSize: 10.5, color: bc.fg, marginLeft: 92 }}>{breakerReason(lang, m.breaker)}{lv === 'stop' ? ` — ${t('mo.stopHint')}` : ''}</div>}
                {resetFor === m.id && (
                  <div style={{ display: 'flex', gap: 5, marginLeft: 92, marginTop: 3 }}>
                    <input value={resetReason} onChange={(e) => setResetReason(e.target.value)} placeholder={t('mo.resetReason')} aria-label={t('mo.resetReason')} style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 11.5, padding: '3px 7px', resize: undefined }} />
                    <button type="button" className="axo-iconbtn" onClick={() => doReset(m.id)}>{t('mo.reset')}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {resetMsg && <p style={{ ...smallMuted, color: BAD_FG }}>{resetMsg}</p>}
      </div>

      {/* 설정 — 작업당 상한 · 하루 예산 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', background: PAPER, border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 10px' }}>
        <label style={{ fontSize: 11.5, color: INK, fontWeight: 700 }}>{t('mo.cap')}
          <input value={cap} onChange={(e) => { setCap(e.target.value); setSaved(''); }} inputMode="decimal" style={{ ...inputStyle, marginTop: 3, width: 90, fontSize: 12, padding: '4px 7px', resize: undefined }} />
        </label>
        <label style={{ fontSize: 11.5, color: INK, fontWeight: 700 }}>{t('mo.budget')}
          <input value={budget} onChange={(e) => { setBudget(e.target.value); setSaved(''); }} inputMode="decimal" style={{ ...inputStyle, marginTop: 3, width: 90, fontSize: 12, padding: '4px 7px', resize: undefined }} />
        </label>
        <button type="button" className="axo-iconbtn" onClick={save}>{t('mo.save')}</button>
        {saved && <span style={{ fontSize: 11.5, color: saved === t('mo.saved') ? OK_FG : BAD_FG }}>{saved}</span>}
        {/* QA 반려 시 1회 자동 보완 — 바꾸면 바로 저장된다(settings.json 의 auto_revise) */}
        <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px dashed ${LINE}`, paddingTop: 6 }}>
          <label title={t('mo.autoReviseHint')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: INK, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRevise} onChange={(e) => toggleRevise(e.target.checked)} />
            {t('mo.autoRevise')}
          </label>
          {reviseMsg && <span style={{ fontSize: 11.5, color: reviseMsg === t('mo.saved') ? OK_FG : BAD_FG }}>{reviseMsg}</span>}
        </div>
        <p style={{ ...smallMuted, fontSize: 11, flexBasis: '100%' }}>{t('mo.autoReviseHint')}</p>
      </div>

      {/* 작업별 비용 */}
      <div>
        <h2 style={{ ...h2Style, marginBottom: 5 }}>{t('mo.tasks')}</h2>
        {data.tasks.filter((x) => !selected || x.owner === selected).slice(0, 25).map((x) => {
          const spent = x.cost_usd + x.qa_usd;
          const over = x.cost_usd >= x.cap_usd * 0.999 && x.cost_usd > 0;
          return (
            <div key={x.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, padding: '3px 0', borderBottom: `1px dashed ${LINE_SOFT}` }}>
              <span style={{ fontFamily: MONO, color: WYLIE_DARK, width: 52 }}>{x.id}</span>
              <span style={{ width: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>{name(x.owner)}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: MUTED }}>{x.title}</span>
              <span style={{ fontSize: 10.5, color: MUTED }}>{statusLabel(lang, x.status)}</span>
              <span style={{ fontFamily: MONO, width: 54, textAlign: 'right', color: over ? BAD_FG : INK }} title={`QA ${usd(x.qa_usd)} · cap ${usd(x.cap_usd)}`}>{usd(spent)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
