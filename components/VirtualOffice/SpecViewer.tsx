import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import type { PlanScreen, PlanVerify } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, FONT, INK, LINE, MONO, MUTED, OK_FG, WARN_FG } from './officeTheme';

interface SpecViewerProps {
  apiBase?: string;
  screens: PlanScreen[];
  index: number;
  verify?: Record<string, PlanVerify> | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}

/**
 * 2단 화면설계서 뷰어 — 패키지 폴더의 화면 HTML 을 그대로 띄운다(좌 화면 · 우 사양, CASE 칩·마커 동작 포함).
 * 서버가 CSP sandbox 로 내보내고 iframe 도 sandbox 라서 화면 스크립트는 이 앱과 다른(불투명) 오리진에서 돈다.
 * ←/→ 로 앞뒤 화면, Esc 로 닫는다. 검사 결과가 있으면 오른쪽에 위반 목록을 붙인다.
 */
export function SpecViewer({ apiBase, screens, index, verify, onIndex, onClose }: SpecViewerProps) {
  const { t } = useOfficeLang();
  const s = screens[index];
  const v = s && verify ? verify[s.id] : undefined;
  const src = s ? `${apiBase}/plan-files/${s.file.split('/').map(encodeURIComponent).join('/')}` : '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key === 'ArrowRight' && index < screens.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, screens.length, onIndex, onClose]);

  if (!s) return null;
  const nav = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', color: INK, cursor: 'pointer' } as const;
  return (
    <div role="dialog" aria-modal="true" aria-label={t('plan.viewer', { id: s.id })} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(27,31,46,.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1500px, 100%)', height: 'min(92vh, 1000px)', background: '#FFFDF8', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: FONT, boxShadow: '0 20px 60px rgba(20,24,36,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${LINE}` }}>
          <button type="button" style={{ ...nav, opacity: index > 0 ? 1 : 0.4 }} disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label={t('plan.prev')}><ChevronLeft size={16} aria-hidden /></button>
          <button type="button" style={{ ...nav, opacity: index < screens.length - 1 ? 1 : 0.4 }} disabled={index >= screens.length - 1} onClick={() => onIndex(index + 1)} aria-label={t('plan.next')}><ChevronRight size={16} aria-hidden /></button>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13 }}>{s.id}</span>
          <span style={{ fontSize: 13, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
          <span style={{ fontSize: 11.5, color: MUTED, whiteSpace: 'nowrap' }}>{index + 1}/{screens.length}</span>
          {v && <span style={{ fontSize: 11.5, fontWeight: 800, color: v.ok ? OK_FG : BAD_FG, whiteSpace: 'nowrap' }}>{v.ok ? t('plan.pass') : t('plan.violations', { n: v.violations.length })}</span>}
          <a href={src} target="_blank" rel="noreferrer" style={{ ...nav, marginLeft: 'auto', width: 'auto', padding: '0 10px', gap: 4, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}><ExternalLink size={13} aria-hidden />{t('plan.newWindow')}</a>
          <button type="button" style={nav} onClick={onClose} aria-label={t('set.close')}><X size={16} aria-hidden /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {s.exists
            ? <iframe key={s.id} title={s.id} src={src} sandbox="allow-scripts" style={{ flex: 1, minWidth: 0, border: 'none', background: '#fff' }} />
            : <p style={{ margin: 'auto', color: MUTED, fontSize: 13 }}>{t('plan.noFile')}</p>}
          {v && (v.violations.length > 0 || v.warnings.length > 0) && (
            <aside aria-label={t('plan.checkResult')} style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${LINE}`, overflowY: 'auto', padding: '10px 12px', fontSize: 12 }}>
              <strong style={{ fontSize: 12.5 }}>{t('plan.checkResult')}</strong>
              <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {v.violations.map((x, i) => <li key={`v${i}`} style={{ lineHeight: 1.45 }}><b style={{ color: BAD_FG, fontFamily: MONO }}>{x.code}</b> {x.msg}</li>)}
                {v.warnings.map((x, i) => <li key={`w${i}`} style={{ lineHeight: 1.45 }}><b style={{ color: WARN_FG, fontFamily: MONO }}>{x.code}</b> {x.msg}</li>)}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
