import { useState } from 'react';
import { Eye, FileCheck2, Layers, Send } from 'lucide-react';
import { usePolling } from './officeApi';
import type { BriefingTemplate, PlanPackDetail, PlanPacksResponse, PlanVerify } from './officeApi';
import { SpecViewer } from './SpecViewer';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, smallMuted } from './officeTheme';

interface PlanTabProps {
  connected: boolean;
  apiBase?: string;
  /** [이 팩으로 화면설계 브리핑] — 입력창을 브리핑 양식으로 채운다(보내기는 사람이) */
  onUse: (tpl: BriefingTemplate) => void;
  onOpenSettings?: () => void;
}

// SSOT 5계층 — 규칙·IA·작업가이드·화면 README·템플릿. 상태는 none → draft → confirmed
const LAYERS: { key: string; label: string }[] = [
  { key: 'rules', label: 'plan.l.rules' }, { key: 'ia', label: 'plan.l.ia' }, { key: 'guide', label: 'plan.l.guide' },
  { key: 'readme', label: 'plan.l.readme' }, { key: 'template', label: 'plan.l.template' },
];
const LAYER_COLOR: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: '#DFF2E6', fg: OK_FG }, draft: { bg: '#FBEED6', fg: WARN_FG }, none: { bg: '#F2EFE7', fg: MUTED },
};

/**
 * 기획 탭 — 기획 에이전트 패키지의 프로젝트 팩(SSOT 5계층 상태·화면 레지스트리)과 2단 화면설계서 뷰어.
 * 화면설계 브리핑은 서버가 표준 기획 프로세스(요구 원장 → 작업가이드·IA 확정 → 화면 생성 → 리뷰 → 추적·인계)로 나눈다.
 */
export function PlanTab({ connected, apiBase, onUse, onOpenSettings }: PlanTabProps) {
  const { t } = useOfficeLang();
  const packs = usePolling<PlanPacksResponse>(connected ? `${apiBase}/api/plan/packs` : undefined, 8000);
  const [picked, setPicked] = useState('');
  const list = packs.data?.packs ?? [];
  const sel = picked && list.some((p) => p.id === picked) ? picked : list[0]?.id ?? '';
  const detail = usePolling<PlanPackDetail>(sel ? `${apiBase}/api/plan/packs/${encodeURIComponent(sel)}` : undefined, 8000);
  const [checked, setChecked] = useState<{ pack: string; data: Record<string, PlanVerify> | null; error: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [viewer, setViewer] = useState<{ index: number } | null>(null);

  if (!connected) return <p style={smallMuted}>{t('plan.offline')}</p>;
  if (!packs.data) return <p style={smallMuted}>{t('tpl.loading')}</p>;
  const kit = packs.data.kit;
  if (!kit.ok) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={h2Style}>{t('plan.title')}</h2>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', background: PAPER, fontSize: 12.5, lineHeight: 1.55 }}>
          <strong>{t('plan.noKit')}</strong>
          <p style={{ ...smallMuted, marginTop: 4 }}>{kit.error}</p>
          <p style={{ ...smallMuted, marginTop: 4 }}>{t('plan.noKitHint')}</p>
          {onOpenSettings && <button type="button" onClick={onOpenSettings} style={{ marginTop: 8, font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '5px 12px', borderRadius: 6, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' }}>{t('plan.openSettings')}</button>}
        </div>
      </div>
    );
  }

  const d = detail.data && detail.data.ok ? detail.data : null;
  const verify = checked && checked.pack === sel ? checked.data : null;
  const runCheck = async () => {
    if (!sel) return;
    setChecking(true);
    try {
      const r = await fetch(`${apiBase}/api/plan/packs/${encodeURIComponent(sel)}?verify=1`, { cache: 'no-store' });
      const j = (await r.json()) as PlanPackDetail;
      const v = j.verify;
      if (v && '_error' in v) setChecked({ pack: sel, data: null, error: String((v as { _error: string })._error) });
      else setChecked({ pack: sel, data: (v as Record<string, PlanVerify>) ?? {}, error: '' });
    } catch {
      setChecked({ pack: sel, data: null, error: t('plan.checkFail') });
    } finally {
      setChecking(false);
    }
  };
  const brief = () => {
    if (!d) return;
    const name = d.pack.name || d.pack.id;
    onUse({
      id: `plan-${d.pack.id}`, builtin: true,
      title: t('plan.briefTitle', { name }),
      result: t('plan.briefResult'),
      context: t('plan.briefContext', { id: d.pack.id }),
      constraints: [t('plan.briefC1'), t('plan.briefC2'), t('plan.briefC3')],
    });
  };
  const screens = d?.screens ?? [];
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '4px 9px', borderRadius: 6, border: `1px solid ${LINE}`, background: '#fff', color: WYLIE_DARK, whiteSpace: 'nowrap' } as const;
  const failCount = verify ? Object.values(verify).filter((x) => !x.ok).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={h2Style}>{t('plan.title')}</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>{t('plan.packCount', { n: list.length })}</span>
      </div>
      <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('plan.flow')}</p>

      {list.length === 0 && <p style={smallMuted}>{t('plan.noPacks')}</p>}
      {list.length > 0 && (
        <div role="listbox" aria-label={t('plan.title')} style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {list.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected={p.id === sel} onClick={() => { setPicked(p.id); setViewer(null); }}
              style={{ font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 10px', borderRadius: 999, border: `1px solid ${p.id === sel ? WYLIE : LINE}`, background: p.id === sel ? WYLIE_TINT : '#fff', color: p.id === sel ? WYLIE_DARK : INK }}>
              {p.name || p.id}<span style={{ marginLeft: 5, fontSize: 10.5, color: MUTED, fontFamily: MONO }}>{p.screens}</span>
            </button>
          ))}
        </div>
      )}

      {d && (
        <section aria-label={d.pack.name || d.pack.id} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 11px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
            <Layers size={14} aria-hidden style={{ color: WYLIE_DARK, alignSelf: 'center' }} />
            <strong style={{ fontSize: 13 }}>{d.pack.name || d.pack.id}</strong>
            <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{d.pack.id}{d.pack.prefix ? ` · ${d.pack.prefix}-` : ''}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>{d.pack.status} · v{d.pack.version}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} aria-label={t('plan.layers')}>
            {LAYERS.map((l) => {
              const st = String((d.pack.layers as Record<string, string>)[l.key] || 'none');
              const c = LAYER_COLOR[st] ?? LAYER_COLOR.none;
              return <span key={l.key} title={st} style={{ fontSize: 11, fontWeight: 800, padding: '1px 8px', borderRadius: 999, background: c.bg, color: c.fg }}>{t(l.label)} · {t(`plan.s.${st}`)}</span>;
            })}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={runCheck} disabled={checking || !screens.length}><FileCheck2 size={13} aria-hidden />{checking ? t('plan.checking') : t('plan.check')}</button>
            {d.index && <a href={`${apiBase}/plan-files/${d.index.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}><Eye size={13} aria-hidden />{t('plan.indexPage')}</a>}
            <button type="button" style={{ ...btn, background: WYLIE, color: '#fff', border: `1px solid ${WYLIE_DARK}` }} onClick={brief}><Send size={12} aria-hidden />{t('plan.brief')}</button>
          </div>
          {checked && checked.pack === sel && (
            <p role="status" style={{ fontSize: 11.5, margin: 0, fontWeight: 700, color: checked.error ? BAD_FG : failCount ? BAD_FG : OK_FG }}>
              {checked.error || (failCount ? t('plan.checkSome', { n: failCount, total: Object.keys(verify || {}).length }) : t('plan.checkAll', { total: Object.keys(verify || {}).length }))}
            </p>
          )}
        </section>
      )}

      {d && (
        <section aria-label={t('plan.screens')} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: MUTED }}>
            {t('plan.screens')} <span style={{ fontWeight: 700 }}>{screens.length}</span>
            <span aria-hidden style={{ flex: 1, height: 1, background: LINE_SOFT }} />
          </div>
          {!screens.length && <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('plan.noScreens')}</p>}
          {screens.map((s, i) => {
            const v = verify?.[s.id];
            return (
              <div key={s.id} style={{ border: `1px solid ${LINE}`, borderLeft: `3px solid ${v ? (v.ok ? OK_FG : BAD_FG) : s.exists ? WYLIE : LINE}`, borderRadius: 8, padding: '6px 9px', background: '#fff', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: WYLIE_DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.id}>{s.id}</span>
                  {s.type && <span style={{ fontSize: 10.5, color: MUTED, fontFamily: MONO }}>{s.type}</span>}
                  {v && <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, color: v.ok ? OK_FG : BAD_FG, whiteSpace: 'nowrap' }} title={v.violations.map((x) => `${x.code} ${x.msg}`).join('\n')}>{v.ok ? t('plan.pass') : t('plan.violations', { n: v.violations.length })}</span>}
                  <button type="button" style={{ ...btn, marginLeft: v ? 0 : 'auto', padding: '2px 8px' }} disabled={!s.exists} onClick={() => setViewer({ index: i })}><Eye size={12} aria-hidden />{t('plan.view')}</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 650, color: INK }}>{s.title || '—'}</span>
                  {(s.req && s.req.length ? s.req : []).map((r) => <span key={r} style={{ fontSize: 10.5, fontFamily: MONO, padding: '0 5px', borderRadius: 4, background: PAPER, border: `1px solid ${LINE_SOFT}` }}>{r}</span>)}
                  {(!s.req || !s.req.length) && <span style={{ fontSize: 10.5, color: WARN_FG, fontWeight: 700 }}>{t('plan.unlinked')}</span>}
                  {!s.exists && <span style={{ fontSize: 10.5, color: BAD_FG, fontWeight: 700 }}>{t('plan.noFile')}</span>}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {d && viewer && <SpecViewer apiBase={apiBase} screens={screens} index={viewer.index} verify={verify} onIndex={(i) => setViewer({ index: i })} onClose={() => setViewer(null)} />}
    </div>
  );
}
