import { useState } from 'react';
import { usePolling } from './officeApi';
import type { RegistrySkill, RosterMember, SkillRegistryResponse } from './officeApi';
import { useOfficeLang } from './i18n';
import { LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, WYLIE_TINT, h2Style, smallMuted } from './officeTheme';

interface SkillsTabProps {
  connected: boolean;
  apiBase?: string;
  roster: RosterMember[] | null;
  selected: string | null;
}

type View = 'registry' | 'roles';

/**
 * 스킬 탭 — ① 문서·제안 스킬 등록부(이 PC 에서 찾은 위치·붙는 담당·넣는 방식) ② 역할별 기본 스킬.
 * 등록부의 스킬은 표준 절차 단계, 작업 글에 맞는 자동 부착, 팀장의 선택으로 작업에 붙는다(server/skillRegistry.mjs).
 */
export function SkillsTab({ connected, apiBase, roster, selected }: SkillsTabProps) {
  const { t, lang, name } = useOfficeLang();
  const [view, setView] = useState<View>('registry');
  const reg = usePolling<SkillRegistryResponse>(connected && apiBase !== undefined ? `${apiBase}/api/skills/registry` : undefined, 60000);
  if (!connected || !roster) return <p style={smallMuted}>{t('sk.offline')}</p>;

  const en = lang === 'en';
  const chip = (on: boolean) => ({ font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '4px 11px', borderRadius: 999, border: `1px solid ${on ? WYLIE : LINE}`, background: on ? WYLIE_TINT : '#fff', color: on ? WYLIE_DARK : MUTED } as const);
  const tag = (text: string, color: string, bg: string, border: string) => (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '1px 7px', borderRadius: 999, color, background: bg, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{text}</span>
  );
  const sourceLabel = (s: RegistrySkill['source']) => (s ? t(`sk.src.${s}`) : t('sk.src.none'));

  const entries = reg.data?.entries ?? [];
  const forAgent = (e: RegistrySkill) => !selected || e.agents.includes(selected);
  const usable = entries.filter((e) => e.usable && forAgent(e));
  const blocked = entries.filter((e) => !e.usable);
  const groups: { key: 'proposal' | 'document'; label: string; list: RegistrySkill[] }[] = [
    { key: 'proposal', label: t('sk.catProposal'), list: usable.filter((e) => e.cat === 'proposal') },
    { key: 'document', label: t('sk.catDocument'), list: usable.filter((e) => e.cat === 'document') },
  ];
  const availCount = entries.filter((e) => e.usable && e.available).length;

  const row = (e: RegistrySkill) => (
    <div key={e.spec} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: e.available ? '#fff' : PAPER, opacity: e.usable ? 1 : 0.8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 13 }}>{en ? e.en : e.ko}</span>
        <span style={{ fontSize: 11, fontFamily: MONO, color: MUTED }}>{e.name ?? e.spec}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {e.available ? tag(sourceLabel(e.source), OK_FG, '#EEF8F1', '#9FD3B1') : tag(t('sk.notHere'), MUTED, '#F2EFE7', LINE)}
          {e.usable && tag(e.inline ? t('sk.modeInline') : t('sk.modeRef'), WYLIE_DARK, WYLIE_TINT, '#CDBFE6')}
          {e.auto && e.usable && tag(t('sk.auto'), WYLIE_DARK, '#fff', '#CDBFE6')}
          {e.exec && tag(t('sk.exec'), WARN_FG, '#FBF3E3', '#E7CD9A')}
        </span>
      </div>
      <p style={{ ...smallMuted, fontSize: 12, marginTop: 3 }}>{en ? e.use_en : e.use_ko}</p>
      {e.exec && <p style={{ ...smallMuted, fontSize: 11, color: WARN_FG }}>{en ? e.note_en : e.note_ko}</p>}
      {!e.usable && <p style={{ ...smallMuted, fontSize: 11, color: WARN_FG }}>{t('sk.blockedWhy', { why: en ? e.why_en : e.why_ko })}</p>}
      {e.usable && e.agents.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
          {e.agents.map((a) => <span key={a} style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: LINE_SOFT, color: '#4A4A42' }}>{name(a)}</span>)}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="tablist" aria-label={t('tab.skills')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" role="tab" aria-selected={view === 'registry'} onClick={() => setView('registry')} style={chip(view === 'registry')}>{t('sk.viewRegistry', { n: availCount })}</button>
        <button type="button" role="tab" aria-selected={view === 'roles'} onClick={() => setView('roles')} style={chip(view === 'roles')}>{t('sk.viewRoles')}</button>
      </div>

      {view === 'registry' && (
        <>
          <p style={smallMuted}>{t('sk.regHint')}</p>
          {!reg.data && <p style={smallMuted}>{t('sk.loading')}</p>}
          {groups.map((g) => g.list.length > 0 && (
            <section key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 style={h2Style}>{g.label} · {g.list.length}</h2>
              {g.list.map(row)}
            </section>
          ))}
          {reg.data && reg.data.client.length > 0 && !selected && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 style={h2Style}>{t('sk.catClient')} · {reg.data.client.length}</h2>
              <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('sk.clientHint')}</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {reg.data.client.map((c) => <span key={c.name} style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, padding: '2px 8px', borderRadius: 999, border: '1px solid #9FD3B1', background: '#EEF8F1', color: OK_FG }}>{c.name}</span>)}
              </div>
            </section>
          )}
          {blocked.length > 0 && !selected && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: MUTED }}>{t('sk.blockedTitle', { n: blocked.length })}</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>{blocked.map(row)}</div>
            </details>
          )}
        </>
      )}

      {view === 'roles' && (selected === 'lead' ? <p style={smallMuted}>{t('sk.lead')}</p> : (
        <>
          <p style={smallMuted}>{t('sk.hint')}</p>
          {roster.filter((m) => m.id !== 'lead' && (!selected || m.id === selected)).map((m) => {
            const registered = entries.filter((e) => e.usable && e.available && e.agents.includes(m.id) && !m.skills.some((s) => s.spec === e.spec));
            return (
              <div key={m.id} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: PAPER }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{name(m.id)}</span>
                  <span style={{ fontSize: 11.5, color: MUTED }}>{en ? m.role_en || m.role : m.role}</span>
                </div>
                {!m.skills.length && <span style={{ fontSize: 12, color: MUTED }}>{t('sk.none')}</span>}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {m.skills.map((s) => (
                    <span key={s.spec} title={s.available ? t('sk.use', { n: s.name ?? '' }) : t('sk.missing', { n: s.spec })} style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, padding: '2px 8px', borderRadius: 999, border: `1px solid ${s.available ? '#9FD3B1' : LINE}`, background: s.available ? '#EEF8F1' : '#F2EFE7', color: s.available ? OK_FG : MUTED, textDecoration: s.available ? 'none' : 'line-through' }}>
                      {s.name ?? s.spec}
                    </span>
                  ))}
                  {registered.map((e) => (
                    <span key={e.spec} title={t('sk.regChip')} style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, padding: '2px 8px', borderRadius: 999, border: `1px dashed ${WYLIE}`, background: '#fff', color: WYLIE_DARK }}>
                      {e.name ?? e.spec}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}
