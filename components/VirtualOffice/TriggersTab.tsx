import { useState } from 'react';
import { deleteJson, postJson, usePolling } from './officeApi';
import type { Trigger, TriggerSchedule, TriggersResponse } from './officeApi';
import { useOfficeLang } from './i18n';
import type { TFn } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, inputStyle, smallMuted } from './officeTheme';

interface TriggersTabProps {
  connected: boolean;
  apiBase?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월요일부터 보여 준다(요일 값 0=일)

/** '매주 월·수 09:00' / '매일 18:00' / '2026-11-09 09:30 한 번' */
function scheduleText(s: TriggerSchedule, t: TFn): string {
  if (s.kind === 'daily') return t('tr.daily', { time: s.time });
  if (s.kind === 'once') return t('tr.onceAt', { date: s.date ?? '', time: s.time });
  const days = DAY_ORDER.filter((d) => s.days?.includes(d)).map((d) => t(`tr.d${d}`)).join('·');
  return t('tr.weeklyAt', { days, time: s.time });
}

function when(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const field = { ...inputStyle, marginTop: 3, fontSize: 12, padding: '5px 8px' };
const chipBtn = (on: boolean) => ({
  font: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '2px 8px', borderRadius: 999,
  border: `1px solid ${on ? WYLIE : LINE}`, background: on ? WYLIE_TINT : '#fff', color: on ? WYLIE_DARK : MUTED,
}) as const;

/**
 * 예약 탭 — 정해진 시각에 브리핑을 대기열에 넣는다(예: 매주 월요일 09:00 주간보고). hive/triggers.json.
 * 앱(서버)이 켜져 있을 때만 돈다. 꺼져 있던 동안 지난 예약은 뒤늦게 돌리지 않고 '놓침'으로 남긴다.
 */
export function TriggersTab({ connected, apiBase }: TriggersTabProps) {
  const { t, name } = useOfficeLang();
  const { data, refresh } = usePolling<TriggersResponse>(connected ? `${apiBase}/api/triggers` : undefined, 10000);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [context, setContext] = useState('');
  const [constraints, setConstraints] = useState('');
  const [kind, setKind] = useState<TriggerSchedule['kind']>('weekly');
  const [days, setDays] = useState<number[]>([1]);
  const [time, setTime] = useState('09:00');
  const [date, setDate] = useState(() => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
  const [confirmDel, setConfirmDel] = useState('');
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  if (!connected) return <p style={smallMuted}>{t('tr.offline')}</p>;
  const list = data?.triggers ?? [];
  const max = data?.max ?? 20;

  const say = (ok: boolean, text: string) => { setFailed(!ok); setMsg(text); };
  const reset = () => { setTitle(''); setResult(''); setContext(''); setConstraints(''); setKind('weekly'); setDays([1]); setTime('09:00'); };

  const save = async () => {
    const schedule: TriggerSchedule = { kind, time, ...(kind === 'weekly' ? { days } : {}), ...(kind === 'once' ? { date } : {}) };
    const r = await postJson(`${apiBase}/api/triggers`, {
      title: title.trim(), schedule,
      briefing: { title: title.trim(), result: result.trim(), context: context.trim(), constraints: constraints.split('\n').map((x) => x.trim()).filter(Boolean) },
    });
    if (!r.ok) { say(false, String(r.error)); return; }
    const tr = (r.data?.trigger ?? null) as Trigger | null;
    say(true, t('tr.added', { id: tr?.id ?? '', next: when(tr?.next_run ?? null) }));
    reset(); setAdding(false); refresh();
  };
  const toggle = async (x: Trigger) => {
    const r = await postJson(`${apiBase}/api/triggers/${encodeURIComponent(x.id)}`, { enabled: !x.enabled });
    say(r.ok, r.ok ? t(x.enabled ? 'tr.turnedOff' : 'tr.turnedOn', { id: x.id }) : String(r.error));
    refresh();
  };
  const runNow = async (x: Trigger) => {
    const r = await postJson(`${apiBase}/api/triggers/${encodeURIComponent(x.id)}/run`, {});
    const item = (r.data?.item ?? null) as { id?: string } | null;
    say(r.ok, r.ok ? t('tr.ran', { id: x.id, item: item?.id ?? '' }) : String(r.error));
    refresh();
  };
  const remove = async (x: Trigger) => {
    const r = await deleteJson(`${apiBase}/api/triggers/${encodeURIComponent(x.id)}`);
    say(r.ok, r.ok ? t('tr.deleted', { id: x.id }) : String(r.error));
    setConfirmDel('');
    refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ ...h2Style, margin: 0 }}>{t('tr.title', { n: list.length, max })}</h2>
        <button type="button" className="axo-iconbtn" style={{ marginLeft: 'auto' }} onClick={() => { setAdding((v) => !v); setMsg(''); }} disabled={list.length >= max} aria-expanded={adding}>
          {adding ? t('tr.cancel') : t('tr.add')}
        </button>
      </div>
      <p style={smallMuted}>{t('tr.note')}</p>

      {adding && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 11px', background: PAPER, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.name')}
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t('tr.namePh')} style={{ ...field, resize: undefined }} />
          </label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.result')}
            <textarea value={result} onChange={(e) => setResult(e.target.value)} rows={2} placeholder={t('tr.resultPh')} style={field} />
          </label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.context')}
            <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} placeholder={t('tr.contextPh')} style={field} />
          </label>
          <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.constraints')}
            <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} placeholder={t('tr.constraintsPh')} style={field} />
          </label>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, marginRight: 2 }}>{t('tr.repeat')}</span>
            {(['weekly', 'daily', 'once'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} style={chipBtn(kind === k)}>{t(`tr.k_${k}`)}</button>
            ))}
          </div>
          {kind === 'weekly' && (
            <div role="group" aria-label={t('tr.days')} style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {DAY_ORDER.map((d) => (
                <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]))} style={chipBtn(days.includes(d))}>{t(`tr.d${d}`)}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {kind === 'once' && (
              <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.date')}
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...field, width: 150, resize: undefined }} />
              </label>
            )}
            <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('tr.time')}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...field, width: 110, resize: undefined }} />
            </label>
            <button type="button" onClick={save}
              style={{ font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '5px 14px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' }}>
              {t('tr.save')}
            </button>
          </div>
        </div>
      )}

      {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: failed ? BAD_FG : OK_FG }}>{msg}</p>}
      {!list.length && !adding && <p style={smallMuted}>{t('tr.empty')}</p>}

      {list.map((x) => (
        <div key={x.id} style={{ border: `1px solid ${x.enabled ? LINE : LINE_SOFT}`, borderRadius: 9, padding: '8px 11px', background: x.enabled ? '#FFFDF8' : '#F7F4EC', opacity: x.enabled ? 1 : 0.75, fontSize: 12.5 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'baseline' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WYLIE_DARK }}>{x.id}</span>
            <span style={{ fontWeight: 800, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span>
            <button type="button" role="switch" aria-checked={x.enabled} onClick={() => toggle(x)} title={x.enabled ? t('tr.turnOff') : t('tr.turnOn')}
              style={{ marginLeft: 'auto', font: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '1px 9px', borderRadius: 999, border: `1px solid ${x.enabled ? OK_FG : LINE}`, background: x.enabled ? '#DFF2E6' : '#fff', color: x.enabled ? OK_FG : MUTED }}>
              {x.enabled ? t('tr.on') : t('tr.off')}
            </button>
          </div>
          <div style={{ fontSize: 12, color: INK, marginTop: 2 }}>{scheduleText(x.schedule, t)} <span style={{ color: MUTED }}>· {t('tr.result')}: {x.briefing.result}</span></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: MUTED, marginTop: 3, fontFamily: MONO }}>
            <span>{t('tr.next')} {x.enabled ? when(x.next_run) : '—'}</span>
            <span>{t('tr.last')} {when(x.last_run)}{x.last_item ? ` → ${x.last_item}` : ''}</span>
            <span>{t('tr.runs', { n: x.runs || 0 })}</span>
            <span>{t('tr.by', { name: name(x.by) })}</span>
          </div>
          {x.last_missed && <div style={{ fontSize: 11, color: WARN_FG, marginTop: 2 }}>{t('tr.missed', { at: when(x.last_missed) })}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <button type="button" className="axo-iconbtn" onClick={() => runNow(x)}>{t('tr.runNow')}</button>
            {confirmDel === x.id ? (
              <>
                <span style={{ fontSize: 11.5, color: BAD_FG, fontWeight: 700 }}>{t('tr.confirmDel')}</span>
                <button type="button" className="axo-iconbtn" style={{ color: BAD_FG }} onClick={() => remove(x)}>{t('tr.delete')}</button>
                <button type="button" className="axo-iconbtn" onClick={() => setConfirmDel('')}>{t('tr.cancel')}</button>
              </>
            ) : (
              <button type="button" className="axo-iconbtn" onClick={() => setConfirmDel(x.id)}>{t('tr.delete')}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
