import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Settings } from 'lucide-react';
import { OfficeSimulator } from './officeSimulator';
import type { RenderVals, HiveState, OfficeState } from './officeSimulator';
import { normalizeBase, saveOfficeBackend } from './officeBackend';
import { loadPref, savePref } from './uiPrefs';
import { CommandCenter } from './CommandCenter';
import type { CommandTab } from './CommandCenter';
import { AgentCards } from './AgentCards';
import type { AgentCardData } from './AgentCards';
import { AddAgentDialog } from './AddAgentDialog';
import { SettingsDialog } from './SettingsDialog';
import { UsageMeter } from './UsageMeter';
import { postJson, useEventStream, usePolling } from './officeApi';
import type { AgentStatus, AuthState, OfficeSettings, RosterResponse } from './officeApi';
import { OfficeLangContext, breakerReason, displayName, makeT } from './i18n';
import type { Lang } from './i18n';
import { SIM_TEXT } from './simText';
import { AGENT_ORDER, BAD_FG, FONT, GATE_NAMES, INK, LINE, MONO, MUTED, WYLIE, WYLIE_DARK, WYLIE_TINT, inputStyle } from './officeTheme';
import './virtualOffice.css';

interface VirtualOfficeViewProps {
  teamLabel?: string;
  autoApprove?: boolean;
  initialSpeed?: number;
  /** 지정 시 이 URL의 상태 JSON을 2초 폴링해 실제 에이전트 상태를 반영(내부 데모 정지).
   *  스키마: OfficeState. 미지정 시 자체 시뮬레이션으로 동작. */
  stateUrl?: string;
  /** 외부 상태 폴링 주기(ms). 기본 2000. */
  pollMs?: number;
  /** 브리핑 제출 대상(백엔드 API). 지정 시 브리핑을 POST(경로 B). 미지정 시 복사/다운로드(경로 A). */
  instructUrl?: string;
  /** 연결된 백엔드 기준 주소(표시용). ''=같은 오리진, undefined=미연결 */
  backendBase?: string;
  /** 백엔드 주소를 어디서 정했는지(표시용) */
  backendSource?: 'query' | 'saved' | 'local' | 'none';
}

function fallbackVals(teamLabel: string, initialSpeed: number, autoApprove: boolean): RenderVals {
  const gates = GATE_NAMES.map((name, i) => ({
    num: 'G' + (i + 1), name, label: '대기', pct: '0%',
    bg: 'transparent', fg: MUTED, barColor: '#2D8C4E',
    opacity: i === 0 ? 1 : 0.55, anim: 'none', showMini: false,
    showLink: i > 0, linkColor: LINE,
  }));
  return {
    teamLabel, clock: 'DAY 1 · 09:00', playLabel: '⏸', speedLabel: `${initialSpeed}×`,
    auto: autoApprove, gates, showApprovalCard: false, approvalDesc: '', approvalFile: '', approvalScore: '',
    feed: [], feedEmpty: true, artifacts: [], artifactsEmpty: true,
    toastMsg: '', toastOpacity: 0, toastTransform: 'translateX(-50%) translateY(20px)',
  };
}

const SIM_TO_STATUS: Record<string, AgentStatus> = { working: '진행', waiting: '승인대기', idle: '대기' };

const chip = { fontWeight: 700, fontSize: 11.5, padding: '1px 8px', borderRadius: 4, whiteSpace: 'nowrap' } as const;
const bar = { margin: '8px 12px 0', borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5 } as const;

/**
 * Wylie AX Office — 팀장이 브리핑을 나눠 AI 에이전트에게 배정하고, hive 상태를 픽셀 사무실로 보여 주는 화면.
 * 배치는 Munder Difflin 과 같다: 상단 바 · [왼쪽 사무실 | 오른쪽 커맨드 센터(탭·대기열·입력)] · 하단 에이전트 바.
 * 창 전체를 고정 배치로 쓰고(페이지 스크롤 없음), 좁은 창에서는 세로로 쌓는다(virtualOffice.css).
 * 화면 언어는 한국어(기본)·영어 — 서버 설정(hive/settings.json)에 남아 트레이 메뉴와 에이전트 출력 언어도 따라간다.
 */
export function VirtualOfficeView({
  teamLabel = '와일리 컨버전스 · AX Office',
  autoApprove = false,
  initialSpeed = 1,
  stateUrl,
  pollMs = 2000,
  instructUrl,
  backendBase,
  backendSource = 'none',
}: VirtualOfficeViewProps) {
  // API 기준 주소: '/api/instruct' → ''(같은 오리진), 'https://x/api/instruct' → 'https://x', 미연결 → undefined
  const apiBase = instructUrl !== undefined ? instructUrl.replace(/\/api\/instruct$/, '') : undefined;

  // ── 언어 — 서버가 있으면 서버 설정, 없으면 이 화면에서만 ──
  const settings = usePolling<OfficeSettings>(apiBase !== undefined ? `${apiBase}/api/settings` : undefined, 15000);
  const [localLang, setLocalLang] = useState<Lang>('ko');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const lang: Lang = settings.data?.lang ?? localLang;
  const t = useMemo(() => makeT(lang), [lang]);
  const changeLang = async (next: Lang) => {
    setLocalLang(next);
    if (apiBase !== undefined) { await postJson(`${apiBase}/api/settings`, { lang: next }); settings.refresh(); }
  };

  // 공개 사이트(GitHub Pages)에서 PC 서버에 붙기 위한 주소 입력 — 저장 후 새로고침하면 officeBackend 가 읽는다.
  const [serverInput, setServerInput] = useState(backendBase || '');
  const [serverMsg, setServerMsg] = useState('');
  const connectServer = () => {
    const base = normalizeBase(serverInput);
    if (!base) { setServerMsg(t('srv.bad')); return; }
    saveOfficeBackend(base);
    const url = new URL(window.location.href);
    url.searchParams.delete('api');
    window.location.href = url.toString(); // 저장한 주소로 다시 연결
  };
  const disconnectServer = () => {
    saveOfficeBackend(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('api');
    window.location.href = url.toString();
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<OfficeSimulator | null>(null);
  const [, setVersion] = useState(0);
  const [ext, setExt] = useState<OfficeState | null>(null);
  const [tab, setTab] = useState<CommandTab>('tasks');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // 하단 에이전트 바 '간단히'(한 줄 칩) — 사무실을 크게 보는 기본값. 보는 사람마다의 편의 설정이라 브라우저에만 기억한다.
  const [barCompact, setBarCompact] = useState<boolean>(() => loadPref('agentBar', 'compact') !== 'full');
  const toggleBar = useCallback(() => {
    setBarCompact((v) => {
      savePref('agentBar', v ? 'full' : 'compact');
      return !v;
    });
  }, []);

  // 카드·책상 선택. 작업/승인 탭을 보고 있었다면 그 사람의 활동 탭으로 넘긴다.
  const handleSelect = useCallback((id: string | null) => {
    setSelected(id);
    if (id) setTab((cur) => (cur === 'tasks' || cur === 'approvals' ? 'activity' : cur));
  }, []);
  // 시뮬레이터는 한 번만 만들어지므로, 책상 클릭 콜백은 최신 선택값을 ref 로 읽는다.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    if (!svgRef.current) return;
    const sim = new OfficeSimulator(svgRef.current, {
      teamLabel, autoApprove, initialSpeed,
      onRender: () => setVersion(v => v + 1),
      onSelectAgent: (id) => handleSelect(selectedRef.current === id ? null : id),
    });
    simRef.current = sim;
    return () => { sim.destroy(); simRef.current = null; };
    // 프로퍼티는 초기 설정값(디자인의 constructor props와 동일 의미) — 1회만 구성.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { simRef.current?.highlightAgent(selected); }, [selected]);
  useEffect(() => { simRef.current?.setLang(lang); }, [lang]);

  // 실전 연동: stateUrl 지정 시 상태 JSON을 폴링해 applyOfficeState로 주입.
  useEffect(() => {
    if (!stateUrl) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(stateUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as OfficeState;
        if (!alive) return;
        simRef.current?.applyOfficeState(data);
        setExt(data);
      } catch {
        // 폴링 실패는 무시하고 다음 주기에 재시도(네트워크 일시 오류 내성).
      }
    };
    poll();
    const iv = setInterval(poll, pollMs);
    return () => { alive = false; clearInterval(iv); };
  }, [stateUrl, pollMs]);

  // 서버 API — 명단(상태·사용량·스킬·서킷 브레이커), 로그인 여부, 이벤트 증분
  const roster = usePolling<RosterResponse>(apiBase !== undefined ? `${apiBase}/api/roster` : undefined, 3000);
  const auth = usePolling<AuthState>(apiBase !== undefined ? `${apiBase}/api/auth` : undefined, 60000);
  const events = useEventStream(apiBase, 3000);
  const members = roster.data?.members ?? null;

  // 추가 인원 → 사무실 확장 구역 책상
  useEffect(() => {
    const list = (members ?? []).filter((m) => m.custom).map((m) => ({ id: m.id, name: lang === 'en' ? m.name_en || m.name : m.name, role: lang === 'en' ? m.dept_en || m.dept : m.dept, look: m.look ?? null }));
    simRef.current?.syncCustomAgents(list);
  }, [members, lang]);

  const langValue = useMemo(() => ({ lang, t, name: (id: string | undefined) => displayName(lang, id, members) }), [lang, t, members]);

  // [로그인] — 새 PowerShell 창을 띄우고, 로그인이 확인될 때까지 5초마다 다시 묻는다(최대 3분).
  const [loginMsg, setLoginMsg] = useState('');
  const [loginWatch, setLoginWatch] = useState(false);
  const startLogin = async () => {
    if (apiBase === undefined) return;
    setLoginMsg(t('login.opening'));
    const r = await postJson(`${apiBase}/api/auth/login`, {});
    if (!r.ok) { setLoginMsg(t('login.failed', { e: r.error ?? '' })); return; }
    setLoginMsg(t('login.opened'));
    setLoginWatch(true);
  };
  const refreshAuth = auth.refresh;
  useEffect(() => {
    if (!loginWatch || apiBase === undefined) return;
    const started = Date.now();
    const iv = setInterval(async () => {
      try { await fetch(`${apiBase}/api/auth?refresh=1`, { cache: 'no-store' }); } catch { /* 다음 주기 */ }
      refreshAuth();
      if (Date.now() - started > 180000) setLoginWatch(false);
    }, 5000);
    return () => clearInterval(iv);
  }, [loginWatch, apiBase, refreshAuth]);
  useEffect(() => { if (auth.data?.loggedIn) { setLoginWatch(false); setLoginMsg(''); } }, [auth.data?.loggedIn]);

  const onSubmitted = useCallback((title: string) => simRef.current?.noteInstruction(title), []);

  const sim = simRef.current;
  const rv: RenderVals = sim ? sim.getRenderVals() : fallbackVals(teamLabel, initialSpeed, autoApprove);
  const hive: HiveState | null = sim ? sim.getHive() : null;
  const question = sim ? sim.getQuestion() : '';
  const connected = Boolean(hive) && apiBase !== undefined;
  const S = SIM_TEXT[lang];

  // 서버 연결 시 명단 API, 데모일 때는 시뮬레이터 자리 상태로 카드를 만든다(많아야 19장이라 매번 계산해도 가볍다).
  const demoStates = sim && !connected ? sim.getAgentStates() : null;
  const cards: AgentCardData[] = connected && members
    ? members.map((m) => ({
      id: m.id, name: displayName(lang, m.id, members),
      role: S.roles[m.id] ?? (lang === 'en' ? m.dept_en || m.dept : m.dept),
      status: m.status, task: m.task, tokens: m.tokens, custom: m.custom, look: m.look ?? null,
      level: m.breaker?.level, levelReason: breakerReason(lang, m.breaker),
    }))
    : AGENT_ORDER.map((id) => {
      const s = demoStates?.[id];
      return { id, name: S.names[id] ?? id, role: S.roles[id] ?? '', status: SIM_TO_STATUS[s?.state ?? 'idle'], task: s?.state === 'idle' ? '' : (s?.task ?? ''), tokens: 0 };
    });
  const customCount = (members ?? []).filter((m) => m.custom).length;
  const canAdd = connected && customCount < (roster.data?.max_custom ?? 6);

  const demo = useMemo(() => ({
    feed: rv.feed, showApproval: rv.showApprovalCard, approvalDesc: rv.approvalDesc, approvalFile: rv.approvalFile, approvalScore: rv.approvalScore,
    onApprove: () => simRef.current?.approveManual(),
  }), [rv.feed, rv.showApprovalCard, rv.approvalDesc, rv.approvalFile, rv.approvalScore]);

  const a = auth.data;
  const mode = roster.data?.mode ?? a?.mode;
  const showLoginBanner = Boolean(a && a.loggedIn === false);
  const showCliBanner = Boolean(a && !a.cli && mode === 'claude_code');
  const playing = rv.playLabel.includes('⏸');
  const langBtn = (l: Lang, label: string) => (
    <button type="button" onClick={() => changeLang(l)} aria-pressed={lang === l}
      style={{ font: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '3px 8px', border: 'none', whiteSpace: 'nowrap', background: lang === l ? WYLIE : '#fff', color: lang === l ? '#fff' : MUTED }}>
      {label}
    </button>
  );

  return (
    <OfficeLangContext.Provider value={langValue}>
      <div className="axo-app" lang={lang} style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5 }}>
        {/* 상단 바 — 앱 이름 · 모드 · 동시 작업 · 시계 · 재생 제어 · 언어 */}
        <header className="axo-top">
          <span aria-hidden style={{ width: 14, height: 14, background: WYLIE, boxShadow: 'inset -3px -3px 0 rgba(0,0,0,.2)', flexShrink: 0 }} />
          <strong style={{ fontSize: 15, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Wylie AX Office</strong>
          <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{rv.teamLabel}</span>
          {hive ? (
            <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ ...chip, color: WYLIE_DARK, background: WYLIE_TINT, border: `1px solid ${WYLIE}` }}>{t('top.hive')}{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>
              {mode && <span style={{ ...chip, color: INK, background: '#fff', border: `1px solid ${LINE}`, fontFamily: MONO }}>{mode}</span>}
              {ext?.concurrency && <span style={{ ...chip, color: INK, background: '#fff', border: `1px solid ${LINE}` }}>{t('top.concurrency', { r: ext.concurrency.running, l: ext.concurrency.limit })}</span>}
            </span>
          ) : (
            stateUrl
              ? <span style={{ ...chip, color: '#A14A2A', background: '#FBEFE9', border: '1px solid #E3B39F' }}>{t('top.noServer')}{backendBase ? ` · ${backendBase.replace(/^https?:\/\//, '')}` : ''}</span>
              : <span style={{ ...chip, color: MUTED, background: '#fff', border: `1px solid ${LINE}` }}>{t('top.demo')}</span>
          )}
          {/* 구독 사용량 — 주간·5시간 창 사용률 · 오늘 사용 토큰 · 실행 중 작업(누르면 자세히) */}
          {connected && apiBase !== undefined && <UsageMeter apiBase={apiBase} onOpenMonitor={() => setTab('monitor')} />}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED, fontWeight: 600, fontFamily: MONO, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{rv.clock}</span>
          <button type="button" className="axo-iconbtn" onClick={() => sim?.togglePlay()} title={t('top.pauseTitle')}>
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}{playing ? t('top.pause') : t('top.play')}
          </button>
          <button type="button" className="axo-iconbtn" onClick={() => sim?.cycleSpeed()}>{rv.speedLabel}</button>
          {!hive && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: MUTED, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={rv.auto} onChange={(e) => sim?.setAuto(e.target.checked)} style={{ accentColor: '#2D8C4E', width: 14, height: 14, cursor: 'pointer' }} />
              {t('top.autoDemo')}
            </label>
          )}
          {!hive && <button type="button" className="axo-iconbtn" onClick={() => sim?.reset()}>{t('top.reset')}</button>}
          <button type="button" className="axo-iconbtn" onClick={() => setSettingsOpen(true)} title={t('set.title')}>
            <Settings size={13} aria-hidden />{t('set.title')}
          </button>
          <span role="group" aria-label={t('top.lang')} style={{ display: 'inline-flex', flexShrink: 0, border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden' }}>
            {langBtn('ko', '한국어')}
            {langBtn('en', 'EN')}
          </span>
        </header>

        {/* Claude 로그인 배너 — 풀려 있으면 에이전트 실행이 '로그인 필요'로 실패한다 */}
        {showLoginBanner && (
          <section role="alert" style={{ ...bar, background: '#FBEFE9', border: '1px solid #E3B39F' }}>
            <strong style={{ color: BAD_FG }}>{t('login.title')}</strong>
            <span style={{ flex: '1 1 320px', color: INK }}>{loginMsg || t('login.body')}</span>
            <button type="button" onClick={startLogin} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '5px 14px', borderRadius: 4, border: `1px solid ${WYLIE_DARK}`, background: WYLIE, color: '#fff' }}>{t('login.button')}</button>
          </section>
        )}
        {showCliBanner && (
          <section role="alert" style={{ ...bar, background: '#FBEFE9', border: '1px solid #E3B39F' }}>
            <strong style={{ color: BAD_FG }}>{t('cli.missing')}</strong>
            <span>{t('cli.body')}</span>
          </section>
        )}
        {/* API 키로 과금 중 — 환경에 키가 있고 OFFICE_ALLOW_API_KEY=1 일 때만(아니면 서버가 키를 빼고 구독으로 돌린다) */}
        {a?.api_key?.billed && (
          <section role="alert" style={{ ...bar, background: '#FBEFE9', border: '1px solid #E3B39F' }}>
            <strong style={{ color: BAD_FG }}>{t('key.billedTitle')}</strong>
            <span>{t('key.billedBody', { k: a.api_key.present.join(', ') })}</span>
          </section>
        )}
        {/* 팀장 되물음 */}
        {question && (
          <section role="alert" style={{ ...bar, background: '#F8E3DF', border: '1px solid #D0684A' }}>
            <strong style={{ color: BAD_FG }}>{t('question.title')}</strong>
            <span style={{ flex: '1 1 320px' }}>{question}</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>{t('question.hint')}</span>
          </section>
        )}
        {/* 서버 주소 — 공개 사이트에서 PC 에 띄운 서버(터널 주소)에 붙인다. 로컬(같은 오리진·설치형 앱)에서는 숨김 */}
        {backendSource !== 'local' && (
          <section aria-label={t('srv.label')} style={{ ...bar, background: '#FFFDF8', border: `1px solid ${LINE}` }}>
            <strong style={{ fontSize: 12, color: WYLIE_DARK, whiteSpace: 'nowrap' }}>{t('srv.label')}</strong>
            <input
              value={serverInput}
              onChange={(e) => setServerInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') connectServer(); }}
              placeholder={t('srv.placeholder')}
              style={{ ...inputStyle, marginTop: 0, flex: '1 1 300px', fontFamily: MONO, fontSize: 12, padding: '5px 9px' }}
            />
            <button type="button" className="axo-iconbtn" onClick={connectServer}>{t('srv.connect')}</button>
            {backendBase && <button type="button" className="axo-iconbtn" onClick={disconnectServer}>{t('srv.disconnect')}</button>}
            <span style={{ fontSize: 11, color: MUTED, flexBasis: '100%' }}>{serverMsg || (backendSource === 'saved' ? t('srv.saved') : t('srv.none'))}</span>
          </section>
        )}

        <main className="axo-main">
          {/* 왼쪽 — 게이트 현황 + 사무실 */}
          <section className="axo-left" aria-label="office">
            <div className="axo-gates" aria-label={t('gates.aria')}>
              {rv.gates.map((g, i) => (
                <div key={g.num} className="axo-gate" title={`${g.num} ${S.gates[i]} — ${g.label}`} style={{ background: g.bg === 'transparent' ? '#FFFDF8' : g.bg, opacity: g.opacity, animation: g.anim }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 800, color: g.fg }}>{g.num}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{S.gates[i]}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: g.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</span>
                  </div>
                  <div style={{ height: 3, background: '#EAE5D8', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: g.pct, background: g.barColor, transition: 'width .25s linear' }} />
                  </div>
                  {g.showMini && !hive && <button type="button" className="apex-btn--mini" style={{ marginTop: 3, padding: '1px 8px', fontSize: 11 }} onClick={() => sim?.approveManual()}>{t('gate.approve')}</button>}
                </div>
              ))}
            </div>
            <div className="axo-canvas">
              <svg id="office" ref={svgRef} viewBox="0 0 1440 860" role="img" aria-label={t('office.aria')} style={{ shapeRendering: 'crispEdges' }} />
            </div>
            <div style={{ display: 'flex', gap: 14, padding: '0 2px', fontSize: 11.5, fontWeight: 600, color: MUTED, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
              <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#2D8C4E' }} />{t('legend.working')}</span>
              <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#E8A33D' }} />{t('legend.waiting')}</span>
              <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: '#6B7288' }} />{t('legend.idle')}</span>
              <span><b style={{ display: 'inline-block', width: 9, height: 9, marginRight: 5, background: WYLIE }} />{t('legend.lead')}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{hive ? t('legend.hive') : t('legend.demo')}</span>
            </div>
          </section>

          {/* 오른쪽 — 커맨드 센터(탭·대기열·입력) */}
          <CommandCenter
            tab={tab}
            onTab={setTab}
            hive={hive}
            apiBase={apiBase}
            onOpenSettings={openSettings}
            selected={selected}
            onSelect={handleSelect}
            roster={members}
            events={events}
            concurrency={ext?.concurrency}
            mode={mode}
            demo={demo}
            instructUrl={instructUrl}
            onSubmitted={onSubmitted}
          />
        </main>

        {/* 하단 — 에이전트 바 */}
        <footer className={`axo-bottom${barCompact ? ' axo-bottom--compact' : ''}`}>
          <AgentCards members={cards} selected={selected} onSelect={handleSelect} connected={connected} onAdd={connected ? () => setAdding(true) : undefined} canAdd={canAdd} compact={barCompact} onToggleCompact={toggleBar} />
        </footer>

        {adding && <AddAgentDialog apiBase={apiBase} roster={members} onClose={() => setAdding(false)} onChanged={roster.refresh} />}
        {settingsOpen && <SettingsDialog apiBase={apiBase} lang={lang} onLang={changeLang} onClose={closeSettings} onSaved={settings.refresh} />}

        <div role="status" style={{ position: 'fixed', left: '50%', bottom: 26, background: INK, color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '10px 18px', borderRadius: 8, pointerEvents: 'none', transition: 'opacity .25s ease, transform .25s ease', opacity: rv.toastOpacity, transform: rv.toastTransform }}>{rv.toastMsg}</div>
      </div>
    </OfficeLangContext.Provider>
  );
}
