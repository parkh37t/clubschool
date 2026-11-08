import { useEffect, useRef, useState } from 'react';
import { deleteJson, postJson, usePolling } from './officeApi';
import type { AgentTemplate, RosterMember } from './officeApi';
import { PixelAvatar } from './PixelAvatar';
import { useOfficeLang } from './i18n';
import { BAD_FG, FONT, INK, LINE, MONO, MUTED, OK_FG, PAPER, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle, smallMuted } from './officeTheme';

interface AddAgentDialogProps {
  apiBase?: string;
  roster: RosterMember[] | null;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * 인원 추가 — 역할 템플릿(역할·목표·캐릭터·스킬)을 골라 사무실 확장 구역에 사람을 들인다(Munder Difflin 의 add agent).
 * 추가한 사람은 팀장 명단에 들어가 다음 브리핑부터 배정받는다. 진행·대기 작업이 없을 때만 뺄 수 있다.
 */
export function AddAgentDialog({ apiBase, roster, onClose, onChanged }: AddAgentDialogProps) {
  const { t, lang, name } = useOfficeLang();
  const { data } = usePolling<{ templates: AgentTemplate[]; max_custom: number; custom: number }>(apiBase !== undefined ? `${apiBase}/api/agents/templates` : undefined, 15000);
  const [pick, setPick] = useState<string>('');
  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  const tpl = data?.templates.find((x) => x.id === pick) ?? null;
  const custom = (roster ?? []).filter((m) => m.custom);
  const max = data?.max_custom ?? 6;

  // 열리면 창으로 포커스를 옮기고, Esc 는 캡처 단계에서 받는다 — 터미널(xterm)에 포커스가 남아 있으면 키를 가로채기 때문.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => { boxRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const choose = (x: AgentTemplate) => { setPick(x.id); setNameKo(x.name.ko); setNameEn(x.name.en); setMsg(''); };
  const add = async () => {
    if (!tpl) return;
    const r = await postJson(`${apiBase}/api/agents`, { template: tpl.id, name: nameKo, name_en: nameEn });
    setFailed(!r.ok);
    setMsg(r.ok ? t('add.done', { name: lang === 'en' ? nameEn || nameKo : nameKo }) : String(r.error));
    if (r.ok) { setPick(''); onChanged(); }
  };
  const remove = async (m: RosterMember) => {
    const r = await deleteJson(`${apiBase}/api/agents/${encodeURIComponent(m.id)}`);
    setFailed(!r.ok);
    setMsg(r.ok ? t('add.removed', { name: name(m.id) }) : String(r.error));
    if (r.ok) onChanged();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('add.title')} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(27,31,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div ref={boxRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{ outline: 'none', fontFamily: FONT, width: 'min(860px, 100%)', maxHeight: '88vh', overflow: 'auto', background: '#FFFDF8', border: `1px solid ${LINE}`, borderRadius: 8, padding: '14px 16px', color: INK, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <strong style={{ fontFamily: MONO, letterSpacing: '.08em', fontSize: 14 }}>{t('add.title')}</strong>
          <span style={{ fontSize: 11.5, color: MUTED }}>{t('add.limit', { n: custom.length, max })}</span>
          <button type="button" className="axo-iconbtn" style={{ marginLeft: 'auto' }} onClick={onClose}>{t('add.close')}</button>
        </div>
        {apiBase === undefined && <p style={smallMuted}>{t('add.offline')}</p>}

        {custom.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 4 }}>{t('add.added')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {custom.map((m) => (
                <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${LINE}`, borderRadius: 6, padding: '3px 6px', background: PAPER, fontSize: 12 }}>
                  <PixelAvatar id={m.id} look={m.look} size={22} />
                  <b>{name(m.id)}</b><span style={{ color: MUTED }}>{lang === 'en' ? m.role_en || m.role : m.role}</span>
                  <button type="button" onClick={() => remove(m)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: BAD_FG, fontSize: 11.5, fontWeight: 700 }}>{t('add.remove')}</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 7 }}>
          {(data?.templates ?? []).map((x) => {
            const on = x.id === pick;
            return (
              <button key={x.id} type="button" onClick={() => choose(x)} aria-pressed={on}
                style={{ font: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 9px', borderRadius: 6, border: `1px solid ${on ? WYLIE : LINE}`, boxShadow: on ? `0 0 0 2px ${WYLIE}` : 'none', background: on ? WYLIE_TINT : '#fff', color: INK }}>
                <PixelAvatar id={`tpl-${x.id}`} look={x.look} size={34} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 12.5 }}>{x.name[lang]} <span style={{ fontWeight: 600, fontSize: 11, color: MUTED }}>· {x.dept[lang]}</span></span>
                  <span style={{ fontSize: 11.5, color: INK, lineHeight: 1.35 }}>{x.role[lang]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {tpl && (
          <div style={{ marginTop: 10, border: `1px solid ${LINE}`, borderRadius: 6, padding: '9px 11px', background: PAPER, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: INK }}><b>{t('add.goal')}</b> — {tpl.goal[lang]}</div>
            <div style={{ fontSize: 11.5, color: MUTED, fontFamily: MONO }}>{t('add.stages')}: {tpl.stages.join(', ')} · {t('add.skills')}: {tpl.skills.join(', ') || '—'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('add.name')}
                <input value={nameKo} onChange={(e) => setNameKo(e.target.value)} maxLength={12} style={{ ...inputStyle, marginTop: 3, width: 140, fontSize: 12.5, padding: '4px 8px', resize: undefined }} />
              </label>
              <label style={{ fontSize: 11.5, fontWeight: 700 }}>{t('add.nameEn')}
                <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={24} style={{ ...inputStyle, marginTop: 3, width: 170, fontSize: 12.5, padding: '4px 8px', resize: undefined }} />
              </label>
              <button type="button" onClick={add} disabled={custom.length >= max}
                style={{ font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: custom.length >= max ? 'not-allowed' : 'pointer', padding: '5px 14px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff', opacity: custom.length >= max ? 0.5 : 1 }}>{t('add.add')}</button>
            </div>
          </div>
        )}
        {msg && <p style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 0', color: failed ? BAD_FG : OK_FG }}>{msg}</p>}
      </div>
    </div>
  );
}
