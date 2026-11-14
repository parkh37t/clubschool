import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, LogIn, LogOut, UserRound } from 'lucide-react';
import { postJson, usePolling } from './officeApi';
import type { AuthState, CliInstallState, LoginState } from './officeApi';
import { useOfficeLang } from './i18n';
import { BAD_FG, INK, LINE, LINE_SOFT, MONO, MUTED, OK_FG, PAPER, WARN_FG, WYLIE, WYLIE_DARK, inputStyle, smallMuted } from './officeTheme';

interface AccountSectionProps {
  apiBase: string;
  /** 진행 중인 브리핑이 있으면 로그인·로그아웃을 막는다(서버도 409 로 막는다) */
  running: boolean;
  /** 화면 위 로그인 배너에서 열었으면 로그인 안 된 상태일 때 바로 로그인을 시작한다 */
  autoLogin?: boolean;
}

type Msg = { ok: boolean; text: string } | null;

const FLOW_MS = 1500; // 앱 안 로그인 진행 상태 확인 주기
const WATCH_MS = 180000; // 예전 방식(새 창) 로그인 뒤 3분 동안 5초마다 다시 확인
const ACTIVE = ['starting', 'waiting'];

/**
 * 설정 창의 'Claude 계정' — AX Office 는 이 PC 에 로그인된 Claude 계정(구독)으로 돈다.
 * 사람마다 자기 PC 에서 자기 계정으로 로그인하면 사용량은 그 계정 구독에 잡힌다. 한 PC 를 여럿이 쓰면 로그아웃 뒤 다시 로그인한다.
 * 로그인은 창 없이 앱 안에서 — 서버가 보이지 않는 가상 터미널에서 claude auth login 을 돌리고(server/account.mjs),
 * 브라우저 승인 뒤 코드가 필요하면 여기 입력 칸으로 받는다. Claude Code 가 없는 PC 는 [Claude Code 설치]부터.
 */
export function AccountSection({ apiBase, running, autoLogin = false }: AccountSectionProps) {
  const { t, lang } = useOfficeLang();
  const auth = usePolling<AuthState>(`${apiBase}/api/auth`, 15000);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState<LoginState | null>(null);
  const [watchUntil, setWatchUntil] = useState(0);
  const [copied, setCopied] = useState(false);
  const [install, setInstall] = useState<CliInstallState | null>(null);
  const [confirmInstall, setConfirmInstall] = useState(false);
  const autoDone = useRef(false);
  const refresh = auth.refresh;

  const recheck = useCallback(async () => {
    try { await fetch(`${apiBase}/api/auth?refresh=1`, { cache: 'no-store' }); } catch { /* 다음 주기 */ }
    refresh();
  }, [apiBase, refresh]);

  // 앱 안 로그인 — 끝날 때까지 상태를 묻는다
  const flowActive = Boolean(flow && ACTIVE.includes(flow.state));
  useEffect(() => {
    if (!flowActive) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${apiBase}/api/auth/login`, { cache: 'no-store' });
        const s = (await r.json()) as LoginState;
        setFlow(s);
        if (!ACTIVE.includes(s.state)) {
          await recheck();
          if (s.state === 'success') setMsg({ ok: true, text: t('acc.flowDone') });
          else if (s.state !== 'idle') setMsg({ ok: false, text: s.message || t(`acc.flow.${s.state}`) });
        }
      } catch { /* 다음 주기 */ }
    }, FLOW_MS);
    return () => clearInterval(iv);
  }, [flowActive, apiBase, recheck, t]);

  // 예전 방식(새 창) — 로그인이 보일 때까지 5초마다
  useEffect(() => {
    if (!watchUntil) return;
    const iv = setInterval(() => { void recheck(); if (Date.now() > watchUntil) setWatchUntil(0); }, 5000);
    return () => clearInterval(iv);
  }, [watchUntil, recheck]);

  // Claude Code 설치 — 끝날 때까지 2초마다
  const installing = install?.state === 'running';
  useEffect(() => {
    if (!installing) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${apiBase}/api/cli/install`, { cache: 'no-store' });
        const s = (await r.json()) as CliInstallState;
        setInstall(s);
        if (s.state !== 'running') {
          await recheck();
          setMsg(s.state === 'success' ? { ok: true, text: t('acc.instDone', { v: s.version || '' }) } : { ok: false, text: s.message || t('acc.instFail') });
        }
      } catch { /* 다음 주기 */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [installing, apiBase, recheck, t]);

  const a = auth.data;
  const acc = a?.account ?? null;
  const state = !a ? 'checking' : !a.cli ? 'nocli' : a.loggedIn === true ? 'in' : a.loggedIn === false ? 'out' : 'unknown';

  const login = useCallback(async () => {
    setMsg(null);
    setConfirming(false);
    setCode('');
    const r = await postJson(`${apiBase}/api/auth/login`, email.trim() ? { email: email.trim() } : {});
    if (!r.ok) { setMsg({ ok: false, text: String(r.error) }); return; }
    if (r.data?.mode === 'window') {
      setMsg({ ok: true, text: t('acc.opened') });
      setWatchUntil(Date.now() + WATCH_MS);
      return;
    }
    setFlow((r.data?.login as LoginState) || { state: 'starting' });
  }, [apiBase, email, t]);

  // 로그인 배너에서 열었으면 한 번만 바로 시작
  useEffect(() => {
    if (autoLogin && !autoDone.current && state === 'out' && !running) {
      autoDone.current = true;
      void login();
    }
  }, [autoLogin, state, running, login]);

  const sendCode = async () => {
    const r = await postJson(`${apiBase}/api/auth/login/code`, { code: code.trim() });
    if (!r.ok) { setMsg({ ok: false, text: String(r.error) }); return; }
    setMsg({ ok: true, text: t('acc.codeSent') });
    setCode('');
  };
  const cancel = async () => {
    await postJson(`${apiBase}/api/auth/login/cancel`, {});
    setFlow(null);
    setMsg({ ok: false, text: t('acc.flow.cancelled') });
  };
  const copyUrl = async () => {
    if (!flow?.url) return;
    try { await navigator.clipboard.writeText(flow.url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* 클립보드 권한 없음 */ }
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

  const startInstall = async () => {
    setConfirmInstall(false);
    setMsg(null);
    const r = await postJson(`${apiBase}/api/cli/install`, { confirm: true });
    if (!r.ok) { setMsg({ ok: false, text: String(r.error) }); return; }
    setInstall((r.data?.install as CliInstallState) || { state: 'running' });
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
  const box = { border: `1px solid ${LINE}`, background: PAPER, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 } as const;
  const dot = state === 'in' ? OK_FG : state === 'out' || state === 'nocli' ? BAD_FG : MUTED;
  const busyAny = flowActive || Boolean(watchUntil);

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

      {/* Claude Code 가 없는 PC — 공식 설치 스크립트로 설치 */}
      {state === 'nocli' && (
        <div style={box}>
          <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>{t('acc.instBody')}</span>
          {confirmInstall ? (
            <div role="alertdialog" aria-label={t('acc.instConfirm')} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, lineHeight: 1.55, color: WARN_FG, fontWeight: 700 }}>{t('acc.instConfirm')}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={primary} onClick={startInstall}><Download size={13} aria-hidden />{t('acc.instGo')}</button>
                <button type="button" style={btn} onClick={() => setConfirmInstall(false)}>{t('acc.cancel')}</button>
              </div>
            </div>
          ) : (
            <div>
              <button type="button" style={{ ...primary, opacity: installing ? 0.6 : 1 }} disabled={installing} onClick={() => setConfirmInstall(true)}>
                <Download size={13} aria-hidden />{installing ? t('acc.instRunning') : t('acc.instButton')}
              </button>
            </div>
          )}
          {install?.log && install.log.length > 0 && (
            <pre style={{ margin: 0, fontFamily: MONO, fontSize: 11, lineHeight: 1.45, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', color: MUTED }}>{install.log.join('\n')}</pre>
          )}
          <span style={{ ...smallMuted, fontSize: 11.5 }}>{t('acc.instManual')}</span>
        </div>
      )}

      {/* 앱 안 로그인 진행 */}
      {flowActive && flow && (
        <div role="status" style={{ ...box, borderColor: WYLIE }}>
          <strong style={{ fontSize: 12.5 }}>{flow.state === 'starting' ? t('acc.flowStarting') : t('acc.flowWaiting')}</strong>
          <span style={{ fontSize: 12, lineHeight: 1.55 }}>{t('acc.flowBody')}</span>
          {flow.url && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" style={btn} onClick={() => window.open(flow.url, '_blank', 'noopener')}><ExternalLink size={13} aria-hidden />{t('acc.flowOpen')}</button>
              <button type="button" style={btn} onClick={copyUrl}><Copy size={13} aria-hidden />{copied ? t('acc.flowCopied') : t('acc.flowCopy')}</button>
            </div>
          )}
          <span style={{ ...smallMuted, fontSize: 11.5 }}>{t('acc.flowOther')}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('acc.codePh')} spellCheck={false} autoComplete="off" aria-label={t('acc.codePh')}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) void sendCode(); }}
              style={{ ...inputStyle, marginTop: 0, flex: '1 1 220px', fontSize: 12, fontFamily: MONO, resize: undefined }} />
            <button type="button" style={{ ...primary, opacity: code.trim() ? 1 : 0.5 }} disabled={!code.trim()} onClick={sendCode}>{t('acc.codeSend')}</button>
            <button type="button" style={btn} onClick={cancel}>{t('acc.cancel')}</button>
          </div>
        </div>
      )}

      {confirming ? (
        <div role="alertdialog" aria-label={t('acc.confirmTitle')} style={{ border: `1px solid ${WARN_FG}`, background: '#FBF3E3', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <strong style={{ fontSize: 12.5 }}>{t('acc.confirmTitle')}</strong>
          <span style={{ fontSize: 12, lineHeight: 1.55 }}>{t('acc.confirmBody', { e: acc?.email || '' })}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={{ ...primary, background: BAD_FG, borderColor: BAD_FG, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={logout}><LogOut size={13} aria-hidden />{busy ? t('acc.loggingOut') : t('acc.logout')}</button>
            <button type="button" style={btn} onClick={() => setConfirming(false)}>{t('acc.cancel')}</button>
          </div>
        </div>
      ) : !flowActive && state !== 'nocli' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {state !== 'in' && (
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('acc.emailPh')} spellCheck={false} autoComplete="email" aria-label={t('acc.emailPh')}
              style={{ ...inputStyle, marginTop: 0, flex: '1 1 200px', fontSize: 12, resize: undefined }} />
          )}
          <button type="button" style={{ ...(state === 'in' ? btn : primary), opacity: running ? 0.55 : 1 }} onClick={login} disabled={busyAny || running} title={running ? t('acc.runningNote') : ''}>
            <LogIn size={13} aria-hidden />{watchUntil ? t('acc.waiting') : state === 'in' ? t('acc.switch') : t('acc.login')}
          </button>
          {state === 'in' && (
            <button type="button" style={{ ...btn, color: BAD_FG, opacity: running ? 0.55 : 1 }} disabled={running} title={running ? t('acc.runningNote') : ''} onClick={() => { setMsg(null); setConfirming(true); }}>
              <LogOut size={13} aria-hidden />{t('acc.logout')}
            </button>
          )}
          {running && <span style={{ fontSize: 11.5, color: WARN_FG, fontWeight: 700 }}>{t('acc.runningNote')}</span>}
        </div>
      )}
      {msg && <p role="status" style={{ fontSize: 12, fontWeight: 600, margin: 0, color: msg.ok ? OK_FG : BAD_FG, overflowWrap: 'anywhere' }}>{msg.text}</p>}
      <p style={{ ...smallMuted, fontSize: 11.5 }}>{t('acc.note')}</p>
    </div>
  );
}
