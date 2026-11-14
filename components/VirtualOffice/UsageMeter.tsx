import { useEffect, useRef, useState } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import { postJson, usePolling } from './officeApi';
import type { LimitWindow, UsageTop } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, smallMuted, tok } from './officeTheme';

interface UsageMeterProps {
  apiBase: string;
  /** [모니터 탭에서 자세히] — 커맨드 센터의 모니터 탭을 연다 */
  onOpenMonitor: () => void;
}

const WARN_AT = 0.7; // 주의(노랑) — 구독 창 사용률·하루 한도 대비
const BAD_AT = 0.9; // 위험(빨강)

const tone = (r: number) => (r >= BAD_AT ? BAD_FG : r >= WARN_AT ? WARN_FG : OK_FG);
const pct = (r: number | null | undefined) => (r === null || r === undefined ? '—' : `${Math.round(r * 100)}%`);

/** 창 순서 — 짧은 창(5시간)을 먼저, 나머지는 이름순 */
function orderWindows(w: Record<string, LimitWindow>): [string, LimitWindow][] {
  const rank = (k: string) => (k === 'five_hour' ? 0 : k === 'seven_day' ? 1 : 2);
  return Object.entries(w).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

/**
 * 화면 위 사용량 막대 — 구독을 얼마나 쓰고 있는지 한눈에.
 *   ① 구독 사용 한도: Claude Code 가 실행마다 알려 주는 주간·5시간 창 사용률(마지막 실행 기준, [지금 확인]으로 새로 받기)
 *   ② 오늘 사용 토큰: 끝난 작업 + 실행 중 작업(실시간)
 *   ③ 하루 한도에 가까운 담당, 실행 중 작업의 작업당 한도 대비
 * 누르면 자세한 내용이 펼쳐진다. 금액이 아니라 토큰·비율로만 보여 준다(구독 사용량은 청구되지 않는다).
 */
export function UsageMeter({ apiBase, onOpenMonitor }: UsageMeterProps) {
  const { t, lang, name } = useOfficeLang();
  const top = usePolling<UsageTop>(`${apiBase}/api/usage/top`, 5000);
  const [open, setOpen] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeMsg, setProbeMsg] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const d = top.data;
  if (!d) return null;

  const windows = orderWindows(d.limits?.windows ?? {});
  const winLabel = (k: string) => (k === 'five_hour' ? t('um.w5h') : k === 'seven_day' ? t('um.w7d') : t('um.wOther', { k: k.replace(/^seven_day_?/, '') || k }));
  const statusLabel = (s: string) => (s === 'allowed' ? t('um.stOk') : s === 'allowed_warning' ? t('um.stWarn') : s === 'rejected' ? t('um.stBlocked') : s || '—');
  const ago = (iso: string | undefined) => {
    if (!iso) return '—';
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return t('um.now');
    if (m < 60) return t('um.minAgo', { n: m });
    if (m < 60 * 24) return t('um.hourAgo', { n: Math.round(m / 60) });
    return t('um.dayAgo', { n: Math.round(m / 1440) });
  };
  const when = (iso: string) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    return dt.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const topAgent = d.agents[0];
  const worstWin = windows.reduce((m, [, w]) => Math.max(m, w.utilization ?? 0), 0);
  const worst = Math.max(worstWin, topAgent?.ratio ?? 0, ...d.running.map((r) => (r.cap ? r.tokens / r.cap : 0)));
  const blocked = windows.some(([, w]) => w.status === 'rejected');
  const color = blocked ? BAD_FG : worst >= WARN_AT ? tone(worst) : INK;

  const bar = (ratio: number, c: string, w = '100%', marker?: number) => (
    <span aria-hidden style={{ position: 'relative', display: 'inline-block', width: w, height: 6, borderRadius: 3, background: LINE_SOFT, overflow: 'hidden', verticalAlign: 'middle' }}>
      <span style={{ position: 'absolute', inset: 0, width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: c, borderRadius: 3 }} />
      {marker !== undefined && <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${marker * 100}%`, width: 1, background: MUTED }} />}
    </span>
  );

  const probe = async () => {
    setProbing(true); setProbeMsg('');
    const r = await postJson(`${apiBase}/api/usage/probe`, {});
    setProbing(false);
    setProbeMsg(r.ok ? t('um.probeOk', { v: tok(Number(r.data?.tokens ?? 0)) }) : String(r.error ?? t('um.probeFail')));
    top.refresh();
  };

  // 막대에 보일 요약 — 구독 창(있으면) · 오늘 사용 토큰 · 실행 중
  const chipWins = windows.slice(0, 2);
  const label = [
    ...chipWins.map(([k, w]) => `${winLabel(k)} ${pct(w.utilization)}`),
    t('um.todayShort', { v: tok(d.today) }),
    ...(d.running.length ? [t('um.runShort', { n: d.running.length })] : []),
  ].join(' · ');

  const sectionTitle = (s: string) => <h3 style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em', color: MUTED, margin: '0 0 6px' }}>{s}</h3>;

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" className="axo-iconbtn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog"
        title={t('um.title')} style={{ color, borderColor: worst >= WARN_AT || blocked ? color : LINE, maxWidth: '100%' }}>
        <Gauge size={13} aria-hidden />
        {chipWins[0] && bar(chipWins[0][1].utilization ?? 0, tone(chipWins[0][1].utilization ?? 0), '34px')}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>{label}</span>
      </button>

      {open && (
        <div role="dialog" aria-label={t('um.title')}
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, width: 360, maxWidth: 'calc(100vw - 32px)', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, boxShadow: '0 10px 30px rgba(36,41,31,.16)', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, color: INK }}>

          {/* ① 구독 사용 한도 */}
          <section>
            {sectionTitle(t('um.subTitle'))}
            {!windows.length && <p style={{ ...smallMuted, fontSize: 12 }}>{t('um.subNone')}</p>}
            {windows.map(([k, w]) => {
              const r = w.utilization ?? 0;
              return (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 42px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{winLabel(k)}</span>
                  <span>
                    {bar(r, w.status === 'rejected' ? BAD_FG : tone(r))}
                    <span style={{ display: 'block', fontSize: 10.5, color: MUTED, marginTop: 2 }}>{t('um.resets', { v: when(w.resets_at) })} · {statusLabel(w.status)}</span>
                  </span>
                  <strong style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: w.status === 'rejected' ? BAD_FG : tone(r) }}>{pct(w.utilization)}</strong>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: MUTED, flex: '1 1 160px' }}>{d.limits ? t('um.asOf', { v: ago(d.limits.at) }) : t('um.subHow')}</span>
              <button type="button" className="axo-iconbtn" onClick={probe} disabled={probing || !d.probe_ready} title={d.mode === 'claude_code' ? t('um.probeTitle') : t('um.probeMode', { m: d.mode })}>
                <RefreshCw size={12} aria-hidden />{probing ? t('um.probing') : t('um.probe')}
              </button>
            </div>
            {probeMsg && <p role="status" style={{ ...smallMuted, fontSize: 11.5, marginTop: 5 }}>{probeMsg}</p>}
          </section>

          {/* ② 오늘 사용 토큰 */}
          <section style={{ borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 12 }}>
            {sectionTitle(t('um.todayTitle'))}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 22, fontWeight: 800, color: WYLIE_DARK, fontVariantNumeric: 'tabular-nums' }}>{tok(d.today)}</strong>
              <span style={{ fontSize: 12, color: MUTED }}>{t('um.todaySplit', { done: tok(d.today_done), live: tok(d.live) })}</span>
            </div>
            <p style={{ ...smallMuted, fontSize: 11, marginTop: 3, fontFamily: MONO }}>
              {t('um.parts', { i: tok(d.parts_today.in), cw: tok(d.parts_today.cw), o: tok(d.parts_today.out), cr: tok(d.parts_today.cr) })}
            </p>
          </section>

          {/* ③ 담당별 하루 한도 대비 */}
          <section style={{ borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 12 }}>
            {sectionTitle(t('um.agentsTitle', { v: tok(d.agent_daily_tokens) }))}
            {!d.agents.length && <p style={{ ...smallMuted, fontSize: 12 }}>{t('um.agentsNone')}</p>}
            {d.agents.slice(0, 5).map((a) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 74px', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(a.id)}</span>
                {bar(a.ratio, tone(a.ratio), '100%', 0.8)}
                <span style={{ fontSize: 11.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: tone(a.ratio) }}>{tok(a.used)} · {pct(a.ratio)}</span>
              </div>
            ))}
          </section>

          {/* ④ 실행 중 작업 */}
          {d.running.length > 0 && (
            <section style={{ borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 12 }}>
              {sectionTitle(t('um.runTitle'))}
              {d.running.map((r) => {
                const ratio = r.cap ? r.tokens / r.cap : 0;
                return (
                  <div key={r.id} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', gap: 6, fontSize: 12, alignItems: 'baseline' }}>
                      <span style={{ fontFamily: MONO, color: MUTED, fontSize: 11 }}>{r.id}</span>
                      <span style={{ fontWeight: 700 }}>{name(r.owner)}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: MUTED }}>{r.title}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8, alignItems: 'center', marginTop: 3 }}>
                      {bar(ratio, tone(ratio))}
                      <span style={{ fontSize: 11.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tok(r.tokens)} / {tok(r.cap)}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <div style={{ borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: PAPER, margin: '0 -14px -14px', padding: '10px 14px', borderRadius: '0 0 12px 12px' }}>
            <span style={{ fontSize: 11, color: MUTED, flex: '1 1 180px' }}>{t('um.note')}</span>
            <button type="button" className="axo-iconbtn" onClick={() => { setOpen(false); onOpenMonitor(); }} style={{ color: WYLIE, borderColor: WYLIE }}>{t('um.more')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
