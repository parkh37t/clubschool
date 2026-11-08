import type { RosterMember } from './officeApi';
import { useOfficeLang } from './i18n';
import { LINE, MONO, MUTED, OK_FG, PAPER, smallMuted } from './officeTheme';

interface SkillsTabProps {
  connected: boolean;
  roster: RosterMember[] | null;
  selected: string | null;
}

/** 스킬 탭 — 역할별 업무 지침서와 이 PC 에서 쓸 수 있는지. */
export function SkillsTab({ connected, roster, selected }: SkillsTabProps) {
  const { t, lang, name } = useOfficeLang();
  if (!connected || !roster) return <p style={smallMuted}>{t('sk.offline')}</p>;
  if (selected === 'lead') return <p style={smallMuted}>{t('sk.lead')}</p>;
  const members = roster.filter((m) => m.id !== 'lead' && (!selected || m.id === selected));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={smallMuted}>{t('sk.hint')}</p>
      {members.map((m) => (
        <div key={m.id} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 11px', background: PAPER }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{name(m.id)}</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>{lang === 'en' ? m.role_en || m.role : m.role}</span>
          </div>
          {!m.skills.length && <span style={{ fontSize: 12, color: MUTED }}>{t('sk.none')}</span>}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {m.skills.map((s) => (
              <span key={s.spec} title={s.available ? t('sk.use', { n: s.name ?? '' }) : t('sk.missing', { n: s.spec })} style={{ fontSize: 11.5, fontWeight: 700, fontFamily: MONO, padding: '2px 8px', borderRadius: 999, border: `1px solid ${s.available ? '#9FD3B1' : LINE}`, background: s.available ? '#EEF8F1' : '#F2EFE7', color: s.available ? OK_FG : MUTED, textDecoration: s.available ? 'none' : 'line-through' }}>
                {s.name ?? s.spec}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
