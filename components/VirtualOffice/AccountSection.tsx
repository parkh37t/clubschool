import { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { postJson, usePolling } from './officeApi';
import type { AuthState } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, inputStyle, smallMuted } from './officeTheme';

interface AccountSectionProps {
  apiBase: string;
  /** 진행 중인 브리핑이 있으면 로그아웃을 막는다(서버도 409 로 막는다) */
  running: boolean;
}

type Msg = { ok: boolean; text: string } | null;

const WATCH_MS = 180000; // 로그인 창을 연 뒤 3분 동안 5초마다 다시 확인

/**
 * 설정 창의 'Claude 계정' — AX Office 는 이 PC 에 로그인된 Claude 계정(구독)으로 돈다.
 * 사람마다 자기 PC 에서 자기 계정으로 로그인하면 사용량은 그 계정 구독에 잡힌다. 한 PC 를 여럿이 쓰면 로그아웃 뒤 다시 로그인한다.
 * 로그인은 새 창(claude auth login --claudeai), 로그아웃은 확인을 받은 뒤 서버가 claude auth logout 을 부른다.
 */
export function AccountSection({ apiBase, running }: AccountSectionProps) {
  const { t, lang } = useOfficeLang();
  const auth = usePolling<AuthState>(`${apiBase}/api/auth`, 15000);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watchUntil, setWatchUntil] = useState(0);
  const before = useRef('');
  const refresh = auth.refresh;

  // 로그인 창을 연 뒤 — 새 로그인이 보일 때까지 5초마다 강제로 다시 묻는다
  useEffect(() => {
    if (!watchUntil) return;
    const iv = setInterval(async () => {
      try { await fetch(`${apiBase}/api/auth?refresh=1`, { cache: 'no-store' }); } catch { /* 다음 주기 */ }
      refresh();
      if (Date.now() > watchUntil) setWatchUntil(0);
    }, 5000);
    return () => clearInterval(iv);
  }, [watchUntil, apiBase, refresh]);

  const a = auth.data;
  const acc = a?.account ?? null;
  const signature = a?.loggedIn ? `${acc?.email || '?'}|${acc?.expires_at || ''}` : 'out';
  useEffect(() => {
    if (watchUntil && a?.loggedIn && signature !== before.current) {
      setWatchUntil(0);
      setMsg({ ok: true, text: t('acc.loggedIn', { e: acc?.email || '' }) });
    }
  }, [watchUntil, a?.loggedIn, signature, acc?.email, t]);

  const login = async () => {
    setMsg(null);
    setConfirming(false);
    const r = await postJson(`${apiBase}/api/auth/login`, email.trim() ? { email: email.trim() } : {});
    if (!r.ok) { setMsg({ ok: false, text: String(r.error) }); return; }
    before.current = signature;
    setMsg({ ok: true, text: t('acc.opened') });
    setWatchUntil(Date.now() + WATCH_MS);
  };

  const logout = async () => {
    setBusy(true);
    setMsg(null);
    const r = await postJson(`${apiBase}/api/auth/logout`, { confirm: true });
    setBusy(false);
    setConfirming(false);
    setMsg(r.ok ? { ok: true, text: t('acc.loggedOut') } : { ok: false, text: String(r.error) });
    refresh();
  };

  const methodLabel = (m: string) => (/console|api[_ ]?key|anthropic_api/i.test(m) ? t('acc.mApi') : /claude|oauth|subscription|max|pro/i.test(m) ? t('acc.mSub') : m || '—');
  const apiBilled = Boolean(acc && /console|api[_ ]?key/i.test(acc.method));
  const when = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '6px 11px', borderRadius: 7, border: `1px solid ${LINE}`, background: '#fff', color: INK, whiteSpace: 'nowrap' } as const;
  const primary = { ...btn, border: `1px solid ${WYLIE}`, background: WYLIE, color: '#fff' } as const;
  const state = !a ? 'checking' : !a.cli ? 'nocli' : a.loggedIn === true ? 'in' : a.loggedIn === false ? 'out' : 'unknown';
  const dot = state === 'in' ? OK_FG : state === 'out' || state === 'nocli' ? BAD_FG : MUTED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: dot, flexShrink: 0 }} />
        <strong style={{ fontSize: 13 }}>{t(`acc.st.${state}`)}</strong>
        {state === 'in' && acc?.email && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 12, padding: '2px 8px', borderRadius: 6, background: PAPER, border: `1px solid ${LINE_SOFT}` }}>
            <UserRound size={12} aria-hidden />{acc.email}
          </span>
        )}
        {state === 'in' && acc?.plan && <span style={{ fontSize: 11, fontWeight: 800, color: WYLIE_DARK, border: `1px solid ${WYLIE}`, borderRadius: 999, padding: '1px 8px', textTransform: 'uppercase' }}>{acc.plan}</span>}
      </div>
      {state === 'in' && acc && (
        <p style={{ ...smallMuted, fontSize: 11.5 }}>
          {t('acc.detail', { m: methodLabel(acc.method), org: acc.org || '—', exp: when(acc.expires_at) })}
        </p>
      )}
      {apiBilled && <p style={{ ...smallMuted, fontSize: 12, color: BAD_FG, fontWeight: 700 }}>{t('acc.apiWarn')}</p>}

      {confirming ? (
        <div role="alertdialog" aria-label={t('acc.confirmTitle')} style={{ border: `1px solid ${WARN_FG}`, background: '#FBF3E3', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <strong style={{ fontSize: 12.5 }}>{t('acc.confirmTitle')}</strong>
          <span style={{ fontSize: 12, lineHeight: 1.55 }}>{t('acc.confirmBody', { e: acc?.email || '' })}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={{ ...primary, background: BAD_FG, borderColor: BAD_FG, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={logout}><LogOut size={13} aria-hidden />{busy ? t('acc.loggingOut') : t('acc.logout')}</button>
            <button type="button" style={btn} onClick={() => setConfirming(false)}>{t('acc.cancel')}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {state !== 'in' && state !== 'nocli' && (
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('acc.emailPh')} spellCheck={false} autoComplete="email" aria-label={t('acc.emailPh')}
              style={{ ...inputStyle, marginTop: 0, flex: '1 1 200px', fontSize: 12, resize: undefined }} />
          )}
          {state !== 'nocli' && (
            <button type="button" style={state === 'in' ? btn : primary} onClick={login} disabled={Boolean(watchUntil)}>
              <LogIn size={13} aria-hidden />{watchUntil ? t('acc.waiting') : state === 'in' ? t('acc.switch') : t('acc.login')}
            </button>
          )}
          {state === 'in' && (
            <button type="button" style={{ ...btn, color: BAD_FG, opacity: running ? 0.55 : 1 }} disabled={running} title={running ? t('acc.runningNote') : ''} onClick={() => { setMsg(null); setConfirming(true); }}>
              <LogOut size={13} aria-hidden />{t('acc.logout')}
            </button>
          )}
          {state === 'in' && running && <span style={{ fontSize: 11.5, color: WARN_FG, fontWeight: 700 }}>{t('acc.runningNote')}</span>}
        </div>
      )}
      {msg && <p role="status" style={{ fontSize: 12, fontWeight: 600, margin: 0, color: msg.ok ? OK_FG : BAD_FG, overflowWrap: 'anywhere' }}>{msg.text}</p>}
      <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('acc.note')}</p>
    </div>
  );
}
