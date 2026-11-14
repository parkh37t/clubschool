import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { postJson, usePolling } from './officeApi';
import type { EnvState } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, MONO, MUTED, OK_FG, PAPER, WARN_FG, clock, h2Style, smallMuted } from './officeTheme';

interface EnvCardProps {
  apiBase?: string;
}

/**
 * 환경 점검 카드(모니터 탭 맨 위) — Claude Code 버전·실행 파일 경로·로그인 상태. 계정 메일 같은 정보는 서버가 내보내지 않는다.
 * 로그인이 풀렸으면 [로그인](새 PowerShell 창), CLI 가 없으면 데스크톱 앱 설치·업데이트 안내. [다시 확인]은 서버 기억(30초)을 건너뛴다.
 */
export function EnvCard({ apiBase }: EnvCardProps) {
  const { t } = useOfficeLang();
  const { data, error, refresh } = usePolling<EnvState>(apiBase !== undefined ? `${apiBase}/api/env` : undefined, 30000);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const [noteBad, setNoteBad] = useState(false);

  const recheck = async () => {
    setChecking(true);
    setNote('');
    try { await fetch(`${apiBase}/api/env?refresh=1`, { cache: 'no-store' }); } catch { /* 아래 refresh 가 오류를 보여 준다 */ }
    refresh();
    setChecking(false);
  };
  const login = async () => {
    setNote(t('login.opening'));
    setNoteBad(false);
    const r = await postJson(`${apiBase}/api/auth/login`, {});
    setNoteBad(!r.ok);
    setNote(r.ok ? t('login.opened') : t('login.failed', { e: String(r.error) }));
  };

  const found = data?.cli.found ?? false;
  const loginTone = data?.loggedIn === true ? 'ok' : data?.loggedIn === false ? 'bad' : 'warn';
  const loginText = data?.loggedIn === true ? t('env.loggedIn') : data?.loggedIn === false ? t('env.loggedOut') : t('env.unknown');
  const healthy = Boolean(data && found && data.loggedIn === true);

  // 줄 하나 — 초록(통과)·빨강(문제)·주황(확인 불가) 네모와 값.
  const row = (label: string, value: string, tone: 'ok' | 'bad' | 'warn' | 'plain', mono = false) => {
    const color = tone === 'ok' ? OK_FG : tone === 'bad' ? BAD_FG : tone === 'warn' ? WARN_FG : MUTED;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, minWidth: 0 }}>
        <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, background: tone === 'plain' ? LINE : color }} />
        <span style={{ width: 76, flexShrink: 0, color: MUTED, fontWeight: 700 }}>{label}</span>
        <span title={value} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, color: tone === 'plain' ? INK : color, fontFamily: mono ? MONO : undefined, fontSize: mono ? 11 : 12 }}>{value}</span>
      </div>
    );
  };

  return (
    <div style={{ border: `1px solid ${data && !healthy ? '#E8B4A8' : LINE}`, background: data && !healthy ? '#FDF5F2' : PAPER, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ ...h2Style, margin: 0 }}>{t('env.title')}</h2>
        {data && <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 3, border: `1px solid ${LINE}`, background: '#fff', color: data.mode === 'mock' ? MUTED : INK }}>{t('env.mode')} {data.mode}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: MUTED, fontFamily: MONO }}>{data ? t('env.checkedAt', { time: clock(data.checked_at) }) : ''}</span>
        <button type="button" className="axo-iconbtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={recheck} disabled={checking || apiBase === undefined}>
          <RefreshCw size={11} aria-hidden />{checking ? t('env.checking') : t('env.recheck')}
        </button>
      </div>
      {error && !data && <p style={{ ...smallMuted, color: BAD_FG }}>{t('env.fail')}</p>}
      {!data && !error && <p style={smallMuted}>{t('env.checking')}</p>}
      {data && (
        <>
          {data.mode === 'mock' && <p style={{ ...smallMuted, fontSize: 11 }}>{t('env.mockNote')}</p>}
          {row(t('env.cli'), found ? (data.cli.version ?? '') : t('env.missing'), found ? 'ok' : 'bad')}
          {row(t('env.path'), data.cli.path || '—', 'plain', true)}
          {row(t('env.login'), found ? loginText : '—', found ? loginTone : 'plain')}
          {!found && <p style={{ ...smallMuted, fontSize: 11.5, color: BAD_FG }}>{t('env.cliFix')}</p>}
          {found && data.loggedIn === false && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <p style={{ ...smallMuted, fontSize: 11.5, color: BAD_FG, flex: 1 }}>{t('env.loginFix')}</p>
              <button type="button" onClick={login}
                style={{ font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '4px 12px', borderRadius: 4, border: `1px solid ${BAD_FG}`, background: BAD_FG, color: '#fff', whiteSpace: 'nowrap' }}>
                {t('login.button')}
              </button>
            </div>
          )}
          {found && data.loggedIn === null && <p style={{ ...smallMuted, fontSize: 11.5, color: WARN_FG }}>{t('env.unknownFix')}</p>}
        </>
      )}
      {note && <p style={{ ...smallMuted, fontSize: 11.5, color: noteBad ? BAD_FG : OK_FG, fontWeight: 600 }}>{note}</p>}
    </div>
  );
}
